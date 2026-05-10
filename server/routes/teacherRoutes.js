import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createTeacher,
  deleteTeacher,
  getTeacher,
  listClassesByTeacher,
  listTeachers,
  updateTeacher,
} from '../services/teacherService.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';
import { auditFromReq } from '../utils/auditFromReq.js';

const router = Router();

const codeParam = z.object({ maGiaoVien: z.string().min(1).max(20) });

/** Chuỗi rỗng / null từ client không làm fail .email() */
const optionalNvarchar = (max) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().max(max).optional(),
  );

const createSchema = z.object({
  maGiaoVien: z.string().min(1).max(20),
  hoTen: z.string().min(2).max(100),
  monHoc: z.string().min(1).max(100),
  soDienThoai: optionalNvarchar(20),
  email: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().email().max(120).optional(),
  ),
});
const updateSchema = createSchema.partial().omit({ maGiaoVien: true });

router.get(
  '/giao-vien',
  requireAuth,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.validatedQuery;
    const { items, total } = await listTeachers({ page, pageSize, q, sort, order });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/giao-vien/:maGiaoVien',
  requireAuth,
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    const data = await getTeacher(req.params.maGiaoVien);
    res.json(data);
  }),
);

router.get(
  '/giao-vien/:maGiaoVien/lop-hoc',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    const data = await listClassesByTeacher(req.params.maGiaoVien);
    res.json(data);
  }),
);

router.post(
  '/giao-vien',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const data = await createTeacher(req.body);
    auditFromReq(req, 'GIAO_VIEN_TAO', data.maGiaoVien, req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/giao-vien/:maGiaoVien',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(codeParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateTeacher(req.params.maGiaoVien, req.body);
    auditFromReq(req, 'GIAO_VIEN_CAP_NHAT', req.params.maGiaoVien, req.body);
    res.json(data);
  }),
);

router.put(
  '/giao-vien/:maGiaoVien',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(codeParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateTeacher(req.params.maGiaoVien, req.body);
    auditFromReq(req, 'GIAO_VIEN_CAP_NHAT', req.params.maGiaoVien, req.body);
    res.json(data);
  }),
);

router.delete(
  '/giao-vien/:maGiaoVien',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    const data = await deleteTeacher(req.params.maGiaoVien);
    auditFromReq(req, 'GIAO_VIEN_XOA', req.params.maGiaoVien, {});
    res.json(data);
  }),
);

export default router;
