import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createMetric, listMetrics } from '../services/metricsService.js';
import { assertTeacherOwnsClass } from '../services/authorizationService.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';

const router = Router();

const listQuery = paginationSchema.extend({
  maLop: z.string().min(1).max(20).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
const createSchema = z.object({
  maLop: z.string().min(1).max(20),
  thoiDiem: z.string().datetime({ offset: true }).optional(),
  siSoHienTai: z.coerce.number().int().min(0).max(500),
  mucTapTrung: z.coerce.number().int().min(0).max(100),
});

router.get(
  '/chi-so-tap-trung',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, maLop, from, to } = req.validatedQuery;
    const { items, total } = await listMetrics({ page, pageSize, maLop, from, to });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.post(
  '/chi-so-tap-trung',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  denyIfReadOnly,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    await assertTeacherOwnsClass(req, req.body.maLop);
    const data = await createMetric(req.body);
    res.status(201).json(data);
  }),
);

export default router;
