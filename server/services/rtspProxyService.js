/**
 * Cầu nối RTSP → MJPEG (multipart) cho trình duyệt:
 * - Spawn `ffmpeg` đọc luồng RTSP, transcode ra MJPEG, pipe vào response.
 * - Trình duyệt hiển thị qua `<img src="/api/v1/rtsp/mjpeg?...">` (auto-update mỗi frame).
 * - YÊU CẦU: máy chạy `npm run api` phải có sẵn `ffmpeg` trong PATH, hoặc đặt FFMPEG_PATH=...
 */
import { spawn } from 'node:child_process';
import { logError, logInfo } from '../utils/logger.js';

const FFMPEG_BIN = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';

let ffmpegMissing = null;

function looksLikeMissingExe(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || '');
  return code === 'ENOENT' || msg.includes('enoent') || msg.includes('not recognized');
}

/**
 * Phát MJPEG multipart từ RTSP vào HTTP response.
 * @param {string} rtspUrl
 * @param {import('express').Response} res
 * @param {{ fps?: number; quality?: number; width?: number }} [opts]
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function streamRtspToMjpeg(rtspUrl, res, opts = {}) {
  const fps = Math.max(1, Math.min(15, Number(opts.fps) || 4));
  const quality = Math.max(2, Math.min(31, Number(opts.quality) || 6));
  const width = Math.max(320, Math.min(1920, Number(opts.width) || 960));

  // Lưu ý: không dùng -stimeout / -timeout / -rw_timeout — các option này khác nhau
  // theo từng build ffmpeg (ffmpeg 6+ đã xoá -stimeout, một số build không hiểu -timeout).
  // Thay vào đó dùng watchdog phía Node để giết tiến trình nếu không nhận được byte đầu.
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-rtsp_transport', 'tcp',
    '-fflags', '+genpts+discardcorrupt',
    '-use_wallclock_as_timestamps', '1',
    '-i', rtspUrl,
    '-an',
    '-vf', `fps=${fps},scale=${width}:-2`,
    '-q:v', String(quality),
    '-f', 'mpjpeg',
    '-boundary_tag', 'ffserver',
    'pipe:1',
  ];

  let ff;
  try {
    ff = spawn(FFMPEG_BIN, args, { windowsHide: true });
  } catch (e) {
    ffmpegMissing = e;
    logError('Không spawn được ffmpeg', e);
    if (!res.headersSent) {
      res.status(503).json({
        message:
          'Không gọi được ffmpeg. Cài ffmpeg trên máy chạy API (winget install ffmpeg) hoặc đặt FFMPEG_PATH=... trong .env.',
      });
    } else {
      res.end();
    }
    return { ok: false, error: e?.message || 'spawn failed' };
  }

  let firstByteReceived = false;
  let lastStderr = '';
  let resolved = false;

  // Watchdog: nếu sau 15 giây không nhận được byte đầu tiên thì kill và báo lỗi.
  const firstByteTimeoutMs = 15000;
  const watchdog = setTimeout(() => {
    if (!firstByteReceived) {
      try { ff.kill('SIGKILL'); } catch { /* ignore */ }
    }
  }, firstByteTimeoutMs);

  return await new Promise((resolve) => {
    const finishOk = () => {
      if (resolved) return;
      resolved = true;
      resolve({ ok: true });
    };
    const finishErr = (msg) => {
      if (resolved) return;
      resolved = true;
      resolve({ ok: false, error: msg });
    };

    // Trên error trước khi có byte: gửi 502.
    const failBeforeStream = (msg) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      res.status(502).json({
        message: `ffmpeg không kết nối được RTSP: ${msg || 'unknown'}`,
      });
    };

    ff.stdout.once('data', (chunk) => {
      firstByteReceived = true;
      clearTimeout(watchdog);
      if (!res.headersSent) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Connection', 'close');
        res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffserver');
        // Cho phép canvas đọc pixel khi gọi từ origin khác (browser <img crossOrigin>).
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      try {
        res.write(chunk);
      } catch {
        /* response đã đóng */
      }
      finishOk();
    });

    ff.stdout.on('data', (chunk) => {
      if (!firstByteReceived) return;
      try {
        res.write(chunk);
      } catch {
        try {
          ff.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      }
    });

    ff.stderr.on('data', (chunk) => {
      const s = chunk.toString();
      lastStderr += s;
      if (lastStderr.length > 1500) {
        lastStderr = lastStderr.slice(-1500);
      }
    });

    ff.on('error', (e) => {
      clearTimeout(watchdog);
      if (looksLikeMissingExe(e)) {
        ffmpegMissing = e;
      }
      logError('ffmpeg error', e);
      if (!firstByteReceived) {
        failBeforeStream(e.message);
      }
      finishErr(e.message || 'ffmpeg error');
    });

    ff.on('exit', (code, signal) => {
      clearTimeout(watchdog);
      if (!firstByteReceived) {
        const detail =
          lastStderr.trim().slice(-700) ||
          `ffmpeg đóng kết nối trước khi có khung (mã ${code}${signal ? `, signal ${signal}` : ''}). ` +
            `Có thể: camera offline, sai user/mật khẩu, sai port (8554/554), hoặc đường dẫn stream.`;
        failBeforeStream(detail);
        finishErr(detail);
        return;
      }
      try {
        res.end();
      } catch {
        /* ignore */
      }
      logInfo('ffmpeg ended', { code, signal });
      finishOk();
    });

    res.on('close', () => {
      try {
        ff.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    });
  });
}

/** Kiểm tra ffmpeg có khả dụng không (gọi `ffmpeg -version`). */
export function probeFfmpeg() {
  return new Promise((resolve) => {
    let ff;
    try {
      ff = spawn(FFMPEG_BIN, ['-version'], { windowsHide: true });
    } catch (e) {
      resolve({ ok: false, bin: FFMPEG_BIN, error: e?.message || 'spawn failed' });
      return;
    }
    let out = '';
    ff.stdout.on('data', (c) => {
      out += c.toString();
    });
    ff.on('error', (e) => {
      ffmpegMissing = e;
      resolve({ ok: false, bin: FFMPEG_BIN, error: e?.message || 'spawn error' });
    });
    ff.on('exit', (code) => {
      if (code === 0) {
        const firstLine = out.split(/\r?\n/)[0] || '';
        resolve({ ok: true, bin: FFMPEG_BIN, version: firstLine.trim() });
      } else {
        resolve({ ok: false, bin: FFMPEG_BIN, error: `exit ${code}` });
      }
    });
  });
}

export function isFfmpegLikelyMissing() {
  return Boolean(ffmpegMissing);
}

/**
 * Chụp 1 khung JPEG từ RTSP (timeout ngắn) — dùng để chẩn đoán / kiểm tra kết nối.
 * @param {string} rtspUrl
 * @param {{ width?: number; quality?: number; timeoutMs?: number }} [opts]
 * @returns {Promise<{ ok: boolean; jpeg?: Buffer; error?: string; stderr?: string; bin?: string }>}
 */
export function captureRtspSnapshot(rtspUrl, opts = {}) {
  const width = Math.max(320, Math.min(1920, Number(opts.width) || 960));
  const quality = Math.max(2, Math.min(31, Number(opts.quality) || 6));
  const timeoutMs = Math.max(2000, Math.min(20000, Number(opts.timeoutMs) || 10000));

  // Tương tự streamRtspToMjpeg: không gắn option -stimeout/-timeout vì khác build ffmpeg.
  // `-update 1` để image2 muxer chấp nhận tên file đơn (pipe:1) — bỏ warning của ffmpeg 7+.
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-rtsp_transport', 'tcp',
    '-fflags', '+genpts+discardcorrupt',
    '-i', rtspUrl,
    '-frames:v', '1',
    '-vf', `scale=${width}:-2`,
    '-q:v', String(quality),
    '-update', '1',
    '-f', 'image2',
    'pipe:1',
  ];

  return new Promise((resolve) => {
    let ff;
    try {
      ff = spawn(FFMPEG_BIN, args, { windowsHide: true });
    } catch (e) {
      ffmpegMissing = e;
      resolve({ ok: false, error: e?.message || 'spawn failed', bin: FFMPEG_BIN });
      return;
    }
    const chunks = [];
    let stderr = '';
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      try { ff.kill('SIGKILL'); } catch { /* ignore */ }
      resolve(result);
    };

    const killTimer = setTimeout(() => {
      finish({ ok: false, error: `timeout ${timeoutMs}ms`, stderr: stderr.slice(-1500), bin: FFMPEG_BIN });
    }, timeoutMs + 2000);

    ff.stdout.on('data', (c) => chunks.push(c));
    ff.stderr.on('data', (c) => {
      stderr += c.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-3000);
    });
    ff.on('error', (e) => {
      if (looksLikeMissingExe(e)) ffmpegMissing = e;
      clearTimeout(killTimer);
      finish({ ok: false, error: e?.message || 'ffmpeg error', stderr: stderr.slice(-1500), bin: FFMPEG_BIN });
    });
    ff.on('exit', (code) => {
      clearTimeout(killTimer);
      const jpeg = Buffer.concat(chunks);
      if (code === 0 && jpeg.length > 0) {
        finish({ ok: true, jpeg, bin: FFMPEG_BIN });
      } else {
        finish({
          ok: false,
          error: stderr.trim().slice(-600) || `exit ${code}`,
          stderr: stderr.slice(-1500),
          bin: FFMPEG_BIN,
        });
      }
    });
  });
}
