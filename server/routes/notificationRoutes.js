import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createNotification,
  deleteNotification,
  getNotification,
  listNotifications,
  listNotificationsForUser,
  markNotificationRead,
  updateNotification,
} from '../services/notificationService.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';

const router = Router();

const idParam = z.object({ maThongBao: z.string().uuid() });
const listQuery = paginationSchema.extend({ loai: z.string().min(1).max(30).optional() });
const myListQuery = listQuery;
const createSchema = z.object({
  tieuDe: z.string().min(1).max(255),
  noiDung: z.string().min(1).max(1000),
  loai: z.string().min(1).max(30).default('info'),
});
const updateSchema = createSchema.partial();

router.get(
  '/thong-bao/cua-toi',
  requireAuth,
  validateQuery(myListQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, loai } = req.validatedQuery;
    const { items, total } = await listNotificationsForUser({
      page,
      pageSize,
      loai,
      maTaiKhoan: req.auth.maTaiKhoan,
    });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.post(
  '/thong-bao/:maThongBao/da-doc',
  requireAuth,
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await markNotificationRead(req.auth.maTaiKhoan, req.params.maThongBao);
    res.json(data);
  }),
);

router.get(
  '/thong-bao',
  requireAuth,
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, loai } = req.validatedQuery;
    const { items, total } = await listNotifications({ page, pageSize, loai });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/thong-bao/:maThongBao',
  requireAuth,
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await getNotification(req.params.maThongBao);
    res.json(data);
  }),
);

router.post(
  '/thong-bao',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  denyIfReadOnly,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const data = await createNotification(req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/thong-bao/:maThongBao',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  denyIfReadOnly,
  validateParams(idParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateNotification(req.params.maThongBao, req.body);
    res.json(data);
  }),
);

router.delete(
  '/thong-bao/:maThongBao',
  requireAuth,
  requireRoles(['admin']),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const data = await deleteNotification(req.params.maThongBao);
    res.json(data);
  }),
);

export default router;
