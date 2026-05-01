import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { sseHandler } from '../sse/hub.js';
import { getDashboardOverview, getClasses, getLatestRealtime, getTeachers } from '../services/monitoringService.js';

const router = Router();

router.get('/giao-vien', requireAuth, async (_req, res) => {
  const data = await getTeachers();
  res.json(data);
});

router.get('/lop-hoc', requireAuth, async (_req, res) => {
  const data = await getClasses();
  res.json(data);
});

router.get('/dashboard/tong-quan', requireAuth, async (_req, res) => {
  const data = await getDashboardOverview();
  res.json(data);
});

router.get('/monitor/thoi-gian-thuc', requireAuth, async (_req, res) => {
  const data = await getLatestRealtime();
  res.json(data);
});

router.get('/monitor/stream', sseHandler);

router.get('/canh-bao', requireAuth, requireRoles(['admin', 'teacher']), async (_req, res) => {
  const overview = await getDashboardOverview();
  res.json(overview.alerts);
});

export default router;
