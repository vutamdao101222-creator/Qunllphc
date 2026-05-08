import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { ensureDatabaseExists, getPool } from '../db.js';
import { seedSampleData } from './seedSampleData.js';
import { logInfo } from '../utils/logger.js';

function splitSqlBatches(sqlText) {
  // Split on standalone "GO" lines (SQL Server batch separator).
  return sqlText
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function runMigrations() {
  if (!env.db.autoMigrate) return;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..', '..');
  const migrationsDir = path.join(projectRoot, 'database', 'migrations');

  await ensureDatabaseExists();
  const pool = await getPool();

  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.sql'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    logInfo('No migration files found', { migrationsDir });
    return;
  }

  for (const fileName of sqlFiles) {
    const fullPath = path.join(migrationsDir, fileName);
    const sqlText = await fs.readFile(fullPath, 'utf8');
    const batches = splitSqlBatches(sqlText);

    logInfo('Running migration', { fileName, batches: batches.length });
    for (const batch of batches) {
      await pool.request().batch(batch);
    }
  }

  logInfo('Migrations completed', { files: sqlFiles.length });
  await seedSampleData(pool, env.sampleSeedCount);
}

