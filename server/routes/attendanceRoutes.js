import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertTeacherOwnsClass } from '../services/authorizationService.js';
import {
  createAttendance,
  deleteAttendance,
  getAttendance,
  listAttendance,
} from '../services/attendanceService.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';
import { auditFromReq } from '../utils/auditFromReq.js';

const router = Router();

const idParam = z.object({ maDiemDanh: z.string().uuid() });
const listQuery = paginationSchema.extend({
  maLop: z.string().min(1).max(20).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
const createSchema = z.object({
  maLop: z.string().min(1).max(20),
  thoiDiem: z.string().datetime({ offset: true }).optional(),
  siSoHienDien: z.coerce.number().int().min(0).max(500),
  siSoDuKien: z.coerce.number().int().min(0).max(500),
});

router.get(
  '/diem-danh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, maLop, from, to } = req.validatedQuery;
    const { items, total } = await listAttendance({ page, pageSize, maLop, from, to });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/diem-danh/:maDiemDanh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await getAttendance(req.params.maDiemDanh);
    res.json(data);
  }),
);

router.post(
  '/diem-danh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  denyIfReadOnly,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    await assertTeacherOwnsClass(req, req.body.maLop);
    const data = await createAttendance(req.body);
    auditFromReq(req, 'DIEM_DANH_TAO', req.body.maLop, req.body);
    res.status(201).json(data);
  }),
);

router.delete(
  '/diem-danh/:maDiemDanh',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await deleteAttendance(req.params.maDiemDanh);
    res.json(data);
  }),
);

export default router;
