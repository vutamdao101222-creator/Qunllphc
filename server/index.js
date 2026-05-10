import { env } from './config/env.js';
import { createApp } from './app.js';
import { startSimulationJob } from './jobs/simulationJob.js';
import { runMigrations } from './migrations/runMigrations.js';
import { logError, logInfo } from './utils/logger.js';

async function main() {
  const app = createApp();

  const server = app.listen(env.apiPort, env.apiHost, () => {
    const addr = server.address();
    const where = typeof addr === 'object' && addr ? `${addr.address}:${addr.port}` : String(addr);
    logInfo('API started', {
      host: env.apiHost,
      port: env.apiPort,
      listen: where,
      baseUrlLocal: `http://127.0.0.1:${env.apiPort}`,
    });
  });

  try {
    await runMigrations();
  } catch (err) {
    logError(
      'DB init/migrations failed. API will start, but DB-backed endpoints may fail. Check DB_* env vars (DB_USER/DB_PASSWORD) or set DB_AUTO_MIGRATE=false.',
      err,
    );
  }

  try {
    startSimulationJob();
  } catch (err) {
    logError('Simulation job failed to start', err);
  }
}

main();
