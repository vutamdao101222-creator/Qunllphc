import sql from 'mssql';
import { env } from './config/env.js';
import { logError } from './utils/logger.js';

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

export async function ensureDatabaseExists() {
  const masterConfig = { ...sqlConfig, database: 'master' };
  const masterPool = await sql.connect(masterConfig);
  try {
    await masterPool
      .request()
      .input('dbName', sql.NVarChar, env.db.database)
      .query(
        `
        IF DB_ID(@dbName) IS NULL
        BEGIN
          DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE [' + REPLACE(@dbName, N']', N']]') + N']';
          EXEC(@sql);
        END
      `,
      );
  } finally {
    try {
      await masterPool.close();
    } catch {
      // ignore
    }
  }
}

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig).then((pool) => {
      pool.on('error', (err) => {
        logError('SQL pool connection error; pool will reconnect on next use', err);
        poolPromise = null;
      });
      return pool;
    });
  }
  return poolPromise;
}

export { sql };
