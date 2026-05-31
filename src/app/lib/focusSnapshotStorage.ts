/** Khung ảnh gửi Roboflow theo mã lớp — dùng chung Tổng quan / Theo dõi (cùng tab trình duyệt). */

const STORAGE_KEY = 'edu_focus_snapshots_v1';
const MAX_CLASSES = 6;
export const FOCUS_SNAPSHOT_EVENT = 'edu-focus-snapshot';

export type FocusClassSnapshot = { dataUrl: string; updatedAt: number };

export function normalizeFocusMaLop(s: string) {
  return String(s || '').trim().toUpperCase();
}

function readAll(): Record<string, FocusClassSnapshot> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, FocusClassSnapshot>;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/** Lưu khung JPEG/PNG (data URL) cho lớp; giới hạn số lớp để tránh tràn sessionStorage. */
export function saveFocusClassSnapshot(maLop: string, dataUrl: string) {
  const k = normalizeFocusMaLop(maLop);
  if (!k || typeof dataUrl !== 'string') return;
  let url = dataUrl.trim();
  if (!url.startsWith('data:image/')) {
    if (/^[a-z0-9+/=\s]+$/i.test(url.slice(0, 200))) {
      url = `data:image/jpeg;base64,${url.replace(/\s/g, '')}`;
    } else return;
  }
  let all = readAll();
  all[k] = { dataUrl: url, updatedAt: Date.now() };
  const sorted = Object.entries(all).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  all = Object.fromEntries(sorted.slice(0, MAX_CLASSES));
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(sorted.slice(0, 2))));
    } catch {
      /* bỏ qua nếu ảnh quá lớn */
    }
  }
  window.dispatchEvent(new CustomEvent(FOCUS_SNAPSHOT_EVENT, { detail: { maLop: k } }));
}

export function getFocusClassSnapshot(maLop: string): FocusClassSnapshot | null {
  const k = normalizeFocusMaLop(maLop);
  if (!k) return null;
  return readAll()[k] ?? null;
}

export function subscribeFocusSnapshots(handler: () => void) {
  const fn = () => handler();
  window.addEventListener(FOCUS_SNAPSHOT_EVENT, fn);
  return () => window.removeEventListener(FOCUS_SNAPSHOT_EVENT, fn);
}

/** --- Trạng thái UI trang Roboflow (khôi phục khi quay lại route) --- */
const UI_STATE_KEY = 'edu_focus_ui_state_v1';
const LAST_RESULT_PREFIX = 'edu_focus_last_result_';
const MONITOR_BIND_KEY = 'edu_focus_monitor_bind_v1';
export const FOCUS_MONITOR_BIND_EVENT = 'edu-focus-monitor-bind';

export type FocusSourceKind = 'webcam' | 'local_file' | 'network_stream';

export type FocusUiPersisted = {
  maLop: string;
  source: FocusSourceKind;
  httpStreamUrl: string;
  rtspNote: string;
  autoRun: boolean;
  pickedIsVideo: boolean;
};

export type FocusMonitorBind = {
  maLop: string;
  mode: 'http' | 'blob' | 'mjpeg' | 'none';
  /** URL phát thực sự (HTTP video, MJPEG bridge endpoint, hoặc blob:). */
  httpUrl?: string;
  blobUrl?: string;
  /** URL gốc user gõ (rtsp://… hoặc https://… ) — để khôi phục ô input khi user quay lại lớp. */
  displayUrl?: string;
  /** Tên file gốc (khi mode=blob) — để show ở UI cho người dùng. */
  fileName?: string;
  updatedAt: number;
};

export function getFocusUiState(): FocusUiPersisted | null {
  try {
    const raw = sessionStorage.getItem(UI_STATE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as FocusUiPersisted;
    if (!o || typeof o !== 'object') return null;
    return {
      maLop: String(o.maLop || ''),
      source: (['webcam', 'local_file', 'network_stream'] as const).includes(o.source as FocusSourceKind)
        ? (o.source as FocusSourceKind)
        : 'webcam',
      httpStreamUrl: String(o.httpStreamUrl || ''),
      rtspNote: String(o.rtspNote || ''),
      autoRun: Boolean(o.autoRun),
      pickedIsVideo: Boolean(o.pickedIsVideo),
    };
  } catch {
    return null;
  }
}

export function saveFocusUiState(state: FocusUiPersisted) {
  try {
    sessionStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function parseBind(o: any): FocusMonitorBind | null {
  if (!o || typeof o !== 'object' || !o.maLop) return null;
  return {
    maLop: normalizeFocusMaLop(String(o.maLop)),
    mode: o.mode === 'http' || o.mode === 'blob' || o.mode === 'mjpeg' ? o.mode : 'none',
    httpUrl: typeof o.httpUrl === 'string' ? o.httpUrl : undefined,
    blobUrl: typeof o.blobUrl === 'string' ? o.blobUrl : undefined,
    displayUrl: typeof o.displayUrl === 'string' ? o.displayUrl : undefined,
    fileName: typeof o.fileName === 'string' ? o.fileName : undefined,
    updatedAt: Number(o.updatedAt) || 0,
  };
}

/**
 * Đọc tất cả bind đang lưu — dạng `{ maLop: bind }`.
 * Tự động migrate từ format cũ (single bind) nếu phát hiện trong sessionStorage.
 */
export function getAllFocusMonitorBinds(): Record<string, FocusMonitorBind> {
  try {
    const raw = sessionStorage.getItem(MONITOR_BIND_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      if (o.maLop && (o.mode || o.httpUrl || o.blobUrl)) {
        const single = parseBind(o);
        if (!single) return {};
        return { [single.maLop]: single };
      }
      const out: Record<string, FocusMonitorBind> = {};
      for (const [k, v] of Object.entries(o)) {
        const b = parseBind(v);
        if (b) out[normalizeFocusMaLop(k)] = b;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function writeAllFocusMonitorBinds(map: Record<string, FocusMonitorBind>) {
  try {
    sessionStorage.setItem(MONITOR_BIND_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(FOCUS_MONITOR_BIND_EVENT));
}

/**
 * Trả về bind của 1 lớp (nếu có maLop), hoặc bind mới nhất (legacy single-bind callers).
 */
export function getFocusMonitorBind(maLop?: string): FocusMonitorBind | null {
  const all = getAllFocusMonitorBinds();
  if (maLop) {
    const k = normalizeFocusMaLop(maLop);
    return all[k] ?? null;
  }
  const list = Object.values(all);
  if (list.length === 0) return null;
  return list.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/** Ghi bind cho 1 lớp — không động đến bind của lớp khác. */
export function setFocusMonitorBind(next: FocusMonitorBind) {
  const map = getAllFocusMonitorBinds();
  const k = normalizeFocusMaLop(next.maLop);
  if (!k) return;
  if (next.mode === 'none') {
    delete map[k];
  } else {
    map[k] = { ...next, maLop: k, updatedAt: Date.now() };
  }
  writeAllFocusMonitorBinds(map);
}

/** Xoá bind của 1 lớp (khi user disconnect / ngắt nguồn). */
export function removeFocusMonitorBind(maLop: string) {
  const map = getAllFocusMonitorBinds();
  const k = normalizeFocusMaLop(maLop);
  if (k && map[k]) {
    delete map[k];
    writeAllFocusMonitorBinds(map);
  }
}

export function subscribeFocusMonitorBind(handler: () => void) {
  const fn = () => handler();
  window.addEventListener(FOCUS_MONITOR_BIND_EVENT, fn);
  return () => window.removeEventListener(FOCUS_MONITOR_BIND_EVENT, fn);
}

/** Kết quả workflow gần nhất theo lớp (giới hạn kích thước). */
export function saveFocusLastResult(maLop: string, result: unknown) {
  const k = normalizeFocusMaLop(maLop);
  if (!k) return;
  try {
    const s = JSON.stringify(result);
    if (s.length > 200_000) return;
    sessionStorage.setItem(LAST_RESULT_PREFIX + k, s);
  } catch {
    /* ignore */
  }
}

export function getFocusLastResult(maLop: string): unknown | null {
  const k = normalizeFocusMaLop(maLop);
  if (!k) return null;
  try {
    const s = sessionStorage.getItem(LAST_RESULT_PREFIX + k);
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}
