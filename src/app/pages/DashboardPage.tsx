import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useSchoolData } from '../context/SchoolDataContext';
import { fetchDashboardOverview } from '../lib/api';
import {
  CLASSES, LIVE_DATA, TEACHERS, ROOMS,
  getTeacher, getRoom, getConcentrationColor, getConcentrationLabel,
  getAlertLabel, getAlertStyle
} from '../data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, LineChart, Line, Legend, Area, AreaChart,
} from 'recharts';
import {
  Users, BookOpen, TrendingUp, AlertTriangle, Activity,
  ArrowRight, Clock, Eye, ChevronRight, Sparkles
} from 'lucide-react';
import {
  getFocusClassSnapshot,
  subscribeFocusSnapshots,
  getFocusMonitorBind,
  getAllFocusMonitorBinds,
  subscribeFocusMonitorBind,
  normalizeFocusMaLop,
  type FocusMonitorBind,
} from '../lib/focusSnapshotStorage';
import {
  getFocusDetections,
  subscribeFocusDetections,
} from '../lib/focusDetectionsStorage';
import DetectionOverlayCanvas from '../components/monitor/DetectionOverlayCanvas';
import {
  analyzeBehaviorOnFrame,
  createBehaviorState,
  ensurePoseDetector,
  type BehaviorState,
} from '../lib/behaviorAnalyzer';
import { saveFocusDetections } from '../lib/focusDetectionsStorage';
import { saveFocusClassSnapshot } from '../lib/focusSnapshotStorage';
import { bumpFocusLocalActive } from '../components/GlobalFocusAnalyzer';

function StatCard({
  title, value, sub, icon, color, bg
}: {
  title: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Khung xem trên Tổng quan cho 1 lớp:
 *   - Nếu cùng lớp đang được bind ở trang Roboflow + mode = mjpeg → render `<img>` live MJPEG.
 *   - mode = http (mp4/HLS) → render `<video autoplay muted loop>` để giả live.
 *   - mode = blob (file local) → render `<video>` (URL blob chỉ chạy được trong cùng tab).
 *   - Còn lại fallback ảnh snapshot tĩnh.
 *
 * Nhờ subscribe `FocusMonitorBind`, ngay khi user gắn RTSP/upload video ở trang khác,
 * Dashboard sẽ tự cập nhật mà không cần refresh.
 */
function DashboardFocusThumb({ maLop }: { maLop: string }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeFocusSnapshots(() => setTick((t) => t + 1)), [maLop]);
  useEffect(() => subscribeFocusMonitorBind(() => setTick((t) => t + 1)), [maLop]);

  const bind = getFocusMonitorBind(maLop);
  const matched =
    bind && normalizeFocusMaLop(bind.maLop) === normalizeFocusMaLop(maLop);
  const cls =
    'w-16 h-11 object-cover rounded border border-gray-200 shadow-sm';

  if (matched && bind!.mode === 'mjpeg' && bind!.httpUrl) {
    return (
      <img
        src={bind!.httpUrl}
        alt=""
        className={cls}
        title="LIVE — luồng RTSP qua cầu nối MJPEG"
      />
    );
  }
  if (matched && bind!.mode === 'http' && bind!.httpUrl) {
    return (
      <video
        src={bind!.httpUrl}
        className={cls}
        autoPlay
        muted
        loop
        playsInline
        title="LIVE — luồng HTTP/HLS"
      />
    );
  }
  if (matched && bind!.mode === 'blob' && bind!.blobUrl?.startsWith('blob:')) {
    return (
      <video
        src={bind!.blobUrl}
        className={cls}
        autoPlay
        muted
        loop
        playsInline
        title="Video đã tải (cùng tab trình duyệt)"
      />
    );
  }

  const snap = getFocusClassSnapshot(maLop);
  if (!snap?.dataUrl) {
    return <span className="text-[11px] text-gray-400">—</span>;
  }
  return (
    <img
      src={snap.dataUrl}
      alt=""
      className={cls}
      title="Khung gửi AI gần nhất (trang Roboflow · tập trung)"
    />
  );
}

/**
 * Panel 1 lớp: video/MJPEG/blob live + chỉ số đỉnh + 2 chart (% tập trung & hành vi).
 * Mỗi panel phát nguồn riêng, biểu đồ vẽ từ chuỗi `series` chỉ thuộc về lớp đó.
 */
function FocusClassPanel({
  bind,
  series,
}: {
  bind: FocusMonitorBind;
  series: Array<{
    t: number;
    label: string;
    pct: number;
    people: number;
    focus: number;
    head: number;
    turn: number;
    raise: number;
    phone: number;
    absent: number;
  }>;
}) {
  const latest = series[series.length - 1] ?? null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const posKey = `edu_focus_panel_pos__${bind.maLop}`;

  /**
   * Phân tích MoveNet ngay trên phần tử LIVE đang hiển thị của panel.
   * Không phụ thuộc `<img>` ẩn ngoài DOM (vốn hay bị browser dedupe / không load đầy đủ
   * khi cùng URL được panel đang fetch). Heartbeat `bumpFocusLocalActive` chặn
   * GlobalFocusAnalyzer/FocusMonitorPage chạy đôi trên cùng mã lớp.
   */
  useEffect(() => {
    if (!bind.maLop) return;
    if (bind.mode === 'none') return;
    let stopped = false;
    const stateRef: { v: BehaviorState | null } = { v: null };
    let busy = false;
    void ensurePoseDetector().catch(() => {
      /* ignore */
    });
    const tick = async () => {
      if (stopped || busy) return;
      const el: HTMLImageElement | HTMLVideoElement | null =
        bind.mode === 'mjpeg' ? imgRef.current : videoRef.current;
      if (!el) return;
      if (el instanceof HTMLVideoElement && (!el.videoWidth || !el.videoHeight)) return;
      if (el instanceof HTMLImageElement && (!el.complete || !el.naturalWidth)) return;
      busy = true;
      try {
        bumpFocusLocalActive(bind.maLop);
        if (!stateRef.v) stateRef.v = createBehaviorState();
        const r = await analyzeBehaviorOnFrame(el, stateRef.v, {
          minAgeToShow: 1,
          multiTile: true,
          hybridCoco: true,
        });
        if (stopped) return;
        saveFocusDetections(bind.maLop, {
          boxes: r.boxes,
          phanTich: r.phanTich,
          summary: r.summary,
          at: new Date().toISOString(),
        });
        // Snapshot tĩnh để các thumbnail khác (table lớp học) cũng có ảnh dự phòng.
        try {
          const canvas = document.createElement('canvas');
          const w = el instanceof HTMLImageElement ? el.naturalWidth : el.videoWidth;
          const h = el instanceof HTMLImageElement ? el.naturalHeight : el.videoHeight;
          canvas.width = Math.min(640, w);
          canvas.height = Math.round((canvas.width / Math.max(w, 1)) * h);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            saveFocusClassSnapshot(bind.maLop, canvas.toDataURL('image/jpeg', 0.7));
          }
        } catch {
          /* tainted canvas — bỏ qua */
        }
      } catch {
        /* ignore */
      } finally {
        busy = false;
      }
    };
    // Lệch nhau theo hash mã lớp để 2 panel không chạy cùng millisecond.
    const off = (Math.abs(bind.maLop.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 1500) + 500;
    const kick = window.setTimeout(() => void tick(), off);
    const iv = window.setInterval(() => void tick(), 2500);
    // Heartbeat tách rời để chặn GlobalFocusAnalyzer ngay cả khi tick chưa chạy được.
    const hb = window.setInterval(() => bumpFocusLocalActive(bind.maLop), 1000);
    bumpFocusLocalActive(bind.maLop);
    return () => {
      stopped = true;
      window.clearTimeout(kick);
      window.clearInterval(iv);
      window.clearInterval(hb);
    };
  }, [bind.maLop, bind.mode, bind.httpUrl, bind.blobUrl]);

  // Khôi phục vị trí phát + lưu định kỳ. Không ghi trong cleanup để khỏi đè 900 bằng 0
  // (xem chi tiết comment ở FocusMonitorPage).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (bind.mode !== 'http' && bind.mode !== 'blob') return;
    let applied = false;
    const apply = () => {
      if (applied) return;
      try {
        const saved = Number(sessionStorage.getItem(posKey));
        if (!Number.isFinite(saved) || saved <= 0.5) return;
        const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
        v.currentTime = dur > 0 ? Math.min(saved, Math.max(0, dur - 0.5)) : saved;
        applied = true;
      } catch {
        /* ignore */
      }
    };
    if (v.readyState >= 1) apply();
    v.addEventListener('loadedmetadata', apply);
    v.addEventListener('loadeddata', apply);
    const onTime = () => {
      if (v.currentTime <= 0.25) return;
      try {
        sessionStorage.setItem(posKey, String(v.currentTime));
      } catch {
        /* ignore */
      }
    };
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', apply);
      v.removeEventListener('loadeddata', apply);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [bind.mode, bind.httpUrl, bind.blobUrl, posKey]);

  const mediaCls = 'block w-full h-full object-cover';
  const innerMedia =
    bind.mode === 'mjpeg' && bind.httpUrl ? (
      <img
        ref={imgRef}
        src={bind.httpUrl}
        crossOrigin="anonymous"
        alt=""
        className={mediaCls}
      />
    ) : bind.mode === 'http' && bind.httpUrl ? (
      <video
        ref={videoRef}
        src={bind.httpUrl}
        crossOrigin="anonymous"
        className={mediaCls}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : bind.mode === 'blob' && bind.blobUrl?.startsWith('blob:') ? (
      <video ref={videoRef} src={bind.blobUrl} className={mediaCls} autoPlay muted loop playsInline />
    ) : (
      <div className="flex items-center justify-center text-slate-400 text-xs h-full">—</div>
    );
  const mediaBox = (
    <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
      {innerMedia}
      <DetectionOverlayCanvas maLop={bind.maLop} />
    </div>
  );
  const gradId = `pctGrad_${bind.maLop}`;

  return (
    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50/40 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-semibold text-gray-800 text-sm">
          <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{bind.maLop}</span>
        </div>
        <Link
          to={`/monitor/focus/robo?maLop=${encodeURIComponent(bind.maLop)}`}
          className="text-[11px] text-indigo-600 hover:underline"
        >
          Cấu hình
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">{mediaBox}</div>
        <div className="md:col-span-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-100">
              <div className="text-emerald-700 font-bold text-base leading-tight">{latest?.pct ?? 0}%</div>
              <div className="text-gray-500 text-[10px]">Tập trung</div>
            </div>
            <div className="px-2 py-1.5 rounded-md bg-blue-50 border border-blue-100">
              <div className="text-blue-700 font-bold text-base leading-tight">{latest?.people ?? 0}</div>
              <div className="text-gray-500 text-[10px]">HS phát hiện</div>
            </div>
            <div className="px-2 py-1.5 rounded-md bg-amber-50 border border-amber-100">
              <div className="text-amber-700 font-bold text-base leading-tight">
                {(latest?.head ?? 0) + (latest?.turn ?? 0) + (latest?.phone ?? 0)}
              </div>
              <div className="text-gray-500 text-[10px]">Mất tập trung</div>
            </div>
          </div>

          {series.length === 0 ? (
            <div className="text-center text-[11px] text-gray-500 py-6">
              Đang chờ khung đầu tiên từ MoveNet…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }}
                  formatter={(v: any, n: any) => (n === 'pct' ? [`${v}%`, 'Tập trung'] : [v, n])}
                />
                <Area type="monotone" dataKey="pct" name="pct" stroke="#10b981" strokeWidth={2} fill={`url(#${gradId})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {series.length > 1 && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="focus" name="Tập trung" stroke="#10b981" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="head" name="Cúi đầu" stroke="#f59e0b" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="turn" name="Quay ngang" stroke="#f97316" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="raise" name="Giơ tay" stroke="#3b82f6" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="phone" name="Điện thoại" stroke="#dc2626" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="absent" name="Vắng chỗ" stroke="#9ca3af" strokeWidth={1.8} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ConcentrationBar({ value }: { value: number }) {
  const color = value >= 80 ? '#16a34a' : value >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const nowLabel = React.useMemo(
    () =>
      new Date().toLocaleString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );
  const { learningProfiles } = useSchoolData();
  const [remoteOverview, setRemoteOverview] = useState<any | null>(null);
  const [remoteError, setRemoteError] = useState('');

  const useRemoteClasses =
    remoteOverview &&
    Array.isArray(remoteOverview.classes) &&
    remoteOverview.classes.length > 0;

  /** Lớp đang coi là «đang học» theo SQL (BuoiHoc active + chỉ số đúng buổi) */
  const activeClasses = useRemoteClasses
    ? remoteOverview.classes.filter((l: any) => l.isActive)
    : LIVE_DATA.filter((l) => l.isActive);

  const totalStudents =
    remoteOverview != null
      ? Number(remoteOverview.totalStudents) || 0
      : activeClasses.reduce((s: number, l: any) => s + l.currentStudents, 0);

  const avgConcentration =
    remoteOverview != null
      ? Number(remoteOverview.avgConcentration) || 0
      : activeClasses.length
        ? Math.round(
            activeClasses.reduce((s: number, l: any) => s + l.concentrationLevel, 0) / activeClasses.length,
          )
        : 0;

  const totalClassCount = useRemoteClasses ? remoteOverview.totalClasses : CLASSES.length;

  const topClass = activeClasses.length
    ? activeClasses.reduce((best: any, l: any) =>
        (l.concentrationLevel ?? 0) > (best?.concentrationLevel ?? 0) ? l : best, activeClasses[0])
    : null;
  const alertClasses = activeClasses.filter((l: any) => l.alertStatus !== 'normal');

  const topClassInfo = topClass
    ? useRemoteClasses
      ? null
      : CLASSES.find((c) => c.id === (topClass.classId || topClass.maLop))
    : null;
  const topClassLabel = topClass
    ? useRemoteClasses
      ? (topClass.tenLop || topClass.maLop)
      : (topClassInfo?.name ?? topClass.tenLop ?? topClass.maLop)
    : null;

  const firstAlertInfo = alertClasses[0]
    ? useRemoteClasses
      ? null
      : CLASSES.find((c) => c.id === (alertClasses[0].classId || alertClasses[0].maLop))
    : null;
  const firstAlertLabel = alertClasses[0]
    ? useRemoteClasses
      ? (alertClasses[0].tenLop || alertClasses[0].maLop)
      : (firstAlertInfo?.name ?? alertClasses[0].tenLop)
    : null;

  /** Cập nhật re-render mỗi khi GlobalFocusAnalyzer/FocusMonitorPage lưu kết quả mới. */
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => subscribeFocusDetections(() => setFocusTick((t) => t + 1)), []);

  /**
   * Biểu đồ: với API hiển thị toàn bộ lớp từ SQL (kể cả chưa active) để không trống.
   * Ưu tiên `chiSoTapTrungUocLuong` từ MoveNet (cập nhật 2.5s/lần) — nếu không có thì
   * fallback `concentrationLevel` SQL (15s/lần). Cờ `live` giúp UI nhận biết để tô khác.
   */
  const chartSource = useRemoteClasses ? remoteOverview.classes : activeClasses;
  const chartData = chartSource.map((l: any) => {
    const cls = CLASSES.find((c) => c.id === (l.classId || l.maLop));
    const maLopKey = String(l.maLop || l.classId || '');
    const det = maLopKey ? getFocusDetections(maLopKey) : null;
    const liveConc = det?.phanTich?.chiSoTapTrungUocLuong;
    const livePeople = det?.boxes ? det.boxes.filter((b: any) => !b.lost).length : 0;
    return {
      name: useRemoteClasses ? (l.tenLop || l.maLop) : (cls?.name ?? l.tenLop ?? l.classId ?? l.maLop),
      students: l.currentStudents,
      expected: useRemoteClasses ? (l.siSoDuKien ?? 0) : (cls?.expectedStudents ?? l.siSoDuKien ?? 0),
      concentration: typeof liveConc === 'number' ? liveConc : l.concentrationLevel,
      live: typeof liveConc === 'number',
      livePeople,
    };
  });
  // Tham chiếu để dev biết tick: dùng tránh "unused warning" mà không gây render thừa.
  void focusTick;

  /** Danh sách tất cả lớp đang có bind (video upload, RTSP bridge, HTTP stream…). */
  const [bindList, setBindList] = useState<FocusMonitorBind[]>(() =>
    Object.values(getAllFocusMonitorBinds()).filter((b) => b.mode !== 'none'),
  );
  useEffect(() => {
    const refresh = () =>
      setBindList(Object.values(getAllFocusMonitorBinds()).filter((b) => b.mode !== 'none'));
    return subscribeFocusMonitorBind(refresh);
  }, []);

  /**
   * Time-series tập trung % theo thời gian cho TỪNG lớp đang bind.
   * Mỗi điểm = 1 lượt MoveNet (≈ 2.5s). Giữ tối đa 60 điểm/lớp.
   */
  type FocusPoint = {
    t: number;
    label: string;
    pct: number;
    people: number;
    focus: number;
    head: number;
    turn: number;
    raise: number;
    phone: number;
    absent: number;
  };
  const [seriesByClass, setSeriesByClass] = useState<Record<string, FocusPoint[]>>({});

  // Mỗi lần FOCUS_DETECTIONS_EVENT bắn → thêm điểm cho lớp tương ứng.
  useEffect(() => {
    if (bindList.length === 0) return;
    setSeriesByClass((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const b of bindList) {
        const det = getFocusDetections(b.maLop);
        if (!det) continue;
        const t = new Date(det.at).getTime();
        if (!Number.isFinite(t)) continue;
        const existing = next[b.maLop] || [];
        if (existing.length > 0 && existing[existing.length - 1].t === t) continue;
        const h = det.phanTich?.hanhVi || {};
        const pct = Math.max(0, Math.min(100, Math.round(det.phanTich?.chiSoTapTrungUocLuong ?? 0)));
        const people = det.boxes.filter((bx: any) => !bx.lost).length;
        const label = new Date(t).toLocaleTimeString('vi-VN', { hour12: false });
        next[b.maLop] = [
          ...existing,
          {
            t,
            label,
            pct,
            people,
            focus: Number(h.focus ?? 0),
            head: Number(h.head_down ?? 0),
            turn: Number(h.turn_away ?? 0),
            raise: Number(h.raise_hand ?? 0),
            phone: Number(h.phone ?? 0),
            absent: Number(h.absent ?? 0),
          },
        ].slice(-60);
        changed = true;
      }
      // Cleanup: bỏ chuỗi của lớp đã ngắt bind.
      const activeKeys = new Set(bindList.map((b) => b.maLop));
      for (const k of Object.keys(next)) {
        if (!activeKeys.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [focusTick, bindList]);

  /** Bảng: API = tất cả lớp từ server; không API = chỉ mock đang active */
  const tableRows =
    useRemoteClasses ? remoteOverview.classes : activeClasses;

  /** Trạng thái phòng — chỉ đáng tin khi không dùng API (map id mock c1…); với SQL hiển thị gợi ý */
  const roomStatus = ROOMS.map((room) => {
    const cls = CLASSES.find((c) => c.roomId === room.id);
    const live =
      cls && !useRemoteClasses
        ? activeClasses.find((l: any) => (l.classId || l.maLop) === cls.id && l.isActive)
        : null;
    return { ...room, classInfo: cls, live };
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadOverview = async () => {
      try {
        const data = await fetchDashboardOverview();
        if (mounted) {
          setRemoteOverview(data);
          setRemoteError('');
        }
      } catch (error: any) {
        if (mounted) {
          setRemoteError(error.message ?? 'Khong the tai du lieu API');
        }
      }
    };
    loadOverview();
    const iv = setInterval(loadOverview, 15000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  const riskStudents = learningProfiles.filter(profile =>
    profile.concentrationTrend.length >= 3 &&
    profile.concentrationTrend.slice(-3).every((v, i, arr) => i === 0 || v <= arr[i - 1])
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">{nowLabel} · Cập nhật mỗi 15 giây</p>
          {remoteError && (
            <p className="text-xs text-amber-600 mt-1">
              Đang dùng dữ liệu dự phòng do API lỗi: {remoteError}
            </p>
          )}
          {!remoteError && useRemoteClasses && remoteOverview?.usingSnapshotFallback && (
            <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2 max-w-3xl leading-relaxed">
              <strong>Chưa có buổi học đang active</strong> trong bảng <code className="text-[11px]">BuoiHoc</code> (hoặc
              chưa có <code className="text-[11px]">ChiSoTapTrung</code> khớp mã buổi). Số liệu thẻ tổng quan và biểu đồ
              đang dùng<strong> chỉ số mới nhất / sĩ số dự kiến</strong> ({remoteOverview.totalClasses} lớp). Để có «đang
              học» thực tế: tạo phiên học{' '}
              <code className="text-[11px]">active</code> hoặc chạy nguồn sinh chỉ số (xem README / đồng bộ thiết bị).
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">Hệ thống hoạt động</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lớp đang học"
          value={`${activeClasses.length}/${totalClassCount}`}
          sub={`${Math.max(0, totalClassCount - activeClasses.length)} lớp không active (SQL)`}
          icon={<BookOpen size={20} className="text-blue-600" />}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          title="Tổng số học sinh"
          value={totalStudents}
          sub={
            useRemoteClasses
              ? remoteOverview?.usingSnapshotFallback
                ? `Theo chỉ số mới nhất — dự kiến cả khối ~${remoteOverview.totalExpectedStudents ?? '—'} HS`
                : 'Hiện diện (lớp đang học)'
              : 'Hiện diện trong phòng (demo)'
          }
          icon={<Users size={20} className="text-indigo-600" />}
          color="text-indigo-700"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Lớp tập trung cao nhất"
          value={topClassLabel ?? '–'}
          sub={`Đạt ${topClass?.concentrationLevel ?? 0}% tập trung`}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="text-green-700"
          bg="bg-green-50"
        />
        <StatCard
          title="Lớp cần chú ý"
          value={alertClasses.length > 0 ? (firstAlertLabel ?? '–') : 'Không có'}
          sub={alertClasses.length > 0 ? getAlertLabel(alertClasses[0].alertStatus) : 'Tất cả ổn định'}
          icon={<AlertTriangle size={20} className={alertClasses.length > 0 ? 'text-red-600' : 'text-gray-400'} />}
          color={alertClasses.length > 0 ? 'text-red-600' : 'text-gray-600'}
          bg={alertClasses.length > 0 ? 'bg-red-50' : 'bg-gray-50'}
        />
      </div>

      {/* Grid panel AI Live — MỖI lớp đang bind có 1 panel độc lập */}
      {bindList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-gray-800 font-semibold flex items-center gap-2">
                AI tập trung trực tiếp
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />LIVE
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {bindList.length} lớp đang phân tích song song · cập nhật 2.5 giây/lần
              </p>
            </div>
            <Link to="/monitor/focus/robo" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
              <Sparkles size={12} /> Cấu hình thêm lớp
            </Link>
          </div>

          <div className={bindList.length === 1 ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
            {bindList.map((b) => (
              <FocusClassPanel key={b.maLop} bind={b} series={seriesByClass[b.maLop] || []} />
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Concentration Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-gray-800 font-semibold">Mức tập trung theo lớp</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {useRemoteClasses
                  ? remoteOverview?.usingSnapshotFallback
                    ? 'Tất cả lớp SQL — chỉ số snapshot mới nhất (không có buổi active)'
                    : 'Lớp đang học — theo realtime SQL'
                  : 'Hiện tại đang học (demo)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/monitor/focus/robo" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                <Sparkles size={12} />
                AI tập trung
              </Link>
              <Link to="/monitor" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                Theo dõi <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number, _n: any, item: any) => {
                  const live = item?.payload?.live;
                  return [`${v}%${live ? ' (AI live)' : ''}`, 'Tập trung'];
                }}
              />
              <Bar dataKey="concentration" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={getConcentrationColor(d.concentration)} stroke={d.live ? '#10b981' : undefined} strokeWidth={d.live ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Room status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800 font-semibold">Trạng thái phòng học</h3>
            {!useRemoteClasses ? (
              <span className="text-xs text-gray-400">{roomStatus.filter((r) => r.live).length}/{ROOMS.length} đang dùng</span>
            ) : (
              <span className="text-xs text-gray-400">Demo (map c1…)</span>
            )}
          </div>
          {useRemoteClasses && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
              Phòng học chưa liên kết với lớp trong SQL; khi dùng API hãy xem bảng lớp bên dưới.
            </p>
          )}
          <div className="space-y-3">
            {roomStatus.map(room => (
              <div key={room.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                room.live ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${room.live ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-700">{room.name}</span>
                </div>
                <div className="text-right">
                  {room.live ? (
                    <div>
                      <span className="text-sm font-semibold text-blue-700">{room.live.currentStudents}</span>
                      <span className="text-xs text-gray-400"> người</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Trống</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Classes Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-gray-800 font-semibold">
              {useRemoteClasses ? 'Danh sách lớp (dữ liệu SQL)' : 'Danh sách lớp đang học'}
            </h3>
            {useRemoteClasses && (
              <p className="text-[11px] text-gray-500 mt-1">
                Mã hiển thị là <strong>MãLớp</strong> trong database (khác id demo c1, c2…).
              </p>
            )}
          </div>
          <Link to="/monitor" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            Theo dõi thực tế <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Lớp học</th>
                <th className="text-left text-xs text-gray-500 font-medium px-2 py-3 w-20" title="Khung gửi Roboflow gần nhất">
                  Khung AI
                </th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Giáo viên</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Phòng</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Sĩ số</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 w-44">Mức tập trung</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-500">
                    {useRemoteClasses
                      ? 'Không có bản ghi LopHoc trên máy chủ.'
                      : 'Không có lớp đang học trong bản demo hiện tại.'}
                  </td>
                </tr>
              ) : (
                tableRows.map((live: any) => {
                  if (useRemoteClasses) {
                    const initial = String(live.tenGiaoVien || live.maLop || '?').charAt(0);
                    return (
                      <tr key={live.maLop} className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800 text-sm">{live.tenLop || live.maLop}</div>
                          <div className="text-xs text-gray-400">{live.monHoc ?? '—'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{live.maLop}</div>
                        </td>
                        <td className="px-2 py-3 align-middle">
                          <DashboardFocusThumb maLop={String(live.maLop || '')} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold uppercase">
                              {initial}
                            </div>
                            <span className="text-sm text-gray-700">{live.tenGiaoVien ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">—</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-800">{live.currentStudents ?? 0}</span>
                          <span className="text-xs text-gray-400">
                            /{live.siSoDuKien != null ? live.siSoDuKien : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ConcentrationBar value={Number(live.concentrationLevel) || 0} />
                        </td>
                        <td className="px-4 py-3 space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getAlertStyle(live.alertStatus)}`}
                          >
                            {live.alertStatus !== 'normal' && <AlertTriangle size={10} />}
                            {getAlertLabel(live.alertStatus)}
                          </span>
                          <span
                            className={`block text-[10px] px-1.5 py-0.5 rounded w-fit ${live.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {live.isActive ? 'Buổi active + chỉ số' : 'Chưa active / chỉ snapshot'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/classes/${encodeURIComponent(live.maLop)}`}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Eye size={14} />
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                  const cls = CLASSES.find((c) => c.id === (live.classId || live.maLop));
                  const teacher = cls ? getTeacher(cls.teacherId) : null;
                  const room = cls ? getRoom(cls.roomId) : null;
                  if (!cls) return null;
                  return (
                    <tr
                      key={live.classId || live.maLop}
                      className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-800 text-sm">{cls.name}</div>
                        <div className="text-xs text-gray-400">{cls.subject}</div>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <DashboardFocusThumb maLop={String(live.classId || cls.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {teacher?.avatar.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700">{teacher?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{room?.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-800">{live.currentStudents}</span>
                        <span className="text-xs text-gray-400">/{cls.expectedStudents}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ConcentrationBar value={live.concentrationLevel} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getAlertStyle(live.alertStatus)}`}
                        >
                          {live.alertStatus !== 'normal' && <AlertTriangle size={10} />}
                          {getAlertLabel(live.alertStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/monitor/${cls.id}`}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Eye size={14} />
                          Theo dõi
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {alertClasses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-gray-800 font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Cảnh báo hiện tại
          </h3>
          <div className="space-y-3">
            {alertClasses.map((l: any) => {
              const cls = useRemoteClasses ? null : CLASSES.find((c) => c.id === (l.classId || l.maLop));
              const room = cls ? getRoom(cls.roomId) : null;
              const title = useRemoteClasses ? (l.tenLop || l.maLop) : cls?.name;
              const exp = useRemoteClasses ? l.siSoDuKien : cls?.expectedStudents;
              return (
                <div key={l.classId || l.maLop} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                  l.alertStatus === 'low_attendance' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div>
                    <span className={`font-medium text-sm ${l.alertStatus === 'low_attendance' ? 'text-red-700' : 'text-amber-700'}`}>
                      {title}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">· {room?.name ?? 'Phòng (SQL chưa map)'}</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {l.alertStatus === 'low_concentration'
                        ? `Mức tập trung chỉ đạt ${l.concentrationLevel}% — cần theo dõi thêm`
                        : `Sĩ số chỉ ${l.currentStudents}/${exp ?? '—'} — thấp bất thường`
                      }
                    </p>
                  </div>
                  <Link to={useRemoteClasses ? `/monitor` : `/monitor/${l.classId || l.maLop}`}>
                    <button className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 ${
                      l.alertStatus === 'low_attendance' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}>
                      Xem <ChevronRight size={12} />
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-gray-800 font-semibold mb-3">Phân tích lớp học thông minh</h3>
        {riskStudents.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Không có học sinh tụt tập trung liên tiếp trong 3 buổi gần nhất.
          </p>
        ) : (
          <div className="space-y-2">
            {riskStudents.map(item => (
              <div key={item.studentId} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-sm text-red-700">Học sinh {item.studentId} đang có xu hướng giảm tập trung</span>
                <Link to="/classes/c1" className="text-xs text-blue-600 hover:underline">Xem can thiệp</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
