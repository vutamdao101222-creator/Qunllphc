/**
 * Kiểm tra kết nối SQL giống Node (tedious = TCP).
 * Chạy: npm run probe-db
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import sql from 'mssql';

function trimStr(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim();
}

const server = trimStr(process.env.DB_SERVER || process.env.DB_SEVER, 'BINMILO');
const database = trimStr(process.env.DB_NAME, 'TruongHocViet');
const user = trimStr(process.env.DB_USER, 'sa');
const password = trimStr(process.env.DB_PASSWORD, '');
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const encrypt = String(process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true';
const trustServerCertificate = String(process.env.DB_TRUST_SERVER_CERT ?? 'true').toLowerCase() === 'true';

async function tryConnect(label, cfg) {
  try {
    const pool = await sql.connect(cfg);
    const r = await pool.request().query('SELECT @@VERSION AS v, SUSER_SNAME() AS who');
    console.log(`\n✓ ${label}`);
    console.log('  User context:', r.recordset[0]?.who);
    console.log('  Version:', String(r.recordset[0]?.v || '').split('\n')[0]?.slice(0, 100));
    await pool.close();
    return true;
  } catch (e) {
    console.error(`\n✗ ${label}`);
    console.error(' ', e.message || e);
    return false;
  }
}

const base = {
  server,
  database,
  user,
  password,
  options: {
    encrypt,
    trustServerCertificate,
    connectTimeout: 20000,
    requestTimeout: 20000,
    enableArithAbort: true,
  },
  pool: { max: 1, min: 0, idleTimeoutMillis: 5000 },
};
if (port) base.port = port;

console.log('Thử kết nối TCP (tedious) như API Node...');
console.log('  server:', server, port ? `port ${port}` : '(mặc định 1433)');
console.log('  user:', user);
console.log('  encrypt:', encrypt);

let ok = await tryConnect('Cấu hình .env hiện tại', { ...base });

if (!ok && encrypt) {
  ok = await tryConnect('Thử lại với encrypt=false (môi trường LAN nội bộ)', {
    ...base,
    options: { ...base.options, encrypt: false },
  });
}

if (!ok && server !== '127.0.0.1') {
  const local = { ...base, server: '127.0.0.1', port: port || 1433 };
  ok = await tryConnect('Thử 127.0.0.1,1433', local);
}

console.log('\n--- So sánh với sqlcmd (cũng dùng TCP) ---');
console.log('Nếu các dòng trên đều ✗, chạy trong CMD:');
console.log(
  `  sqlcmd -S "tcp:127.0.0.1,1433" -U ${user} -P "<mật khẩu trong .env>" -Q "SELECT 1" -b`,
);
console.log('Chỉ khi lệnh sqlcmd trên OK thì npm run api mới kết nối được bằng SQL login.');
console.log('Nếu sqlcmd -S BINMILO được nhưng tcp:127.0.0.1 thì không → bật TCP/IP + cổng trong SQL Server Configuration Manager.');
console.log('Hoặc đặt DB_WINDOWS_AUTH=true trong .env (Windows), cấp quyền user Windows chạy npm trên SQL.\n');

process.exit(ok ? 0 : 1);
