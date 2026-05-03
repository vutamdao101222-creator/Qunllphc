import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SELECT_COLUMNS = `
  d.[MãĐiểmDanh] AS maDiemDanh,
  d.[MãLớp] AS maLop,
  l.[TênLớp] AS tenLop,
  d.[ThờiĐiểm] AS thoiDiem,
  d.[SĩSốHiệnDiện] AS siSoHienDien,
  d.[SĩSốDựKiến] AS siSoDuKien
`;

function mapRow(row) {
  return {
    maDiemDanh: row.maDiemDanh,
    maLop: row.maLop,
    tenLop: row.tenLop,
    thoiDiem: row.thoiDiem,
    siSoHienDien: row.siSoHienDien,
    siSoDuKien: row.siSoDuKien,
  };
}

export async function listAttendance({ page, pageSize, maLop, from, to }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const filters = [];
  if (maLop) filters.push('d.[MãLớp] = @maLop');
  if (from) filters.push('d.[ThờiĐiểm] >= @from');
  if (to) filters.push('d.[ThờiĐiểm] <= @to');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (maLop) totalReq.input('maLop', sql.NVarChar, maLop);
  if (from) totalReq.input('from', sql.DateTime2, from);
  if (to) totalReq.input('to', sql.DateTime2, to);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.DiemDanh d ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (maLop) request.input('maLop', sql.NVarChar, maLop);
  if (from) request.input('from', sql.DateTime2, from);
  if (to) request.input('to', sql.DateTime2, to);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.DiemDanh d
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = d.[MãLớp]
    ${where}
    ORDER BY d.[ThờiĐiểm] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function getAttendance(maDiemDanh) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maDiemDanh', sql.UniqueIdentifier, maDiemDanh)
    .query(`
      SELECT ${SELECT_COLUMNS}
      FROM dbo.DiemDanh d
      INNER JOIN dbo.LopHoc l ON l.[MãLớp] = d.[MãLớp]
      WHERE d.[MãĐiểmDanh] = @maDiemDanh
    `);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay ban ghi diem danh');
  return mapRow(row);
}

export async function createAttendance(data) {
  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('maLop', sql.NVarChar, data.maLop)
    .input('thoiDiem', sql.DateTime2, data.thoiDiem ?? new Date())
    .input('siSoHienDien', sql.Int, data.siSoHienDien)
    .input('siSoDuKien', sql.Int, data.siSoDuKien)
    .query(`
      INSERT INTO dbo.DiemDanh ([MãLớp], [ThờiĐiểm], [SĩSốHiệnDiện], [SĩSốDựKiến])
      OUTPUT inserted.[MãĐiểmDanh] AS maDiemDanh
      VALUES (@maLop, @thoiDiem, @siSoHienDien, @siSoDuKien)
    `);
  return getAttendance(inserted.recordset[0].maDiemDanh);
}

export async function deleteAttendance(maDiemDanh) {
  await getAttendance(maDiemDanh);
  const pool = await getPool();
  await pool
    .request()
    .input('maDiemDanh', sql.UniqueIdentifier, maDiemDanh)
    .query('DELETE FROM dbo.DiemDanh WHERE [MãĐiểmDanh] = @maDiemDanh');
  return { ok: true };
}
