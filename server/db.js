import baseMssql from 'mssql';
import { env } from './config/env.js';
import { logError } from './utils/logger.js';

/**
 * Không import tĩnh mssql/msnodesqlv8 — module đó ghi đè driver global và làm mọi connect dùng ODBC.
 */
export const sql = env.db.windowsAuth
  ? (await import('mssql/msnodesqlv8.js')).default
  : baseMssql;

function buildSqlConfig() {
  const pool = {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  };

  const options = {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
    connectTimeout: env.db.connectTimeout,
    requestTimeout: env.db.requestTimeout,
    enableArithAbort: true,
  };

  if (env.db.windowsAuth) {
    return {
      server: env.db.server,
      database: env.db.database,
      options: {
        ...options,
        trustedConnection: true,
      },
      pool,
    };
  }

  const cfg = {
    server: env.db.server,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    options,
    pool,
  };
  if (env.db.port) {
    cfg.port = env.db.port;
  }
  return cfg;
}

const sqlConfig = buildSqlConfig();

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
