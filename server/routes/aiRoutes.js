import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateAiPredictions,
  getLatestAiPredictions,
  listAiPredictionHistory,
} from '../services/aiService.js';

const router = Router();

const historyQuery = paginationSchema.extend({
  maLop: z.string().min(1).max(20).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

router.get(
  '/ai/du-doan',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  asyncHandler(async (_req, res) => {
    const data = await getLatestAiPredictions();
    res.json(data);
  }),
);

router.get(
  '/ai/du-doan/lich-su',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateQuery(historyQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, maLop, from, to } = req.validatedQuery;
    const { items, total } = await listAiPredictionHistory({ page, pageSize, maLop, from, to });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.post(
  '/ai/chay-lai',
  requireAuth,
  requireRoles(['admin']),
  asyncHandler(async (_req, res) => {
    const data = await generateAiPredictions();
    res.json({ message: 'Da cap nhat du doan AI', data });
  }),
);

export default router;
