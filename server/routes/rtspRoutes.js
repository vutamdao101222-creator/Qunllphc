import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import {
  streamRtspToMjpeg,
  probeFfmpeg,
  captureRtspSnapshot,
} from '../services/rtspProxyService.js';

const router = Router();

const isRtsp = (u) => /^rtsp:\/\//i.test(u);

/** Kiểm tra ffmpeg có sẵn — UI gọi 1 lần để hiện nút "kết nối" nếu OK. */
router.get(
  '/rtsp/probe',
  asyncHandler(async (_req, res) => {
    const info = await probeFfmpeg();
    res.json(info);
  }),
);

/**
 * Phát RTSP dưới dạng MJPEG multipart cho thẻ <img>.
 * - Không yêu cầu auth: dùng `<img>` không gửi Authorization được; chấp nhận rủi ro proxy mở.
 *   Khi triển khai thật, đặt route này sau reverse-proxy giới hạn IP nội bộ.
 */
router.get(
  '/rtsp/mjpeg',
  asyncHandler(async (req, res) => {
    const url = String(req.query.url || '').trim();
    if (!url) throw new HttpError(400, 'Thiếu tham số ?url=rtsp://...');
    if (!isRtsp(url)) throw new HttpError(400, 'URL phải bắt đầu bằng rtsp://');
    const fps = Number(req.query.fps) || 4;
    const q = Number(req.query.q) || 6;
    const w = Number(req.query.w) || 960;
    await streamRtspToMjpeg(url, res, { fps, quality: q, width: w });
  }),
);

/** Chẩn đoán nhanh: chụp 1 JPEG từ RTSP, hoặc trả JSON lỗi (stderr ffmpeg). */
router.get(
  '/rtsp/snapshot',
  asyncHandler(async (req, res) => {
    const url = String(req.query.url || '').trim();
    if (!url) throw new HttpError(400, 'Thiếu tham số ?url=rtsp://...');
    if (!isRtsp(url)) throw new HttpError(400, 'URL phải bắt đầu bằng rtsp://');
    const w = Number(req.query.w) || 960;
    const timeoutMs = Number(req.query.timeoutMs) || 10000;
    const result = await captureRtspSnapshot(url, { width: w, timeoutMs });
    if (result.ok && result.jpeg) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Access-Control-Allow-Origin', '*');
      res.type('image/jpeg').send(result.jpeg);
      return;
    }
    res.status(502).json({
      ok: false,
      message: result.error || 'Không kết nối được RTSP qua ffmpeg.',
      stderr: result.stderr || null,
      bin: result.bin || null,
    });
  }),
);

export default router;
