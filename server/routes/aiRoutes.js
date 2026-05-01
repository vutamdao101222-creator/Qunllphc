import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { generateAiPredictions, getLatestAiPredictions } from '../services/aiService.js';

const router = Router();

router.get('/ai/du-doan', requireAuth, requireRoles(['admin', 'teacher']), async (_req, res) => {
  const data = await getLatestAiPredictions();
  res.json(data);
});

router.post('/ai/chay-lai', requireAuth, requireRoles(['admin']), async (_req, res) => {
  const data = await generateAiPredictions();
  res.json({ message: 'Da cap nhat du doan AI', data });
});

export default router;
