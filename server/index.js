import { env } from './config/env.js';
import { createApp } from './app.js';
import { startSimulationJob } from './jobs/simulationJob.js';
import { runMigrations } from './migrations/runMigrations.js';
import { logError, logInfo } from './utils/logger.js';

async function main() {
  const app = createApp();

  app.listen(env.apiPort, () => {
    logInfo('API started', { port: env.apiPort, baseUrl: `http://localhost:${env.apiPort}` });
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
