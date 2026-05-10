import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getParentOverview, getParentSummaryReport, listMyParentLinks } from '../services/parentService.js';

const router = Router();

const summaryQuery = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

router.get('/phu-huynh/tong-quan', requireAuth, requireRoles(['parent', 'admin']), async (_req, res) => {
  const data = await getParentOverview();
  res.json(data);
});

router.get(
  '/phu-huynh/bao-cao-tom-tat',
  requireAuth,
  requireRoles(['parent', 'admin']),
  validateQuery(summaryQuery),
  asyncHandler(async (req, res) => {
    const { from, to } = req.validatedQuery;
    const data = await getParentSummaryReport(req.auth.maTaiKhoan, {
      from: new Date(from),
      to: new Date(to),
    });
    res.json(data);
  }),
);

router.get('/phu-huynh/lien-ket', requireAuth, requireRoles(['parent', 'admin']), async (req, res) => {
  const items = await listMyParentLinks(req.auth.maTaiKhoan);
  res.json({ items });
});

export default router;
