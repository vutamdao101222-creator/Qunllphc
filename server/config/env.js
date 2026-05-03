import dotenv from 'dotenv';

dotenv.config();

function toBool(value, fallback) {
  if (value === undefined) return fallback;
  return value === 'true';
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: Number(process.env.API_PORT || 4000),
  db: {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'TruongHocViet',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    encrypt: toBool(process.env.DB_ENCRYPT, false),
    trustServerCertificate: toBool(process.env.DB_TRUST_SERVER_CERT, true),
    autoMigrate: toBool(process.env.DB_AUTO_MIGRATE, true),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'replace_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'replace_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  simulationTickMs: Number(process.env.SIMULATION_TICK_MS || 15000),
};
