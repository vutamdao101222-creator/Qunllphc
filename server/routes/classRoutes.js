import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createClass, deleteClass, getClass, listClasses, updateClass } from '../services/classService.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';
import { auditFromReq } from '../utils/auditFromReq.js';
import { HttpError } from '../utils/httpError.js';
import { assertTeacherOwnsClass, resolveTeacherMaGiaoVien } from '../services/authorizationService.js';
import {
  createExchange,
  listExchangeForClass,
} from '../services/parentTeacherExchangeService.js';
import {
  createStudentAttendance,
  listStudentAttendanceForClass,
} from '../services/studentAttendanceDetailService.js';
import { getPool, sql } from '../db.js';

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

const exchangeQuery = z.object({ maHocSinh: z.string().max(50).optional() });
const exchangeBody = z.object({
  maHocSinh: z.string().max(50).optional().nullable(),
  tieuDe: z.string().max(255).optional(),
  noiDung: z.string().min(1).max(2000),
  thoiDiem: z.string().max(45).optional(),
});

const hsddQuery = z.object({
  maHocSinh: z.string().max(50).optional(),
  from: z.string().max(45).optional(),
  to: z.string().max(45).optional(),
});

const hsddBody = z.object({
  maHocSinh: z.string().min(1).max(50),
  trangThai: z.enum(['present', 'late', 'absent']),
  thoiDiem: z.string().max(45).optional(),
  ghiChu: z.string().max(500).optional(),
});

/** Chuỗi thời gian từ client (ISO có Z hoặc datetime-local không offset). */
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

async function assertTeacherOrAdminClass(req, maLop) {
  if (req.auth.role === 'teacher') {
    await assertTeacherOwnsClass(req, maLop);
  } else if (req.auth.role !== 'admin') {
    throw new HttpError(403, 'Ban khong co quyen voi lop nay');
  }
}

router.get(
  '/lop-hoc',
  requireAuth,
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    let { page, pageSize, q, sort, order, maGiaoVien } = req.validatedQuery;
    if (req.auth.role === 'teacher') {
      const code = await resolveTeacherMaGiaoVien(req);
      if (!code) {
        res.json(buildPageResult([], 0, page, pageSize));
        return;
      }
      maGiaoVien = code;
    }
    const { items, total } = await listClasses({ page, pageSize, q, sort, order, maGiaoVien });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/lop-hoc/:maLop/goi-y-ma-hoc-sinh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    await assertTeacherOrAdminClass(req, req.params.maLop);
    const pool = await getPool();
    const maLop = req.params.maLop;
    const r = await pool.request().input('l', sql.NVarChar, maLop).query(`
      SELECT DISTINCT v.[MaHocSinh] AS maHocSinh
      FROM (
        SELECT [MaHocSinh] FROM dbo.PhuHuynh_HocSinh WHERE [MaLop] = @l
        UNION
        SELECT [MaHocSinh] FROM dbo.HocSinhDiemDanh WHERE [MaLop] = @l
      ) v
      WHERE v.[MaHocSinh] IS NOT NULL
      ORDER BY v.[MaHocSinh]
    `);
    res.json({ items: r.recordset.map((x) => x.maHocSinh) });
  }),
);

router.get(
  '/lop-hoc/:maLop/trao-doi',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(codeParam),
  validateQuery(exchangeQuery),
  asyncHandler(async (req, res) => {
    await assertTeacherOrAdminClass(req, req.params.maLop);
    const items = await listExchangeForClass({
      maLop: req.params.maLop,
      maHocSinh: req.validatedQuery.maHocSinh,
    });
    res.json({ items });
  }),
);

router.post(
  '/lop-hoc/:maLop/trao-doi',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  denyIfReadOnly,
  validateParams(codeParam),
  validateBody(exchangeBody),
  asyncHandler(async (req, res) => {
    await assertTeacherOrAdminClass(req, req.params.maLop);
    const thoiDiem = parseThoiDiemHoacNow(req.body.thoiDiem);
    const id = await createExchange({
      maLop: req.params.maLop,
      maHocSinh: req.body.maHocSinh ?? null,
      maNguoiGui: req.auth.maTaiKhoan,
      vaiTroGui: 'teacher',
      tieuDe: req.body.tieuDe,
      noiDung: req.body.noiDung,
      thoiDiem,
    });
    auditFromReq(req, 'TRAO_DOI_GV', req.params.maLop, req.body);
    res.status(201).json({ maTraoDoi: id });
  }),
);

router.get(
  '/lop-hoc/:maLop/diem-danh-hoc-sinh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  validateParams(codeParam),
  validateQuery(hsddQuery),
  asyncHandler(async (req, res) => {
    await assertTeacherOrAdminClass(req, req.params.maLop);
    const { maHocSinh, from, to } = req.validatedQuery;
    const items = await listStudentAttendanceForClass({
      maLop: req.params.maLop,
      maHocSinh,
      from: parseQueryDateOptional(from),
      to: parseQueryDateOptional(to),
    });
    res.json({ items });
  }),
);

router.post(
  '/lop-hoc/:maLop/diem-danh-hoc-sinh',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  denyIfReadOnly,
  validateParams(codeParam),
  validateBody(hsddBody),
  asyncHandler(async (req, res) => {
    await assertTeacherOrAdminClass(req, req.params.maLop);
    const thoiDiem = parseThoiDiemHoacNow(req.body.thoiDiem);
    const ma = await createStudentAttendance({
      maLop: req.params.maLop,
      maHocSinh: req.body.maHocSinh,
      thoiDiem,
      trangThai: req.body.trangThai,
      ghiChu: req.body.ghiChu,
      taoBoi: req.auth.maTaiKhoan,
    });
    auditFromReq(req, 'DIEM_DANH_HS', req.params.maLop, req.body);
    res.status(201).json({ ma });
  }),
);

router.get(
  '/lop-hoc/:maLop',
  requireAuth,
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    if (req.auth.role === 'teacher') {
      await assertTeacherOwnsClass(req, req.params.maLop);
    }
    const data = await getClass(req.params.maLop);
    res.json(data);
  }),
);

router.post(
  '/lop-hoc',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const data = await createClass(req.body);
    auditFromReq(req, 'LOP_HOC_TAO', data.maLop, req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/lop-hoc/:maLop',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(codeParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateClass(req.params.maLop, req.body);
    auditFromReq(req, 'LOP_HOC_CAP_NHAT', req.params.maLop, req.body);
    res.json(data);
  }),
);

router.put(
  '/lop-hoc/:maLop',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(codeParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await updateClass(req.params.maLop, req.body);
    auditFromReq(req, 'LOP_HOC_CAP_NHAT', req.params.maLop, req.body);
    res.json(data);
  }),
);

router.delete(
  '/lop-hoc/:maLop',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(codeParam),
  asyncHandler(async (req, res) => {
    const data = await deleteClass(req.params.maLop);
    auditFromReq(req, 'LOP_HOC_XOA', req.params.maLop, {});
    res.json(data);
  }),
);

export default router;
