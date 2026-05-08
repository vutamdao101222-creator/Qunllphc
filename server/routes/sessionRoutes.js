import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertTeacherOwnsClass } from '../services/authorizationService.js';
import {
  createSession,
  deleteSession,
  endSession,
  getSession,
  listSessions,
  updateSession,
} from '../services/sessionService.js';

const router = Router();

const idParam = z.object({ maBuoiHoc: z.string().uuid() });
const listQuery = paginationSchema.extend({
  maLop: z.string().min(1).max(20).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  trangThai: z.enum(['active', 'ended']).optional(),
});
const createSchema = z.object({
  maLop: z.string().min(1).max(20),
  thoiGianBatDau: z.string().datetime({ offset: true }),
  thoiGianKetThuc: z.string().datetime({ offset: true }).optional(),
  trangThai: z.enum(['active', 'ended']).default('active'),
});
const updateSchema = createSchema.partial().omit({ maLop: true });

router.get(
  '/buoi-hoc',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, maLop, from, to, trangThai } = req.validatedQuery;
    const { items, total } = await listSessions({ page, pageSize, maLop, from, to, trangThai });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/buoi-hoc/:maBuoiHoc',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await getSession(req.params.maBuoiHoc);
    res.json(data);
  }),
);

router.post(
  '/buoi-hoc',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    await assertTeacherOwnsClass(req, req.body.maLop);
    const data = await createSession(req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/buoi-hoc/:maBuoiHoc',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(idParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await getSession(req.params.maBuoiHoc);
    await assertTeacherOwnsClass(req, existing.maLop);
    const data = await updateSession(req.params.maBuoiHoc, req.body);
    res.json(data);
  }),
);

router.post(
  '/buoi-hoc/:maBuoiHoc/ket-thuc',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const existing = await getSession(req.params.maBuoiHoc);
    await assertTeacherOwnsClass(req, existing.maLop);
    const data = await endSession(req.params.maBuoiHoc);
    res.json(data);
  }),
);

router.delete(
  '/buoi-hoc/:maBuoiHoc',
  requireAuth,
  requireRoles(['admin']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await deleteSession(req.params.maBuoiHoc);
    res.json(data);
  }),
);

export default router;
