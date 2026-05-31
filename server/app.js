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
import focusInferenceRoutes from './routes/focusInferenceRoutes.js';
import focusMetricsRoutes from './routes/focusMetricsRoutes.js';
import speakerRoutes from './routes/speakerRoutes.js';
import rtspRoutes from './routes/rtspRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import classRoutes from './routes/classRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import loginHistoryRoutes from './routes/loginHistoryRoutes.js';
import adminManagementRoutes from './routes/adminManagementRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { getPool } from './db.js';

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((item) => item.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '25mb' }));

  const loginLimiter = env.loginRateLimitDisabled
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: env.loginRateLimitWindowMs,
        max: env.loginRateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { message: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau' },
      });

  app.get('/api/health', async (_req, res, next) => {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS ok');
      res.json({
        ok: true,
        db: true,
        message: 'API and SQL Server are connected',
        simulationTickMs: env.simulationTickMs,
        dbAutoMigrate: env.db.autoMigrate,
      });
    } catch (error) {
      const raw = error?.message || 'Database unavailable';
      let message = raw;
      if (/ECONNRESET|ECONNREFUSED|ETIMEDOUT|ETIMEOUT|login failed|Login failed/i.test(String(raw))) {
        message = `${raw} | Gợi ý: SQL trên cùng máy với Node → DB_SERVER=127.0.0.1; bật TCP/IP trong SQL Server Configuration Manager; firewall cho cổng 1433 (hoặc cổng instance); kiểm tra DB_USER/DB_PASSWORD.`;
      }
      res.status(503).json({
        ok: false,
        db: false,
        message,
        simulationTickMs: env.simulationTickMs,
      });
    }
  });

  app.use('/api/v1/auth', loginLimiter, authRoutes);
  app.use('/api/v1', monitoringRoutes);
  app.use('/api/v1', reportRoutes);
  app.use('/api/v1', parentRoutes);
  app.use('/api/v1', aiRoutes);
  app.use('/api/v1', focusInferenceRoutes);
  app.use('/api/v1', focusMetricsRoutes);
  app.use('/api/v1', speakerRoutes);
  app.use('/api/v1', rtspRoutes);
  app.use('/api/v1', teacherRoutes);
  app.use('/api/v1', classRoutes);
  app.use('/api/v1', accountRoutes);
  app.use('/api/v1', sessionRoutes);
  app.use('/api/v1', attendanceRoutes);
  app.use('/api/v1', alertRoutes);
  app.use('/api/v1', notificationRoutes);
  app.use('/api/v1', metricsRoutes);
  app.use('/api/v1', loginHistoryRoutes);
  app.use('/api/v1', adminManagementRoutes);
  app.use('/api/v1', systemRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
