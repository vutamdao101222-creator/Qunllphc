import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db.js';
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
    role: row.laQuanTri ? 'admin' : row.laGiaoVien ? 'teacher' : 'parent',
  };
}

function signTokens(user) {
  const payload = {
    maTaiKhoan: user.maTaiKhoan,
    tenDangNhap: user.tenDangNhap,
    role: user.role,
    laQuanTri: user.laQuanTri,
    laGiaoVien: user.laGiaoVien,
    laPhuHuynh: user.laPhuHuynh,
  };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
  const refreshToken = jwt.sign({ maTaiKhoan: user.maTaiKhoan, role: user.role }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
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
        [MậtKhẩu] AS matKhau,
        [MậtKhẩuHash] AS matKhauHash
      FROM dbo.TaiKhoan
      WHERE [TênĐăngNhập] = @tenDangNhap
        AND [HoạtĐộng] = 1
    `);

  const account = result.recordset[0];
  if (!account) throw new HttpError(401, 'Sai ten dang nhap hoac mat khau');

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

  if (!valid) throw new HttpError(401, 'Sai ten dang nhap hoac mat khau');

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

export function refreshAccessToken(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
    const accessToken = jwt.sign(
      {
        maTaiKhoan: payload.maTaiKhoan,
        role: payload.role,
      },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.accessExpiresIn },
    );
    return { accessToken };
  } catch {
    throw new HttpError(401, 'Refresh token khong hop le');
  }
}
