/**
 * Phân tích hành vi học sinh từ video/MJPEG bằng MoveNet MultiPose (TF.js, chạy trong trình duyệt).
 *
 * Pipeline 1 khung:
 *   1) MoveNet MultiPose → ≤ 6 pose / khung, mỗi pose có bbox + 17 keypoint COCO.
 *   2) Lọc pose có ít keypoint score cao (loại cây/rèm/nhân vật-ma do COCO‑SSD lỗi).
 *   3) Tracker IOU → gán ID ổn định, smoothing, theo dõi vắng chỗ (track mất > N giây).
 *   4) Face Mesh trên vùng đầu → EAR (mắt nhắm) + hướng nhìn iris (lia mắt / nhìn xuống).
 *   5) Suy ra 1 trong các nhãn hành vi: focus / head_down / turn_away / raise_hand / phone / absent.
 *   6) Trả về `boxes` (kèm `hanhVi`, `keypoints`, `cuChiMat`) và `phanTich` để overlay & panel hiển thị.
 *
 * Heuristic được hiệu chỉnh cho lớp học (đầu trên, chân dưới, học sinh ngồi đối diện camera).
 * Mỗi hành vi được tính trên KEYPOINT, không phải bbox — nên ổn định trong nhiều góc camera.
 */
import type {
  BehaviorCounts,
  BehaviorLabel,
  FocusKeypoint,
  FocusNormBox,
  FocusPhanTichPayload,
} from './focusDetectionsStorage';
import { detectPeopleBoxesOnFrame } from './cocoSsdDetector';
import { analyzeEyeGesturesForTracks, refineBehaviorWithEyeGesture } from './faceEyeAnalyzer';

const MIN_KP_SCORE = 0.25;

/** Đối tượng pose-detector (MoveNet MultiPose) — chỉ load 1 lần. */
type RawKeypoint = { x: number; y: number; score?: number; name?: string };
type RawPose = {
  keypoints: RawKeypoint[];
  score?: number;
  box?: { yMin: number; xMin: number; yMax: number; xMax: number; width: number; height: number };
};
type PoseDetector = {
  estimatePoses: (
    el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    opts?: { maxPoses?: number; flipHorizontal?: boolean },
  ) => Promise<RawPose[]>;
};

/** Canvas dùng chung cho việc tile-crop — tạo 1 lần, đỡ tốn bộ nhớ. */
let tileCanvas: HTMLCanvasElement | null = null;
function getTileCanvas(): HTMLCanvasElement {
  if (!tileCanvas) tileCanvas = document.createElement('canvas');
  return tileCanvas;
}

let detectorPromise: Promise<PoseDetector> | null = null;
let loadFailedReason: string | null = null;

/** Tải MoveNet MultiPose 1 lần — model nhẹ, đủ realtime ở 5–8 FPS trên CPU laptop. */
export function ensurePoseDetector(): Promise<PoseDetector> {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    try {
      await import('@tensorflow/tfjs');
      const pose = await import('@tensorflow-models/pose-detection');
      const detector = await pose.createDetector(pose.SupportedModels.MoveNet, {
        modelType: pose.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableTracking: false,
        minPoseScore: 0.12, // ngưỡng thấp — bắt thêm học sinh xa / chỉ thấy đầu–vai
      });
      return detector as unknown as PoseDetector;
    } catch (e) {
      loadFailedReason = e instanceof Error ? e.message : String(e);
      detectorPromise = null;
      throw e;
    }
  })();
  return detectorPromise;
}

/* ────────────────────── Multi-tile pose detection ──────────────────────
 * MoveNet MultiPose chỉ detect tối đa 6 pose/lượt. Lớp 20–30 người cần chia
 * khung thành nhiều vùng chồng nhau, chạy MoveNet trên từng vùng, rồi map
 * keypoint về toạ độ ảnh gốc và NMS để khử trùng lặp.
 *
 * Cấu hình tile được chọn cho phòng học điển hình:
 *   - Full frame (bắt người đứng/ngồi gần camera)
 *   - Left/Right 60% (bắt 2 dãy bàn)
 *   - Top 60% (bắt hàng cuối phòng học)
 *   - 4 quadrant (top-left, top-right, bottom-left, bottom-right) — bắt cụm nhỏ
 */
type Tile = { x: number; y: number; w: number; h: number };

/** Tile chồng nhau — full + 2 nửa ngang + trên/dưới + 4 góc + cột giữa (lớp 20–35 em). */
const DEFAULT_TILES: Tile[] = [
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

const MIN_TILE_INFER_PX = 480;

async function detectPosesOnTile(
  det: PoseDetector,
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  tile: Tile,
): Promise<RawPose[]> {
  const tw = Math.round(tile.w * srcW);
  const th = Math.round(tile.h * srcH);
  if (tw < 48 || th < 48) return [];
  if (tile.x === 0 && tile.y === 0 && tile.w === 1 && tile.h === 1) {
    return await det.estimatePoses(source, { maxPoses: 6, flipHorizontal: false });
  }
  const tx = Math.round(tile.x * srcW);
  const ty = Math.round(tile.y * srcH);
  const scale = Math.max(1, MIN_TILE_INFER_PX / Math.max(tw, th));
  const cw = Math.round(tw * scale);
  const ch = Math.round(th * scale);
  const canvas = getTileCanvas();
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  try {
    ctx.drawImage(source, tx, ty, tw, th, 0, 0, cw, ch);
  } catch {
    return [];
  }
  const poses = await det.estimatePoses(canvas, { maxPoses: 6, flipHorizontal: false });
  const inv = 1 / scale;
  for (const p of poses) {
    for (const k of p.keypoints) {
      k.x = tx + k.x * inv;
      k.y = ty + k.y * inv;
    }
    if (p.box) {
      p.box = {
        xMin: tx + p.box.xMin * inv,
        yMin: ty + p.box.yMin * inv,
        xMax: tx + p.box.xMax * inv,
        yMax: ty + p.box.yMax * inv,
        width: p.box.width * inv,
        height: p.box.height * inv,
      };
    }
  }
  return poses;
}

/**
 * Bbox của pose dựa trên keypoint tin cậy (>= 0.3). Trả về bbox chuẩn hoá [0..1].
 * Dùng để IOU dedupe — nhanh và chính xác hơn so với centroid keypoint.
 */
function poseBoundingBox(p: RawPose, srcW: number, srcH: number): null | { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let n = 0;
  for (const k of p.keypoints) {
    if ((k.score ?? 0) < MIN_KP_SCORE) continue;
    const nx = k.x / srcW;
    const ny = k.y / srcH;
    if (nx < minX) minX = nx;
    if (ny < minY) minY = ny;
    if (nx > maxX) maxX = nx;
    if (ny > maxY) maxY = ny;
    n += 1;
  }
  if (n === 0 || !Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
}

function iouBox(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const iw = Math.max(0, x2 - x1);
  const ih = Math.max(0, y2 - y1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/** Hai pose chia sẻ vùng mặt (nose/mắt/tai) ⇒ chắc chắn cùng 1 người, kể cả khi bbox khác xa nhau. */
function headOverlap(a: RawPose, b: RawPose, srcW: number, srcH: number): boolean {
  const HEAD_IDX = [0, 1, 2, 3, 4]; // nose, leftEye, rightEye, leftEar, rightEar
  for (const ai of HEAD_IDX) {
    const ka = a.keypoints[ai];
    if (!ka || (ka.score ?? 0) < MIN_KP_SCORE) continue;
    for (const bi of HEAD_IDX) {
      const kb = b.keypoints[bi];
      if (!kb || (kb.score ?? 0) < MIN_KP_SCORE) continue;
      const dx = (ka.x - kb.x) / srcW;
      const dy = (ka.y - kb.y) / srcH;
      // ≤ 4% chiều rộng/cao khung — đầu của 2 người KHÔNG BAO GIỜ gần đến mức đó.
      if (Math.sqrt(dx * dx + dy * dy) <= 0.04) return true;
    }
  }
  return false;
}

/** Tâm bbox khoảng cách rất gần (đề phòng pose không có head keypoint nào). */
function centerProximity(a: RawPose, b: RawPose, srcW: number, srcH: number): boolean {
  const ba = poseBoundingBox(a, srcW, srcH);
  const bb = poseBoundingBox(b, srcW, srcH);
  if (!ba || !bb) return false;
  const cxA = ba.x + ba.w / 2;
  const cyA = ba.y + ba.h / 2;
  const cxB = bb.x + bb.w / 2;
  const cyB = bb.y + bb.h / 2;
  const sz = Math.max(ba.w, ba.h, bb.w, bb.h, 0.05);
  const dx = cxA - cxB;
  const dy = cyA - cyB;
  // Tâm 2 bbox cách < 30% kích thước người lớn nhất ⇒ trùng người (ngồi cạnh nhau cũng cách ≥ 50%).
  return Math.sqrt(dx * dx + dy * dy) < sz * 0.3;
}

/**
 * NMS pose mạnh hơn: 3 lớp dedupe (bbox IOU + head proximity + center proximity).
 * Giữ pose có nhiều keypoint tin cậy nhất khi gặp trùng → ưu tiên full-body trên face-only.
 */
function nmsPoses(poses: RawPose[], srcW: number, srcH: number): RawPose[] {
  const enriched = poses.map((p) => {
    const bb = poseBoundingBox(p, srcW, srcH);
    return {
      pose: p,
      box: bb,
      goodCount: p.keypoints.filter((k) => (k.score ?? 0) >= MIN_KP_SCORE).length,
      area: bb ? bb.w * bb.h : 0,
      avgScore: p.score ?? 0,
    };
  });
  enriched.sort(
    (a, b) =>
      b.goodCount * 2 + b.area * 1.2 + b.avgScore - (a.goodCount * 2 + a.area * 1.2 + a.avgScore),
  );
  const kept: typeof enriched = [];
  for (const cur of enriched) {
    let dup = false;
    for (const k of kept) {
      if (headOverlap(cur.pose, k.pose, srcW, srcH)) {
        dup = true;
        break;
      }
      if (cur.box && k.box && iouBox(cur.box, k.box) > 0.32) {
        dup = true;
        break;
      }
      if (centerProximity(cur.pose, k.pose, srcW, srcH)) {
        dup = true;
        break;
      }
    }
    if (!dup) kept.push(cur);
  }
  return kept.map((k) => k.pose);
}

export function getPoseDetectorLoadError(): string | null {
  return loadFailedReason;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/* ────────────────────── Tracker (gán ID, smoothing, vắng) ────────────────────── */

type Track = FocusNormBox & {
  id: number;
  ageFrames: number;
  lostFrames: number;
  /** Mốc lần đầu tiên track xuất hiện (ms epoch) — dùng để tính độ ổn định. */
  firstSeenAt: number;
  /** Mốc lần cuối tracker thấy track (ms epoch) — dùng để xác định vắng chỗ. */
  lastSeenAt: number;
};

export interface BehaviorState {
  nextId: number;
  tracks: Track[];
  /** Bộ nhớ vùng ghế "đã từng có người" để phát hiện vắng chỗ. Lưu maps id → vùng. */
  seatHistory: Map<number, { x: number; y: number; w: number; h: number; lastSeenAt: number }>;
}

export function createBehaviorState(): BehaviorState {
  return { nextId: 1, tracks: [], seatHistory: new Map() };
}

function iou(a: FocusNormBox, b: FocusNormBox): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const ua = a.w * a.h + b.w * b.h - inter;
  return ua > 0 ? inter / ua : 0;
}

const SMOOTH_OLD = 0.5;
const SMOOTH_NEW = 0.5;
const IOU_MATCH_THR = 0.25;
const MAX_LOST_FRAMES = 2;
const MIN_AGE_TO_SHOW = 2; // vẽ sớm hơn — lớp đông cần thấy người mới trong 2 khung
const ABSENT_MS_THRESHOLD = 10_000; // ghế vắng quá 10s tính là 'absent'

function trackAndSmooth(state: BehaviorState, fresh: FocusNormBox[], nowMs: number): FocusNormBox[] {
  const used = new Set<number>();
  const next: Track[] = [];

  for (const f of fresh) {
    let bestI = -1;
    let bestIou = IOU_MATCH_THR;
    for (let i = 0; i < state.tracks.length; i += 1) {
      const t = state.tracks[i];
      if (used.has(t.id)) continue;
      const o = iou(t, f);
      if (o > bestIou) {
        bestIou = o;
        bestI = i;
      }
    }
    if (bestI >= 0) {
      const t = state.tracks[bestI];
      used.add(t.id);
      next.push({
        ...f,
        x: t.x * SMOOTH_OLD + f.x * SMOOTH_NEW,
        y: t.y * SMOOTH_OLD + f.y * SMOOTH_NEW,
        w: t.w * SMOOTH_OLD + f.w * SMOOTH_NEW,
        h: t.h * SMOOTH_OLD + f.h * SMOOTH_NEW,
        id: t.id,
        ageFrames: t.ageFrames + 1,
        lostFrames: 0,
        firstSeenAt: t.firstSeenAt,
        lastSeenAt: nowMs,
        lost: false,
      });
    } else {
      next.push({
        ...f,
        id: state.nextId++,
        ageFrames: 1,
        lostFrames: 0,
        firstSeenAt: nowMs,
        lastSeenAt: nowMs,
        lost: false,
      });
    }
  }

  // Carry box mất tạm — vài khung không thấy nhưng đã ổn định, giữ tránh nháy.
  for (const t of state.tracks) {
    if (used.has(t.id)) continue;
    if (t.ageFrames < MIN_AGE_TO_SHOW) continue;
    if (t.lostFrames >= MAX_LOST_FRAMES) continue;
    next.push({
      ...t,
      lostFrames: t.lostFrames + 1,
      lost: true,
    });
  }

  state.tracks = next;

  // Cập nhật seatHistory để biết người này từng ngồi vùng nào — dùng cho vắng chỗ về sau.
  for (const t of next) {
    if (!t.lost && t.ageFrames >= MIN_AGE_TO_SHOW) {
      state.seatHistory.set(t.id, { x: t.x, y: t.y, w: t.w, h: t.h, lastSeenAt: nowMs });
    }
  }

  return next;
}

/* ────────────────────── Suy hành vi từ keypoints ────────────────────── */

const KP = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
} as const;

function pt(kps: FocusKeypoint[], i: number): FocusKeypoint | null {
  const k = kps[i];
  if (!k) return null;
  if ((k.score ?? 0) < MIN_KP_SCORE) return null;
  return k;
}

/** Suy 1 trong 5 hành vi (chưa kể `absent` tính ở vòng ngoài). */
function inferBehaviorFromKeypoints(kps: FocusKeypoint[]): { label: BehaviorLabel; nhan: string } {
  const nose = pt(kps, KP.nose);
  const lSh = pt(kps, KP.leftShoulder);
  const rSh = pt(kps, KP.rightShoulder);
  const lEar = pt(kps, KP.leftEar);
  const rEar = pt(kps, KP.rightEar);
  const lW = pt(kps, KP.leftWrist);
  const rW = pt(kps, KP.rightWrist);
  const lH = pt(kps, KP.leftHip);
  const rH = pt(kps, KP.rightHip);

  // Không đủ thông tin để kết luận → giữ 'focus' (an toàn, không cảnh báo nhầm).
  if (!nose && (!lSh || !rSh)) return { label: 'unknown', nhan: 'Chưa rõ tư thế' };

  const shY = lSh && rSh ? (lSh.y + rSh.y) / 2 : (lSh?.y ?? rSh?.y ?? 0);
  const shX = lSh && rSh ? (lSh.x + rSh.x) / 2 : (lSh?.x ?? rSh?.x ?? 0);
  const shWidth = lSh && rSh ? Math.max(0.001, Math.abs(lSh.x - rSh.x)) : 0.05;
  const hipY = lH && rH ? (lH.y + rH.y) / 2 : null;
  const torsoHeight = hipY != null ? Math.max(0.001, hipY - shY) : 0.2;

  // (1) Giơ tay: cổ tay cao hơn vai > 5% chiều cao ảnh.
  const wristAboveShoulder =
    (lW && lW.y < shY - 0.05) || (rW && rW.y < shY - 0.05);
  if (wristAboveShoulder) return { label: 'raise_hand', nhan: 'Giơ tay phát biểu' };

  // (2) Dùng điện thoại: cổ tay nằm gần mặt (trong vùng nửa trên thân) + đầu cúi nhẹ.
  if (nose) {
    const handNearFace =
      (lW && Math.abs(lW.x - nose.x) < shWidth * 1.0 && lW.y > nose.y - 0.02 && lW.y < shY) ||
      (rW && Math.abs(rW.x - nose.x) < shWidth * 1.0 && rW.y > nose.y - 0.02 && rW.y < shY);
    const noseBelowShoulderMid = nose.y > shY - 0.02;
    if (handNearFace && noseBelowShoulderMid) {
      return { label: 'phone', nhan: 'Có thể đang dùng điện thoại' };
    }
  }

  // (3) Cúi đầu: mũi rơi xuống quá vai (theo trục y), tức học sinh nhìn xuống bàn / ngủ gật.
  // Ngưỡng: nose.y > shoulder.y + 30% torso.
  if (nose && nose.y > shY + 0.3 * torsoHeight) {
    return { label: 'head_down', nhan: 'Cúi đầu / không nhìn lên' };
  }

  // (4) Quay sang: nose lệch khỏi midpoint vai > 70% nửa độ rộng vai,
  //     HOẶC chỉ thấy 1 bên tai trong khi vai vẫn rõ.
  const noseOffCenter = nose ? Math.abs(nose.x - shX) > 0.7 * (shWidth / 2 + 0.02) : false;
  const oneEarVisible = (lEar && !rEar) || (rEar && !lEar);
  if (noseOffCenter || oneEarVisible) {
    return { label: 'turn_away', nhan: 'Quay sang / không nhìn bảng' };
  }

  // (5) Mặc định: tập trung (đầu thẳng, vai cân, tay không vung lên/đưa lên mặt).
  return { label: 'focus', nhan: 'Đang tập trung' };
}

/* ────────────────────── Chuyển raw pose → FocusNormBox ────────────────────── */

function poseToBox(
  pose: RawPose,
  srcW: number,
  srcH: number,
  opts: { minKeypoints?: number; minArea?: number; minAspect?: number } = {},
): FocusNormBox | null {
  const MIN_KP = opts.minKeypoints ?? 2;
  const MIN_AREA = opts.minArea ?? 0.0025;
  const MIN_ASPECT = opts.minAspect ?? 0.45;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const norm: FocusKeypoint[] = [];
  let goodCount = 0;
  for (const k of pose.keypoints) {
    const nx = k.x / srcW;
    const ny = k.y / srcH;
    norm.push({ x: clamp01(nx), y: clamp01(ny), score: k.score, name: k.name });
    if ((k.score ?? 0) >= MIN_KP_SCORE) {
      goodCount += 1;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx > maxX) maxX = nx;
      if (ny > maxY) maxY = ny;
    }
  }
  if (goodCount < MIN_KP) return null;
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;

  const padX = 0.015,
    padY = 0.04;
  const x = clamp01(minX - padX);
  const y = clamp01(minY - padY);
  const w = clamp01(Math.min(1 - x, maxX - minX + padX * 2));
  const h = clamp01(Math.min(1 - y, maxY - minY + padY * 2));

  if (h <= 0 || w <= 0) return null;
  if (h / w < MIN_ASPECT) return null;
  if (w * h < MIN_AREA) return null;

  return {
    x,
    y,
    w,
    h,
    label: 'person',
    score: Math.round((pose.score ?? 0.5) * 100) / 100,
    keypoints: norm,
  };
}

/** Gộp bbox COCO‑SSD cho người MoveNet bỏ sót (chỉ thấy đầu/vai, bị che bàn). */
async function mergeCocoPersonFallback(
  source: HTMLVideoElement | HTMLImageElement,
  poseBoxes: FocusNormBox[],
): Promise<FocusNormBox[]> {
  let coco: FocusNormBox[];
  try {
    coco = await detectPeopleBoxesOnFrame(source, 0.26);
  } catch {
    return poseBoxes;
  }
  const extra: FocusNormBox[] = [];
  for (const c of coco) {
    let best = 0;
    for (const p of poseBoxes) {
      best = Math.max(best, iou(c, p));
    }
    if (best >= 0.12) continue;
    extra.push({
      ...c,
      hanhVi: 'unknown',
      hanhViNhan: 'Đang đánh giá',
      trangThai: 'tap_trung',
    });
  }
  return extra.length ? [...poseBoxes, ...extra] : poseBoxes;
}

/* ────────────────────── API chính ────────────────────── */

export type BehaviorAnalyzeResult = {
  boxes: FocusNormBox[];
  phanTich: FocusPhanTichPayload;
  summary: string;
  /** Số người vắng (track quá hạn) — đính kèm để panel hiển thị. */
  vangChoCount: number;
};

/** Đếm số người ở mỗi hành vi tại khung hiện tại — phục vụ thanh thống kê. */
function countBehaviors(boxes: FocusNormBox[]): BehaviorCounts {
  const counts: BehaviorCounts = {};
  for (const b of boxes) {
    if (b.lost) continue;
    const l = b.hanhVi ?? 'unknown';
    counts[l] = (counts[l] ?? 0) + 1;
  }
  return counts;
}

/** Tổng hợp số người vắng từ seatHistory: ghế có lastSeenAt cũ hơn ngưỡng absent. */
function countAbsent(state: BehaviorState, currentTrackIds: Set<number>, nowMs: number): number {
  let absent = 0;
  for (const [id, seat] of state.seatHistory.entries()) {
    if (currentTrackIds.has(id)) continue;
    if (nowMs - seat.lastSeenAt > ABSENT_MS_THRESHOLD) absent += 1;
  }
  // Dọn rác: bỏ ghế quá cũ (> 5 phút) khỏi bộ nhớ.
  const TTL = 5 * 60_000;
  for (const [id, seat] of state.seatHistory.entries()) {
    if (nowMs - seat.lastSeenAt > TTL) state.seatHistory.delete(id);
  }
  return absent;
}

const TT_FROM_BEHAVIOR: Record<BehaviorLabel, 'tap_trung' | 'kem_tap_trung'> = {
  focus: 'tap_trung',
  raise_hand: 'tap_trung',
  head_down: 'kem_tap_trung',
  turn_away: 'kem_tap_trung',
  phone: 'kem_tap_trung',
  absent: 'kem_tap_trung',
  unknown: 'tap_trung',
};

const NHAN_FROM_BEHAVIOR: Record<BehaviorLabel, string> = {
  focus: 'Tập trung',
  raise_hand: 'Giơ tay',
  head_down: 'Cúi đầu',
  turn_away: 'Quay sang',
  phone: 'Dùng điện thoại',
  absent: 'Vắng',
  unknown: 'Chưa rõ',
};

/**
 * Phân tích 1 khung video/MJPEG → trả về `boxes` (kèm hành vi & keypoint) + thống kê.
 * @param opts.minAgeToShow Số khung liên tục tối thiểu mới vẽ box (default 3 cho live realtime;
 *                          trang phân tích thủ công nên dùng 1 để thấy ngay khung đầu).
 */
export async function analyzeBehaviorOnFrame(
  source: HTMLVideoElement | HTMLImageElement,
  state: BehaviorState,
  opts: { minAgeToShow?: number; multiTile?: boolean; hybridCoco?: boolean; eyeAnalysis?: boolean } = {},
): Promise<BehaviorAnalyzeResult> {
  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!srcW || !srcH) {
    return {
      boxes: [],
      phanTich: { tomTatDieuHanh: 'Nguồn chưa sẵn sàng — chờ vài giây.' },
      summary: 'Nguồn chưa sẵn sàng — chờ vài giây.',
      vangChoCount: 0,
    };
  }
  const det = await ensurePoseDetector();

  // Multi-tile mặc định BẬT — bắt được tới ~30 pose cho lớp đông. Tắt khi muốn realtime nhanh.
  const useMultiTile = opts.multiTile ?? true;
  const useHybridCoco = opts.hybridCoco ?? useMultiTile;
  let poses: RawPose[];
  if (useMultiTile) {
    const batches = await Promise.all(
      DEFAULT_TILES.map((tile) =>
        detectPosesOnTile(det, source as HTMLVideoElement | HTMLImageElement, srcW, srcH, tile),
      ),
    );
    poses = nmsPoses(batches.flat(), srcW, srcH);
  } else {
    poses = await det.estimatePoses(source, { maxPoses: 6, flipHorizontal: false });
  }

  const nowMs = Date.now();

  // Pose → box, lọc pose ảo (quá ít keypoint tin cậy).
  const fresh: FocusNormBox[] = [];
  for (const p of poses) {
    const b = poseToBox(p, srcW, srcH);
    if (b) fresh.push(b);
  }

  const mergedFresh = useHybridCoco
    ? await mergeCocoPersonFallback(source, fresh)
    : fresh;

  // Tracker: gán ID, smoothing.
  const tracked = trackAndSmooth(state, mergedFresh, nowMs);

  // Chỉ vẽ box đủ ổn định — bỏ track sơ sinh để khử nhiễu rèm cửa.
  const minAge = Math.max(1, opts.minAgeToShow ?? MIN_AGE_TO_SHOW);
  const stable = tracked.filter((t) => {
    const tt = t as Track;
    return tt.ageFrames >= minAge || tt.lost === true;
  });

  // Face Mesh: cử chỉ mắt trên track ổn định (tối đa 6 em/khung).
  const useEyeAnalysis = opts.eyeAnalysis ?? true;
  let eyeByTrack = new Map<number, import('./faceEyeAnalyzer').EyeGesture>();
  if (useEyeAnalysis) {
    try {
      eyeByTrack = await analyzeEyeGesturesForTracks(
        source,
        stable.filter((t) => !t.lost),
        srcW,
        srcH,
      );
    } catch {
      /* fallback MoveNet-only */
    }
  }

  // Suy hành vi cho từng box (pose + cử chỉ mắt).
  for (const b of stable) {
    if (b.lost) {
      b.hanhVi = b.hanhVi ?? 'unknown';
      b.hanhViNhan = b.hanhViNhan ?? 'Tạm mất';
      b.trangThai = b.trangThai ?? 'kem_tap_trung';
      continue;
    }
    if (!b.keypoints || b.keypoints.length === 0) {
      b.hanhVi = 'unknown';
      b.hanhViNhan = 'Chưa rõ tư thế';
      b.trangThai = 'tap_trung';
      continue;
    }
    const poseR = inferBehaviorFromKeypoints(b.keypoints);
    const trackId = (b as Track).id;
    const eye = trackId != null ? eyeByTrack.get(trackId) : undefined;
    if (eye) b.cuChiMat = eye;
    const r = refineBehaviorWithEyeGesture(poseR.label, poseR.nhan, eye);
    b.hanhVi = r.label;
    b.hanhViNhan = r.nhan;
    b.trangThai = TT_FROM_BEHAVIOR[r.label];
  }

  // Vắng chỗ: ghế có người trước đó nhưng không còn track hiện tại > ABSENT_MS_THRESHOLD.
  const currentIds = new Set<number>();
  for (const b of stable) {
    if (!b.lost && (b as Track).id != null) currentIds.add((b as Track).id);
  }
  const absent = countAbsent(state, currentIds, nowMs);

  const counts = countBehaviors(stable);
  if (absent > 0) counts.absent = absent;

  const presentCount = (stable.filter((x) => !x.lost)).length;
  const focusLikeCount = (counts.focus ?? 0) + (counts.raise_hand ?? 0);
  const pct = presentCount ? Math.round((focusLikeCount / presentCount) * 100) : 0;

  let ruiRo: string | undefined;
  if (presentCount === 0) {
    ruiRo = 'Chưa phát hiện học sinh nào — kiểm tra góc / độ sáng camera.';
  } else if ((counts.phone ?? 0) >= 2) {
    ruiRo = `Phát hiện ${counts.phone} em có dấu hiệu dùng điện thoại — nhắc nhở trực tiếp.`;
  } else if ((counts.head_down ?? 0) + (counts.turn_away ?? 0) >= Math.max(2, presentCount / 2)) {
    ruiRo = 'Quá nửa lớp đang cúi đầu hoặc quay sang — đổi nhịp giảng / tương tác.';
  } else if (absent >= 3) {
    ruiRo = `${absent} chỗ trống quá lâu (>10s) — điểm danh để cập nhật.`;
  }

  const detailParts: string[] = [];
  if (counts.focus) detailParts.push(`${counts.focus} tập trung`);
  if (counts.raise_hand) detailParts.push(`${counts.raise_hand} giơ tay`);
  if (counts.head_down) detailParts.push(`${counts.head_down} cúi đầu`);
  if (counts.turn_away) detailParts.push(`${counts.turn_away} quay sang`);
  if (counts.phone) detailParts.push(`${counts.phone} có thể dùng điện thoại`);
  if (absent) detailParts.push(`${absent} vắng chỗ`);

  const eyeNote = eyeByTrack.size > 0 ? ' · FaceMesh mắt' : '';
  const hybridNote = useHybridCoco ? ' · COCO+MoveNet' : '';
  const summary =
    presentCount === 0
      ? 'Chưa phát hiện học sinh nào trong khung.'
      : `Phát hiện ${presentCount} học sinh${hybridNote}${eyeNote} · ${pct}% tập trung — ${detailParts.join(', ') || 'phân loại đang khởi tạo'}.`;

  return {
    boxes: stable,
    phanTich: {
      tomTatDieuHanh: summary,
      chiSoTapTrungUocLuong: pct,
      ruiRo,
      khuyenNghi:
        presentCount === 0
          ? 'Chỉnh hướng camera, kiểm tra ánh sáng; mở rèm nếu cần.'
          : pct < 55
            ? 'Đổi hoạt động ngắn 3–5 phút (thảo luận đôi, câu hỏi nhanh) để lấy lại nhịp.'
            : pct < 75
              ? 'Lớp ổn định nhưng còn vài em mất tập trung — đi vòng giáo cụ hoặc nhắc tên.'
              : 'Lớp giữ nhịp tốt — duy trì tương tác, ghi nhận em giơ tay.',
      hanhVi: counts,
    },
    summary,
    vangChoCount: absent,
  };
}

export const BEHAVIOR_NHAN = NHAN_FROM_BEHAVIOR;
