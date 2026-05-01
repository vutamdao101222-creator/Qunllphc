import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { getPool } from './db.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((item) => item.trim()),
      credentials: true,
    }),
  );
  app.use(express.json());

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Qua nhieu lan dang nhap, vui long thu lai sau' },
  });

  app.get('/api/health', async (_req, res, next) => {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS ok');
      res.json({ ok: true, message: 'API and SQL Server are connected' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/v1/auth', loginLimiter, authRoutes);
  app.use('/api/v1', monitoringRoutes);
  app.use('/api/v1', reportRoutes);
  app.use('/api/v1', parentRoutes);
  app.use('/api/v1', aiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
