/**
 * Phát hiện người trong khung video bằng TensorFlow.js + COCO‑SSD (chạy trong trình duyệt).
 * - Dynamic import: chỉ tải nặng khi user mở trang Theo dõi có video.
 * - Tile detection + NMS: bắt được nhiều người hơn (lớp đông, dãy sau xa camera).
 * - Trả về bbox đã chuẩn hóa 0–1 theo kích thước video — khớp DetectionOverlayCanvas.
 */
import type { FocusNormBox, FocusPhanTichPayload } from './focusDetectionsStorage';

type CocoModel = {
  detect: (
    el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<Array<{ bbox: [number, number, number, number]; class: string; score: number }>>;
};

let modelPromise: Promise<CocoModel> | null = null;
let loadFailedReason: string | null = null;
let tileCanvas: HTMLCanvasElement | null = null;

/** Tải mô hình 1 lần — `mobilenet_v2` chính xác hơn lite, vẫn đủ nhanh cho 1–2 video. */
export function ensureCocoSsd(): Promise<CocoModel> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    try {
      await import('@tensorflow/tfjs');
      const mod = await import('@tensorflow-models/coco-ssd');
      const m = await mod.load({ base: 'mobilenet_v2' });
      return m as unknown as CocoModel;
    } catch (e) {
      loadFailedReason = e instanceof Error ? e.message : String(e);
      modelPromise = null;
      throw e;
    }
  })();
  return modelPromise;
}

export function getCocoSsdLoadError(): string | null {
  return loadFailedReason;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function iou(a: FocusNormBox, b: FocusNormBox): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const ua = a.w * a.h + b.w * b.h - inter;
  return ua > 0 ? inter / ua : 0;
}

/** Loại box chồng lấn — giữ box có score cao hơn. */
function nms(boxes: FocusNormBox[], iouThr = 0.45): FocusNormBox[] {
  const sorted = [...boxes].sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
  const kept: FocusNormBox[] = [];
  for (const b of sorted) {
    let drop = false;
    for (const k of kept) {
      if (iou(b, k) > iouThr) {
        drop = true;
        break;
      }
    }
    if (!drop) kept.push(b);
  }
  return kept;
}

/** Trạng thái tracker — gán ID ổn định, smoothing toạ độ, giữ box ngắn hạn khi mất tạm. */
export interface DetectorState {
  nextId: number;
  tracks: Array<FocusNormBox & { id: number; ageFrames: number; lostFrames: number }>;
}

export function createDetectorState(): DetectorState {
  return { nextId: 1, tracks: [] };
}

const SMOOTH_OLD = 0.4; // trọng số vị trí cũ
const SMOOTH_NEW = 0.6;
const IOU_MATCH_THR = 0.3;
const MAX_LOST_FRAMES = 1; // giữ box mất tối đa 1 lượt trước khi xoá
const MIN_AGE_TO_CARRY = 2; // chỉ carry box đã ổn định ≥2 lượt

function trackAndSmooth(state: DetectorState, fresh: FocusNormBox[]): FocusNormBox[] {
  const usedTrackIds = new Set<number>();
  const out: Array<FocusNormBox & { id: number; ageFrames: number; lostFrames: number }> = [];

  for (const f of fresh) {
    let bestI = -1;
    let bestIou = IOU_MATCH_THR;
    for (let i = 0; i < state.tracks.length; i += 1) {
      const t = state.tracks[i];
      if (usedTrackIds.has(t.id)) continue;
      const o = iou(t, f);
      if (o > bestIou) {
        bestIou = o;
        bestI = i;
      }
    }
    if (bestI >= 0) {
      const t = state.tracks[bestI];
      usedTrackIds.add(t.id);
      out.push({
        ...f,
        x: t.x * SMOOTH_OLD + f.x * SMOOTH_NEW,
        y: t.y * SMOOTH_OLD + f.y * SMOOTH_NEW,
        w: t.w * SMOOTH_OLD + f.w * SMOOTH_NEW,
        h: t.h * SMOOTH_OLD + f.h * SMOOTH_NEW,
        id: t.id,
        ageFrames: t.ageFrames + 1,
        lostFrames: 0,
        lost: false,
      });
    } else {
      out.push({
        ...f,
        id: state.nextId++,
        ageFrames: 1,
        lostFrames: 0,
        lost: false,
      });
    }
  }

  // Giữ box mất tạm — tránh nháy trắng khi detector miss 1 lượt.
  for (const t of state.tracks) {
    if (usedTrackIds.has(t.id)) continue;
    if (t.ageFrames < MIN_AGE_TO_CARRY) continue;
    if (t.lostFrames >= MAX_LOST_FRAMES) continue;
    out.push({
      ...t,
      lostFrames: t.lostFrames + 1,
      lost: true,
    });
  }

  state.tracks = out;
  return out;
}

function frameSize(source: HTMLVideoElement | HTMLImageElement): { w: number; h: number } {
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight };
  }
  return { w: source.naturalWidth, h: source.naturalHeight };
}

type NormTile = { x: number; y: number; w: number; h: number };

/** Lưới tile chồng nhau — bắt người xa (trên) và gần camera (dưới / hai bên). */
const DETECT_TILES: NormTile[] = [
  { x: 0, y: 0, w: 1, h: 1 },
  { x: 0, y: 0, w: 0.58, h: 1 },
  { x: 0.42, y: 0, w: 0.58, h: 1 },
  { x: 0, y: 0, w: 1, h: 0.58 },
  { x: 0, y: 0.42, w: 1, h: 0.58 },
  { x: 0, y: 0, w: 0.55, h: 0.58 },
  { x: 0.45, y: 0, w: 0.55, h: 0.58 },
  { x: 0, y: 0.42, w: 0.55, h: 0.58 },
  { x: 0.45, y: 0.42, w: 0.55, h: 0.58 },
  { x: 0.18, y: 0, w: 0.64, h: 1 },
];

/** Chạy detect trên 1 vùng (tile) của ảnh nguồn rồi map bbox về toạ độ chuẩn hóa của ảnh đầy đủ. */
async function detectOnTile(
  model: CocoModel,
  source: HTMLVideoElement | HTMLImageElement,
  sw: number,
  sh: number,
  tile: NormTile,
  minScore: number,
): Promise<FocusNormBox[]> {
  const tx = Math.round(tile.x * sw);
  const ty = Math.round(tile.y * sh);
  const tw = Math.round(tile.w * sw);
  const th = Math.round(tile.h * sh);
  if (tw < 8 || th < 8) return [];
  if (!tileCanvas) tileCanvas = document.createElement('canvas');
  tileCanvas.width = tw;
  tileCanvas.height = th;
  const ctx = tileCanvas.getContext('2d');
  if (!ctx) return [];
  try {
    ctx.drawImage(source, tx, ty, tw, th, 0, 0, tw, th);
  } catch {
    return [];
  }
  const raw = await model.detect(tileCanvas, 100, Math.max(0.18, minScore - 0.2));
  const out: FocusNormBox[] = [];
  for (const r of raw) {
    if (r.class !== 'person') continue;
    if (r.score < minScore) continue;
    const [bx, by, bw, bh] = r.bbox;
    const fx = (tx + bx) / sw;
    const fy = (ty + by) / sh;
    const fw = bw / sw;
    const fh = bh / sh;
    if (fw < 0.008 || fh < 0.018) continue;
    out.push({
      x: clamp01(fx),
      y: clamp01(fy),
      w: clamp01(fw),
      h: clamp01(fh),
      label: 'person',
      score: Math.round(r.score * 100) / 100,
    });
  }
  return out;
}

function rawToNormBoxes(
  raw: Array<{ bbox: [number, number, number, number]; class: string; score: number }>,
  w: number,
  h: number,
  minScore: number,
): FocusNormBox[] {
  const out: FocusNormBox[] = [];
  for (const r of raw) {
    if (r.class !== 'person') continue;
    if (r.score < minScore) continue;
    const [bx, by, bw, bh] = r.bbox;
    const nw = bw / w;
    const nh = bh / h;
    if (nw < 0.008 || nh < 0.018) continue;
    out.push({
      x: clamp01(bx / w),
      y: clamp01(by / h),
      w: clamp01(nw),
      h: clamp01(nh),
      label: 'person',
      score: Math.round(r.score * 100) / 100,
    });
  }
  return out;
}

/**
 * Chỉ trả bbox người (tile + NMS) — dùng bổ sung cho MoveNet khi thiếu pose.
 */
export async function detectPeopleBoxesOnFrame(
  source: HTMLVideoElement | HTMLImageElement,
  minScore = 0.28,
): Promise<FocusNormBox[]> {
  const { w, h } = frameSize(source);
  if (!w || !h) return [];
  const model = await ensureCocoSsd();
  const inferMin = Math.max(0.15, minScore - 0.22);
  const parts = await Promise.all(
    DETECT_TILES.map(async (tile) => {
      if (tile.x === 0 && tile.y === 0 && tile.w === 1 && tile.h === 1) {
        const raw = await model.detect(source, 100, inferMin);
        return rawToNormBoxes(raw, w, h, minScore);
      }
      return detectOnTile(model, source, w, h, tile, minScore);
    }),
  );
  return nms(parts.flat(), 0.38);
}

/**
 * Detect người trên 1 khung video/ảnh — multi-tile → NMS → tracker.
 * @param minScore default 0.30 — cân bằng recall / false positive trong lớp đông.
 */
export async function detectPeopleOnVideo(
  video: HTMLVideoElement,
  minScore = 0.3,
  state?: DetectorState,
): Promise<{ boxes: FocusNormBox[]; phanTich: FocusPhanTichPayload; summary: string }> {
  return detectPeopleOnFrame(video, minScore, state);
}

export async function detectPeopleOnFrame(
  source: HTMLVideoElement | HTMLImageElement,
  minScore = 0.3,
  state?: DetectorState,
): Promise<{ boxes: FocusNormBox[]; phanTich: FocusPhanTichPayload; summary: string }> {
  const { w, h } = frameSize(source);
  if (!w || !h) {
    return {
      boxes: [],
      phanTich: { tomTatDieuHanh: 'Nguồn chưa sẵn sàng — chờ vài giây.' },
      summary: 'Nguồn chưa sẵn sàng — chờ vài giây.',
    };
  }

  const nmsed = await detectPeopleBoxesOnFrame(source, minScore);

  // Gán ID ổn định + smoothing + giữ tạm box mất.
  const merged = state ? trackAndSmooth(state, nmsed) : nmsed;

  // Heuristic chuyên nghiệp: đánh giá tập trung từ tỉ lệ + diện tích bbox.
  // Đứng/ngồi thẳng → bbox cao‑hẹp. Cúi gập / dùng điện thoại → bbox bẹt hoặc rất nhỏ.
  let focusedCount = 0;
  let realCount = 0;
  for (const b of merged) {
    if (!b.lost) realCount += 1;
    const aspect = b.h / Math.max(0.001, b.w);
    const area = b.w * b.h;
    const ok = aspect >= 1.2 && b.h >= 0.16 && area >= 0.012;
    if (ok) {
      if (!b.lost) focusedCount += 1;
      b.trangThai = 'tap_trung';
    } else {
      b.trangThai = 'kem_tap_trung';
    }
  }

  const count = realCount;
  const pct = count ? Math.round((focusedCount / count) * 100) : 0;

  let canhBaoMatDo: string | undefined;
  if (count >= 28) {
    canhBaoMatDo = 'Mật độ người trong khung rất cao — đảm bảo camera góc rộng + ánh sáng đủ để không bỏ lọt.';
  } else if (count >= 1 && count <= 3) {
    canhBaoMatDo = 'Số người trong khung thấp — kiểm tra hướng camera hoặc xem lớp có vắng.';
  } else if (pct < 50 && count >= 6) {
    canhBaoMatDo = 'Tỉ lệ tư thế tập trung thấp — có thể nhiều em đang cúi đầu/làm việc riêng.';
  }

  const summary =
    count === 0
      ? 'Chưa phát hiện người nào trong khung — kiểm tra góc / độ sáng camera.'
      : `Phát hiện ${count} người (COCO‑SSD, ${DETECT_TILES.length} vùng tile, tracker ID + smoothing). Ước lượng ${focusedCount}/${count} đang giữ tư thế tập trung (${pct}%).`;

  return {
    boxes: merged,
    phanTich: {
      tomTatDieuHanh: summary,
      chiSoTapTrungUocLuong: pct,
      ruiRo: canhBaoMatDo,
      khuyenNghi:
        count === 0
          ? 'Chỉnh hướng camera vào khu vực học sinh; bật đèn nếu thiếu sáng; thử lại sau vài giây.'
          : pct < 55
            ? 'Tỉ lệ tư thế tập trung thấp — xen kẽ hoạt động nhóm ngắn 3–5 phút hoặc đổi cách giảng.'
            : pct < 75
              ? 'Lớp ổn định nhưng còn vài em cần nhắc — quan sát thêm hàng cuối / hai biên.'
              : 'Lớp giữ nhịp tốt — tiếp tục duy trì tương tác và phản hồi nhanh.',
    },
    summary,
  };
}
