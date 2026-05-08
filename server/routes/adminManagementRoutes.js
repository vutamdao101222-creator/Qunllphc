import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createParentStudentLink,
  deleteParentStudentLink,
  listParentStudentLinks,
  listScheduleAdjustments,
  resetScheduleAdjustment,
  upsertScheduleAdjustment,
} from '../services/adminManagementService.js';

const router = Router();

// Parent-student links
const listLinksQuery = z.object({
  parentId: z.string().uuid().optional(),
});
const createLinkSchema = z.object({
  parentId: z.string().uuid(),
  studentId: z.string().min(1).max(50),
  relationship: z.enum(['father', 'mother', 'guardian']).default('guardian'),
});
const linkIdParam = z.object({ linkId: z.string().uuid() });

router.get(
  '/admin/parent-links',
  requireAuth,
  requireRoles(['admin']),
  validateQuery(listLinksQuery),
  asyncHandler(async (req, res) => {
    const items = await listParentStudentLinks({ parentId: req.validatedQuery.parentId });
    res.json({ items });
  }),
);

router.post(
  '/admin/parent-links',
  requireAuth,
  requireRoles(['admin']),
  validateBody(createLinkSchema),
  asyncHandler(async (req, res) => {
    const created = await createParentStudentLink(req.body);
    res.status(201).json({ item: created });
  }),
);

router.delete(
  '/admin/parent-links/:linkId',
  requireAuth,
  requireRoles(['admin']),
  validateParams(linkIdParam),
  asyncHandler(async (req, res) => {
    const data = await deleteParentStudentLink(req.params.linkId);
    res.json(data);
  }),
);

// Schedule adjustments
const listAdjQuery = z.object({
  classId: z.string().min(1).max(20).optional(),
});
const classParam = z.object({ maLop: z.string().min(1).max(20) });
const upsertAdjSchema = z.object({
  schedules: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(1).max(7),
        startTime: z.string().min(1).max(10),
        endTime: z.string().min(1).max(10),
      }),
    )
    .default([]),
  reason: z.string().min(1).max(255),
  updatedBy: z.string().min(1).max(100),
});

router.get(
  '/lich-hoc/dieu-chinh',
  requireAuth,
  requireRoles(['admin', 'teacher', 'parent']),
  validateQuery(listAdjQuery),
  asyncHandler(async (req, res) => {
    const items = await listScheduleAdjustments({ classId: req.validatedQuery.classId });
    res.json({ items });
  }),
);

router.put(
  '/lop-hoc/:maLop/lich-hoc/dieu-chinh',
  requireAuth,
  requireRoles(['admin']),
  validateParams(classParam),
  validateBody(upsertAdjSchema),
  asyncHandler(async (req, res) => {
    const data = await upsertScheduleAdjustment({
      classId: req.params.maLop,
      schedules: req.body.schedules,
      reason: req.body.reason,
      updatedBy: req.body.updatedBy,
    });
    res.json({ item: data });
  }),
);

router.delete(
  '/lop-hoc/:maLop/lich-hoc/dieu-chinh',
  requireAuth,
  requireRoles(['admin']),
  validateParams(classParam),
  asyncHandler(async (req, res) => {
    const data = await resetScheduleAdjustment(req.params.maLop);
    res.json(data);
  }),
);

export default router;

