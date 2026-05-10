import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sseHandler } from '../sse/hub.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  EMPTY_DASHBOARD,
  getDashboardOverview,
  getLatestRealtime,
} from '../services/monitoringService.js';
import { resolveTeacherMaGiaoVien } from '../services/authorizationService.js';

const router = Router();

router.get(
  '/dashboard/tong-quan',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    let scope = null;
    if (req.auth.role === 'teacher') {
      scope = await resolveTeacherMaGiaoVien(req);
      if (!scope) {
        res.json(EMPTY_DASHBOARD);
        return;
      }
    }
    const data = await getDashboardOverview(scope);
    res.json(data);
  }),
);

router.get(
  '/monitor/thoi-gian-thuc',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    let scope = null;
    if (req.auth.role === 'teacher') {
      scope = await resolveTeacherMaGiaoVien(req);
      if (!scope) {
        res.json([]);
        return;
      }
    }
    const data = await getLatestRealtime(scope);
    res.json(data);
  }),
);

router.get('/monitor/stream', sseHandler);

export default router;
