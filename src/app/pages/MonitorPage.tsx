import React, { useState, useEffect, useLayoutEffect, useRef, useReducer } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router';
import {
  getFocusClassSnapshot,
  subscribeFocusSnapshots,
  getFocusMonitorBind,
  subscribeFocusMonitorBind,
} from '../lib/focusSnapshotStorage';
import { getFocusDetections, subscribeFocusDetections } from '../lib/focusDetectionsStorage';
import DetectionOverlayCanvas from '../components/monitor/DetectionOverlayCanvas';
import {
  fetchRealtimeClasses,
  fetchClass,
  getMonitorStreamUrl,
} from '../lib/api';
import { saveFocusDetections } from '../lib/focusDetectionsStorage';
import { persistFocusAnalysisToServer } from '../lib/focusPersist';
import {
  analyzeBehaviorOnFrame,
  createBehaviorState,
  ensurePoseDetector,
  type BehaviorState,
} from '../lib/behaviorAnalyzer';
import {
  CLASSES, LIVE_DATA, LiveData,
  getTeacher, getRoom, getConcentrationColor, getConcentrationLabel,
  getAlertLabel, getAlertStyle
} from '../data/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  ArrowLeft, Users, Activity, Clock, AlertTriangle,
  Wifi, WifiOff, Video, TrendingUp, TrendingDown,
  Volume2, VolumeX, Sparkles,
} from 'lucide-react';

function normalizeMaLop(s: string) {
  return String(s || '').trim().toUpperCase();
}

/** Khung nhận diện + phân tích từ trang Roboflow (cùng tab, đúng mã lớp). */
function AiFocusDetectionsPanel({ maLop }: { maLop: string }) {
  const key = normalizeMaLop(maLop);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeFocusDetections(bump), [bump]);
  if (!key) return null;
  const d = getFocusDetections(key);
  const hasData =
    (d?.boxes?.length ?? 0) > 0 || Boolean(d?.phanTich?.tomTatDieuHanh || d?.summary);
  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/90 p-4 text-sm text-gray-600">
        <div className="font-medium text-gray-800 mb-1 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600 shrink-0" />
          Phân tích AI trên khung hình
        </div>
        <p className="text-xs leading-relaxed">
          Chưa có kết quả nhận diện cho lớp <span className="font-mono">{key}</span>. Mở{' '}
          <Link
            to={`/monitor/focus/robo?maLop=${encodeURIComponent(key)}`}
            className="text-sky-600 hover:underline font-medium"
          >
            Roboflow · tập trung
          </Link>
          , chọn đúng mã lớp và chạy phân tích khung (hoặc bật phân tích tự động).
        </p>
      </div>
    );
  }
  const p = d?.phanTich;
  return (
    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
          <Sparkles size={16} className="text-emerald-600 shrink-0" />
          Phân tích AI · lớp {key}
        </div>
        {d?.at && (
          <span className="text-[10px] text-gray-500 font-mono shrink-0">
            {new Date(d.at).toLocaleString('vi-VN')}
          </span>
        )}
      </div>
      {(d?.summary || p?.tomTatDieuHanh) && (
        <p className="text-sm text-gray-800 leading-snug mb-3">{d.summary || p?.tomTatDieuHanh}</p>
      )}
      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        {typeof p?.chiSoTapTrungUocLuong === 'number' && (
          <div className="rounded-lg bg-white/80 border border-gray-100 px-2 py-1.5">
            <div className="text-gray-500">Chỉ số tập trung (ước lượng)</div>
            <div className="font-bold text-emerald-700">{p.chiSoTapTrungUocLuong}%</div>
          </div>
        )}
        {(d?.boxes?.length ?? 0) > 0 && (
          <div className="rounded-lg bg-white/80 border border-gray-100 px-2 py-1.5">
            <div className="text-gray-500">Thành viên trong khung</div>
            <div className="font-bold text-blue-700">{d!.boxes!.filter((b) => !b.lost).length}</div>
          </div>
        )}
      </div>

      {p?.hanhVi && Object.keys(p.hanhVi).length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[11px]">
          {([
            { key: 'focus', label: 'Tập trung', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            { key: 'raise_hand', label: 'Giơ tay', tone: 'bg-sky-100 text-sky-800 border-sky-200' },
            { key: 'head_down', label: 'Cúi đầu', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
            { key: 'turn_away', label: 'Quay sang', tone: 'bg-orange-100 text-orange-800 border-orange-200' },
            { key: 'phone', label: 'Điện thoại', tone: 'bg-red-100 text-red-800 border-red-200' },
            { key: 'absent', label: 'Vắng chỗ', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
          ] as const).map((row) => {
            const v = p.hanhVi?.[row.key] ?? 0;
            return (
              <div key={row.key} className={`rounded-md border px-2 py-1.5 ${row.tone} flex items-baseline justify-between gap-1`}>
                <span className="truncate">{row.label}</span>
                <span className="font-bold tabular-nums">{v}</span>
              </div>
            );
          })}
        </div>
      )}
      {p?.ruiRo && (
        <div className="mt-2 text-xs text-amber-900 bg-amber-50/80 border border-amber-100 rounded-lg px-2 py-1.5">
          <span className="font-medium">Rủi ro / lưu ý:</span> {p.ruiRo}
        </div>
      )}
      {p?.khuyenNghi && (
        <div className="mt-2 text-xs text-slate-800 bg-slate-100/80 border border-slate-200 rounded-lg px-2 py-1.5">
          <span className="font-medium">Khuyến nghị:</span> {p.khuyenNghi}
        </div>
      )}
    </div>
  );
}

function extractRealtimeList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { classes?: unknown }).classes)) {
    return (raw as { classes: any[] }).classes;
  }
  return [];
}

function findRealtimeRow(list: any[], classId: string) {
  const n = normalizeMaLop(classId);
  return list.find((x) => normalizeMaLop(x?.maLop ?? x?.classId) === n) ?? null;
}

/** Backend có thể trả isActive=false khi vẫn có BuoiHoc active nhưng chỉ số mới nhất chưa gắn đúng mã buổi — tránh danh sách trống sau khi điều hướng. */
function coerceLiveFromApiItem(item: any): LiveData {
  const sessionOn = Boolean(item?.maBuoiHocDangHoatDong);
  const effectiveActive = Boolean(item?.isActive) || sessionOn;
  const ma = item?.maLop ?? item?.classId ?? '';
  return {
    classId: ma,
    isActive: effectiveActive,
    currentStudents: Number(item.currentStudents) || 0,
    concentrationLevel: Number(item.concentrationLevel) || 0,
    sessionStart: '07:00',
    alertStatus: item.alertStatus ?? 'normal',
    last30MinConcentration: [],
    last30MinStudents: [],
    displayName: item.tenLop || undefined,
    displayTeacher: item.tenGiaoVien || undefined,
  };
}

function meaningfulApiSnapshot(raw: any) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw.thoiDiem) return true;
  const c = Number(raw.concentrationLevel);
  const p = Number(raw.currentStudents);
  return (Number.isFinite(c) && c > 0) || (Number.isFinite(p) && p > 0);
}

/** Giống tổng quan Dashboard: không có buổi đang học vẫn hiện các lớp + chỉ số gần nhất để không màn trắng. */
function monitorDisplayPool(remoteLiveRaw: any[]): LiveData[] {
  if (!remoteLiveRaw.length) {
    return LIVE_DATA;
  }
  const mapped = remoteLiveRaw.map(coerceLiveFromApiItem);
  const activeStrict = mapped.filter((l) => l.isActive);
  if (activeStrict.length > 0) {
    return activeStrict;
  }

  const withSnapshot = mapped.filter((_l, i) => meaningfulApiSnapshot(remoteLiveRaw[i]));
  const basis = withSnapshot.length > 0 ? remoteLiveRaw.filter((_r, i) => meaningfulApiSnapshot(remoteLiveRaw[i])).map(coerceLiveFromApiItem)
    : mapped;

  return basis.map((l) => ({
    ...l,
    isActive: true,
    snapshotOnly: true,
  }));
}

function computeAlertStatus(
  concentration: number,
  currentStudents: number,
  expectedStudents: number,
): 'normal' | 'low_concentration' | 'low_attendance' | 'late_start' {
  if (expectedStudents > 0 && currentStudents < Math.round(expectedStudents * 0.7)) return 'low_attendance';
  if (concentration < 60) return 'low_concentration';
  return 'normal';
}

function hasMeaningfulSnapshot(row: any | null) {
  if (!row) return false;
  if (row.thoiDiem) return true;
  const c = Number(row.concentrationLevel);
  const s = Number(row.currentStudents);
  return (Number.isFinite(c) && c > 0) || (Number.isFinite(s) && s > 0);
}

// Mini circular concentration indicator
function ConcentrationGauge({ value }: { value: number }) {
  const color = getConcentrationColor(value);
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={80} height={80} className="-rotate-90">
        <circle cx={40} cy={40} r={r} fill="none" stroke="#e5e7eb" strokeWidth={7} />
        <circle
          cx={40} cy={40} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-base font-bold" style={{ color }}>{value}%</div>
      </div>
    </div>
  );
}

/**
 * Phát file/URL đã gắn như luồng trực quan: không thanh tua, tự phát muted, chặn seek ngược.
 * Giao diện LIVE + AI để nhìn từ ngoài giống camera thật (thực chất là video + pipeline phân tích).
 */
/** Lưu vị trí phát theo `src` (sessionStorage) — giúp video tiếp tục đúng chỗ khi điều hướng quay lại. */
const VIDEO_POS_PREFIX = 'edu_video_pos_v1:';
function loadVideoPos(src: string): number {
  try {
    const v = sessionStorage.getItem(VIDEO_POS_PREFIX + src);
    if (!v) return 0;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
function saveVideoPos(src: string, t: number) {
  try {
    if (Number.isFinite(t) && t >= 0) {
      sessionStorage.setItem(VIDEO_POS_PREFIX + src, String(t));
    }
  } catch {
    /* sessionStorage có thể đầy — bỏ qua */
  }
}

function PseudoLiveBoundVideo({ src, inferMaLop }: { src: string; inferMaLop?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const inferBusyRef = useRef(false);
  const behaviorStateRef = useRef<BehaviorState | null>(null);
  const maxSeenRef = useRef(0);
  const lastSavedPosRef = useRef(0);
  const [muted, setMuted] = useState(true);
  const [aiStatus, setAiStatus] = useState<'loading' | 'idle' | 'running' | 'ok' | 'error'>('loading');
  const [aiCount, setAiCount] = useState<number>(0);
  const [aiFocusPct, setAiFocusPct] = useState<number>(0);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    maxSeenRef.current = 0;
    // Reset behavior tracker khi đổi nguồn video — ID + lịch sử ghế không còn ý nghĩa cross-source.
    behaviorStateRef.current = createBehaviorState();
  }, [src]);

  // Lưu / khôi phục vị trí phát.
  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;

    const resume = () => {
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      const saved = loadVideoPos(src);
      if (dur > 0 && saved > 0 && saved < dur - 2) {
        try {
          v.currentTime = saved;
          maxSeenRef.current = saved;
        } catch {
          /* ignore */
        }
      }
    };
    const onTime = () => {
      const t = v.currentTime;
      // Lưu mỗi ~1.5s để không spam sessionStorage.
      if (Math.abs(t - lastSavedPosRef.current) > 1.5) {
        lastSavedPosRef.current = t;
        saveVideoPos(src, t);
      }
    };
    const onPause = () => saveVideoPos(src, v.currentTime);
    v.addEventListener('loadedmetadata', resume);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('pause', onPause);
    // Cũng thử resume ngay nếu metadata đã có (HMR / reuse cache).
    if ((v as HTMLVideoElement).readyState >= 1) resume();

    return () => {
      v.removeEventListener('loadedmetadata', resume);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('pause', onPause);
      // Khi rời trang / đổi src → lưu vị trí cuối để lần sau quay lại đúng chỗ.
      try {
        saveVideoPos(src, v.currentTime);
      } catch {
        /* ignore */
      }
    };
  }, [src]);

  useEffect(() => {
    const ml = (inferMaLop || '').trim();
    const v = ref.current;
    if (!v || !ml) return;

    let stopped = false;
    setAiStatus('loading');
    setAiError(null);

    ensurePoseDetector().catch((e) => {
      setAiStatus('error');
      setAiError(e instanceof Error ? e.message : String(e));
    });

    const tick = async () => {
      if (stopped) return;
      if (inferBusyRef.current) return;
      if (v.paused || v.ended) return;
      if (!v.videoWidth || !v.videoHeight) return;
      inferBusyRef.current = true;
      setAiStatus((s) => (s === 'error' ? s : 'running'));
      try {
        if (!behaviorStateRef.current) behaviorStateRef.current = createBehaviorState();
        const { boxes, phanTich, summary } = await analyzeBehaviorOnFrame(v, behaviorStateRef.current, {
          multiTile: true,
          hybridCoco: true,
        });
        if (stopped) return;
        saveFocusDetections(ml, {
          boxes,
          phanTich,
          summary,
          at: new Date().toISOString(),
        });
        void persistFocusAnalysisToServer(ml, {
          concentrationLevel: phanTich.chiSoTapTrungUocLuong ?? 0,
          presentCount: boxes.filter((b) => !b.lost).length,
          summary,
          phanTich,
          behaviorCounts: phanTich.hanhVi,
          source: 'browser_ai',
        });
        setAiCount(boxes.filter((b) => !b.lost).length);
        setAiFocusPct(phanTich.chiSoTapTrungUocLuong ?? 0);
        setAiStatus('ok');
        setAiError(null);
      } catch (e) {
        if (!stopped) {
          setAiStatus('error');
          setAiError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        inferBusyRef.current = false;
      }
    };

    const startTimer = window.setTimeout(() => void tick(), 1200);
    const iv = window.setInterval(() => void tick(), 1800);
    return () => {
      stopped = true;
      window.clearTimeout(startTimer);
      window.clearInterval(iv);
    };
  }, [src, inferMaLop]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      maxSeenRef.current = Math.max(maxSeenRef.current, v.currentTime);
    };
    const onSeek = () => {
      const maxT = maxSeenRef.current;
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      // Cho phép vòng lặp tự nhiên (cuối → đầu): không coi đây là tua ngược.
      if (dur > 0 && maxT > dur - 0.6 && v.currentTime < 0.6) {
        maxSeenRef.current = 0;
        return;
      }
      if (maxT > 0.2 && v.currentTime < maxT - 0.2) {
        v.currentTime = maxT;
      }
    };
    const onEnded = () => {
      // Một số trình duyệt vẫn fire `ended` dù có loop — chủ động seek về 0 và phát tiếp.
      maxSeenRef.current = 0;
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
      void v.play().catch(() => {});
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeking', onSeek);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeking', onSeek);
      v.removeEventListener('ended', onEnded);
    };
  }, [src]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const tryPlay = () => {
      void v.play().catch(() => {});
    };
    // Một số trình duyệt mất phát sau khi tab ẩn rồi quay lại — đảm bảo luôn phát tiếp.
    const onVis = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    v.addEventListener('loadeddata', tryPlay);
    v.addEventListener('pause', tryPlay);
    document.addEventListener('visibilitychange', onVis);
    tryPlay();
    return () => {
      v.removeEventListener('loadeddata', tryPlay);
      v.removeEventListener('pause', tryPlay);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [src]);

  const aiBadgeText =
    aiStatus === 'loading'
      ? 'AI · tải mô hình…'
      : aiStatus === 'running'
        ? `AI · phân tích${aiCount ? ` (${aiCount})` : ''}`
        : aiStatus === 'ok'
          ? `AI · ${aiCount} hs · ${aiFocusPct}% tập trung`
          : aiStatus === 'error'
            ? 'AI · lỗi'
            : 'AI · sẵn sàng';
  const aiBadgeClass =
    aiStatus === 'error'
      ? 'bg-red-900/80 text-red-200 border-red-500/40'
      : aiStatus === 'ok'
        ? 'bg-slate-900/85 text-emerald-300 border-emerald-500/40'
        : 'bg-slate-900/85 text-amber-200 border-amber-500/40';

  return (
    <>
      <video
        ref={ref}
        key={src}
        src={src}
        className="absolute inset-0 w-full h-full object-cover bg-black"
        muted={muted}
        playsInline
        autoPlay
        loop
        controls={false}
        disablePictureInPicture
        crossOrigin={src.startsWith('blob:') ? undefined : 'anonymous'}
        tabIndex={-1}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 4px)',
        }}
        aria-hidden
      />
      <div className="absolute bottom-12 left-2 z-[9] flex items-center gap-1.5 pointer-events-none">
        <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium border ${aiBadgeClass}`}>
          <Sparkles size={12} className="shrink-0" />
          {aiBadgeText}
        </div>
      </div>
      {aiError && (
        <div className="absolute bottom-20 left-2 right-2 z-[9] text-[10px] leading-snug text-red-100 bg-red-900/80 border border-red-500/40 rounded-md px-2 py-1.5 pointer-events-none">
          AI: {aiError.length > 200 ? `${aiError.slice(0, 200)}…` : aiError}
        </div>
      )}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          title={muted ? 'Bật tiếng' : 'Tắt tiếng'}
          onClick={() => setMuted((m) => !m)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 border border-white/20"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </>
  );
}

/** Phát MJPEG (RTSP qua ffmpeg bridge) qua <img> + phân tích hành vi với MoveNet trên img element. */
function PseudoLiveMjpegImage({ src, inferMaLop }: { src: string; inferMaLop?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const inferBusyRef = useRef(false);
  const behaviorStateRef = useRef<BehaviorState | null>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'idle' | 'running' | 'ok' | 'error'>('loading');
  const [aiCount, setAiCount] = useState<number>(0);
  const [aiFocusPct, setAiFocusPct] = useState<number>(0);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    behaviorStateRef.current = createBehaviorState();
  }, [src]);

  useEffect(() => {
    const ml = (inferMaLop || '').trim();
    const img = ref.current;
    if (!img || !ml) return;

    let stopped = false;
    setAiStatus('loading');
    setAiError(null);

    ensurePoseDetector().catch((e) => {
      setAiStatus('error');
      setAiError(e instanceof Error ? e.message : String(e));
    });

    const tick = async () => {
      if (stopped) return;
      if (inferBusyRef.current) return;
      if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;
      inferBusyRef.current = true;
      setAiStatus((s) => (s === 'error' ? s : 'running'));
      try {
        if (!behaviorStateRef.current) behaviorStateRef.current = createBehaviorState();
        const { boxes, phanTich, summary } = await analyzeBehaviorOnFrame(img, behaviorStateRef.current, {
          multiTile: true,
          hybridCoco: true,
        });
        if (stopped) return;
        saveFocusDetections(ml, {
          boxes,
          phanTich,
          summary,
          at: new Date().toISOString(),
        });
        void persistFocusAnalysisToServer(ml, {
          concentrationLevel: phanTich.chiSoTapTrungUocLuong ?? 0,
          presentCount: boxes.filter((b) => !b.lost).length,
          summary,
          phanTich,
          behaviorCounts: phanTich.hanhVi,
          source: 'browser_ai',
        });
        setAiCount(boxes.filter((b) => !b.lost).length);
        setAiFocusPct(phanTich.chiSoTapTrungUocLuong ?? 0);
        setAiStatus('ok');
        setAiError(null);
      } catch (e) {
        if (!stopped) {
          setAiStatus('error');
          setAiError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        inferBusyRef.current = false;
      }
    };

    const startTimer = window.setTimeout(() => void tick(), 1500);
    const iv = window.setInterval(() => void tick(), 1800);
    return () => {
      stopped = true;
      window.clearTimeout(startTimer);
      window.clearInterval(iv);
    };
  }, [src, inferMaLop]);

  const badgeText =
    aiStatus === 'loading'
      ? 'AI · tải mô hình…'
      : aiStatus === 'running'
        ? `AI · phân tích RTSP${aiCount ? ` (${aiCount})` : ''}`
        : aiStatus === 'ok'
          ? `AI · ${aiCount} hs · ${aiFocusPct}% tập trung`
          : aiStatus === 'error'
            ? 'AI · lỗi'
            : 'AI · sẵn sàng';
  const badgeClass =
    aiStatus === 'error'
      ? 'bg-red-900/80 text-red-200 border-red-500/40'
      : aiStatus === 'ok'
        ? 'bg-slate-900/85 text-emerald-300 border-emerald-500/40'
        : 'bg-slate-900/85 text-amber-200 border-amber-500/40';

  return (
    <>
      <img
        ref={ref}
        key={src}
        src={src}
        crossOrigin="anonymous"
        alt="RTSP qua cầu nối ffmpeg"
        className="absolute inset-0 w-full h-full object-cover bg-black"
      />
      <div className="absolute bottom-12 left-2 z-[9] flex items-center gap-1.5 pointer-events-none">
        <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium border ${badgeClass}`}>
          <Sparkles size={12} className="shrink-0" />
          {badgeText}
        </div>
      </div>
      {aiError && (
        <div className="absolute bottom-20 left-2 right-2 z-[9] text-[10px] leading-snug text-red-100 bg-red-900/80 border border-red-500/40 rounded-md px-2 py-1.5 pointer-events-none">
          AI: {aiError.length > 200 ? `${aiError.slice(0, 200)}…` : aiError}
        </div>
      )}
    </>
  );
}

/** Ưu tiên: video/URL đã gắn ở Roboflow → ảnh khung AI → placeholder. */
function LiveVideoFeed({ className, maLop }: { className: string; maLop?: string }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [snapUrl, setSnapUrl] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [mjpegUrl, setMjpegUrl] = useState<string | null>(null);
  /** Có bind/snapshot cho lớp khác — giải thích vì sao thẻ này trống. */
  const [boundOtherClass, setBoundOtherClass] = useState<string | null>(null);

  const refresh = () => {
    if (!maLop?.trim()) {
      setSnapUrl(null);
      setPlayUrl(null);
      setMjpegUrl(null);
      setBoundOtherClass(null);
      return;
    }
    const m = normalizeMaLop(maLop);
    setSnapUrl(getFocusClassSnapshot(maLop)?.dataUrl ?? null);
    const b = getFocusMonitorBind(m);
    if (b && normalizeMaLop(b.maLop) === m && b.mode === 'mjpeg' && b.httpUrl?.trim()) {
      setMjpegUrl(b.httpUrl.trim());
      setPlayUrl(null);
      setBoundOtherClass(null);
    } else if (b && normalizeMaLop(b.maLop) === m && b.mode === 'http' && b.httpUrl?.trim()) {
      setPlayUrl(b.httpUrl.trim());
      setMjpegUrl(null);
      setBoundOtherClass(null);
    } else if (b && normalizeMaLop(b.maLop) === m && b.mode === 'blob' && b.blobUrl?.startsWith('blob:')) {
      setPlayUrl(b.blobUrl);
      setMjpegUrl(null);
      setBoundOtherClass(null);
    } else {
      setPlayUrl(null);
      setMjpegUrl(null);
      if (b && b.mode !== 'none' && normalizeMaLop(b.maLop) !== m) {
        setBoundOtherClass(b.maLop);
      } else {
        setBoundOtherClass(null);
      }
    }
  };

  useEffect(() => {
    refresh();
    const u1 = subscribeFocusSnapshots(refresh);
    const u2 = subscribeFocusMonitorBind(refresh);
    return () => {
      u1();
      u2();
    };
  }, [maLop]);

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString('vi-VN')), 1000);
    return () => clearInterval(iv);
  }, []);

  const key = maLop?.trim() ? normalizeMaLop(maLop) : '';
  const mode = mjpegUrl ? 'mjpeg' : playUrl ? 'video' : snapUrl ? 'snapshot' : 'empty';

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video w-full">
      <div className="absolute inset-0">
        {mjpegUrl ? (
          <PseudoLiveMjpegImage src={mjpegUrl} inferMaLop={key || undefined} />
        ) : playUrl ? (
          <PseudoLiveBoundVideo src={playUrl} inferMaLop={key || undefined} />
        ) : snapUrl ? (
          <img src={snapUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
        <>
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-5 grid-rows-4 h-full">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="border border-slate-600" />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-slate-600 text-center px-4 max-w-sm">
              <Video size={32} className="mx-auto mb-1 opacity-40" />
              <div className="text-xs opacity-40">Chưa gắn video / chưa có khung AI cho lớp này</div>
              {boundOtherClass && (
                <p className="mt-2 text-[11px] text-amber-200 leading-snug bg-black/40 rounded px-2 py-1.5 border border-amber-500/40">
                  Đang có video/ảnh gắn lớp <strong className="font-mono">{boundOtherClass}</strong> — Roboflow phải chọn{' '}
                  <strong className="font-mono">đúng mã {key}</strong> thì thẻ này mới hiện. Hoặc mở Roboflow cho lớp đang gắn.
                </p>
              )}
              {key ? (
                <Link
                  to={`/monitor/focus/robo?maLop=${encodeURIComponent(key)}`}
                  className="mt-2 inline-block text-[11px] text-sky-300 hover:underline"
                >
                  Roboflow · tập trung — lớp {key}: chọn MP4 / URL HTTP / phân tích khung
                </Link>
              ) : (
                <div className="text-[10px] opacity-30 mt-1">Chọn mã lớp ở trang AI tập trung</div>
              )}
            </div>
          </div>
        </>
        )}
      </div>
      {key && (mode === 'video' || mode === 'snapshot' || mode === 'mjpeg') && <DetectionOverlayCanvas maLop={key} />}
      <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 pointer-events-none z-[8]">
        {(mode === 'video' || mode === 'mjpeg') && (
          <>
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs px-2.5 py-1 rounded-md font-semibold shadow-lg ring-1 ring-red-400/50">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              TRỰC TIẾP
            </div>
            <div className="flex items-center gap-1 rounded-md bg-slate-900/85 px-2 py-1 text-[10px] font-medium text-emerald-300 border border-emerald-500/40">
              <Sparkles size={12} className="shrink-0" />
              AI
            </div>
          </>
        )}
        {mode === 'snapshot' && (
          <div className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-2 py-1 rounded-md font-medium">
            Khung AI
          </div>
        )}
        {mode === 'empty' && (
          <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-md font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 z-[8] bg-black/50 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none">
        {time}
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[8] bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
        <div className="text-white text-xs font-medium truncate">{className}</div>
        {key && (
          <div className="text-[10px] text-white/80 truncate">
            {mode === 'video' && 'Luồng phòng · trực quan · '}
            {mode === 'mjpeg' && 'Camera RTSP · cầu nối ffmpeg · '}
            {mode === 'snapshot' && 'Ảnh phân tích gần nhất · '}
            {mode === 'empty' && 'Demo · '}
            lớp {key}
          </div>
        )}
      </div>
    </div>
  );
}

// Single class monitor card
function ClassMonitorCard({ live }: { live: LiveData }) {
  const cls = CLASSES.find(c => c.id === live.classId);
  const teacher = cls ? getTeacher(cls.teacherId) : null;
  const room = cls ? getRoom(cls.roomId) : null;
  const [currentConc, setCurrentConc] = useState(live.concentrationLevel);
  const [currentStudents, setCurrentStudents] = useState(live.currentStudents);

  // Simulate slight fluctuation
  useEffect(() => {
    const iv = setInterval(() => {
      setCurrentConc(v => Math.max(0, Math.min(100, v + Math.round((Math.random() - 0.5) * 4))));
      setCurrentStudents(v => Math.max(0, Math.min(cls?.expectedStudents ?? 40, v + Math.round((Math.random() - 0.5) * 2))));
    }, 5000);
    return () => clearInterval(iv);
  }, [cls]);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
      live.alertStatus !== 'normal' ? 'border-amber-300' : 'border-gray-200'
    }`}>
      {live.alertStatus !== 'normal' && (
        <div className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium ${
          live.alertStatus === 'low_attendance' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <AlertTriangle size={12} />
          Cảnh báo: {getAlertLabel(live.alertStatus)}
        </div>
      )}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              {live.displayName ?? cls?.name ?? live.classId}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {live.displayTeacher || teacher?.name || 'Giáo viên'}
              {cls && room?.name ? ` · ${room.name}` : ''}
              {!cls && live.classId ? ` · ${live.classId}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
            {live.snapshotOnly ? (
            <>
              <WifiOff size={10} className="text-amber-600" />
              <span className="text-amber-800">Ảnh chụp chỉ số</span>
            </>
          ) : (
            <>
              <Wifi size={10} />
              <span>Đang học</span>
            </>
          )}
          </div>
        </div>

        {/* Video */}
        <LiveVideoFeed
          className={live.displayName ?? cls?.name ?? live.classId}
          maLop={normalizeMaLop(live.classId)}
        />

        {/* Stats */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-center">
            <ConcentrationGauge value={currentConc} />
            <p className="text-xs text-gray-500 mt-1">Tập trung</p>
          </div>
          <div className="flex-1 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={14} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Sĩ số</div>
                <div className="font-semibold text-gray-800">{currentStudents}/{cls?.expectedStudents}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Clock size={14} className="text-green-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Bắt đầu</div>
                <div className="font-semibold text-gray-800">{live.sessionStart}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini chart */}
        {live.last30MinConcentration.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Tập trung 30 phút qua</p>
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={live.last30MinConcentration}>
                <defs>
                  <linearGradient id={`grad-${live.classId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getConcentrationColor(currentConc)} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={getConcentrationColor(currentConc)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone" dataKey="value"
                  stroke={getConcentrationColor(currentConc)}
                  fill={`url(#grad-${live.classId})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <Link to={`/monitor/${live.classId}`}>
          <button className="w-full mt-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
            Xem chi tiết →
          </button>
        </Link>
      </div>
    </div>
  );
}

// ===== DETAIL VIEW =====
function enrichRealtimeRow(found: any | null, classMeta: any | null, classId: string) {
  const expected = Math.max(0, Number(classMeta?.siSoDuKien) || 0);
  const exp = expected || 30;
  if (found && hasMeaningfulSnapshot(found)) {
    const conc = Number(found.concentrationLevel);
    const present = Number(found.currentStudents);
    return {
      ...found,
      alertStatus: computeAlertStatus(conc, present, exp),
      __simulated: false,
    };
  }
  const basePresent = found ? Number(found.currentStudents) : NaN;
  const baseConc = found ? Number(found.concentrationLevel) : NaN;
  const present = Number.isFinite(basePresent) && basePresent > 0
    ? Math.min(exp, basePresent)
    : Math.min(exp, Math.max(1, Math.round(exp * 0.88)));
  const conc = Number.isFinite(baseConc) && baseConc > 0
    ? Math.min(100, baseConc)
    : 74;
  return {
    ...(found || {}),
    maLop: found?.maLop ?? classId,
    currentStudents: present,
    concentrationLevel: conc,
    isActive: true,
    alertStatus: computeAlertStatus(conc, present, exp),
    __simulated: true,
  };
}

function MonitorDetail({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const cls = CLASSES.find(c => c.id === classId);
  const live = LIVE_DATA.find(l => l.classId === classId);
  const teacher = cls ? getTeacher(cls.teacherId) : null;
  const room = cls ? getRoom(cls.roomId) : null;
  const [remoteClass, setRemoteClass] = useState<any | null>(null);
  const [remoteRealtime, setRemoteRealtime] = useState<any | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(() => !cls || !live);
  const [streamConnected, setStreamConnected] = useState(false);
  const remoteClassRef = useRef<any | null>(null);
  remoteClassRef.current = remoteClass;
  const loadSeqRef = useRef(0);

  const [concentration, setConcentration] = useState(live?.concentrationLevel ?? 0);
  const [students, setStudents] = useState(live?.currentStudents ?? 0);
  const [concHistory, setConcHistory] = useState(live?.last30MinConcentration ?? []);
  const [studHistory, setStudHistory] = useState(live?.last30MinStudents ?? []);
  const [remoteConcHistory, setRemoteConcHistory] = useState<{ time: string; value: number }[]>([]);
  const [remoteStudHistory, setRemoteStudHistory] = useState<{ time: string; value: number }[]>([]);
  const remoteRealtimeRef = useRef<any | null>(null);
  remoteRealtimeRef.current = remoteRealtime;

  const isRemoteDetail = !cls || !live;

  useEffect(() => {
    if (!isRemoteDetail) return;
    setRemoteConcHistory([]);
    setRemoteStudHistory([]);
    const sample = () => {
      const r = remoteRealtimeRef.current;
      if (!r) return;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const c = Number(r.concentrationLevel) || 0;
      const s = Number(r.currentStudents) || 0;
      setRemoteConcHistory((h) => [...h.slice(-14), { time: timeStr, value: c }]);
      setRemoteStudHistory((h) => [...h.slice(-14), { time: timeStr, value: s }]);
    };
    sample();
    const iv = setInterval(sample, 5000);
    return () => clearInterval(iv);
  }, [isRemoteDetail, classId]);

  useEffect(() => {
    if (!isRemoteDetail) return;
    const seq = ++loadSeqRef.current;
    let mounted = true;
    const applyList = (raw: unknown) => {
      if (!mounted || seq !== loadSeqRef.current) return;
      const list = extractRealtimeList(raw);
      const found = findRealtimeRow(list, classId);
      const meta = remoteClassRef.current;
      // Không chặn khi meta chưa tới: SSE thường fire trước khi fetchClass xong; vẫn enrich từ snapshot + sĩ số mặc định.
      setRemoteRealtime(enrichRealtimeRow(found, meta, classId));
    };

    const loadRemote = async () => {
      setRemoteLoading(true);
      setRemoteClass(null);
      setRemoteRealtime(null);
      remoteClassRef.current = null;
      try {
        const [c, rt] = await Promise.all([
          fetchClass(classId).catch(() => null),
          fetchRealtimeClasses().catch(() => null),
        ]);
        if (!mounted || seq !== loadSeqRef.current) return;
        remoteClassRef.current = c;
        setRemoteClass(c);
        if (!c) {
          // Giữ snapshot realtime từ SSE/poll nếu đã tới trước; không xóa để tránh màn hình trống tới khi F5.
          return;
        }
        const list = extractRealtimeList(rt);
        const found = findRealtimeRow(list, classId);
        setRemoteRealtime(enrichRealtimeRow(found, c, classId));
        fetchRealtimeClasses()
          .then((raw) => {
            if (!mounted || seq !== loadSeqRef.current) return;
            applyList(raw);
          })
          .catch(() => {});
      } finally {
        if (mounted && seq === loadSeqRef.current) setRemoteLoading(false);
      }
    };

    loadRemote();
    const streamUrl = getMonitorStreamUrl();
    const source = new EventSource(streamUrl);
    source.onopen = () => {
      if (mounted) setStreamConnected(true);
    };
    source.addEventListener('connected', () => {
      if (mounted) setStreamConnected(true);
    });
    source.addEventListener('realtime', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        applyList(payload?.classes ?? payload);
      } catch {
        /* ignore */
      }
    });
    source.onerror = () => {
      if (mounted) setStreamConnected(false);
    };
    const poll = setInterval(() => {
      fetchRealtimeClasses()
        .then((raw) => {
          if (!mounted) return;
          applyList(raw);
        })
        .catch(() => {});
    }, 15000);

    return () => {
      mounted = false;
      source.close();
      clearInterval(poll);
    };
  }, [classId, isRemoteDetail]);

  useEffect(() => {
    if (!isRemoteDetail || !remoteRealtime?.__simulated || !remoteClass) return;
    const expected = Math.max(1, Number(remoteClass.siSoDuKien) || 30);
    const iv = setInterval(() => {
      setRemoteRealtime((prev: any) => {
        if (!prev?.__simulated) return prev;
        const p = Number(prev.currentStudents);
        const c = Number(prev.concentrationLevel);
        const nextP = Math.max(0, Math.min(expected, p + Math.round((Math.random() - 0.5) * 2)));
        const nextC = Math.max(0, Math.min(100, c + Math.round((Math.random() - 0.5) * 5)));
        return {
          ...prev,
          currentStudents: nextP,
          concentrationLevel: nextC,
          alertStatus: computeAlertStatus(nextC, nextP, expected),
        };
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [isRemoteDetail, remoteRealtime?.__simulated, remoteClass]);

  useEffect(() => {
    if (!cls || !live) return;
    const cap = cls.expectedStudents;
    const iv = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setConcentration((c) => {
        const newC = Math.max(0, Math.min(100, c + Math.round((Math.random() - 0.5) * 6)));
        setConcHistory((h) => [...h.slice(-14), { time: timeStr, value: newC }]);
        return newC;
      });
      setStudents((s) => {
        const newS = Math.max(0, Math.min(cap, s + Math.round((Math.random() - 0.5) * 2)));
        setStudHistory((h) => [...h.slice(-14), { time: timeStr, value: newS }]);
        return newS;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [cls?.id, live?.classId]);

  if (!cls || !live) {
    if (remoteLoading && !remoteRealtime) {
      return <div className="p-6 text-gray-500 text-center">Đang tải dữ liệu realtime...</div>;
    }
    if (remoteClass || remoteRealtime) {
      const expected = remoteClass?.siSoDuKien ?? 0;
      const conc = Number(remoteRealtime?.concentrationLevel ?? 0);
      const present = Number(remoteRealtime?.currentStudents ?? 0);
      const fromApi = remoteRealtime && !remoteRealtime.__simulated;
      const alertStatus = remoteRealtime?.alertStatus ?? computeAlertStatus(conc, present, Number(expected) || 30);
      const statusLine = streamConnected
        ? 'Đang cập nhật qua luồng SSE từ máy chủ.'
        : fromApi
          ? 'Dữ liệu từ API (polling 15 giây). Mở server và simulation job để có SSE.'
          : 'Dữ liệu mô phỏng realtime — khi có snapshot trong CSDL sẽ chuyển sang số liệu thật.';
      const title = remoteClass?.tenLop ?? remoteClass?.maLop ?? remoteRealtime?.maLop ?? classId;
      const gvLine = remoteClass?.tenGiaoVien ?? remoteClass?.maGiaoVien ?? remoteRealtime?.tenGiaoVien ?? '—';
      return (
        <div className="p-4 lg:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/monitor')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
              <ArrowLeft size={16} /> Quay lại
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-gray-900">{title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getAlertStyle(alertStatus)}`}>
                  {alertStatus !== 'normal' && <AlertTriangle size={10} className="inline mr-1" />}
                  {getAlertLabel(alertStatus)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                GV: {gvLine} · Sĩ số dự kiến: {expected || '—'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Trạng thái realtime</p>
                <p className="text-xs text-gray-500 mt-0.5">{statusLine}</p>
              </div>
              {streamConnected ? (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
                  <Wifi size={10} />
                  <span>SSE</span>
                </div>
              ) : fromApi ? (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">
                  <Wifi size={10} />
                  <span>API</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full border border-amber-200">
                  <Activity size={10} />
                  <span>Mô phỏng</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Học sinh hiện diện', value: `${present}/${expected || '—'}`, icon: <Users size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
                { label: 'Mức tập trung', value: `${conc}%`, icon: <Activity size={18} className="text-green-600" />, bg: 'bg-green-50' },
                { label: 'Tỷ lệ tham dự', value: expected ? `${Math.round((present / Number(expected)) * 100)}%` : '—', icon: <TrendingUp size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
                { label: 'Trạng thái lớp', value: getAlertLabel(alertStatus), icon: <AlertTriangle size={18} className={alertStatus !== 'normal' ? 'text-amber-600' : 'text-gray-400'} />, bg: alertStatus !== 'normal' ? 'bg-amber-50' : 'bg-gray-50' },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>{m.icon}</div>
                    <p className="text-xs text-gray-500">{m.label}</p>
                  </div>
                  <p className="font-bold text-gray-900 text-lg">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Camera trực tiếp</h3>
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Trực tiếp
                </div>
              </div>
              <LiveVideoFeed
                className={String(title)}
                maLop={normalizeMaLop(String(remoteClass?.maLop ?? remoteRealtime?.maLop ?? classId))}
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <ConcentrationGauge value={conc} />
                  <p className="text-xs text-gray-500 mt-1">Tập trung hiện tại</p>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                    <span className="text-xs text-gray-600">Sĩ số</span>
                    <span className="font-bold text-blue-700">{present}</span>
                  </div>
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-2">
                    <span className="text-xs text-gray-600">Dự kiến</span>
                    <span className="font-bold text-green-700">{expected || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-50 rounded-lg p-2">
                    <span className="text-xs text-gray-600">Vắng</span>
                    <span className="font-bold text-amber-700">
                      {expected ? Math.max(0, Number(expected) - present) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Mức tập trung theo thời gian</h3>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={remoteConcHistory}>
                    <defs>
                      <linearGradient id="remoteConcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung']} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#remoteConcGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Số học sinh theo thời gian</h3>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={remoteStudHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis
                      domain={[0, (Number(expected) || 40) + 5]}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Học sinh']} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <AiFocusDetectionsPanel
            maLop={String(remoteClass?.maLop ?? remoteRealtime?.maLop ?? classId)}
          />

          <div
            className={`rounded-xl p-4 border ${
              alertStatus === 'normal'
                ? 'bg-green-50 border-green-200'
                : alertStatus === 'low_concentration'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                alertStatus === 'normal'
                  ? 'text-green-800'
                  : alertStatus === 'low_concentration'
                    ? 'text-amber-800'
                    : 'text-red-800'
              }`}
            >
              <strong>Tóm tắt:</strong> {title} hiện có {present} học sinh trong phòng, mức tập trung {conc}%,
              trạng thái {getAlertLabel(alertStatus).toLowerCase()}.
              {alertStatus === 'low_concentration' && ' Cần theo dõi thêm và có thể điều chỉnh phương pháp giảng dạy.'}
              {alertStatus === 'low_attendance' && ' Sĩ số thấp hơn bình thường, cần kiểm tra nguyên nhân.'}
            </p>
          </div>
        </div>
      );
    }
    return <div className="p-6 text-gray-500 text-center">Không tìm thấy thông tin lớp học.</div>;
  }

  const alertStatus = concentration < 60 ? 'low_concentration' : students < (cls.expectedStudents * 0.6) ? 'low_attendance' : 'normal';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/monitor')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-gray-900">{cls.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getAlertStyle(alertStatus)}`}>
              {alertStatus !== 'normal' && <AlertTriangle size={10} className="inline mr-1" />}
              {getAlertLabel(alertStatus)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {teacher?.name} · {room?.name} · Bắt đầu {live.sessionStart}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Học sinh hiện diện', value: `${students}/${cls.expectedStudents}`, icon: <Users size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Mức tập trung', value: `${concentration}%`, icon: <Activity size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Tỷ lệ tham dự', value: `${Math.round(students / cls.expectedStudents * 100)}%`, icon: <TrendingUp size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
          { label: 'Trạng thái lớp', value: getAlertLabel(alertStatus), icon: <AlertTriangle size={18} className={alertStatus !== 'normal' ? 'text-amber-600' : 'text-gray-400'} />, bg: alertStatus !== 'normal' ? 'bg-amber-50' : 'bg-gray-50' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>{m.icon}</div>
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
            <p className="font-bold text-gray-900 text-lg">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Video + Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Camera trực tiếp</h3>
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Trực tiếp
            </div>
          </div>
          <LiveVideoFeed className={cls.name} maLop={normalizeMaLop(cls.id)} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <ConcentrationGauge value={concentration} />
              <p className="text-xs text-gray-500 mt-1">Tập trung hiện tại</p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                <span className="text-xs text-gray-600">Sĩ số</span>
                <span className="font-bold text-blue-700">{students}</span>
              </div>
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-2">
                <span className="text-xs text-gray-600">Dự kiến</span>
                <span className="font-bold text-green-700">{cls.expectedStudents}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-50 rounded-lg p-2">
                <span className="text-xs text-gray-600">Vắng</span>
                <span className="font-bold text-amber-700">{Math.max(0, cls.expectedStudents - students)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Concentration chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Mức tập trung theo thời gian</h3>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={concHistory}>
                <defs>
                  <linearGradient id="concGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung']} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#concGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Students chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Số học sinh theo thời gian</h3>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={studHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis domain={[0, cls.expectedStudents + 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Học sinh']} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <AiFocusDetectionsPanel maLop={cls.id} />

      {/* Description */}
      <div className={`rounded-xl p-4 border ${
        alertStatus === 'normal' ? 'bg-green-50 border-green-200' :
        alertStatus === 'low_concentration' ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        <p className={`text-sm ${
          alertStatus === 'normal' ? 'text-green-800' :
          alertStatus === 'low_concentration' ? 'text-amber-800' : 'text-red-800'
        }`}>
          <strong>Tóm tắt:</strong> Lớp {cls.name} hiện có {students} người trong phòng, mức độ tập trung hiện tại là {concentration}%,
          trạng thái lớp {getAlertLabel(alertStatus).toLowerCase()}.
          {alertStatus === 'low_concentration' && ' Cần theo dõi thêm và có thể điều chỉnh phương pháp giảng dạy.'}
          {alertStatus === 'low_attendance' && ' Sĩ số thấp hơn bình thường, cần kiểm tra nguyên nhân.'}
        </p>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function MonitorPage() {
  const { classId } = useParams<{ classId?: string }>();
  const location = useLocation();
  const [remoteLive, setRemoteLive] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'alert'>('all');
  const [listLoading, setListLoading] = useState(() => !classId);

  // Tránh một frame "đã tải xong" khi vừa từ /monitor/:id quay lại /monitor (listLoading còn false từ nhánh detail).
  useLayoutEffect(() => {
    if (!classId) {
      setListLoading(true);
    }
  }, [classId]);

  useEffect(() => {
    if (classId) {
      return;
    }

    setListLoading(true);
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchRealtimeClasses();
        if (mounted) setRemoteLive(extractRealtimeList(data));
      } catch {
        // giữ remoteLive cũ / sẽ fallback LIVE_DATA
      }
    };

    load().finally(() => {
      if (mounted) setListLoading(false);
    });

    const source = new EventSource(getMonitorStreamUrl());
    source.addEventListener('realtime', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (mounted) setRemoteLive(extractRealtimeList(payload?.classes ?? payload));
      } catch {
        // ignore parse errors
      }
    });
    const iv = setInterval(load, 15000);
    return () => {
      mounted = false;
      source.close();
      clearInterval(iv);
    };
  }, [classId, location.key, location.pathname]);

  if (classId) return <MonitorDetail key={classId} classId={classId} />;

  const poolForCards = monitorDisplayPool(remoteLive);
  const activeClasses = poolForCards.filter((l) => l.isActive);
  const usingMonitorSnapshotFallback =
    remoteLive.length > 0 && activeClasses.some((l) => Boolean(l.snapshotOnly));

  const displayed = filter === 'alert'
    ? activeClasses.filter(l => l.alertStatus !== 'normal')
    : activeClasses;

  if (listLoading) {
    return (
      <div className="p-4 lg:p-6 flex flex-col items-center justify-center min-h-[320px] gap-4 text-gray-600">
        <div className="flex items-center gap-2 text-blue-600">
          <Activity size={28} className="animate-pulse" />
          <span className="text-sm font-medium">Đang tải dữ liệu lớp học…</span>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-sm">
          Vui lòng đợi trong giây lát. Hệ thống đang gọi API theo dõi thời gian thực.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Theo dõi thời gian thực</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {usingMonitorSnapshotFallback ? (
              <>
                <span className="text-amber-700 font-medium">{activeClasses.length} lớp phụ trách</span>
                {' '}
                — hiển thị chỉ số gần nhất: chưa có buổi học trạng thái hoạt động trong SQL, hoặc chỉ số chưa gắn
                đúng mã buổi. Dữ liệu vẫn được SSE và làm mới định kỳ.
              </>
            ) : (
              <>{activeClasses.length} lớp đang học · Cập nhật liên tục</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tất cả ({activeClasses.length})
          </button>
          <button
            onClick={() => setFilter('alert')}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'alert' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Cần chú ý ({activeClasses.filter(l => l.alertStatus !== 'normal').length})
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p>Không có lớp nào {filter === 'alert' ? 'cần chú ý' : 'đang học'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayed.map(live => (
            <ClassMonitorCard key={live.classId} live={live} />
          ))}
        </div>
      )}
    </div>
  );
}
