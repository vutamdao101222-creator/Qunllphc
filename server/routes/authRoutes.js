import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginWithPassword, refreshAccessToken, registerUser } from '../services/authService.js';

const router = Router();

const loginSchema = z.object({
  tenDangNhap: z.string().min(3),
  matKhau: z.string().min(3),
});

const registerSchema = z.object({
  tenDangNhap: z.string().min(3).max(50),
  matKhau: z.string().min(6).max(100),
  hoTen: z.string().min(2).max(100),
  email: z.string().email().optional(),
  role: z.enum(['parent', 'teacher', 'admin']).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

router.post('/dang-nhap', validateBody(loginSchema), async (req, res) => {
  const result = await loginWithPassword(req.body.tenDangNhap, req.body.matKhau);
  res.json({ message: 'Dang nhap thanh cong', ...result });
});

router.post('/dang-ky', validateBody(registerSchema), async (req, res, next) => {
  try {
    // Self-register only for parent; teacher/admin must be created by an admin.
    const role = req.body.role || 'parent';
    if (role !== 'parent') {
      return requireAuth(req, res, (err) => {
        if (err) return next(err);
        return requireRoles(['admin'])(req, res, async (err2) => {
          if (err2) return next(err2);
          const result = await registerUser({ ...req.body, role });
          return res.json({ message: 'Tao tai khoan thanh cong', ...result });
        });
      });
    }

    const result = await registerUser({ ...req.body, role: 'parent' });
    return res.json({ message: 'Dang ky thanh cong', ...result });
  } catch (error) {
    return next(error);
  }
});

router.post('/lam-moi-token', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const result = await refreshAccessToken(req.body.refreshToken);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/toi', requireAuth, (req, res) => {
  res.json({ user: req.auth });
});

export default router;
