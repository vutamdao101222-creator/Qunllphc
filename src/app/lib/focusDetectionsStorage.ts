/** Hộp nhận diện + phân tích AI theo mã lớp (phiên trình duyệt) — vẽ overlay trên Theo dõi. */

const KEY = 'edu_focus_detections_v1';
export const FOCUS_DETECTIONS_EVENT = 'edu-focus-detections';

/** 6 nhãn hành vi mô tả tình trạng học sinh tại 1 khung. `unknown` khi chưa đủ tin cậy để phân loại. */
export type BehaviorLabel =
  | 'focus'
  | 'head_down'
  | 'turn_away'
  | 'raise_hand'
  | 'phone'
  | 'absent'
  | 'unknown';

/** 1 keypoint chuẩn hóa 0–1 theo kích thước ảnh — tương thích MoveNet COCO 17 điểm. */
export type FocusKeypoint = {
  /** 0..1 theo chiều rộng/chiều cao ảnh. */
  x: number;
  y: number;
  /** Độ tin cậy của keypoint, 0..1. */
  score?: number;
  /** Tên keypoint COCO: nose, left_eye, right_eye, left_ear, right_ear, left_shoulder, … */
  name?: string;
};

export type FocusNormBox = {
  /** Tọa độ chuẩn hóa 0–1 theo chiều ngang / dọc ảnh (góc trên-trái + kích thước) */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  score?: number;
  trangThai?: 'tap_trung' | 'kem_tap_trung' | string;
  /** ID người do tracker gán — giữ ổn định giữa các frame liên tiếp. */
  id?: number;
  /** Box không xuất hiện ở lượt detect gần nhất, đang được giữ tạm để chống flicker. */
  lost?: boolean;
  /** Hành vi suy diễn từ pose của người này tại khung hiện tại. */
  hanhVi?: BehaviorLabel;
  /** Diễn giải ngắn để show trong overlay & tooltip. */
  hanhViNhan?: string;
  /** Keypoint pose (MoveNet) — chuẩn hóa 0..1, dùng để vẽ skeleton mờ. */
  keypoints?: FocusKeypoint[];
  /** Cử chỉ mắt từ Face Mesh (EAR, hướng nhìn iris). */
  cuChiMat?: {
    earAvg: number;
    eyesClosed: boolean;
    gazeH: 'center' | 'left' | 'right' | 'up' | 'down';
    gazeV: 'center' | 'left' | 'right' | 'up' | 'down';
    nhan: string;
  };
};

/** Đếm số người đang ở mỗi hành vi tại khung hiện tại. */
export type BehaviorCounts = Partial<Record<BehaviorLabel, number>>;

export type FocusPhanTichPayload = {
  tomTatDieuHanh?: string;
  chiSoTapTrungUocLuong?: number;
  ruiRo?: string;
  khuyenNghi?: string;
  /** Phân bố hành vi tức thời tại khung gần nhất. */
  hanhVi?: BehaviorCounts;
};

export type FocusDetectionPayload = {
  boxes: FocusNormBox[];
  summary?: string;
  phanTich?: FocusPhanTichPayload;
  at: string;
};

function readAll(): Record<string, FocusDetectionPayload> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, FocusDetectionPayload>;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

export function normalizeFocusDetMaLop(s: string) {
  return String(s || '').trim().toUpperCase();
}

export function saveFocusDetections(maLop: string, payload: FocusDetectionPayload) {
  const k = normalizeFocusDetMaLop(maLop);
  if (!k) return;
  const boxes = Array.isArray(payload.boxes) ? payload.boxes.slice(0, 80) : [];
  const all = readAll();
  all[k] = { ...payload, boxes, at: payload.at || new Date().toISOString() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    try {
      delete all[k];
      const keys = Object.keys(all).slice(-3);
      const trimmed = Object.fromEntries(keys.map((x) => [x, all[x]]));
      trimmed[k] = { ...payload, boxes: boxes.slice(0, 40), at: payload.at || new Date().toISOString() };
      sessionStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(FOCUS_DETECTIONS_EVENT, { detail: { maLop: k } }));
}

export function getFocusDetections(maLop: string): FocusDetectionPayload | null {
  const k = normalizeFocusDetMaLop(maLop);
  if (!k) return null;
  return readAll()[k] ?? null;
}

export function subscribeFocusDetections(handler: () => void) {
  const fn = () => handler();
  window.addEventListener(FOCUS_DETECTIONS_EVENT, fn);
  return () => window.removeEventListener(FOCUS_DETECTIONS_EVENT, fn);
}
