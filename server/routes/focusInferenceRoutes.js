import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { assertTeacherOwnsClass } from '../services/authorizationService.js';
import { stripDataUrlBase64, runRoboflowFocusWorkflow } from '../services/roboflowFocusService.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

const focusBodySchema = z.object({
  maLop: z.string().min(1).max(20).optional(),
  source: z
    .enum(['webcam', 'image_upload', 'video_upload', 'stream_http', 'rtsp', 'unknown'])
    .optional(),
  imageBase64: z.string().optional(),
});

router.get(
  '/ai/focus/cau-hinh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  asyncHandler(async (_req, res) => {
    const rf = env.roboflow;
    res.json({
      roboflowEnabled: Boolean(rf.enabled),
      inferenceBaseUrl: rf.inferenceBaseUrl,
      serverlessBaseUrl: rf.serverlessBaseUrl,
      hostedFallback: Boolean(rf.hostedFallback),
      workspace: rf.workspace,
      workflowId: rf.workflowId,
      imageInputName: rf.imageInputName,
      inferWorkflowUrlOverride: rf.inferWorkflowUrlOverride || null,
      hasApiKey: Boolean(rf.apiKey),
    });
  }),
);

router.post(
  '/ai/focus/workflow',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateBody(focusBodySchema),
  asyncHandler(async (req, res) => {
    const { maLop, source, imageBase64 } = req.body;

    if (!env.roboflow.enabled) {
      throw new HttpError(503, 'Tính năng nhận diện Roboflow đã tắt (ROBOFLOW_FOCUS_ENABLED=false).');
    }

    if (req.auth.role === 'teacher' && maLop) {
      await assertTeacherOwnsClass(req, maLop);
    }

    if (source === 'rtsp') {
      throw new HttpError(
        400,
        'Luồng RTSP không gửi trực tiếp từ trình duyệt được. Dùng URL HTTP (MP4/HLS proxy) trên web, hoặc Inference SDK Python với RTSPSource.',
      );
    }

    const raw = imageBase64;
    if (!raw || !raw.trim()) {
      throw new HttpError(400, 'Thiếu ảnh (imageBase64). Chọn webcam hoặc tải ảnh.');
    }

    const b64Core = stripDataUrlBase64(raw);
    let buffer;
    try {
      buffer = Buffer.from(b64Core, 'base64');
    } catch {
      throw new HttpError(400, 'Không đọc được base64.');
    }

    const out = await runRoboflowFocusWorkflow(buffer);
    res.json({
      maLop: maLop ?? null,
      source: source ?? null,
      ...out,
      at: new Date().toISOString(),
    });
  }),
);

export default router;
