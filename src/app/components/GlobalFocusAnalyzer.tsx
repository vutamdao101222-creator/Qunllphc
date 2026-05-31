/**
 * Phân tích nền toàn cục cho NHIỀU LỚP cùng lúc.
 *
 * Mỗi lớp đang có bind ở `FocusMonitorBind` (mã lớp → nguồn) sẽ:
 *   - Có 1 phần tử video/img ẨN tự phát.
 *   - Có 1 vòng lặp 2.5s chạy MoveNet single-tile → lưu kết quả vào FocusDetections.
 *
 * Khi user đang ở trang Roboflow và chọn đúng lớp đó (ACTIVE_KEY ghi gần đây),
 * lớp đó được bỏ qua để tránh chạy 2 lần — trang sẽ tự xử lý chu kỳ riêng.
 */

import { useEffect, useRef, useState } from 'react';
import {
  getAllFocusMonitorBinds,
  subscribeFocusMonitorBind,
  saveFocusClassSnapshot,
  type FocusMonitorBind,
} from '../lib/focusSnapshotStorage';
import { saveFocusDetections } from '../lib/focusDetectionsStorage';
import { persistFocusAnalysisToServer } from '../lib/focusPersist';
import {
  analyzeBehaviorOnFrame,
  createBehaviorState,
  ensurePoseDetector,
  type BehaviorState,
} from '../lib/behaviorAnalyzer';

const ACTIVE_KEY_PREFIX = 'edu_focus_local_active__';
const INTERVAL_MS = 2500;

function isLocalActive(maLop: string): boolean {
  try {
    const v = sessionStorage.getItem(ACTIVE_KEY_PREFIX + maLop);
    if (!v) return false;
    const ts = Number(v);
    return Number.isFinite(ts) && Date.now() - ts < 4000;
  } catch {
    return false;
  }
}

function captureVideoToDataUrl(v: HTMLVideoElement): string | null {
  if (!v.videoWidth || !v.videoHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(640, v.videoWidth);
  canvas.height = Math.round((canvas.width / v.videoWidth) * v.videoHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return null;
  }
}

function captureImgToDataUrl(img: HTMLImageElement): string | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(640, img.naturalWidth);
  canvas.height = Math.round((canvas.width / img.naturalWidth) * img.naturalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return null;
  }
}

/** Worker phân tích cho 1 lớp — gắn lên 1 phần tử (img/video) ẩn. */
function ClassAnalyzer({ bind }: { bind: FocusMonitorBind }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<BehaviorState | null>(null);
  const busyRef = useRef(false);
  const ml = bind.maLop;

  useEffect(() => {
    stateRef.current = createBehaviorState();
  }, [ml, bind.mode]);

  useEffect(() => {
    if (!ml || bind.mode === 'none') return;
    let stopped = false;
    void ensurePoseDetector().catch(() => {
      /* ignore */
    });

    const tick = async () => {
      if (stopped || busyRef.current) return;
      if (isLocalActive(ml)) return;
      let el: HTMLVideoElement | HTMLImageElement | null = null;
      if (bind.mode === 'mjpeg') el = imgRef.current;
      else el = videoRef.current;
      if (!el) return;
      if (el instanceof HTMLVideoElement && (!el.videoWidth || !el.videoHeight)) return;
      if (el instanceof HTMLImageElement && (!el.complete || !el.naturalWidth)) return;
      busyRef.current = true;
      try {
        if (!stateRef.current) stateRef.current = createBehaviorState();
        const r = await analyzeBehaviorOnFrame(el, stateRef.current, {
          minAgeToShow: 1,
          multiTile: true,
          hybridCoco: true,
        });
        if (stopped) return;
        saveFocusDetections(ml, {
          boxes: r.boxes,
          phanTich: r.phanTich,
          summary: r.summary,
          at: new Date().toISOString(),
        });
        void persistFocusAnalysisToServer(ml, {
          concentrationLevel: r.phanTich.chiSoTapTrungUocLuong ?? 0,
          presentCount: r.boxes.filter((b) => !b.lost).length,
          summary: r.summary,
          phanTich: r.phanTich,
          behaviorCounts: r.phanTich.hanhVi,
          source: 'browser_ai',
        });
        const snap =
          el instanceof HTMLVideoElement
            ? captureVideoToDataUrl(el)
            : captureImgToDataUrl(el);
        if (snap) saveFocusClassSnapshot(ml, snap);
      } catch {
        /* ignore */
      } finally {
        busyRef.current = false;
      }
    };

    // Chạy lệch nhau theo hash mã lớp → 2 lớp không bắt đầu cùng millisecond.
    const offset = (Math.abs(ml.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 1000) + 500;
    const kick = window.setTimeout(() => void tick(), offset);
    const iv = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(kick);
      window.clearInterval(iv);
    };
  }, [ml, bind.mode, bind.httpUrl, bind.blobUrl]);

  const hidden: React.CSSProperties = {
    position: 'fixed',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
    left: -9999,
    top: -9999,
  };

  if (bind.mode === 'mjpeg' && bind.httpUrl) {
    return (
      <img
        ref={imgRef}
        src={bind.httpUrl}
        crossOrigin="anonymous"
        style={hidden}
        alt=""
        aria-hidden
      />
    );
  }
  if (bind.mode === 'http' && bind.httpUrl) {
    return (
      <video
        ref={videoRef}
        src={bind.httpUrl}
        crossOrigin="anonymous"
        autoPlay
        muted
        loop
        playsInline
        style={hidden}
        aria-hidden
      />
    );
  }
  if (bind.mode === 'blob' && bind.blobUrl?.startsWith('blob:')) {
    return (
      <video
        ref={videoRef}
        src={bind.blobUrl}
        autoPlay
        muted
        loop
        playsInline
        style={hidden}
        aria-hidden
      />
    );
  }
  return null;
}

export default function GlobalFocusAnalyzer() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeFocusMonitorBind(() => setTick((t) => t + 1)), []);

  const all = getAllFocusMonitorBinds();
  const list = Object.values(all).filter((b) => b.mode !== 'none');
  if (list.length === 0) return null;

  return (
    <>
      {list.map((b) => (
        <ClassAnalyzer key={b.maLop + ':' + b.mode + ':' + (b.httpUrl || b.blobUrl || '')} bind={b} />
      ))}
    </>
  );
}

/**
 * Heartbeat từ FocusMonitorPage — báo "lớp này đang được tôi xử lý ở foreground".
 * Analyzer toàn cục sẽ bỏ qua maLop được đánh dấu để khỏi chạy đôi.
 */
export function bumpFocusLocalActive(maLop: string) {
  if (!maLop) return;
  try {
    sessionStorage.setItem(ACTIVE_KEY_PREFIX + maLop, String(Date.now()));
  } catch {
    /* ignore */
  }
}
