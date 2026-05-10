import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { denyIfReadOnly } from '../middleware/readOnly.js';
import { env } from '../config/env.js';
import { getPool } from '../db.js';
import {
  getMonitoringThresholds,
  getPublicSystemInfo,
  updateMonitoringThresholds,
  updateTenantDisplayName,
} from '../services/systemSettingsService.js';
import { listAuditLogs } from '../services/auditService.js';
import { listDevices, createDevice, updateDevice } from '../services/deviceService.js';

const router = Router();

const thresholdBody = z.object({
  tyLeThamDuToiThieu: z.number().min(0).max(1).optional(),
  nguongTapTrungToiThieu: z.number().min(0).max(100).optional(),
});

const tenantBody = z.object({
  tenHienThi: z.string().min(1).max(200),
});

const deviceCreate = z.object({
  ten: z.string().min(1).max(120),
  maLop: z.string().min(1).max(20).optional().nullable(),
  urlKetNoi: z.string().max(500).optional().nullable(),
  trangThai: z.string().max(30).optional(),
  ghiChu: z.string().max(500).optional().nullable(),
});

const devicePatch = deviceCreate.partial();

const deviceId = z.object({ maThietBi: z.string().uuid() });

router.get(
  '/he-thong/thong-tin',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  asyncHandler(async (_req, res) => {
    const info = await getPublicSystemInfo();
    res.json({
      ...info,
      api: {
        simulationTickMs: env.simulationTickMs,
        dbAutoMigrate: env.db.autoMigrate,
        nodeEnv: env.nodeEnv,
      },
    });
  }),
);

router.get(
  '/he-thong/trang-thai',
  requireAuth,
  requireRoles(['admin']),
  asyncHandler(async (_req, res) => {
    let dbOk = false;
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS ok');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    const thresholds = await getMonitoringThresholds().catch(() => null);
    res.json({
      ok: dbOk,
      db: dbOk,
      simulationTickMs: env.simulationTickMs,
      thresholds,
      cameraMode: (await getPublicSystemInfo().catch(() => ({}))).cameraMode,
    });
  }),
);

router.patch(
  '/he-thong/nguong-giam-sat',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateBody(thresholdBody),
  asyncHandler(async (req, res) => {
    const t = await updateMonitoringThresholds(req.body);
    res.json(t);
  }),
);

router.patch(
  '/he-thong/ten-hien-thi',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateBody(tenantBody),
  asyncHandler(async (req, res) => {
    await updateTenantDisplayName(req.body.tenHienThi);
    res.json({ ok: true });
  }),
);

router.get(
  '/he-thong/nhat-ky',
  requireAuth,
  requireRoles(['admin']),
  validateQuery(paginationSchema.extend({ hanhDong: z.string().max(80).optional() })),
  asyncHandler(async (req, res) => {
    const { page, pageSize, hanhDong } = req.validatedQuery;
    const { items, total } = await listAuditLogs({ page, pageSize, hanhDong });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

router.get(
  '/he-thong/thiet-bi',
  requireAuth,
  requireRoles(['admin', 'teacher']),
  asyncHandler(async (_req, res) => {
    const items = await listDevices();
    res.json({ items });
  }),
);

router.post(
  '/he-thong/thiet-bi',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateBody(deviceCreate),
  asyncHandler(async (req, res) => {
    const data = await createDevice(req.body);
    res.status(201).json(data);
  }),
);

router.patch(
  '/he-thong/thiet-bi/:maThietBi',
  requireAuth,
  requireRoles(['admin']),
  denyIfReadOnly,
  validateParams(deviceId),
  validateBody(devicePatch),
  asyncHandler(async (req, res) => {
    const data = await updateDevice(req.params.maThietBi, req.body);
    res.json(data);
  }),
);

export default router;
