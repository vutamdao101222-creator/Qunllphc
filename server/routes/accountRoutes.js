import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, requireSelfOrRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  resetPassword,
  setAccountActive,
  updateAccount,
} from '../services/accountService.js';

const router = Router();

const idParam = z.object({ maTaiKhoan: z.string().uuid() });
const listQuery = paginationSchema.extend({
  role: z.enum(['admin', 'teacher', 'parent']).optional(),
});
const createSchema = z.object({
  tenDangNhap: z.string().min(3).max(50),
  matKhau: z.string().min(6).max(100),
  hoTen: z.string().min(2).max(100),
  email: z.string().email().max(120).optional(),
  role: z.enum(['admin', 'teacher', 'parent']),
  hoatDong: z.boolean().optional(),
});
const updateSchema = z.object({
  hoTen: z.string().min(2).max(100).optional(),
  email: z.string().email().max(120).optional(),
  role: z.enum(['admin', 'teacher', 'parent']).optional(),
});
const activeSchema = z.object({ hoatDong: z.boolean() });
const resetSchema = z.object({ matKhauMoi: z.string().min(6).max(100) });

router.get(
  '/tai-khoan',
  requireAuth,
  requireRoles(['admin']),
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order, role } = req.validatedQuery;
    const { items, total } = await listAccounts({ page, pageSize, q, sort, order, role });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/tai-khoan/:maTaiKhoan',
  requireAuth,
  validateParams(idParam),
  requireSelfOrRoles((req) => req.params.maTaiKhoan, ['admin']),
  asyncHandler(async (req, res) => {
    const data = await getAccount(req.params.maTaiKhoan);
    res.json(data);
  }),
);

router.post(
  '/tai-khoan',
  requireAuth,
  requireRoles(['admin']),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const data = await createAccount(req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/tai-khoan/:maTaiKhoan',
  requireAuth,
  validateParams(idParam),
  requireSelfOrRoles((req) => req.params.maTaiKhoan, ['admin']),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const allowRoleChange = req.auth?.role === 'admin';
    const data = await updateAccount(req.params.maTaiKhoan, req.body, { allowRoleChange });
    res.json(data);
  }),
);

router.patch(
  '/tai-khoan/:maTaiKhoan/kich-hoat',
  requireAuth,
  requireRoles(['admin']),
  validateParams(idParam),
  validateBody(activeSchema),
  asyncHandler(async (req, res) => {
    const data = await setAccountActive(req.params.maTaiKhoan, req.body.hoatDong);
    res.json(data);
  }),
);

router.post(
  '/tai-khoan/:maTaiKhoan/dat-lai-mat-khau',
  requireAuth,
  validateParams(idParam),
  requireSelfOrRoles((req) => req.params.maTaiKhoan, ['admin']),
  validateBody(resetSchema),
  asyncHandler(async (req, res) => {
    const data = await resetPassword(req.params.maTaiKhoan, req.body.matKhauMoi);
    res.json(data);
  }),
);

router.delete(
  '/tai-khoan/:maTaiKhoan',
  requireAuth,
  requireRoles(['admin']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await deleteAccount(req.params.maTaiKhoan);
    res.json(data);
  }),
);

export default router;
