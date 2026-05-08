import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createClass, deleteClass, getClass, listClasses, updateClass } from '../services/classService.js';

const router = Router();

const codeParam = z.object({ maLop: z.string().min(1).max(20) });
const listQuery = paginationSchema.extend({
  maGiaoVien: z.string().min(1).max(20).optional(),
});
const createSchema = z.object({
  maLop: z.string().min(1).max(20),
  tenLop: z.string().min(1).max(100),
  khoi: z.string().min(1).max(10),
  monHoc: z.string().min(1).max(100),
  maGiaoVien: z.string().min(1).max(20),
  siSoDuKien: z.coerce.number().int().min(1).max(200),
});
const updateSchema = createSchema.partial().omit({ maLop: true });

router.get(
  '/lop-hoc',
  requireAuth,
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order, maGiaoVien } = req.validatedQuery;
    const { items, total } = await listClasses({ page, pageSize, q, sort, order, maGiaoVien });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/lop-hoc/:maLop',
  requireAuth,
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    const data = await getClass(req.params.maLop);
    res.json(data);
  }),
);

router.post(
  '/lop-hoc',
  requireAuth,
  requireRoles(['admin']),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const data = await createClass(req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/lop-hoc/:maLop',
  requireAuth,
  requireRoles(['admin']),
  validateParams(codeParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateClass(req.params.maLop, req.body);
    res.json(data);
  }),
);

router.put(
  '/lop-hoc/:maLop',
  requireAuth,
  requireRoles(['admin']),
  validateParams(codeParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateClass(req.params.maLop, req.body);
    res.json(data);
  }),
);

router.delete(
  '/lop-hoc/:maLop',
  requireAuth,
  requireRoles(['admin']),
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    const data = await deleteClass(req.params.maLop);
    res.json(data);
  }),
);

export default router;
