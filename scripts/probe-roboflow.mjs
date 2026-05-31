/**
 * Kiểm tra TCP tới Inference (vd 127.0.0.1:9001) — không cần Roboflow key.
 * Usage: node scripts/probe-roboflow.mjs
 */
import net from 'node:net';
import { config } from 'dotenv';

config();

function parseInferenceTarget(rawUrl) {
  const u = String(rawUrl || 'http://127.0.0.1:9001').trim();
  try {
    const url = new URL(u.startsWith('http') ? u : `http://${u}`);
    return {
      hostname: url.hostname || '127.0.0.1',
      port: Number(url.port || (url.protocol === 'https:' ? 443 : 9001)),
    };
  } catch {
    return { hostname: '127.0.0.1', port: 9001 };
  }
}

const { hostname, port } = parseInferenceTarget(process.env.ROBOFLOW_INFERENCE_URL);

const socket = net.createConnection({ host: hostname, port, timeout: 5000 }, () => {
  console.log(`OK: ${hostname}:${port} có tiến trình lắng nghe (TCP đã kết nối).`);
  socket.end();
});

socket.on('error', (err) => {
  console.error(`FAIL: ${hostname}:${port} — ${err.message}`);
  console.error(
    'Gợi ý: trên máy chạy `npm run api`, bật Inference (vd `inference server start --port ' +
      port +
      '`), hoặc trong .env đặt ROBOFLOW_INFERENCE_URL=https://serverless.roboflow.com và ROBOFLOW_API_KEY (+ tùy chọn ROBOFLOW_HOSTED_FALLBACK=true).',
  );
  process.exitCode = 1;
});

socket.on('timeout', () => {
  console.error(`FAIL: timeout kết nối ${hostname}:${port}`);
  socket.destroy();
  process.exitCode = 1;
});
