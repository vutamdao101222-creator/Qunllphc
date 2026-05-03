import { getPool, sql } from '../db.js';

const SELECT_COLUMNS = `
  h.[MãLịchSử] AS maLichSu,
  h.[MãTàiKhoản] AS maTaiKhoan,
  t.[TênĐăngNhập] AS tenDangNhap,
  h.[HànhĐộng] AS hanhDong,
  h.[GhiChú] AS ghiChu,
  h.[ThờiĐiểm] AS thoiDiem
`;

function mapRow(row) {
  return {
    maLichSu: row.maLichSu,
    maTaiKhoan: row.maTaiKhoan,
    tenDangNhap: row.tenDangNhap,
    hanhDong: row.hanhDong,
    ghiChu: row.ghiChu,
    thoiDiem: row.thoiDiem,
  };
}

export async function listLoginHistory({ page, pageSize, maTaiKhoan, hanhDong, from, to }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const filters = [];
  if (maTaiKhoan) filters.push('h.[MãTàiKhoản] = @maTaiKhoan');
  if (hanhDong) filters.push('h.[HànhĐộng] = @hanhDong');
  if (from) filters.push('h.[ThờiĐiểm] >= @from');
  if (to) filters.push('h.[ThờiĐiểm] <= @to');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (maTaiKhoan) totalReq.input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan);
  if (hanhDong) totalReq.input('hanhDong', sql.NVarChar, hanhDong);
  if (from) totalReq.input('from', sql.DateTime2, from);
  if (to) totalReq.input('to', sql.DateTime2, to);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.LichSuDangNhap h ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (maTaiKhoan) request.input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan);
  if (hanhDong) request.input('hanhDong', sql.NVarChar, hanhDong);
  if (from) request.input('from', sql.DateTime2, from);
  if (to) request.input('to', sql.DateTime2, to);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.LichSuDangNhap h
    INNER JOIN dbo.TaiKhoan t ON t.[MãTàiKhoản] = h.[MãTàiKhoản]
    ${where}
    ORDER BY h.[ThờiĐiểm] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}
