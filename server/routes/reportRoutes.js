import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCsvReport, getReportSummary } from '../services/reportService.js';
import { resolveTeacherMaGiaoVien } from '../services/authorizationService.js';
import { EMPTY_DASHBOARD } from '../services/monitoringService.js';

const router = Router();

const EMPTY_TEACHER_REPORT = {
  ...EMPTY_DASHBOARD,
  recentAlerts: [],
  timeline: [],
};

router.get(
  '/bao-cao/tong-hop',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    if (req.auth.role === 'teacher') {
      const maGv = await resolveTeacherMaGiaoVien(req);
      if (!maGv) {
        res.json(EMPTY_TEACHER_REPORT);
        return;
      }
      const data = await getReportSummary({ maGiaoVien: maGv });
      res.json(data);
      return;
    }
    const data = await getReportSummary();
    res.json(data);
  }),
);

router.get(
  '/bao-cao/xuat-csv',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    let opts = {};
    if (req.auth.role === 'teacher') {
      const maGv = await resolveTeacherMaGiaoVien(req);
      if (!maGv) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-lop-hoc.csv"');
        res.send('');
        return;
      }
      opts = { maGiaoVien: maGv };
    }
    const csv = await getCsvReport(opts);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-lop-hoc.csv"');
    res.send(csv);
  }),
);

export default router;
