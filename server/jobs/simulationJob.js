import { env } from '../config/env.js';
import { generateAiPredictions } from '../services/aiService.js';
import { createRealtimeSnapshot, getLatestRealtime, upsertAlertsFromRealtime } from '../services/monitoringService.js';
import { runScheduleRemindersIfNeeded } from '../services/scheduleReminderService.js';
import { broadcast } from '../sse/hub.js';
import { logError, logInfo } from '../utils/logger.js';

let timerId;

async function runTick() {
  try {
    await runScheduleRemindersIfNeeded();
    await createRealtimeSnapshot();
    const realtime = await getLatestRealtime();
    await upsertAlertsFromRealtime(realtime);
    const ai = await generateAiPredictions();
    broadcast('realtime', { classes: realtime, ts: new Date().toISOString() });
    broadcast('ai', { predictions: ai, ts: new Date().toISOString() });
  } catch (error) {
    logError('Simulation tick failed', error);
  }
}

export function startSimulationJob() {
  if (timerId) return;
  logInfo('Starting simulation job', { simulationTickMs: env.simulationTickMs });
  runTick();
  timerId = setInterval(runTick, env.simulationTickMs);
}
