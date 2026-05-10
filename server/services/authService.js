import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../db.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

function mapUser(row) {
  return {
    maTaiKhoan: row.maTaiKhoan,
    tenDangNhap: row.tenDangNhap,
    hoTen: row.hoTen,
    email: row.email,
    laQuanTri: Boolean(row.laQuanTri),
    laGiaoVien: Boolean(row.laGiaoVien),
    laPhuHuynh: Boolean(row.laPhuHuynh),
    chiDoc: Boolean(row.chiDoc),
    role: row.laQuanTri ? 'admin' : row.laGiaoVien ? 'teacher' : 'parent',
  };
}

function roleToFlags(role) {
  const normalized = String(role || 'parent').toLowerCase();
  if (normalized === 'admin') return { laQuanTri: 1, laGiaoVien: 0, laPhuHuynh: 0, role: 'admin' };
  if (normalized === 'teacher') return { laQuanTri: 0, laGiaoVien: 1, laPhuHuynh: 0, role: 'teacher' };
  return { laQuanTri: 0, laGiaoVien: 0, laPhuHuynh: 1, role: 'parent' };
}

function signTokens(user) {
  const payload = {
    maTaiKhoan: user.maTaiKhoan,
    tenDangNhap: user.tenDangNhap,
    role: user.role,
    laQuanTri: user.laQuanTri,
    laGiaoVien: user.laGiaoVien,
    laPhuHuynh: user.laPhuHuynh,
    chiDoc: user.chiDoc,
  };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
  const refreshToken = jwt.sign({ maTaiKhoan: user.maTaiKhoan, role: user.role }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

export async function registerUser({ tenDangNhap, matKhau, hoTen, email, role }) {
  const pool = await getPool();
  const flags = roleToFlags(role);
  const matKhauHash = await bcrypt.hash(matKhau, 10);

  const existing = await pool
    .request()
    .input('tenDangNhap', tenDangNhap)
    .query('SELECT TOP 1 1 AS ok FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = @tenDangNhap');
  if (existing.recordset?.[0]) throw new HttpError(409, 'Ten dang nhap da ton tai');

  const insertResult = await pool
    .request()
    .input('tenDangNhap', tenDangNhap)
    .input('matKhau', '') // legacy column, keep NOT NULL
    .input('matKhauHash', matKhauHash)
    .input('hoTen', hoTen)
    .input('email', email ?? null)
    .input('laQuanTri', flags.laQuanTri)
    .input('laGiaoVien', flags.laGiaoVien)
    .input('laPhuHuynh', flags.laPhuHuynh)
    .query(`
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      OUTPUT
        inserted.[MãTàiKhoản] AS maTaiKhoan,
        inserted.[TênĐăngNhập] AS tenDangNhap,
        inserted.[HọTên] AS hoTen,
        inserted.[Email] AS email,
        inserted.[LàQuảnTrị] AS laQuanTri,
        inserted.[LàGiáoViên] AS laGiaoVien,
        inserted.[LàPhụHuynh] AS laPhuHuynh
      VALUES
      (
        @tenDangNhap, @matKhau, @matKhauHash, @hoTen, @email,
        @laQuanTri, @laGiaoVien, @laPhuHuynh, 1
      )
    `);

  const user = mapUser(insertResult.recordset[0]);
  const tokens = signTokens(user);
  return { user, ...tokens };
}

export async function loginWithPassword(tenDangNhap, matKhau) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('tenDangNhap', tenDangNhap)
    .query(`
      SELECT TOP 1
        [MãTàiKhoản] AS maTaiKhoan,
        [TênĐăngNhập] AS tenDangNhap,
        [HọTên] AS hoTen,
        [Email] AS email,
        [LàQuảnTrị] AS laQuanTri,
        [LàGiáoViên] AS laGiaoVien,
        [LàPhụHuynh] AS laPhuHuynh,
        CASE WHEN [ChỉĐọc] = 1 THEN 1 ELSE 0 END AS chiDoc,
        [MậtKhẩu] AS matKhau,
        [MậtKhẩuHash] AS matKhauHash
      FROM dbo.TaiKhoan
      WHERE [TênĐăngNhập] = @tenDangNhap
        AND [HoạtĐộng] = 1
    `);

  const account = result.recordset[0];
  if (!account) throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');

  let valid = false;
  if (account.matKhauHash) {
    valid = await bcrypt.compare(matKhau, account.matKhauHash);
  } else {
    valid = account.matKhau === matKhau;
    if (valid) {
      const hash = await bcrypt.hash(matKhau, 10);
      await pool
        .request()
        .input('maTaiKhoan', account.maTaiKhoan)
        .input('matKhauHash', hash)
        .query('UPDATE dbo.TaiKhoan SET [MậtKhẩuHash] = @matKhauHash WHERE [MãTàiKhoản] = @maTaiKhoan');
    }
  }

  if (!valid) throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');

  const user = mapUser(account);
  const tokens = signTokens(user);

  await pool
    .request()
    .input('maTaiKhoan', user.maTaiKhoan)
    .input('hanhDong', 'LOGIN_SUCCESS')
    .input('ghiChu', 'Dang nhap thanh cong')
    .query(`
      INSERT INTO dbo.LichSuDangNhap ([MãTàiKhoản], [HànhĐộng], [GhiChú])
      VALUES (@maTaiKhoan, @hanhDong, @ghiChu)
    `);

  return { user, ...tokens };
}

export async function refreshAccessToken(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
    const pool = await getPool();
    const r = await pool
      .request()
      .input('id', sql.UniqueIdentifier, payload.maTaiKhoan)
      .query(`
        SELECT TOP 1
          [MãTàiKhoản] AS maTaiKhoan,
          [TênĐăngNhập] AS tenDangNhap,
          [HọTên] AS hoTen,
          [Email] AS email,
          [LàQuảnTrị] AS laQuanTri,
          [LàGiáoViên] AS laGiaoVien,
          [LàPhụHuynh] AS laPhuHuynh,
          CASE WHEN [ChỉĐọc] = 1 THEN 1 ELSE 0 END AS chiDoc
        FROM dbo.TaiKhoan
        WHERE [MãTàiKhoản] = @id AND [HoạtĐộng] = 1
      `);
    const row = r.recordset[0];
    if (!row) throw new HttpError(401, 'Refresh token khong hop le');
    const user = mapUser(row);
    const accessToken = jwt.sign(
      {
        maTaiKhoan: user.maTaiKhoan,
        tenDangNhap: user.tenDangNhap,
        role: user.role,
        laQuanTri: user.laQuanTri,
        laGiaoVien: user.laGiaoVien,
        laPhuHuynh: user.laPhuHuynh,
        chiDoc: user.chiDoc,
      },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.accessExpiresIn },
    );
    return { accessToken };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, 'Refresh token khong hop le');
  }
}
