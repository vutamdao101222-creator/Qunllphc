import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getCsvReport, getReportSummary } from '../services/reportService.js';

const router = Router();

router.get('/bao-cao/tong-hop', requireAuth, requireRoles(['admin', 'teacher']), async (_req, res) => {
  const data = await getReportSummary();
  res.json(data);
});

router.get('/bao-cao/xuat-csv', requireAuth, requireRoles(['admin', 'teacher']), async (_req, res) => {
  const csv = await getCsvReport();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-lop-hoc.csv"');
  res.send(csv);
});

export default router;
