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
    poolPromise = sql.connect(sqlConfig);
  }
  return poolPromise;
}

export { sql };
