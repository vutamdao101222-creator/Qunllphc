import dotenv from 'dotenv';

dotenv.config();

function toBool(value, fallback) {
  if (value === undefined) return fallback;
  return value === 'true';
}

/** Tránh \r / khoảng trắng cuối dòng trong .env (Windows) làm sai mật khẩu SQL. */
function trimStr(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim();
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: Number(process.env.API_PORT || 4000),
  /** 0.0.0.0 — lắng nghe mọi giao diện mạng (LAN, IIS ARR trỏ về máy chủ) */
  apiHost: process.env.API_HOST || '0.0.0.0',
  /** Đặt true khi API đứng sau IIS / reverse proxy (X-Forwarded-For, rate limit) */
  trustProxy: toBool(process.env.TRUST_PROXY, false),
  db: {
    // Support legacy/typo env var name DB_SEVER
    server: trimStr(process.env.DB_SERVER || process.env.DB_SEVER, 'BINMILO'),
    database: trimStr(process.env.DB_NAME, 'TruongHocViet'),
    user: trimStr(process.env.DB_USER, 'sa'),
    password: trimStr(process.env.DB_PASSWORD, '123456aA@'),
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    encrypt: toBool(process.env.DB_ENCRYPT, false),
    trustServerCertificate: toBool(process.env.DB_TRUST_SERVER_CERT, true),
    autoMigrate: toBool(process.env.DB_AUTO_MIGRATE, true),
    /** ms — tedious/mssql; tăng nếu SQL khởi động chậm */
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 30000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000),
    /** Windows: dùng mssql/msnodesqlv8 + Trusted Connection (Node chạy dưới user đã có quyền SQL) */
    windowsAuth: toBool(process.env.DB_WINDOWS_AUTH, false),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'replace_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'replace_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  simulationTickMs: Number(process.env.SIMULATION_TICK_MS || 15000),
  sampleSeedCount: Number(process.env.SAMPLE_SEED_COUNT || 30),
  /**
   * Giới hạn POST /auth/* (chống brute-force).
   * Mặc định tắt (không giới hạn). Production: đặt LOGIN_RATE_LIMIT_DISABLED=false
   */
  loginRateLimitDisabled: toBool(process.env.LOGIN_RATE_LIMIT_DISABLED, true),
  loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX || 100),
  /** Roboflow Inference (workflow tập trung học sinh) — chỉ backend gọi, không đưa key lên frontend */
  roboflow: {
    enabled: toBool(process.env.ROBOFLOW_FOCUS_ENABLED, true),
    /** Ví dụ: http://127.0.0.1:9001 (Inference Server local) hoặc https://serverless.roboflow.com */
    inferenceBaseUrl: trimStr(process.env.ROBOFLOW_INFERENCE_URL, 'http://127.0.0.1:9001').replace(/\/$/, ''),
    /** Roboflow Serverless Hosted API — cùng path /infer/workflows/... như Inference local */
    serverlessBaseUrl: trimStr(
      process.env.ROBOFLOW_SERVERLESS_URL || 'https://serverless.roboflow.com',
      'https://serverless.roboflow.com',
    ).replace(/\/$/, ''),
    /**
     * Khi không kết nối được Inference local (ECONNREFUSED, timeout...), thử tiếp serverless — cần ROBOFLOW_API_KEY.
     */
    hostedFallback: toBool(process.env.ROBOFLOW_HOSTED_FALLBACK, false),
    apiKey: trimStr(process.env.ROBOFLOW_API_KEY, ''),
    workspace: trimStr(process.env.ROBOFLOW_WORKSPACE, 'dao-tmqly'),
    workflowId: trimStr(process.env.ROBOFLOW_WORKFLOW_ID, 'student-focus-monitor-1778252522047'),
    /** Nếu server dùng path khác, set full URL (ví dụ http://127.0.0.1:9001/infer/workflows/ws/workflow) */
    inferWorkflowUrlOverride: trimStr(process.env.ROBOFLOW_INFER_WORKFLOW_URL, ''),
    imageInputName: trimStr(process.env.ROBOFLOW_IMAGE_INPUT_NAME, 'image'),
  },
};
