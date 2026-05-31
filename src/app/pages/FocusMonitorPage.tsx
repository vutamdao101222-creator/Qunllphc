import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CLASSES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import {
  fetchClassesPage,
  fetchDashboardOverview,
  fetchRoboflowFocusConfig,
  postRoboflowFocusWorkflow,
  buildRtspMjpegUrl,
  probeRtspFfmpeg,
  captureRtspTestSnapshot,
} from '../lib/api';
import {
  analyzeBehaviorOnFrame,
  createBehaviorState,
  ensurePoseDetector,
} from '../lib/behaviorAnalyzer';
import { bumpFocusLocalActive } from '../components/GlobalFocusAnalyzer';
import type { BehaviorCounts } from '../lib/focusDetectionsStorage';
import DetectionOverlayCanvas from '../components/monitor/DetectionOverlayCanvas';
import {
  saveFocusClassSnapshot,
  getFocusUiState,
  saveFocusUiState,
  getFocusMonitorBind,
  setFocusMonitorBind,
  normalizeFocusMaLop,
  saveFocusLastResult,
  getFocusLastResult,
} from '../lib/focusSnapshotStorage';
import { persistFocusDetectionsFromApi } from '../lib/roboflowDetectionsExtract';
import { toast } from 'sonner';
import {
  Sparkles,
  Camera,
  Film,
  Globe,
  Upload,
  Square,
  Play,
  Link2,
  GraduationCap,
} from 'lucide-react';

const FOCUS_CLASS_KEY = 'edu_focus_maLop';

/** Ba lựa chọn trên web: webcam | tệp cục bộ (ảnh hoặc video) | luồng URL xem được (HTTP/HTTPS) — RTSP chỉ lưu ghi chú */
type SourceKind = 'webcam' | 'local_file' | 'network_stream';

type ApiSource = 'webcam' | 'image_upload' | 'video_upload' | 'stream_http' | 'rtsp';

export default function FocusMonitorPage() {
  const { user } = useAuth();
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const fileVideoRef = useRef<HTMLVideoElement>(null);
  const streamVideoRef = useRef<HTMLVideoElement>(null);
  const streamMjpegImgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [maLop, setMaLop] = useState('');
  const [source, setSource] = useState<SourceKind>('webcam');
  const [rtspNote, setRtspNote] = useState('');
  const [httpStreamUrl, setHttpStreamUrl] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [pickedIsVideo, setPickedIsVideo] = useState(false);
  const [fileVideoUrl, setFileVideoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [robofCfg, setRobofCfg] = useState<any>(null);
  const [autoRun, setAutoRun] = useState(true); // bật mặc định — live không cần ấn nút
  const [dbClasses, setDbClasses] = useState<Array<{ maLop: string; tenLop?: string }>>([]);
  const [bridgedMjpegUrl, setBridgedMjpegUrl] = useState<string | null>(null);
  const [ffmpegProbe, setFfmpegProbe] = useState<{ ok: boolean; version?: string; error?: string } | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [snapshotBlobUrl, setSnapshotBlobUrl] = useState<string | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  /** Tiến độ + kết quả phân tích toàn bộ video — chế độ batch để có báo cáo theo phút. */
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchReport, setBatchReport] = useState<null | {
    stepSec: number;
    durationSec: number;
    points: Array<{ t: number; counts: BehaviorCounts; present: number; pct: number }>;
    perMinute: Array<{ minute: number; pct: number; counts: BehaviorCounts; samples: number }>;
  }>(null);
  const batchCancelRef = useRef(false);
  const focusHydratedRef = useRef(false);

  useEffect(() => {
    fetchRoboflowFocusConfig()
      .then(setRobofCfg)
      .catch(() => setRobofCfg(null));

    // Lấy lớp từ 2 nguồn để khớp với trang Tổng quan: /lop-hoc và /dashboard/tong-quan.
    // Tổng quan có thể chứa thêm lớp đang học (LH10A1…) chưa có trong /lop-hoc.
    Promise.all([
      fetchClassesPage({ pageSize: 100 }).catch(() => ({ items: [] })),
      fetchDashboardOverview().catch(() => ({ classes: [] })),
    ]).then(([page, overview]) => {
      const m = new Map<string, string>();
      const addRow = (maLop: any, tenLop: any) => {
        const k = String(maLop || '').trim();
        if (!k) return;
        if (!m.has(k) || (tenLop && tenLop !== k)) m.set(k, String(tenLop || k));
      };
      if (Array.isArray((page as any)?.items)) {
        for (const r of (page as any).items) addRow(r.maLop, r.tenLop);
      }
      if (Array.isArray((overview as any)?.classes)) {
        for (const r of (overview as any).classes) addRow(r.maLop ?? r.classId, r.tenLop);
      }
      setDbClasses([...m.entries()].map(([maLop, tenLop]) => ({ maLop, tenLop })));
    });

    void probeRtspFfmpeg().then(setFfmpegProbe);
  }, []);

  /**
   * Đồng bộ vị trí phát video giữa Tổng quan ↔ Robo cho cùng mã lớp.
   * Dùng chung key sessionStorage `edu_focus_panel_pos__<maLop>` với FocusClassPanel.
   * Khi user xem ở Tổng quan tới phút 15 rồi quay về Robo, video tiếp tục đúng phút 15.
   *
   * CHÚ Ý: KHÔNG ghi currentTime trong cleanup — vì khi `<video>` vừa mount,
   * currentTime=0 sẽ đè lên giá trị 900 đã lưu, gây hỏng cơ chế resume.
   * Chỉ ghi qua `timeupdate` (chạy liên tục khi video play / seek).
   */
  useEffect(() => {
    const ml = normalizeFocusMaLop(maLop);
    if (!ml) return;
    const v = fileVideoRef.current || streamVideoRef.current;
    if (!v) return;
    const posKey = `edu_focus_panel_pos__${ml}`;
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
    v.addEventListener('loadeddata', apply); // bổ sung — một số trình duyệt firee loadedmetadata trễ
    const onTime = () => {
      // Chỉ ghi khi đã chắc chắn không phải 0 lúc mới load (tránh đè giá trị đã lưu).
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
  }, [maLop, fileVideoUrl, httpStreamUrl, source, pickedIsVideo]);

  /**
   * Khôi phục lớp + nguồn lần đầu mount. Tự động tra bind ĐÚNG mã lớp (sau khi multi-class),
   * không lấy bind mới nhất rồi so khớp như trước (gây mất video khi quay lại lớp 10A1
   * trong khi bind mới nhất là của 11A1).
   */
  useLayoutEffect(() => {
    if (focusHydratedRef.current) return;
    const ui = getFocusUiState();
    let initialMa = '';
    if (ui) {
      if (ui.maLop) initialMa = ui.maLop;
      setAutoRun(ui.autoRun);
      setRtspNote(ui.rtspNote);
    }
    if (!initialMa) {
      try {
        initialMa = sessionStorage.getItem(FOCUS_CLASS_KEY) || '';
      } catch {
        /* ignore */
      }
    }
    let queryMaLop = '';
    try {
      queryMaLop = new URLSearchParams(window.location.search).get('maLop')?.trim() || '';
    } catch {
      /* ignore */
    }
    if (queryMaLop) initialMa = queryMaLop;
    if (initialMa) setMaLop(initialMa);

    // Áp nguồn theo bind đã lưu CHO ĐÚNG lớp này (không phải bind mới nhất nói chung).
    const nm = initialMa ? normalizeFocusMaLop(initialMa) : '';
    const b = nm ? getFocusMonitorBind(nm) : null;
    if (b && b.mode !== 'none') {
      if (b.mode === 'blob' && b.blobUrl?.startsWith('blob:')) {
        fileBlobUrlRef.current = b.blobUrl;
        setFileVideoUrl(b.blobUrl);
        setPickedIsVideo(true);
        setSource('local_file');
      } else if (b.mode === 'mjpeg' && b.httpUrl) {
        setSource('network_stream');
        setRtspNote(b.displayUrl || ''); // URL rtsp:// gốc — để nút "Kết nối" sẵn sàng
        setHttpStreamUrl('');
        setBridgedMjpegUrl(b.httpUrl);
      } else if (b.mode === 'http' && b.httpUrl) {
        setSource('network_stream');
        setHttpStreamUrl(b.displayUrl || b.httpUrl);
        setRtspNote('');
        setBridgedMjpegUrl(null);
      }
    } else if (ui) {
      // Không có bind cho lớp này → áp tạm UI state cũ (source mặc định).
      setSource(ui.source);
      setHttpStreamUrl(ui.httpStreamUrl);
      setPickedIsVideo(ui.pickedIsVideo);
    }

    const lrMa = initialMa || (ui?.maLop ?? '');
    if (lrMa) {
      const prev = getFocusLastResult(lrMa);
      if (prev != null) setLastResult(prev);
    }
    focusHydratedRef.current = true;
  }, []);

  const classOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of dbClasses) map.set(r.maLop, r.tenLop || r.maLop);
    for (const c of CLASSES) {
      if (!map.has(c.code)) map.set(c.code, c.name);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [dbClasses]);

  useEffect(() => {
    if (classOptions.length && !maLop) setMaLop(classOptions[0][0]);
  }, [classOptions, maLop]);

  useEffect(() => {
    try {
      if (maLop) sessionStorage.setItem(FOCUS_CLASS_KEY, maLop);
    } catch {
      /* ignore */
    }
  }, [maLop]);

  useEffect(() => {
    if (!focusHydratedRef.current) return;
    saveFocusUiState({
      maLop,
      source,
      httpStreamUrl,
      rtspNote,
      autoRun,
      pickedIsVideo,
    });
  }, [maLop, source, httpStreamUrl, rtspNote, autoRun, pickedIsVideo]);

  useEffect(() => {
    if (!focusHydratedRef.current || !maLop.trim()) return;
    const prev = getFocusLastResult(maLop);
    setLastResult(prev != null ? prev : null);
  }, [maLop]);

  useEffect(() => {
    if (!focusHydratedRef.current) return;
    if (source === 'webcam') {
      setFocusMonitorBind({ maLop: normalizeFocusMaLop(maLop), mode: 'none', updatedAt: Date.now() });
    }
  }, [source, maLop]);

  useEffect(() => {
    if (!focusHydratedRef.current) return;
    if (source === 'local_file' && !pickedIsVideo) {
      setFocusMonitorBind({ maLop: normalizeFocusMaLop(maLop), mode: 'none', updatedAt: Date.now() });
    }
  }, [source, pickedIsVideo, maLop]);

  /**
   * Khi user đổi mã lớp ở dropdown: khôi phục bind đã lưu của lớp đó.
   * Cho phép cấu hình độc lập, ví dụ 10A1 = video upload, 11A1 = RTSP — không đè lẫn nhau.
   */
  useEffect(() => {
    if (!focusHydratedRef.current || !maLop.trim()) return;
    const nm = normalizeFocusMaLop(maLop);
    const b = getFocusMonitorBind(nm);
    if (!b || b.mode === 'none') {
      // Lớp này chưa có bind → reset trạng thái stream/bridge của lớp trước.
      setBridgedMjpegUrl(null);
      setBridgeError(null);
      return;
    }
    // Áp lại đúng nguồn của lớp được chọn.
    if (b.mode === 'mjpeg' && b.httpUrl) {
      setSource('network_stream');
      setRtspNote(b.displayUrl || ''); // text rtsp:// gốc
      setHttpStreamUrl('');
      setBridgedMjpegUrl(b.httpUrl);
      setBridgeError(null);
      setPickedIsVideo(false);
      setFileVideoUrl(null);
      fileBlobUrlRef.current = null;
    } else if (b.mode === 'http' && b.httpUrl) {
      setSource('network_stream');
      setHttpStreamUrl(b.displayUrl || b.httpUrl);
      setRtspNote('');
      setBridgedMjpegUrl(null);
      setPickedIsVideo(false);
      setFileVideoUrl(null);
      fileBlobUrlRef.current = null;
    } else if (b.mode === 'blob' && b.blobUrl?.startsWith('blob:')) {
      setSource('local_file');
      fileBlobUrlRef.current = b.blobUrl;
      setFileVideoUrl(b.blobUrl);
      setPickedIsVideo(true);
      setBridgedMjpegUrl(null);
      setHttpStreamUrl('');
      setRtspNote('');
    }
  }, [maLop]);

  /**
   * Auto-save bind theo URL hiện tại. Có 2 quy tắc bảo vệ:
   *   1) Bỏ qua nếu vừa đổi mã lớp (`prevAutoSaveMaLopRef`) — vì các state URL còn
   *      thuộc class cũ, ghi sẽ làm hỏng bind của class mới (vd 10A1 có video
   *      bị đè bằng RTSP của 11A1).
   *   2) Bỏ qua nếu bind hiện tại của class này khác mode 'mjpeg'/'http' — tức user
   *      đang ở mode khác (blob), không phải đang gõ URL.
   */
  const prevAutoSaveMaLopRef = useRef<string>('');
  useEffect(() => {
    if (!focusHydratedRef.current || source !== 'network_stream') return;
    const nm = normalizeFocusMaLop(maLop);
    if (!nm) return;
    const prev = prevAutoSaveMaLopRef.current;
    prevAutoSaveMaLopRef.current = nm;
    // Chỉ skip khi vừa đổi class TỪ class KHÁC sang nm (race state stale).
    // Khi prev rỗng (mount lần đầu) thì cho phép save bình thường.
    if (prev && prev !== nm) return;
    if (bridgedMjpegUrl) {
      setFocusMonitorBind({
        maLop: nm,
        mode: 'mjpeg',
        httpUrl: bridgedMjpegUrl,
        // Ưu tiên rtspNote (input RTSP), fallback httpStreamUrl khi user gõ rtsp:// vào ô HTTP cũ.
        displayUrl: rtspNote.trim() || httpStreamUrl.trim() || undefined,
        blobUrl: undefined,
        updatedAt: Date.now(),
      });
      return;
    }
    const u = httpStreamUrl.trim();
    if (!u || u.toLowerCase().startsWith('rtsp://') || !/^https?:\/\//i.test(u)) return;
    const t = window.setTimeout(() => {
      setFocusMonitorBind({
        maLop: nm,
        mode: 'http',
        httpUrl: u,
        displayUrl: u,
        blobUrl: undefined,
        updatedAt: Date.now(),
      });
    }, 450);
    return () => clearTimeout(t);
  }, [httpStreamUrl, bridgedMjpegUrl, maLop, source, rtspNote]);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null;
  }, []);

  const startWebcam = useCallback(async () => {
    stopWebcam();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = media;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = media;
        await webcamVideoRef.current.play();
      }
      toast.success('Đã bật webcam');
    } catch {
      toast.error('Không mở được webcam.');
    }
  }, [stopWebcam]);

  useEffect(() => {
    if (source === 'webcam') void startWebcam();
    else stopWebcam();
    return () => stopWebcam();
  }, [source, startWebcam, stopWebcam]);

  const captureToDataUrl = useCallback((v: HTMLVideoElement | null): string | null => {
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return null;
    c.width = Math.min(v.videoWidth, 1280);
    c.height = Math.round((c.width / v.videoWidth) * v.videoHeight);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.drawImage(v, 0, 0, c.width, c.height);
    } catch {
      toast.error('Không đọc được khung hình (CORS hoặc chưa sẵn sàng). Thử URL khác hoặc dùng tệp/ webcam.');
      return null;
    }
    return c.toDataURL('image/jpeg', 0.85);
  }, []);

  const captureImgToDataUrl = useCallback((img: HTMLImageElement | null): string | null => {
    const c = canvasRef.current;
    if (!img || !c || !img.naturalWidth) return null;
    c.width = Math.min(img.naturalWidth, 1280);
    c.height = Math.round((c.width / img.naturalWidth) * img.naturalHeight);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.drawImage(img, 0, 0, c.width, c.height);
    } catch {
      toast.error('Không đọc được khung MJPEG (CORS / chưa có frame). Đợi vài giây hoặc kiểm tra cầu nối.');
      return null;
    }
    return c.toDataURL('image/jpeg', 0.85);
  }, []);

  /** Tạo URL cầu nối MJPEG từ RTSP — hiển thị qua <img>, COCO‑SSD detect trực tiếp. */
  const connectRtspBridge = useCallback(() => {
    const r = rtspNote.trim();
    if (!r.toLowerCase().startsWith('rtsp://')) {
      toast.error('URL phải bắt đầu bằng rtsp://');
      return;
    }
    if (ffmpegProbe && !ffmpegProbe.ok) {
      toast.error(
        'Server chưa có ffmpeg. Cài ffmpeg (winget install ffmpeg) hoặc đặt FFMPEG_PATH trong .env rồi khởi động lại API.',
      );
      return;
    }
    setBridgeError(null);
    setBridgedMjpegUrl(buildRtspMjpegUrl(r, { fps: 4, q: 6, w: 960 }));
    toast.success('Đã kết nối qua cầu nối ffmpeg — chờ vài giây để có khung đầu.');
  }, [rtspNote, ffmpegProbe]);

  const disconnectRtspBridge = useCallback(() => {
    setBridgedMjpegUrl(null);
    setPreviewDataUrl(null);
    setBridgeError(null);
  }, []);

  /** Khi <img> báo lỗi tải MJPEG — fetch lại để đọc JSON lỗi từ server (stderr ffmpeg). */
  const handleMjpegImgError = useCallback(async () => {
    if (!bridgedMjpegUrl) return;
    try {
      const resp = await fetch(bridgedMjpegUrl, { cache: 'no-store' });
      const ct = resp.headers.get('content-type') || '';
      if (!resp.ok && ct.includes('application/json')) {
        const j = await resp.json().catch(() => null);
        const msg = j?.message || `HTTP ${resp.status}`;
        const stderr: string | null = j?.stderr ?? null;
        setBridgeError(stderr ? `${msg}\n${stderr}` : msg);
        return;
      }
      setBridgeError(`HTTP ${resp.status}`);
    } catch (e) {
      setBridgeError(e instanceof Error ? e.message : String(e));
    }
  }, [bridgedMjpegUrl]);

  /** Test nhanh: chụp 1 JPEG từ RTSP để xác minh server thực sự thấy camera. */
  const testRtspSnapshot = useCallback(async () => {
    const r = rtspNote.trim();
    if (!r.toLowerCase().startsWith('rtsp://')) {
      toast.error('Nhập URL bắt đầu bằng rtsp:// để test.');
      return;
    }
    if (ffmpegProbe && !ffmpegProbe.ok) {
      toast.error('Server chưa có ffmpeg.');
      return;
    }
    setSnapshotBusy(true);
    setBridgeError(null);
    if (snapshotBlobUrl) {
      URL.revokeObjectURL(snapshotBlobUrl);
      setSnapshotBlobUrl(null);
    }
    const r2 = await captureRtspTestSnapshot(r, { w: 960, timeoutMs: 12000 });
    setSnapshotBusy(false);
    if (r2.ok) {
      setSnapshotBlobUrl(r2.blobUrl);
      toast.success('Đã chụp được khung — RTSP hoạt động. Có thể bật cầu nối MJPEG.');
    } else {
      setBridgeError(r2.stderr ? `${r2.message}\n${r2.stderr}` : r2.message);
      toast.error('Không lấy được ảnh từ RTSP. Xem chi tiết bên dưới.');
    }
  }, [rtspNote, ffmpegProbe, snapshotBlobUrl]);

  useEffect(() => () => {
    if (snapshotBlobUrl) URL.revokeObjectURL(snapshotBlobUrl);
  }, [snapshotBlobUrl]);

  /**
   * Tua video theo bước cố định (default 5 giây) → chạy MoveNet ở từng mốc → gộp theo phút.
   * Trả về timeline + báo cáo tỉ lệ tập trung/cúi đầu/quay sang/giơ tay/điện thoại/vắng chỗ.
   */
  const analyzeWholeVideo = useCallback(
    async (stepSec = 5) => {
      const v = fileVideoRef.current;
      if (!v || !Number.isFinite(v.duration) || v.duration < 1) {
        toast.error('Video chưa sẵn sàng — bấm Play vài giây rồi thử lại.');
        return;
      }
      setBatchBusy(true);
      setBatchProgress({ done: 0, total: Math.floor(v.duration) });
      setBatchReport(null);
      batchCancelRef.current = false;
      const wasMuted = v.muted;
      const wasPaused = v.paused;
      try {
        v.muted = true;
        v.pause();
        await ensurePoseDetector();
      } catch (e) {
        toast.error('Không tải được mô hình AI — kiểm tra mạng.');
        setBatchBusy(false);
        return;
      }
      const state = createBehaviorState();
      const points: Array<{ t: number; counts: BehaviorCounts; present: number; pct: number }> = [];
      const total = Math.max(1, Math.floor(v.duration));
      for (let t = 0; t < total; t += stepSec) {
        if (batchCancelRef.current) break;
        // Seek tới mốc t (giây).
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            v.removeEventListener('seeked', finish);
            resolve();
          };
          v.addEventListener('seeked', finish, { once: true });
          try {
            v.currentTime = Math.min(t, total - 0.05);
          } catch {
            finish();
          }
          window.setTimeout(finish, 1500); // fallback chống treo nếu seeked không fire
        });
        // Cho pixel render xong trước khi đọc.
        await new Promise((r) => setTimeout(r, 120));
        try {
          const r = await analyzeBehaviorOnFrame(v, state, {
            minAgeToShow: 1,
            multiTile: true,
            hybridCoco: true,
          });
          points.push({
            t,
            counts: r.phanTich.hanhVi ?? {},
            present: r.boxes.filter((b) => !b.lost).length,
            pct: r.phanTich.chiSoTapTrungUocLuong ?? 0,
          });
        } catch (e) {
          /* bỏ qua mốc lỗi, tiếp tục */
        }
        setBatchProgress({ done: Math.min(t + stepSec, total), total });
      }

      // Gom theo phút: trung bình % tập trung + tổng đếm hành vi.
      const perMinuteMap = new Map<
        number,
        { minute: number; sumPct: number; samples: number; counts: BehaviorCounts }
      >();
      for (const p of points) {
        const minute = Math.floor(p.t / 60);
        const cur = perMinuteMap.get(minute) ?? { minute, sumPct: 0, samples: 0, counts: {} };
        cur.sumPct += p.pct;
        cur.samples += 1;
        for (const [k, vv] of Object.entries(p.counts)) {
          (cur.counts as any)[k] = ((cur.counts as any)[k] ?? 0) + (vv as number);
        }
        perMinuteMap.set(minute, cur);
      }
      const perMinute = Array.from(perMinuteMap.values())
        .sort((a, b) => a.minute - b.minute)
        .map((r) => ({
          minute: r.minute,
          pct: r.samples > 0 ? Math.round(r.sumPct / r.samples) : 0,
          counts: r.counts,
          samples: r.samples,
        }));

      setBatchReport({ stepSec, durationSec: total, points, perMinute });
      setBatchBusy(false);
      setBatchProgress(null);
      v.muted = wasMuted;
      if (!wasPaused) {
        void v.play().catch(() => {});
      }
      toast.success(`Phân tích xong ${points.length} mốc, ${perMinute.length} phút.`);
    },
    [],
  );

  const cancelBatch = useCallback(() => {
    batchCancelRef.current = true;
  }, []);

  /** State MoveNet dùng chung cho cả manual + auto — giữ tracker liên tục giữa các lần. */
  const localBehaviorStateRef = useRef<ReturnType<typeof createBehaviorState> | null>(null);

  /**
   * Chạy MoveNet trực tiếp trong trình duyệt (giống trang Theo dõi) lên khung hiện tại của nguồn
   * đang chọn — không gọi backend Roboflow → kết quả luôn là dữ liệu thật từ pose, không mock.
   * @param silent true (auto-run) → không hiện toast / cờ busy để khỏi rung UI.
   */
  const analyzeCurrentFrameLocal = useCallback(async (silent = false) => {
    const ml = maLop.trim();
    if (!ml) {
      if (!silent) toast.error('Chọn lớp ở bước 1.');
      return;
    }
    let el: HTMLVideoElement | HTMLImageElement | null = null;
    if (source === 'webcam') el = webcamVideoRef.current;
    else if (source === 'local_file' && pickedIsVideo) el = fileVideoRef.current;
    else if (source === 'network_stream') {
      el = bridgedMjpegUrl ? streamMjpegImgRef.current : streamVideoRef.current;
    }
    if (!el) {
      if (!silent) toast.error('Chưa có nguồn hình — bấm Play hoặc bật cầu nối trước.');
      return;
    }
    if (!silent) setBusy(true);
    try {
      await ensurePoseDetector();
      if (!localBehaviorStateRef.current) {
        localBehaviorStateRef.current = createBehaviorState();
      }
      const state = localBehaviorStateRef.current;
      // Trang phân tích thủ công: vẽ ngay từ khung đầu (live realtime ở Monitor page dùng default = 3).
      const r = await analyzeBehaviorOnFrame(el, state, {
        minAgeToShow: 1,
        multiTile: true,
        hybridCoco: true,
      });
      const snap = captureToDataUrl(el as HTMLVideoElement) ?? captureImgToDataUrl(el as HTMLImageElement);
      if (snap) saveFocusClassSnapshot(ml, snap);
      saveFocusLastResult(ml, { localMovenet: true, ...r });
      const { saveFocusDetections } = await import('../lib/focusDetectionsStorage');
      saveFocusDetections(ml, {
        boxes: r.boxes,
        phanTich: r.phanTich,
        summary: r.summary,
        at: new Date().toISOString(),
      });
      const { persistFocusAnalysisToServer } = await import('../lib/focusPersist');
      void persistFocusAnalysisToServer(ml, {
        concentrationLevel: r.phanTich.chiSoTapTrungUocLuong ?? 0,
        presentCount: r.boxes.filter((b) => !b.lost).length,
        summary: r.summary,
        phanTich: r.phanTich,
        behaviorCounts: r.phanTich.hanhVi,
        source: 'browser_ai',
      });
      setLastResult({ source: 'movenet_browser', ...r });
      if (!silent) {
        toast.success(`Đã phân tích bằng MoveNet — phát hiện ${r.boxes.filter((b) => !b.lost).length} học sinh.`);
      }
    } catch (e) {
      if (!silent) toast.error('Lỗi MoveNet: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (!silent) setBusy(false);
    }
  }, [maLop, source, pickedIsVideo, bridgedMjpegUrl, captureToDataUrl, captureImgToDataUrl]);

  // Reset tracker khi đổi nguồn để ID không chéo giữa các stream khác nhau.
  useEffect(() => {
    localBehaviorStateRef.current = createBehaviorState();
  }, [source, bridgedMjpegUrl, fileVideoUrl]);

  const runInference = useCallback(
    async (imageBase64: string, apiSrc: ApiSource) => {
      if (!maLop.trim()) {
        toast.error('Chọn lớp cần gắn');
        return;
      }
      setBusy(true);
      try {
        const out = await postRoboflowFocusWorkflow({
          maLop: maLop.trim(),
          source: apiSrc,
          imageBase64,
        });
        setLastResult(out);
        try {
          saveFocusClassSnapshot(maLop.trim(), imageBase64);
          saveFocusLastResult(maLop.trim(), out);
          void persistFocusDetectionsFromApi(maLop.trim(), out, imageBase64);
        } catch {
          /* ignore */
        }
        toast.success(`Đã nhận kết quả (lớp ${maLop.trim()})`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(msg);
        setLastResult({ error: msg });
      } finally {
        setBusy(false);
      }
    },
    [maLop],
  );

  /**
   * @param silent true = gọi từ interval tự động: không toast khi video chưa Play / chưa có khung (tránh spam đỏ).
   */
  const analyzeCurrentFrame = useCallback(async (silent = false) => {
    if (!maLop.trim()) {
      if (!silent) toast.error('Chọn lớp ở bước 1.');
      return;
    }

    if (source === 'webcam') {
      const url = captureToDataUrl(webcamVideoRef.current);
      if (!url) {
        if (!silent) toast.error('Chưa có hình từ webcam.');
        return;
      }
      setPreviewDataUrl(url);
      await runInference(url, 'webcam');
      return;
    }

    if (source === 'local_file') {
      if (pickedIsVideo) {
        const url = captureToDataUrl(fileVideoRef.current);
        if (!url) {
          if (!silent) {
            toast.error('Chưa chụp được khung: bấm nút Play trên thanh video (thời gian > 0:00), đợi vài giây rồi thử lại.');
          }
          return;
        }
        setPreviewDataUrl(url);
        await runInference(url, 'video_upload');
        return;
      }
      if (!previewDataUrl) {
        if (!silent) toast.error('Chọn ảnh trước.');
        return;
      }
      await runInference(previewDataUrl, 'image_upload');
      return;
    }

    if (source === 'network_stream') {
      // Ưu tiên cầu nối MJPEG nếu đã kết nối — chụp khung từ <img> rồi gửi như stream_http
      // (server chặn source='rtsp' vì xưa không có cách chụp khung; giờ có bridge nên dùng stream_http).
      if (bridgedMjpegUrl) {
        const url = captureImgToDataUrl(streamMjpegImgRef.current);
        if (!url) {
          if (!silent) toast.error('Chưa lấy được khung MJPEG — đợi vài giây sau khi bật cầu nối.');
          return;
        }
        setPreviewDataUrl(url);
        await runInference(url, 'stream_http');
        return;
      }
      if (httpStreamUrl.trim().toLowerCase().startsWith('rtsp://')) {
        if (!silent) {
          toast.error(
            'URL này là RTSP — bấm «Kết nối qua cầu nối ffmpeg» bên trên thay vì dán vào ô HTTP, hoặc dùng URL HTTP (MP4/HLS).',
          );
        }
        return;
      }
      if (!httpStreamUrl.trim()) {
        if (!silent) toast.error('Nhập URL luồng HTTP/HTTPS có thể mở bằng thẻ video (thường là MP4, hoặc HLS tuỳ trình duyệt).');
        return;
      }
      const url = captureToDataUrl(streamVideoRef.current);
      if (!url) {
        if (!silent) {
          toast.error('Chưa lấy được khung — bấm Play trên video hoặc kiểm tra CORS của máy chủ.');
        }
        return;
      }
      setPreviewDataUrl(url);
      await runInference(url, 'stream_http');
    }
  }, [maLop, source, pickedIsVideo, previewDataUrl, httpStreamUrl, bridgedMjpegUrl, captureToDataUrl, captureImgToDataUrl, runInference]);

  /** Cờ báo cho UI biết auto-loop đang chạy (xanh nháy "LIVE"). */
  const [autoLive, setAutoLive] = useState(false);

  useEffect(() => {
    setAutoLive(false);
    if (!autoRun) return;
    // Cho phép auto khi có cầu nối MJPEG; chỉ chặn khi user dán rtsp:// nhưng chưa bridge.
    if (source === 'network_stream' && httpStreamUrl.trim().toLowerCase().startsWith('rtsp') && !bridgedMjpegUrl)
      return;
    // Auto-run dùng MoveNet trong trình duyệt — không gọi Roboflow để khỏi spam lỗi ECONNREFUSED.
    // Cờ busy đảm bảo nếu 1 lượt > 2s thì lượt sau bị skip → CPU không bị nghẹn.
    let busy = false;
    let stopped = false;
    setAutoLive(true);
    const ml = normalizeFocusMaLop(maLop);
    const tick = async () => {
      if (stopped || busy) return;
      busy = true;
      try {
        bumpFocusLocalActive(ml); // báo analyzer toàn cục bỏ qua ĐÚNG lớp này
        await analyzeCurrentFrameLocal(true);
      } finally {
        busy = false;
      }
    };
    const kick = window.setTimeout(() => void tick(), 300);
    const t = window.setInterval(() => void tick(), 2000);
    const hb = window.setInterval(() => bumpFocusLocalActive(ml), 1000);
    return () => {
      stopped = true;
      window.clearTimeout(kick);
      window.clearInterval(t);
      window.clearInterval(hb);
      setAutoLive(false);
    };
  }, [autoRun, source, httpStreamUrl, bridgedMjpegUrl, analyzeCurrentFrameLocal]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (fileBlobUrlRef.current) {
      URL.revokeObjectURL(fileBlobUrlRef.current);
      fileBlobUrlRef.current = null;
    }
    setPreviewDataUrl(null);
    setFileVideoUrl(null);

    const isVid = /^video\//i.test(f.type) || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(f.name);
    setPickedIsVideo(isVid);

    if (isVid) {
      const obj = URL.createObjectURL(f);
      fileBlobUrlRef.current = obj;
      setFileVideoUrl(obj);
      const ml = normalizeFocusMaLop(maLop);
      if (ml) {
        setFocusMonitorBind({
          maLop: ml,
          mode: 'blob',
          blobUrl: obj,
          fileName: f.name,
          updatedAt: Date.now(),
        });
      }
    } else {
      const ml = normalizeFocusMaLop(maLop);
      if (ml) setFocusMonitorBind({ maLop: ml, mode: 'none', updatedAt: Date.now() });
      const r = new FileReader();
      r.onload = () => {
        const u = typeof r.result === 'string' ? r.result : null;
        setPreviewDataUrl(u);
      };
      r.readAsDataURL(f);
    }
  };

  const threeChoices = (
    [
      {
        key: 'webcam' as const,
        title: '1 · Webcam trực tiếp',
        desc: 'Camera trên máy tính / laptop. Luồng xử lý trong trình duyệt, chỉ khung ảnh gửi lên API.',
        icon: Camera,
      },
      {
        key: 'local_file' as const,
        title: '2 · Tệp ảnh hoặc video',
        desc: 'Chọn JPG/PNG hoặc video MP4… Trình duyệt chiếu video và “chụp” khung gửi mô hình.',
        icon: Film,
      },
      {
        key: 'network_stream' as const,
        title: '3 · Luồng HTTP/HTTPS hoặc ghi RTSP',
        desc: 'Dán URL có thể mở bằng trình duyệt (thường MP4). RTSP chỉ làm nhật ký; phân tích cần bản HTTP hoặc tool Python.',
        icon: Globe,
      },
    ] as const
  ).map((x) => ({ ...x, Icon: x.icon }));

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="p-6 text-center text-gray-500">
        Chỉ giáo viên hoặc quản trị sử dụng trang này.
      </div>
    );
  }

  const streamAnalyzeDisabled =
    source === 'network_stream' &&
    !bridgedMjpegUrl &&
    (!httpStreamUrl.trim() || httpStreamUrl.trim().toLowerCase().startsWith('rtsp://'));

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-gray-900">AI nhận diện tập trung trong trình duyệt</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl leading-relaxed">
            Mô hình Roboflow chạy trên máy chủ Inference (Python), còn <strong>trang web</strong> chỉ lo:{' '}
            <strong className="text-gray-700">chọn lớp</strong> → <strong className="text-gray-700">một trong ba nguồn hình</strong> →{' '}
            <strong className="text-gray-700">gửi khung ảnh</strong> lên EduMonitor để proxy sang Inference. Sau khi phân tích{' '}
            <strong className="text-gray-700">thành công</strong>, khung ảnh được lưu theo mã lớp trong phiên trình duyệt và hiện ở{' '}
            <strong className="text-gray-700">Tổng quan</strong> (cột Khung AI) và <strong className="text-gray-700">Theo dõi thực tế</strong>{' '}
            cho đúng mã lớp. RTSP thuần không chạy được trong Chrome/Edge như webcam; cần URL HTTP (MP4/HLS) hoặc xử lý ngoài bằng SDK.
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm mb-2">
              <GraduationCap size={18} />
              Bước 1 — Chọn lớp (lưới)
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Cùng <strong className="text-gray-800">MãLớp</strong> với API (vd <code className="text-[10px] bg-white px-1 rounded">LH10A1</code>),{' '}
              <strong>không</strong> nhầm với tên hiển thị kiểu «Lớp 10A1». Nếu thẻ Theo dõi trống dù đã phân tích — kiểm tra đúng mã; từ
              Theo dõi bấm link &quot;Roboflow&quot; trên thẻ lớp sẽ mở kèm <code className="text-[10px]">?maLop=…</code>. Trạng thái trang
              được lưu trong phiên.
            </p>
            {classOptions.length === 0 ? (
              <p className="text-xs text-amber-700">Chưa có danh sách lớp — kiểm tra API hoặc mock.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[min(40vh,260px)] overflow-y-auto pr-1">
                {classOptions.map(([code, label]) => {
                  const active = normalizeFocusMaLop(maLop) === normalizeFocusMaLop(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setMaLop(code)}
                      className={`text-left rounded-lg border px-2.5 py-2 transition-all ${
                        active
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                      }`}
                    >
                      <div className={`text-xs font-semibold truncate ${active ? 'text-white' : 'text-gray-900'}`}>
                        {label}
                      </div>
                      <div className={`text-[10px] font-mono truncate mt-0.5 ${active ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {code}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {robofCfg?.mockFocus && (
            <div className="text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-950 px-3 py-2">
              <strong>Chế độ demo:</strong> backend đang bật <code className="bg-white/80 px-1 rounded">ROBOFLOW_MOCK_FOCUS</code> — trả
              JSON giả lập, không gọi Roboflow. Tắt biến này và bật Inference hoặc serverless để dùng mô hình thật.
            </div>
          )}

          {robofCfg && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 space-y-0.5">
              <div>
                Inference:&nbsp;
                <strong>{robofCfg.roboflowEnabled ? 'bật' : 'tắt'}</strong>
                {robofCfg.mockFocus ? (
                  <> · <span className="text-amber-800 font-medium">mock (không gọi mạng)</span></>
                ) : (
                  <>
                    {' '}
                    · <code className="break-all">{robofCfg.inferenceBaseUrl}</code> · {robofCfg.workspace}/{robofCfg.workflowId}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Link2 size={16} className="text-indigo-600" />
              Bước 2 — Nguồn hình (webcam / tệp / URL)
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {threeChoices.map(({ key, title, desc, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSource(key)}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${
                    source === key
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-1 ring-indigo-100'
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <Icon className={`mb-1.5 ${source === key ? 'text-indigo-600' : 'text-gray-500'}`} size={22} />
                  <div className="font-semibold text-gray-900 text-xs leading-tight">{title}</div>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">{desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">
              Video HTTP hoặc tệp MP4 sau khi gắn sẽ phát trên <strong>Theo dõi thực tế</strong> đúng lớp (cùng tab). Ảnh chụp AI vẫn hiện
              khi đã phân tích thành công.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
        <canvas ref={canvasRef} className="hidden" />

        {source === 'webcam' && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[420px]">
              <video ref={webcamVideoRef} playsInline muted className="w-full h-full object-contain" />
              <DetectionOverlayCanvas maLop={maLop} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => void startWebcam()}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <Play size={14} /> Bật / làm mới webcam
              </button>
              <button
                type="button"
                onClick={stopWebcam}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <Square size={14} /> Tắt
              </button>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} />
                Tự phân tích mỗi 5 giây
              </label>
            </div>
          </div>
        )}

        {source === 'local_file' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              className="hidden"
              onChange={onPickFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              <Upload size={16} /> Chọn ảnh hoặc video (máy bạn)
            </button>
            {pickedIsVideo && fileVideoUrl && (
              <div className="space-y-2">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[420px]">
                  <video
                    ref={fileVideoRef}
                    controls
                    playsInline
                    autoPlay
                    muted
                    loop
                    preload="auto"
                    className="w-full h-full object-contain"
                    src={fileVideoUrl}
                  />
                  <DetectionOverlayCanvas maLop={maLop} />
                </div>
                <p className="text-xs text-gray-500">
                  Bấm <strong>Play</strong> trên thanh điều khiển video (đếm thời phải chạy, không dừng ở 0:00) rồi mới bấm &quot;Phân tích
                  khung hiện tại&quot;.
                </p>
                {autoRun && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    Đang bật <strong>tự động 5 giây</strong>: nếu video chưa Play, hệ thống sẽ <strong>không</strong> hiện toast lỗi — chỉ
                    phân tích khi đã có khung hình.
                  </p>
                )}

                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
                  <div className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles size={14} /> Báo cáo theo phút (chế độ batch — phân tích cả video)
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-snug">
                    Tự tua video mỗi <strong>5 giây</strong>, chạy MoveNet ở từng mốc rồi gom theo phút. Phù hợp cho video bài giảng dài
                    để có bảng tỉ lệ tập trung / cúi đầu / quay sang / giơ tay / điện thoại / vắng chỗ từng phút.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {!batchBusy ? (
                      <button
                        type="button"
                        onClick={() => void analyzeWholeVideo(5)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <Sparkles size={12} /> Phân tích toàn bộ video
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={cancelBatch}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700"
                      >
                        <Square size={12} /> Dừng phân tích
                      </button>
                    )}
                    {batchProgress && (
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center justify-between text-[10px] text-indigo-900 mb-0.5">
                          <span>
                            Đang xử lý mốc {batchProgress.done}/{batchProgress.total}s
                          </span>
                          <span>
                            {Math.round((batchProgress.done / Math.max(1, batchProgress.total)) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all"
                            style={{
                              width: `${Math.min(100, Math.round((batchProgress.done / Math.max(1, batchProgress.total)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {batchReport && batchReport.perMinute.length > 0 && (
                    <div className="mt-1 overflow-x-auto">
                      <div className="text-[11px] text-indigo-900 mb-1">
                        Thời lượng video: {Math.round(batchReport.durationSec)} giây · bước {batchReport.stepSec}s ·{' '}
                        {batchReport.points.length} mốc lấy mẫu
                      </div>
                      <table className="text-[10px] w-full min-w-[640px] border-collapse">
                        <thead>
                          <tr className="bg-indigo-100/70 text-indigo-900">
                            <th className="px-2 py-1 text-left">Phút</th>
                            <th className="px-2 py-1 text-right">% Tập trung</th>
                            <th className="px-2 py-1 text-right">Tập trung</th>
                            <th className="px-2 py-1 text-right">Giơ tay</th>
                            <th className="px-2 py-1 text-right">Cúi đầu</th>
                            <th className="px-2 py-1 text-right">Quay sang</th>
                            <th className="px-2 py-1 text-right">Điện thoại</th>
                            <th className="px-2 py-1 text-right">Vắng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchReport.perMinute.map((row) => (
                            <tr key={row.minute} className="border-t border-indigo-100/60">
                              <td className="px-2 py-1 font-mono">
                                {String(row.minute).padStart(2, '0')}:00–{String(row.minute).padStart(2, '0')}:59
                              </td>
                              <td className="px-2 py-1 text-right font-semibold text-emerald-700">{row.pct}%</td>
                              <td className="px-2 py-1 text-right">{row.counts.focus ?? 0}</td>
                              <td className="px-2 py-1 text-right">{row.counts.raise_hand ?? 0}</td>
                              <td className="px-2 py-1 text-right">{row.counts.head_down ?? 0}</td>
                              <td className="px-2 py-1 text-right">{row.counts.turn_away ?? 0}</td>
                              <td className="px-2 py-1 text-right">{row.counts.phone ?? 0}</td>
                              <td className="px-2 py-1 text-right">{row.counts.absent ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[10px] text-indigo-900/70 mt-1">
                        Các con số là <strong>tổng</strong> lượt phát hiện hành vi trong các mốc lấy mẫu của phút đó (ko phải số học sinh
                        duy nhất). Tỉ lệ % tính trên (tập trung + giơ tay) / tổng người trong khung.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!pickedIsVideo && previewDataUrl && (
              <img src={previewDataUrl} alt="preview" className="max-h-72 rounded-lg border border-gray-200" />
            )}
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                disabled={!pickedIsVideo}
              />
              Tự phân tích mỗi 5 giây (chỉ hợp lý khi video đang phát)
            </label>
          </div>
        )}

        {source === 'network_stream' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  URL RTSP (sẽ chạy qua cầu nối ffmpeg ở server)
                </label>
                <input
                  value={rtspNote}
                  onChange={(e) => {
                    setRtspNote(e.target.value);
                    if (!e.target.value.trim()) setBridgedMjpegUrl(null);
                  }}
                  placeholder="rtsp://192.168.x.x:554/..."
                  className="w-full border border-amber-200 rounded-lg px-2 py-2 text-xs font-mono bg-amber-50/50"
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {!bridgedMjpegUrl ? (
                    <button
                      type="button"
                      onClick={connectRtspBridge}
                      disabled={!rtspNote.trim().toLowerCase().startsWith('rtsp://') || (ffmpegProbe !== null && !ffmpegProbe.ok)}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Link2 size={12} />
                      Kết nối qua cầu nối ffmpeg
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={disconnectRtspBridge}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-600 text-white hover:bg-slate-700"
                    >
                      <Square size={12} />
                      Ngắt cầu nối
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void testRtspSnapshot()}
                    disabled={!rtspNote.trim().toLowerCase().startsWith('rtsp://') || snapshotBusy || (ffmpegProbe !== null && !ffmpegProbe.ok)}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                    title="Server chụp 1 ảnh để xác minh URL/RTSP — nếu fail sẽ hiện stderr ffmpeg."
                  >
                    <Camera size={12} />
                    {snapshotBusy ? 'Đang chụp…' : 'Test chụp 1 ảnh'}
                  </button>
                  {ffmpegProbe == null ? (
                    <span className="text-[11px] text-gray-400">Đang kiểm tra ffmpeg…</span>
                  ) : ffmpegProbe.ok ? (
                    <span className="text-[11px] text-emerald-700">
                      ffmpeg sẵn sàng{ffmpegProbe.version ? ` · ${ffmpegProbe.version.slice(0, 50)}` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-red-700">
                      Server chưa có ffmpeg — chạy <code className="font-mono">winget install ffmpeg</code> hoặc đặt
                      <code className="font-mono"> FFMPEG_PATH</code> trong <code>.env</code>.
                    </span>
                  )}
                </div>
                {(snapshotBlobUrl || bridgeError) && (
                  <div className="mt-2 space-y-2">
                    {snapshotBlobUrl && (
                      <div>
                        <div className="text-[11px] text-emerald-700 mb-1">Ảnh test gần nhất từ RTSP:</div>
                        <img
                          src={snapshotBlobUrl}
                          alt="RTSP snapshot test"
                          className="rounded-lg border border-emerald-200 max-h-48 object-contain"
                        />
                      </div>
                    )}
                    {bridgeError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-900 space-y-1">
                        <div className="font-semibold">Lỗi cầu nối RTSP/ffmpeg — không lấy được khung:</div>
                        <pre className="whitespace-pre-wrap text-[10px] leading-snug max-h-40 overflow-auto font-mono">
{bridgeError}
                        </pre>
                        <div className="text-[10px] text-red-800/80">
                          Kiểm tra: (a) máy server có ping được tới IP camera không;
                          (b) cổng RTSP (mặc định 554, MediaMTX 8554) đã mở;
                          (c) URL có cần <code>user:pass@</code> ở trước host;
                          (d) đường dẫn (<code>/cam</code>, <code>/Streaming/Channels/101</code>…) đúng theo NSX camera;
                          (e) firewall/VPN không chặn.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL xem trên web (HTTP/HTTPS — MP4 hoặc stream hỗ trợ)</label>
                <input
                  value={httpStreamUrl}
                  onChange={(e) => setHttpStreamUrl(e.target.value)}
                  placeholder="https://.../stream.mp4 hoặc endpoint HLS (tuỳ trình duyệt)"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">Bỏ trống nếu đã dùng cầu nối RTSP ở ô bên trái.</p>
              </div>
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[420px]">
              {bridgedMjpegUrl ? (
                <img
                  ref={streamMjpegImgRef}
                  key={bridgedMjpegUrl}
                  src={bridgedMjpegUrl}
                  crossOrigin="anonymous"
                  alt="RTSP qua cầu nối ffmpeg"
                  className="w-full h-full object-contain"
                  onError={handleMjpegImgError}
                  onLoad={() => setBridgeError(null)}
                />
              ) : httpStreamUrl.trim() && !httpStreamUrl.trim().toLowerCase().startsWith('rtsp://') ? (
                <video
                  ref={streamVideoRef}
                  key={httpStreamUrl}
                  src={httpStreamUrl.trim()}
                  controls
                  playsInline
                  autoPlay
                  muted
                  loop
                  preload="auto"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-400 px-4 text-center">
                  Dán URL RTSP và bấm <span className="font-medium text-amber-300">«Kết nối qua cầu nối ffmpeg»</span>, hoặc
                  dán URL HTTP/HTTPS ở ô bên phải.
                </div>
              )}
              {(bridgedMjpegUrl || (httpStreamUrl.trim() && !httpStreamUrl.trim().toLowerCase().startsWith('rtsp://'))) && (
                <DetectionOverlayCanvas maLop={maLop} />
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                disabled={streamAnalyzeDisabled}
              />
              Tự phân tích mỗi 5 giây (cần video / cầu nối MJPEG đang hoạt động)
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 items-center">
          <button
            type="button"
            disabled={busy || streamAnalyzeDisabled}
            onClick={() => void analyzeCurrentFrameLocal(false)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            title="Chạy MoveNet trong trình duyệt — KHÔNG gọi backend, không phụ thuộc Roboflow / API key."
          >
            <Sparkles size={16} />
            {busy ? 'Đang phân tích…' : 'Phân tích bằng MoveNet (thật)'}
          </button>
          {robofCfg?.roboflowEnabled && !robofCfg?.mockFocus && (
            <button
              type="button"
              disabled={busy || streamAnalyzeDisabled}
              onClick={() => void analyzeCurrentFrame(false)}
              className="inline-flex items-center gap-2 bg-indigo-600/90 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              title="Gửi khung lên backend Roboflow workflow (cần Inference server / API key)."
            >
              <Sparkles size={14} />
              {busy ? 'Đang gửi…' : 'Roboflow Cloud (tùy chọn)'}
            </button>
          )}
          <span className="text-xs text-gray-400 self-center">Lớp: {maLop || '—'}</span>
          {autoLive && (
            <span className="inline-flex items-center gap-1.5 self-center px-2 py-1 rounded-full bg-rose-600 text-white text-[11px] font-semibold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE · auto 2 giây
            </span>
          )}
          <label className="inline-flex items-center gap-1.5 self-center text-[12px] text-gray-700 select-none">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="accent-emerald-600"
            />
            Tự động phân tích (live)
          </label>
          <span className="text-[11px] text-emerald-700/80 self-center ml-auto">
            MoveNet chạy hoàn toàn trong trình duyệt — không cần API key.
          </span>
        </div>

        {lastResult && (lastResult.source === 'movenet_browser' || lastResult.localMovenet) && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs space-y-1">
            <div className="font-semibold text-emerald-900 flex items-center justify-between">
              <span>Kết quả MoveNet (khung gần nhất)</span>
              <span className="font-mono text-[10px] text-emerald-700/80">
                {new Date().toLocaleTimeString('vi-VN')}
              </span>
            </div>
            <div className="text-emerald-900/90">
              {typeof lastResult.boxes === 'object' && Array.isArray(lastResult.boxes) && lastResult.boxes.length === 0
                ? 'Chưa phát hiện ai trong khung — hãy đứng cách camera 1–2 m sao cho vai/đầu lộ rõ. Ảnh portrait nhỏ trên thẻ học sinh thường không kích hoạt được MoveNet.'
                : (lastResult.summary || lastResult.phanTich?.tomTatDieuHanh || '—')}
            </div>
            {lastResult.phanTich?.hanhVi && Object.keys(lastResult.phanTich.hanhVi).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {([
                  { k: 'focus', l: 'Tập trung', c: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                  { k: 'raise_hand', l: 'Giơ tay', c: 'bg-sky-100 text-sky-800 border-sky-200' },
                  { k: 'head_down', l: 'Cúi đầu', c: 'bg-amber-100 text-amber-800 border-amber-200' },
                  { k: 'turn_away', l: 'Quay sang', c: 'bg-orange-100 text-orange-800 border-orange-200' },
                  { k: 'phone', l: 'Điện thoại', c: 'bg-red-100 text-red-800 border-red-200' },
                  { k: 'absent', l: 'Vắng', c: 'bg-slate-100 text-slate-700 border-slate-200' },
                ] as const).map((row) => {
                  const v = lastResult.phanTich.hanhVi[row.k] ?? 0;
                  if (!v) return null;
                  return (
                    <span key={row.k} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${row.c}`}>
                      {row.l} <strong>{v}</strong>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {(previewDataUrl || lastResult) && (
        <div className="grid md:grid-cols-2 gap-4">
          {previewDataUrl && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="text-xs font-medium text-gray-600 mb-2">Khung gửi đi</div>
              <img src={previewDataUrl} alt="last frame" className="w-full rounded-lg border border-gray-100 max-h-56 object-contain" />
            </div>
          )}
          {lastResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm md:col-span-1">
              <h2 className="text-xs font-semibold text-gray-800 mb-2">Kết quả workflow</h2>
              <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto max-h-[280px]">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
