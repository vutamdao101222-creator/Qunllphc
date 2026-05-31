/**
 * Phân tích cử chỉ mắt bằng MediaPipe Face Mesh (TF.js, chạy trong trình duyệt).
 *
 * Chạy trên vùng đầu cắt từ keypoint MoveNet → 468 landmark mặt, gồm:
 *   - EAR (Eye Aspect Ratio): phát hiện mắt nhắm / ngủ gật
 *   - Vị trí iris: ước lượng hướng nhìn ngang / dọc
 *
 * Kết quả ghép vào pipeline hành vi trong behaviorAnalyzer.ts.
 */
import type { FocusKeypoint, FocusNormBox } from './focusDetectionsStorage';

export type GazeDirection = 'center' | 'left' | 'right' | 'up' | 'down';

export type EyeGesture = {
  /** Trung bình EAR hai mắt — càng thấp càng nhắm. */
  earAvg: number;
  /** Mắt nhắm (EAR dưới ngưỡng liên tiếp). */
  eyesClosed: boolean;
  /** Hướng nhìn ngang (từ góc camera). */
  gazeH: GazeDirection;
  /** Hướng nhìn dọc. */
  gazeV: GazeDirection;
  /** Mô tả ngắn cho overlay. */
  nhan: string;
};

type FaceKeypoint = { x: number; y: number; z?: number; name?: string };
type RawFace = { keypoints?: FaceKeypoint[]; box?: { xMin: number; yMin: number; width: number; height: number } };

type FaceMeshDetector = {
  estimateFaces: (
    input: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
    opts?: { flipHorizontal?: boolean; staticImageMode?: boolean },
  ) => Promise<RawFace[]>;
};

let detectorPromise: Promise<FaceMeshDetector | null> | null = null;
let loadFailed = false;

/** MediaPipe Face Mesh — chỉ load 1 lần; lỗi thì trả null (fallback MoveNet). */
export function ensureFaceMeshDetector(): Promise<FaceMeshDetector | null> {
  if (loadFailed) return Promise.resolve(null);
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    try {
      await import('@tensorflow/tfjs');
      const fld = await import('@tensorflow-models/face-landmarks-detection');
      const det = await fld.createDetector(fld.SupportedModels.MediaPipeFaceMesh, {
        runtime: 'tfjs',
        refineLandmarks: true,
        maxFaces: 1,
      });
      return det as unknown as FaceMeshDetector;
    } catch {
      loadFailed = true;
      detectorPromise = null;
      return null;
    }
  })();
  return detectorPromise;
}

let cropCanvas: HTMLCanvasElement | null = null;
function getCropCanvas(): HTMLCanvasElement {
  if (!cropCanvas) cropCanvas = document.createElement('canvas');
  return cropCanvas;
}

const MIN_KP = 0.25;
const EAR_CLOSED = 0.19;
const GAZE_H_LEFT = 0.62;
const GAZE_H_RIGHT = 0.38;
const GAZE_V_UP = 0.38;
const GAZE_V_DOWN = 0.62;

/** Chỉ số landmark MediaPipe cho EAR và iris. */
const LEFT_EAR_IDX = [33, 160, 158, 133, 153, 144] as const;
const RIGHT_EAR_IDX = [362, 385, 387, 263, 373, 380] as const;
const LEFT_EYE_H = [33, 133] as const;
const RIGHT_EYE_H = [362, 263] as const;
const LEFT_EYE_V = [159, 145] as const;
const RIGHT_EYE_V = [386, 374] as const;
const LEFT_IRIS = [468, 469, 470, 471, 472] as const;
const RIGHT_IRIS = [473, 474, 475, 476, 477] as const;

function dist(a: FaceKeypoint, b: FaceKeypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function earFromIndices(kps: FaceKeypoint[], indices: readonly number[]): number | null {
  const pts = indices.map((i) => kps[i]).filter(Boolean);
  if (pts.length < 6) return null;
  const [p1, p2, p3, p4, p5, p6] = pts;
  const num = dist(p2, p6) + dist(p3, p5);
  const den = 2 * dist(p1, p4);
  return den > 1e-6 ? num / den : null;
}

function irisRatio(
  kps: FaceKeypoint[],
  irisIdx: readonly number[],
  hIdx: readonly number[],
  vIdx: readonly number[],
): { h: number; v: number } | null {
  const irisPts = irisIdx.map((i) => kps[i]).filter(Boolean);
  if (irisPts.length < 1) return null;
  const ix = irisPts.reduce((s, p) => s + p.x, 0) / irisPts.length;
  const iy = irisPts.reduce((s, p) => s + p.y, 0) / irisPts.length;
  const h0 = kps[hIdx[0]];
  const h1 = kps[hIdx[1]];
  const v0 = kps[vIdx[0]];
  const v1 = kps[vIdx[1]];
  if (!h0 || !h1 || !v0 || !v1) return null;
  const hx0 = Math.min(h0.x, h1.x);
  const hx1 = Math.max(h0.x, h1.x);
  const vy0 = Math.min(v0.y, v1.y);
  const vy1 = Math.max(v0.y, v1.y);
  const hw = hx1 - hx0;
  const vh = vy1 - vy0;
  if (hw < 1e-4 || vh < 1e-4) return null;
  return { h: (ix - hx0) / hw, v: (iy - vy0) / vh };
}

function classifyGaze(h: number, v: number): { gazeH: GazeDirection; gazeV: GazeDirection } {
  let gazeH: GazeDirection = 'center';
  let gazeV: GazeDirection = 'center';
  if (h >= GAZE_H_LEFT) gazeH = 'left';
  else if (h <= GAZE_H_RIGHT) gazeH = 'right';
  if (v <= GAZE_V_UP) gazeV = 'up';
  else if (v >= GAZE_V_DOWN) gazeV = 'down';
  return { gazeH, gazeV };
}

function buildEyeNhan(gazeH: GazeDirection, gazeV: GazeDirection, eyesClosed: boolean): string {
  if (eyesClosed) return 'Mắt nhắm';
  const parts: string[] = [];
  if (gazeV === 'down') parts.push('nhìn xuống');
  else if (gazeV === 'up') parts.push('nhìn lên');
  if (gazeH === 'left') parts.push('lia trái');
  else if (gazeH === 'right') parts.push('lia phải');
  if (parts.length === 0) return 'Mắt thẳng';
  return parts.join(' · ');
}

function analyzeFaceKeypoints(kps: FaceKeypoint[]): EyeGesture | null {
  if (kps.length < 400) return null;
  const earL = earFromIndices(kps, LEFT_EAR_IDX);
  const earR = earFromIndices(kps, RIGHT_EAR_IDX);
  if (earL == null && earR == null) return null;
  const earAvg = earL != null && earR != null ? (earL + earR) / 2 : (earL ?? earR)!;
  const eyesClosed = earAvg < EAR_CLOSED;

  const ratioL = irisRatio(kps, LEFT_IRIS, LEFT_EYE_H, LEFT_EYE_V);
  const ratioR = irisRatio(kps, RIGHT_IRIS, RIGHT_EYE_H, RIGHT_EYE_V);
  let gazeH: GazeDirection = 'center';
  let gazeV: GazeDirection = 'center';
  if (ratioL && ratioR) {
    const h = (ratioL.h + ratioR.h) / 2;
    const v = (ratioL.v + ratioR.v) / 2;
    ({ gazeH, gazeV } = classifyGaze(h, v));
  } else if (ratioL) {
    ({ gazeH, gazeV } = classifyGaze(ratioL.h, ratioL.v));
  } else if (ratioR) {
    ({ gazeH, gazeV } = classifyGaze(ratioR.h, ratioR.v));
  }

  return {
    earAvg: Math.round(earAvg * 1000) / 1000,
    eyesClosed,
    gazeH,
    gazeV,
    nhan: buildEyeNhan(gazeH, gazeV, eyesClosed),
  };
}

/** Vùng cắt đầu từ keypoint MoveNet (nose/mắt/tai) — chuẩn hoá 0..1. */
function headCropNorm(kps: FocusKeypoint[]): { x: number; y: number; w: number; h: number } | null {
  const headIdx = [0, 1, 2, 3, 4];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let n = 0;
  for (const i of headIdx) {
    const k = kps[i];
    if (!k || (k.score ?? 0) < MIN_KP) continue;
    minX = Math.min(minX, k.x);
    minY = Math.min(minY, k.y);
    maxX = Math.max(maxX, k.x);
    maxY = Math.max(maxY, k.y);
    n += 1;
  }
  if (n < 2 || !Number.isFinite(minX)) return null;
  const padX = 0.06;
  const padY = 0.08;
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const w = Math.min(1 - x, maxX - minX + padX * 2);
  const h = Math.min(1 - y, maxY - minY + padY * 2.5);
  if (w < 0.04 || h < 0.04) return null;
  return { x, y, w, h };
}

/**
 * Phân tích cử chỉ mắt cho các track ổn định — tối đa 6 người/khung để giữ realtime.
 * Trả Map trackId → EyeGesture.
 */
export async function analyzeEyeGesturesForTracks(
  source: HTMLVideoElement | HTMLImageElement,
  tracks: FocusNormBox[],
  srcW: number,
  srcH: number,
  maxFaces = 6,
): Promise<Map<number, EyeGesture>> {
  const out = new Map<number, EyeGesture>();
  const det = await ensureFaceMeshDetector();
  if (!det) return out;

  const candidates = tracks
    .filter((t) => !t.lost && t.id != null && t.keypoints && t.keypoints.length >= 5)
    .slice(0, maxFaces);

  if (candidates.length === 0) return out;

  const canvas = getCropCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) return out;

  for (const track of candidates) {
    const crop = headCropNorm(track.keypoints!);
    if (!crop) continue;
    const tx = Math.round(crop.x * srcW);
    const ty = Math.round(crop.y * srcH);
    const tw = Math.round(crop.w * srcW);
    const th = Math.round(crop.h * srcH);
    if (tw < 32 || th < 32) continue;

    const scale = Math.max(1, 192 / Math.max(tw, th));
    canvas.width = Math.round(tw * scale);
    canvas.height = Math.round(th * scale);
    try {
      ctx.drawImage(source, tx, ty, tw, th, 0, 0, canvas.width, canvas.height);
    } catch {
      continue;
    }

    let faces: RawFace[];
    try {
      faces = await det.estimateFaces(canvas, { flipHorizontal: false, staticImageMode: true });
    } catch {
      continue;
    }
    const face = faces[0];
    if (!face?.keypoints?.length) continue;
    const gesture = analyzeFaceKeypoints(face.keypoints);
    if (gesture && track.id != null) out.set(track.id, gesture);
  }

  return out;
}

/** Suy hành vi tin cậy hơn khi có dữ liệu mắt từ Face Mesh. */
export function refineBehaviorWithEyeGesture(
  poseLabel: import('./focusDetectionsStorage').BehaviorLabel,
  poseNhan: string,
  eye: EyeGesture | null | undefined,
): { label: import('./focusDetectionsStorage').BehaviorLabel; nhan: string } {
  if (!eye) return { label: poseLabel, nhan: poseNhan };

  if (eye.eyesClosed) {
    return { label: 'head_down', nhan: 'Mắt nhắm · có thể ngủ gật' };
  }
  if (eye.gazeV === 'down' && poseLabel !== 'phone' && poseLabel !== 'raise_hand') {
    return { label: 'head_down', nhan: 'Mắt nhìn xuống · không theo bảng' };
  }
  if ((eye.gazeH === 'left' || eye.gazeH === 'right') && poseLabel !== 'raise_hand') {
    const side = eye.gazeH === 'left' ? 'trái' : 'phải';
    return { label: 'turn_away', nhan: `Mắt lia sang ${side} · không nhìn bảng` };
  }
  if (eye.gazeH === 'center' && eye.gazeV === 'center' && poseLabel === 'turn_away') {
    return { label: 'focus', nhan: 'Mắt thẳng · đang tập trung' };
  }
  if (poseLabel === 'focus') {
    return { label: 'focus', nhan: `Tập trung · ${eye.nhan}` };
  }
  return { label: poseLabel, nhan: `${poseNhan} · ${eye.nhan}` };
}
