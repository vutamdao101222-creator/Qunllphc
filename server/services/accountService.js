import bcrypt from 'bcryptjs';
import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SORTABLE = new Set(['tenDangNhap', 'hoTen', 'email', 'ngayTao']);
const SORT_COLUMN_MAP = {
  tenDangNhap: '[TênĐăngNhập]',
  hoTen: '[HọTên]',
  email: '[Email]',
  ngayTao: '[NgàyTạo]',
};

function rolesFromRow(row) {
  if (row.laQuanTri) return 'admin';
  if (row.laGiaoVien) return 'teacher';
  if (row.laPhuHuynh) return 'parent';
  return 'parent';
}

function mapRow(row) {
  return {
    maTaiKhoan: row.maTaiKhoan,
    tenDangNhap: row.tenDangNhap,
    hoTen: row.hoTen,
    email: row.email,
    laQuanTri: Boolean(row.laQuanTri),
    laGiaoVien: Boolean(row.laGiaoVien),
    laPhuHuynh: Boolean(row.laPhuHuynh),
    hoatDong: Boolean(row.hoatDong),
    ngayTao: row.ngayTao,
    role: rolesFromRow(row),
  };
}

function flagsFromRole(role) {
  const r = String(role || 'parent').toLowerCase();
  if (r === 'admin') return { laQuanTri: 1, laGiaoVien: 0, laPhuHuynh: 0 };
  if (r === 'teacher') return { laQuanTri: 0, laGiaoVien: 1, laPhuHuynh: 0 };
  return { laQuanTri: 0, laGiaoVien: 0, laPhuHuynh: 1 };
}

const SELECT_COLUMNS = `
  [MãTàiKhoản] AS maTaiKhoan,
  [TênĐăngNhập] AS tenDangNhap,
  [HọTên] AS hoTen,
  [Email] AS email,
  [LàQuảnTrị] AS laQuanTri,
  [LàGiáoViên] AS laGiaoVien,
  [LàPhụHuynh] AS laPhuHuynh,
  [HoạtĐộng] AS hoatDong,
  [NgàyTạo] AS ngayTao
`;

export async function listAccounts({ page, pageSize, q, sort, order, role }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const sortKey = SORTABLE.has(sort) ? sort : 'tenDangNhap';
  const sortColumn = SORT_COLUMN_MAP[sortKey];
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const filters = [];
  if (q) filters.push('([TênĐăngNhập] LIKE @q OR [HọTên] LIKE @q OR [Email] LIKE @q)');
  if (role === 'admin') filters.push('[LàQuảnTrị] = 1');
  if (role === 'teacher') filters.push('[LàGiáoViên] = 1');
  if (role === 'parent') filters.push('[LàPhụHuynh] = 1');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (q) totalReq.input('q', sql.NVarChar, `%${q}%`);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.TaiKhoan ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (q) request.input('q', sql.NVarChar, `%${q}%`);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.TaiKhoan
    ${where}
    ORDER BY ${sortColumn} ${sortDir}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function getAccount(maTaiKhoan) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .query(`SELECT ${SELECT_COLUMNS} FROM dbo.TaiKhoan WHERE [MãTàiKhoản] = @maTaiKhoan`);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay tai khoan');
  return mapRow(row);
}

export async function createAccount(data) {
  const pool = await getPool();
  const exists = await pool
    .request()
    .input('tenDangNhap', sql.NVarChar, data.tenDangNhap)
    .query('SELECT TOP 1 1 AS ok FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = @tenDangNhap');
  if (exists.recordset[0]) throw new HttpError(409, 'Ten dang nhap da ton tai');

  const flags = flagsFromRole(data.role);
  const matKhauHash = await bcrypt.hash(data.matKhau, 10);
  const inserted = await pool
    .request()
    .input('tenDangNhap', sql.NVarChar, data.tenDangNhap)
    .input('matKhau', sql.NVarChar, '')
    .input('matKhauHash', sql.NVarChar, matKhauHash)
    .input('hoTen', sql.NVarChar, data.hoTen)
    .input('email', sql.NVarChar, data.email ?? null)
    .input('laQuanTri', sql.Bit, flags.laQuanTri)
    .input('laGiaoVien', sql.Bit, flags.laGiaoVien)
    .input('laPhuHuynh', sql.Bit, flags.laPhuHuynh)
    .input('hoatDong', sql.Bit, data.hoatDong === false ? 0 : 1)
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
        inserted.[LàPhụHuynh] AS laPhuHuynh,
        inserted.[HoạtĐộng] AS hoatDong,
        inserted.[NgàyTạo] AS ngayTao
      VALUES
      (
        @tenDangNhap, @matKhau, @matKhauHash, @hoTen, @email,
        @laQuanTri, @laGiaoVien, @laPhuHuynh, @hoatDong
      )
    `);
  return mapRow(inserted.recordset[0]);
}

export async function updateAccount(maTaiKhoan, data, { allowRoleChange }) {
  await getAccount(maTaiKhoan);
  const pool = await getPool();
  const request = pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .input('hoTen', sql.NVarChar, data.hoTen ?? null)
    .input('email', sql.NVarChar, data.email ?? null);

  let setRoles = '';
  if (allowRoleChange && data.role) {
    const flags = flagsFromRole(data.role);
    request
      .input('laQuanTri', sql.Bit, flags.laQuanTri)
      .input('laGiaoVien', sql.Bit, flags.laGiaoVien)
      .input('laPhuHuynh', sql.Bit, flags.laPhuHuynh);
    setRoles = `
        [LàQuảnTrị] = @laQuanTri,
        [LàGiáoViên] = @laGiaoVien,
        [LàPhụHuynh] = @laPhuHuynh,`;
  }

  await request.query(`
    UPDATE dbo.TaiKhoan
    SET
      [HọTên] = COALESCE(@hoTen, [HọTên]),
      [Email] = COALESCE(@email, [Email]),${setRoles}
      [HoạtĐộng] = [HoạtĐộng]
    WHERE [MãTàiKhoản] = @maTaiKhoan
  `);
  return getAccount(maTaiKhoan);
}

export async function setAccountActive(maTaiKhoan, hoatDong) {
  await getAccount(maTaiKhoan);
  const pool = await getPool();
  await pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .input('hoatDong', sql.Bit, hoatDong ? 1 : 0)
    .query('UPDATE dbo.TaiKhoan SET [HoạtĐộng] = @hoatDong WHERE [MãTàiKhoản] = @maTaiKhoan');
  return getAccount(maTaiKhoan);
}

export async function resetPassword(maTaiKhoan, newPassword) {
  await getAccount(maTaiKhoan);
  const pool = await getPool();
  const matKhauHash = await bcrypt.hash(newPassword, 10);
  await pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .input('matKhauHash', sql.NVarChar, matKhauHash)
    .query('UPDATE dbo.TaiKhoan SET [MậtKhẩuHash] = @matKhauHash WHERE [MãTàiKhoản] = @maTaiKhoan');
  return { ok: true };
}

export async function deleteAccount(maTaiKhoan) {
  await getAccount(maTaiKhoan);
  const pool = await getPool();
  const inUse = await pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .query('SELECT TOP 1 1 AS ok FROM dbo.LichSuDangNhap WHERE [MãTàiKhoản] = @maTaiKhoan');
  if (inUse.recordset[0]) {
    throw new HttpError(409, 'Khong the xoa: tai khoan da co lich su dang nhap. Hay vo hieu hoa thay vi xoa.');
  }
  await pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .query('DELETE FROM dbo.TaiKhoan WHERE [MãTàiKhoản] = @maTaiKhoan');
  return { ok: true };
}
