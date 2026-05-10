import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getParentOverview, getParentSummaryReport, listMyParentLinks } from '../services/parentService.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';
import {
  assertParentLinkedToClass,
  createExchange,
  listExchangeForParent,
} from '../services/parentTeacherExchangeService.js';
import { listStudentAttendanceForParent } from '../services/studentAttendanceDetailService.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

const summaryQuery = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

const parentExchangeBody = z.object({
  maLop: z.string().min(1).max(20),
  maHocSinh: z.string().min(1).max(50),
  tieuDe: z.string().max(255).optional(),
  noiDung: z.string().min(1).max(2000),
  thoiDiem: z.string().max(45).optional(),
});

const parentAttendanceQuery = z.object({
  from: z.string().max(45).optional(),
  to: z.string().max(45).optional(),
  maHocSinh: z.string().max(50).optional(),
});

function parseThoiDiemHoacNow(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return new Date();
  const t = Date.parse(String(raw));
  if (Number.isNaN(t)) throw new HttpError(400, 'Thoi diem khong hop le');
  return new Date(t);
}

function parseQueryDateOptional(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
  const t = Date.parse(String(raw));
  if (Number.isNaN(t)) throw new HttpError(400, 'Tham so thoi gian khong hop le');
  return new Date(t);
}

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

router.get(
  '/phu-huynh/trao-doi',
  requireAuth,
  requireRoles(['parent', 'admin']),
  asyncHandler(async (req, res) => {
    const items = await listExchangeForParent(req.auth.maTaiKhoan);
    res.json({ items });
  }),
);

router.post(
  '/phu-huynh/trao-doi',
  requireAuth,
  requireRoles(['parent', 'admin']),
  denyIfReadOnly,
  validateBody(parentExchangeBody),
  asyncHandler(async (req, res) => {
    if (req.auth.role === 'parent') {
      await assertParentLinkedToClass(req.auth.maTaiKhoan, req.body.maLop, req.body.maHocSinh);
    }
    const thoiDiem = parseThoiDiemHoacNow(req.body.thoiDiem);
    const maTraoDoi = await createExchange({
      maLop: req.body.maLop,
      maHocSinh: req.body.maHocSinh,
      maNguoiGui: req.auth.maTaiKhoan,
      vaiTroGui: 'parent',
      tieuDe: req.body.tieuDe,
      noiDung: req.body.noiDung,
      thoiDiem,
    });
    res.status(201).json({ maTraoDoi });
  }),
);

router.get(
  '/phu-huynh/diem-danh-hoc-sinh',
  requireAuth,
  requireRoles(['parent', 'admin']),
  validateQuery(parentAttendanceQuery),
  asyncHandler(async (req, res) => {
    const { from, to, maHocSinh } = req.validatedQuery;
    const toD = parseQueryDateOptional(to) ?? new Date();
    const fromD = parseQueryDateOptional(from) ?? new Date(toD.getTime() - 30 * 86400000);
    const items = await listStudentAttendanceForParent(req.auth.maTaiKhoan, {
      from: fromD,
      to: toD,
      maHocSinh,
    });
    res.json({ items });
  }),
);

export default router;
