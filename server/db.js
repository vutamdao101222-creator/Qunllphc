import sql from 'mssql';
import { env } from './config/env.js';

const sqlConfig = {
  server: env.db.server,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  options: {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
  },
};

if (env.db.port) {
  sqlConfig.port = env.db.port;
}

let poolPromise;

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig);
  }
  return poolPromise;
}

export { sql };
