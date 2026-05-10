import { getPool, sql } from '../db.js';

export async function writeAudit({
  maTaiKhoan = null,
  tenDangNhap = null,
  hanhDong,
  doiTuong = null,
  chiTiet = null,
  diaChiIp = null,
}) {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan || null)
      .input('tenDangNhap', sql.NVarChar, tenDangNhap || null)
      .input('hanhDong', sql.NVarChar, hanhDong)
      .input('doiTuong', sql.NVarChar, doiTuong || null)
      .input('chiTiet', sql.NVarChar, chiTiet || null)
      .input('diaChiIp', sql.NVarChar, diaChiIp || null)
      .query(`
        INSERT INTO dbo.NhatKyThaoTac
          ([MaTaiKhoan], [TenDangNhap], [HanhDong], [DoiTuong], [ChiTiet], [DiaChiIp])
        VALUES (@maTaiKhoan, @tenDangNhap, @hanhDong, @doiTuong, @chiTiet, @diaChiIp)
      `);
  } catch {
    /* bảng có thể chưa migrate */
  }
}

export async function listAuditLogs({ page, pageSize, hanhDong }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const filters = [];
  if (hanhDong) filters.push('[HanhDong] = @hanhDong');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (hanhDong) totalReq.input('hanhDong', sql.NVarChar, hanhDong);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.NhatKyThaoTac ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  if (hanhDong) request.input('hanhDong', sql.NVarChar, hanhDong);
  const result = await request.query(`
    SELECT
      [MaNhatKy] AS maNhatKy,
      [MaTaiKhoan] AS maTaiKhoan,
      [TenDangNhap] AS tenDangNhap,
      [HanhDong] AS hanhDong,
      [DoiTuong] AS doiTuong,
      [ChiTiet] AS chiTiet,
      [ThoiDiem] AS thoiDiem,
      [DiaChiIp] AS diaChiIp
    FROM dbo.NhatKyThaoTac
    ${where}
    ORDER BY [ThoiDiem] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset, total };
}
