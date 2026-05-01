import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginWithPassword, refreshAccessToken } from '../services/authService.js';

const router = Router();

const loginSchema = z.object({
  tenDangNhap: z.string().min(3),
  matKhau: z.string().min(3),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

router.post('/dang-nhap', validateBody(loginSchema), async (req, res) => {
  const result = await loginWithPassword(req.body.tenDangNhap, req.body.matKhau);
  res.json({ message: 'Dang nhap thanh cong', ...result });
});

router.post('/lam-moi-token', validateBody(refreshSchema), (req, res) => {
  const result = refreshAccessToken(req.body.refreshToken);
  res.json(result);
});

router.get('/toi', requireAuth, (req, res) => {
  res.json({ user: req.auth });
});

export default router;
