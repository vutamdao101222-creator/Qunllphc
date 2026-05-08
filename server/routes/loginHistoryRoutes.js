import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema, buildPageResult } from '../utils/pagination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { listLoginHistory } from '../services/loginHistoryService.js';

const router = Router();

const listQuery = paginationSchema.extend({
  maTaiKhoan: z.string().uuid().optional(),
  hanhDong: z.string().min(1).max(50).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

router.get(
  '/lich-su-dang-nhap',
  requireAuth,
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, maTaiKhoan, hanhDong, from, to } = req.validatedQuery;
    if (req.auth.role !== 'admin') {
      if (!maTaiKhoan || maTaiKhoan !== req.auth.maTaiKhoan) {
        throw new HttpError(403, 'Ban chi xem duoc lich su dang nhap cua chinh minh');
      }
    }
    const { items, total } = await listLoginHistory({
      page,
      pageSize,
      maTaiKhoan,
      hanhDong,
      from,
      to,
    });
    res.json(buildPageResult(items, total, page, pageSize));
  }),
);

export default router;
