import { env } from './config/env.js';
import { createApp } from './app.js';
import { startSimulationJob } from './jobs/simulationJob.js';
import { logInfo } from './utils/logger.js';

const app = createApp();

app.listen(env.apiPort, () => {
  logInfo('API started', { port: env.apiPort, baseUrl: `http://localhost:${env.apiPort}` });
});

startSimulationJob();
