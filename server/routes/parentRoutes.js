import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getParentOverview, listMyParentLinks } from '../services/parentService.js';

const router = Router();

router.get('/phu-huynh/tong-quan', requireAuth, requireRoles(['parent', 'admin']), async (_req, res) => {
  const data = await getParentOverview();
  res.json(data);
});

router.get('/phu-huynh/lien-ket', requireAuth, requireRoles(['parent', 'admin']), async (req, res) => {
  const items = await listMyParentLinks(req.auth.maTaiKhoan);
  res.json({ items });
});

export default router;
