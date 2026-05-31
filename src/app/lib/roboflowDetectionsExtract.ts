import type { FocusNormBox, FocusPhanTichPayload } from './focusDetectionsStorage';
import { saveFocusDetections } from './focusDetectionsStorage';

export function loadImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 640, h: img.naturalHeight || 360 });
    img.onerror = () => resolve({ w: 1280, h: 720 });
    img.src = dataUrl;
  });
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Chuẩn hóa bbox từ nhiều dạng JSON Roboflow / workflow. */
export function extractNormalizedDetections(
  result: unknown,
  imageWidth: number,
  imageHeight: number,
): FocusNormBox[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const iw = Math.max(1, imageWidth);
  const ih = Math.max(1, imageHeight);

  const overlay = r.overlay as { boxes?: FocusNormBox[] } | undefined;
  if (overlay?.boxes && Array.isArray(overlay.boxes)) {
    return overlay.boxes.filter((b) => typeof b?.x === 'number' && typeof b?.w === 'number');
  }

  const preds = (r.predictions ?? r.detections ?? (r.outputs as Record<string, unknown>)?.predictions) as unknown;
  if (!Array.isArray(preds)) return [];

  const out: FocusNormBox[] = [];
  for (const p of preds) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const label = String(o.class ?? o.class_name ?? o.label ?? 'Đối tượng');
    const score = Number(o.confidence ?? o.score ?? 0);

    if (Array.isArray(o.bbox) && o.bbox.length >= 4) {
      const [x1, y1, x2, y2] = (o.bbox as number[]).map(Number);
      if (Number.isFinite(x1) && Number.isFinite(y1)) {
        const nx = clamp01(x1 / iw);
        const ny = clamp01(y1 / ih);
        const nw = clamp01((x2 - x1) / iw);
        const nh = clamp01((y2 - y1) / ih);
        if (nw > 0.002 && nh > 0.002) out.push({ x: nx, y: ny, w: nw, h: nh, label, score });
      }
      continue;
    }

    const x = Number(o.x);
    const y = Number(o.y);
    const w = Number(o.width ?? o.w);
    const h = Number(o.height ?? o.h);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;

    if (x <= 1 && y <= 1 && w <= 1 && h <= 1) {
      out.push({ x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h), label, score });
    } else {
      const nx = clamp01((x - w / 2) / iw);
      const ny = clamp01((y - h / 2) / ih);
      const nw = clamp01(w / iw);
      const nh = clamp01(h / ih);
      if (nw > 0.002 && nh > 0.002) out.push({ x: nx, y: ny, w: nw, h: nh, label, score });
    }
  }
  return out;
}

export function extractPhanTichPayload(result: unknown): FocusPhanTichPayload | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  const p = r.phanTichChuyenNghiep as FocusPhanTichPayload | undefined;
  if (p && typeof p === 'object') return p;
  return undefined;
}

export function extractSummaryLine(result: unknown): string | undefined {
  const p = extractPhanTichPayload(result);
  if (p?.tomTatDieuHanh) return p.tomTatDieuHanh;
  const r = result as Record<string, unknown>;
  const t = r.tomTat as Record<string, number> | undefined;
  if (t && typeof t.uocLuongSoNguoiTrongKhung === 'number') {
    return `Ước lượng ${t.uocLuongSoNguoiTrongKhung} người trong khung; tập trung ~${t.uocLuongDangTapTrung ?? '—'}.`;
  }
  return undefined;
}

/** Sau POST /ai/focus/workflow — bbox + phân tích vào sessionStorage để Theo dõi vẽ overlay. */
export async function persistFocusDetectionsFromApi(maLop: string, apiOut: unknown, imageDataUrl: string) {
  const ml = String(maLop || '').trim();
  if (!ml) return;
  const o = apiOut as Record<string, unknown>;
  const result = o.result;
  if (result == null || typeof result !== 'object') return;
  const { w, h } = await loadImageDimensions(imageDataUrl);
  const boxes = extractNormalizedDetections(result, w, h);
  const phanTich = extractPhanTichPayload(result);
  const summary = extractSummaryLine(result);
  if (!boxes.length && !phanTich && !summary) return;
  saveFocusDetections(ml, {
    boxes,
    phanTich,
    summary,
    at: String(o.at ?? new Date().toISOString()),
  });
}
