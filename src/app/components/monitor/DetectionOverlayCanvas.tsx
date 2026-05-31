import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getFocusDetections,
  subscribeFocusDetections,
  type BehaviorLabel,
  type FocusKeypoint,
  type FocusNormBox,
} from '../../lib/focusDetectionsStorage';

type Props = { maLop: string };

/** Bảng màu cho 6 nhãn hành vi — đồng bộ với panel thống kê (tone Tailwind). */
const COLOR_BY_BEHAVIOR: Record<BehaviorLabel, { stroke: string; fill: string; label: string }> = {
  focus: { stroke: 'rgba(16,185,129,#A)', fill: 'rgba(16,185,129,#F)', label: 'Tập trung' },
  raise_hand: { stroke: 'rgba(59,130,246,#A)', fill: 'rgba(59,130,246,#F)', label: 'Giơ tay' },
  head_down: { stroke: 'rgba(245,158,11,#A)', fill: 'rgba(245,158,11,#F)', label: 'Cúi đầu' },
  turn_away: { stroke: 'rgba(249,115,22,#A)', fill: 'rgba(249,115,22,#F)', label: 'Quay sang' },
  phone: { stroke: 'rgba(239,68,68,#A)', fill: 'rgba(239,68,68,#F)', label: 'Điện thoại' },
  absent: { stroke: 'rgba(148,163,184,#A)', fill: 'rgba(148,163,184,#F)', label: 'Vắng' },
  unknown: { stroke: 'rgba(100,116,139,#A)', fill: 'rgba(100,116,139,#F)', label: 'Đang đánh giá' },
};

function colorFor(b: FocusNormBox, alpha: number) {
  const beh = (b.hanhVi as BehaviorLabel | undefined) ?? 'unknown';
  const c = COLOR_BY_BEHAVIOR[beh] ?? COLOR_BY_BEHAVIOR.unknown;
  const s = c.stroke.replace('#A', String(0.95 * alpha));
  const f = c.fill.replace('#F', String(0.12 * alpha));
  return { stroke: s, fill: f, label: c.label };
}

/** Cạnh nối keypoint theo định nghĩa COCO 17 điểm — dùng vẽ skeleton mờ. */
const SKELETON_EDGES: Array<[number, number]> = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // vai – tay
  [5, 11], [6, 12], [11, 12],               // thân
  [11, 13], [13, 15], [12, 14], [14, 16],   // chân
  [0, 1], [0, 2], [1, 3], [2, 4],           // đầu
];

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  kps: FocusKeypoint[],
  alpha: number,
) {
  if (kps.length < 5) return;
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.0015);
  ctx.strokeStyle = `rgba(255,255,255,${0.55 * alpha})`;
  for (const [a, b] of SKELETON_EDGES) {
    const ka = kps[a];
    const kb = kps[b];
    if (!ka || !kb) continue;
    if ((ka.score ?? 0) < 0.3 || (kb.score ?? 0) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(ka.x * w, ka.y * h);
    ctx.lineTo(kb.x * w, kb.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${0.7 * alpha})`;
  const r = Math.max(1.2, Math.min(w, h) * 0.0035);
  for (const k of kps) {
    if ((k.score ?? 0) < 0.35) continue;
    ctx.beginPath();
    ctx.arc(k.x * w, k.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoxes(ctx: CanvasRenderingContext2D, w: number, h: number, boxes: FocusNormBox[]) {
  ctx.clearRect(0, 0, w, h);
  const fontPx = Math.max(10, Math.round(Math.min(w, h) * 0.026));
  ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
  for (const b of boxes) {
    const x = b.x * w;
    const y = b.y * h;
    const bw = b.w * w;
    const bh = b.h * h;
    const alpha = b.lost ? 0.5 : 1;
    const c = colorFor(b, alpha);

    ctx.strokeStyle = c.stroke;
    ctx.fillStyle = c.fill;
    ctx.lineWidth = Math.max(1.4, Math.min(w, h) * 0.0028);
    if (b.lost) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeRect(x, y, bw, bh);
    ctx.setLineDash([]);

    if (b.keypoints && b.keypoints.length > 0) {
      drawSkeleton(ctx, w, h, b.keypoints, alpha);
    }

    const idPart = b.id != null ? `#${b.id} ` : '';
    const scorePart = b.score != null ? ` · ${(b.score * 100).toFixed(0)}%` : '';
    const labelText = `${idPart}${b.hanhViNhan || c.label}${scorePart}`;
    const tw = ctx.measureText(labelText).width;
    const labelY = y - fontPx - 4 >= 0 ? y - fontPx - 4 : y + 2;
    ctx.fillStyle = `rgba(0,0,0,${0.78 * alpha})`;
    ctx.fillRect(x, labelY, tw + 8, fontPx + 4);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText(labelText, x + 4, labelY + fontPx);
  }
}

export default function DetectionOverlayCanvas({ maLop }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rev, setRev] = useState(0);

  const paint = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !maLop.trim()) return;
    const payload = getFocusDetections(maLop);
    const boxes = payload?.boxes ?? [];
    const { clientWidth: cw, clientHeight: ch } = wrap;
    if (cw < 2 || ch < 2) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoxes(ctx, cw, ch, boxes);
  }, [maLop]);

  useEffect(() => {
    return subscribeFocusDetections(() => setRev((r) => r + 1));
  }, []);

  useEffect(() => {
    paint();
  }, [maLop, paint, rev]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  if (!maLop.trim()) return null;

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none z-[5]">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />
    </div>
  );
}
