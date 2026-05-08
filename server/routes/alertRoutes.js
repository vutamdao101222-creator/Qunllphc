import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createAlert,
  deleteAlert,
  getAlert,
  listAlerts,
  setAlertResolved,
} from '../services/alertService.js';

const router = Router();

const idParam = z.object({ maCanhBao: z.string().uuid() });
const listQuery = paginationSchema.extend({
  maLop: z.string().min(1).max(20).optional(),
  daXuLy: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  mucDo: z.string().min(1).max(30).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
const createSchema = z.object({
  maLop: z.string().min(1).max(20),
  mucDo: z.string().min(1).max(30),
  noiDung: z.string().min(1).max(500),
});
const resolveSchema = z.object({ daXuLy: z.boolean() });

router.get(
  '/canh-bao',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, maLop, daXuLy, mucDo, from, to } = req.validatedQuery;
    const { items, total } = await listAlerts({ page, pageSize, maLop, daXuLy, mucDo, from, to });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/canh-bao/:maCanhBao',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await getAlert(req.params.maCanhBao);
    res.json(data);
  }),
);

router.post(
  '/canh-bao',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const data = await createAlert(req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/canh-bao/:maCanhBao/da-xu-ly',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(idParam),
  validateBody(resolveSchema),
  asyncHandler(async (req, res) => {
    const data = await setAlertResolved(req.params.maCanhBao, req.body.daXuLy);
    res.json(data);
  }),
);

router.delete(
  '/canh-bao/:maCanhBao',
  requireAuth,
  requireRoles(['admin']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await deleteAlert(req.params.maCanhBao);
    res.json(data);
  }),
);

export default router;
