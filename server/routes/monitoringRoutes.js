import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sseHandler } from '../sse/hub.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboardOverview, getLatestRealtime } from '../services/monitoringService.js';

const router = Router();

router.get(
  '/dashboard/tong-quan',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await getDashboardOverview();
    res.json(data);
  }),
);

router.get(
  '/monitor/thoi-gian-thuc',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await getLatestRealtime();
    res.json(data);
  }),
);

router.get('/monitor/stream', sseHandler);

export default router;
