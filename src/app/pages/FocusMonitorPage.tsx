import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CLASSES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import {
  fetchClassesPage,
  fetchRoboflowFocusConfig,
  postRoboflowFocusWorkflow,
} from '../lib/api';
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
  const [autoRun, setAutoRun] = useState(false);
  const [dbClasses, setDbClasses] = useState<Array<{ maLop: string; tenLop?: string }>>([]);

  useEffect(() => {
    fetchRoboflowFocusConfig()
      .then(setRobofCfg)
      .catch(() => setRobofCfg(null));

    fetchClassesPage({ pageSize: 100 })
      .then((page) => {
        const rows = Array.isArray(page?.items)
          ? page.items.map((r: any) => ({ maLop: String(r.maLop || ''), tenLop: r.tenLop }))
          : [];
        setDbClasses(rows.filter((r) => r.maLop));
      })
      .catch(() => setDbClasses([]));

    try {
      const saved = sessionStorage.getItem(FOCUS_CLASS_KEY);
      if (saved) setMaLop(saved);
    } catch {
      /* ignore */
    }
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

  useEffect(() => {
    return () => {
      if (fileBlobUrlRef.current) {
        URL.revokeObjectURL(fileBlobUrlRef.current);
        fileBlobUrlRef.current = null;
      }
    };
  }, []);

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

  const analyzeCurrentFrame = useCallback(async () => {
    if (!maLop.trim()) {
      toast.error('Chọn lớp ở bước 1.');
      return;
    }

    if (source === 'webcam') {
      const url = captureToDataUrl(webcamVideoRef.current);
      if (!url) {
        toast.error('Chưa có hình từ webcam.');
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
          toast.error('Chọn video và bấm Play, hoặc đợi tải xong khung đầu tiên.');
          return;
        }
        setPreviewDataUrl(url);
        await runInference(url, 'video_upload');
        return;
      }
      if (!previewDataUrl) {
        toast.error('Chọn ảnh trước.');
        return;
      }
      await runInference(previewDataUrl, 'image_upload');
      return;
    }

    if (source === 'network_stream') {
      if (httpStreamUrl.trim().toLowerCase().startsWith('rtsp://')) {
        toast.error('URL này là RTSP — trình duyệt không chơi được. Đặt URL HTTP (MP4/HLS trong hỗ trợ) vào ô bên phải, hoặc dùng webcam / tệp.');
        return;
      }
      if (!httpStreamUrl.trim()) {
        toast.error('Nhập URL luồng HTTP/HTTPS có thể mở bằng thẻ video (thường là MP4, hoặc HLS tuỳ trình duyệt).');
        return;
      }
      const url = captureToDataUrl(streamVideoRef.current);
      if (!url) {
        toast.error('Chưa lấy được khung — bấm Play trên video hoặc kiểm tra CORS của máy chủ.');
        return;
      }
      setPreviewDataUrl(url);
      await runInference(url, 'stream_http');
    }
  }, [maLop, source, pickedIsVideo, previewDataUrl, httpStreamUrl, captureToDataUrl, runInference]);

  useEffect(() => {
    if (!autoRun) return;
    if (source === 'network_stream' && httpStreamUrl.trim().toLowerCase().startsWith('rtsp')) return;
    const t = setInterval(() => {
      void analyzeCurrentFrame();
    }, 5000);
    return () => clearInterval(t);
  }, [autoRun, source, httpStreamUrl, analyzeCurrentFrame]);

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
    } else {
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
    (!httpStreamUrl.trim() || httpStreamUrl.trim().toLowerCase().startsWith('rtsp://'));

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-gray-900">AI nhận diện tập trung trong trình duyệt</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl leading-relaxed">
            Mô hình Roboflow chạy trên máy chủ Inference (Python), còn <strong>trang web</strong> chỉ lo:{' '}
            <strong className="text-gray-700">chọn lớp</strong> → <strong className="text-gray-700">một trong ba nguồn hình</strong> →{' '}
            <strong className="text-gray-700">gửi khung ảnh</strong> lên EduMonitor để proxy sang Inference. RTSP thuần không chạy
            được trong Chrome/Edge như webcam; phải có bản HTTPS (camera/NVR proxy) hoặc xử lý ngoài bằng SDK.
          </p>
        </div>
      </div>

      {/* Bước 1 · Gắn với lớp */}
      <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm mb-2">
          <GraduationCap size={18} />
          Bước 1 — Gắn mô hình AI với lớp học
        </div>
        <p className="text-xs text-gray-600 mb-3 max-w-2xl">
          Mọi lần &quot;Phân tích&quot; đều gửi kèm <strong>mã lớp</strong> để báo cáo/audit thống nhất (ghi nhật ký backend). Sau này bạn có
          thể lưu thêm vào DB theo <code className="text-[11px] bg-white px-1 rounded">{`{ maLop }`}</code>.
        </p>
        <div className="max-w-md">
          <label className="block text-xs font-medium text-gray-600 mb-1">Chọn lớp</label>
          <select
            value={maLop}
            onChange={(e) => setMaLop(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            {classOptions.map(([code, label]) => (
              <option key={code} value={code}>
                {label} ({code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bước 2 · Ba lựa chọn */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Link2 size={16} className="text-indigo-600" />
          Bước 2 — Chọn một trong ba nguồn cho lớp đã chọn
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          {threeChoices.map(({ key, title, desc, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSource(key)}
              className={`text-left rounded-xl border-2 p-4 transition-all ${
                source === key
                  ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-1 ring-indigo-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
              }`}
            >
              <Icon className={`mb-2 ${source === key ? 'text-indigo-600' : 'text-gray-500'}`} size={26} />
              <div className="font-semibold text-gray-900 text-sm">{title}</div>
              <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {robofCfg && (
        <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 space-y-0.5">
          <div>
            Inference:&nbsp;
            <strong>{robofCfg.roboflowEnabled ? 'bật' : 'tắt'}</strong> ·{' '}
            <code>{robofCfg.inferenceBaseUrl}</code> · {robofCfg.workspace}/{robofCfg.workflowId}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
        <canvas ref={canvasRef} className="hidden" />

        {source === 'webcam' && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[420px]">
              <video ref={webcamVideoRef} playsInline muted className="w-full h-full object-contain" />
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
                  <video ref={fileVideoRef} controls playsInline className="w-full h-full object-contain" src={fileVideoUrl} />
                </div>
                <p className="text-xs text-gray-500">Bấm Play rồi &quot;Phân tích khung hiện tại&quot; — hoặc bật tự động 5 giây.</p>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú RTSP (không phân tích trực tiếp trên web)</label>
                <input
                  value={rtspNote}
                  onChange={(e) => setRtspNote(e.target.value)}
                  placeholder="rtsp://camera-lop-hoc:554/..."
                  className="w-full border border-amber-200 rounded-lg px-2 py-2 text-xs font-mono bg-amber-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL xem trên web (HTTP/HTTPS — MP4 hoặc stream hỗ trợ)</label>
                <input
                  value={httpStreamUrl}
                  onChange={(e) => setHttpStreamUrl(e.target.value)}
                  placeholder="https://.../stream.mp4 hoặc endpoint HLS (tuỳ trình duyệt)"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[420px]">
              {httpStreamUrl.trim() && !httpStreamUrl.trim().toLowerCase().startsWith('rtsp://') ? (
                <video
                  ref={streamVideoRef}
                  key={httpStreamUrl}
                  src={httpStreamUrl.trim()}
                  controls
                  playsInline
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-400 px-4 text-center">
                  Dán URL HTTP ở ô bên phải. Nếu máy chủ không cho CORS, trình duyệt có thể không chụp được khung — khi đó dùng tệp hoặc
                  webcam.
                </div>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                disabled={streamAnalyzeDisabled}
              />
              Tự phân tích mỗi 5 giây (cần video đang phát và CORS cho phép)
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            disabled={busy || streamAnalyzeDisabled}
            onClick={() => void analyzeCurrentFrame()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {busy ? 'Đang gửi Inference…' : 'Phân tích khung hiện tại'}
          </button>
          <span className="text-xs text-gray-400 self-center">Lớp: {maLop || '—'}</span>
        </div>
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
