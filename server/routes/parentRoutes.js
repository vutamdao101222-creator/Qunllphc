import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getParentOverview } from '../services/parentService.js';

const router = Router();

router.get('/phu-huynh/tong-quan', requireAuth, requireRoles(['parent', 'admin']), async (_req, res) => {
  const data = await getParentOverview();
  res.json(data);
});

export default router;
