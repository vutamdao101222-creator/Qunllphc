import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SELECT_COLUMNS = `
  b.[MãBuổiHọc] AS maBuoiHoc,
  b.[MãLớp] AS maLop,
  l.[TênLớp] AS tenLop,
  b.[ThờiGianBắtĐầu] AS thoiGianBatDau,
  b.[ThờiGianKếtThúc] AS thoiGianKetThuc,
  b.[TrạngThái] AS trangThai,
  b.[NgàyTạo] AS ngayTao
`;

function mapRow(row) {
  return {
    maBuoiHoc: row.maBuoiHoc,
    maLop: row.maLop,
    tenLop: row.tenLop,
    thoiGianBatDau: row.thoiGianBatDau,
    thoiGianKetThuc: row.thoiGianKetThuc,
    trangThai: row.trangThai,
    ngayTao: row.ngayTao,
  };
}

export async function listSessions({ page, pageSize, maLop, from, to, trangThai }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const filters = [];
  if (maLop) filters.push('b.[MãLớp] = @maLop');
  if (from) filters.push('b.[ThờiGianBắtĐầu] >= @from');
  if (to) filters.push('b.[ThờiGianBắtĐầu] <= @to');
  if (trangThai) filters.push('b.[TrạngThái] = @trangThai');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (maLop) totalReq.input('maLop', sql.NVarChar, maLop);
  if (from) totalReq.input('from', sql.DateTime2, from);
  if (to) totalReq.input('to', sql.DateTime2, to);
  if (trangThai) totalReq.input('trangThai', sql.NVarChar, trangThai);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.BuoiHoc b ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (maLop) request.input('maLop', sql.NVarChar, maLop);
  if (from) request.input('from', sql.DateTime2, from);
  if (to) request.input('to', sql.DateTime2, to);
  if (trangThai) request.input('trangThai', sql.NVarChar, trangThai);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.BuoiHoc b
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = b.[MãLớp]
    ${where}
    ORDER BY b.[ThờiGianBắtĐầu] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function getSession(maBuoiHoc) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maBuoiHoc', sql.UniqueIdentifier, maBuoiHoc)
    .query(`
      SELECT ${SELECT_COLUMNS}
      FROM dbo.BuoiHoc b
      INNER JOIN dbo.LopHoc l ON l.[MãLớp] = b.[MãLớp]
      WHERE b.[MãBuổiHọc] = @maBuoiHoc
    `);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay buoi hoc');
  return mapRow(row);
}

export async function createSession(data) {
  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('maLop', sql.NVarChar, data.maLop)
    .input('thoiGianBatDau', sql.DateTime2, data.thoiGianBatDau)
    .input('thoiGianKetThuc', sql.DateTime2, data.thoiGianKetThuc ?? null)
    .input('trangThai', sql.NVarChar, data.trangThai ?? 'active')
    .query(`
      INSERT INTO dbo.BuoiHoc ([MãLớp], [ThờiGianBắtĐầu], [ThờiGianKếtThúc], [TrạngThái])
      OUTPUT inserted.[MãBuổiHọc] AS maBuoiHoc
      VALUES (@maLop, @thoiGianBatDau, @thoiGianKetThuc, @trangThai)
    `);
  return getSession(inserted.recordset[0].maBuoiHoc);
}

export async function updateSession(maBuoiHoc, data) {
  await getSession(maBuoiHoc);
  const pool = await getPool();
  await pool
    .request()
    .input('maBuoiHoc', sql.UniqueIdentifier, maBuoiHoc)
    .input('thoiGianBatDau', sql.DateTime2, data.thoiGianBatDau ?? null)
    .input('thoiGianKetThuc', sql.DateTime2, data.thoiGianKetThuc ?? null)
    .input('trangThai', sql.NVarChar, data.trangThai ?? null)
    .query(`
      UPDATE dbo.BuoiHoc
      SET
        [ThờiGianBắtĐầu] = COALESCE(@thoiGianBatDau, [ThờiGianBắtĐầu]),
        [ThờiGianKếtThúc] = COALESCE(@thoiGianKetThuc, [ThờiGianKếtThúc]),
        [TrạngThái] = COALESCE(@trangThai, [TrạngThái])
      WHERE [MãBuổiHọc] = @maBuoiHoc
    `);
  return getSession(maBuoiHoc);
}

export async function endSession(maBuoiHoc) {
  await getSession(maBuoiHoc);
  const pool = await getPool();
  await pool
    .request()
    .input('maBuoiHoc', sql.UniqueIdentifier, maBuoiHoc)
    .query(`
      UPDATE dbo.BuoiHoc
      SET [ThờiGianKếtThúc] = SYSDATETIME(), [TrạngThái] = N'ended'
      WHERE [MãBuổiHọc] = @maBuoiHoc
    `);
  return getSession(maBuoiHoc);
}

export async function deleteSession(maBuoiHoc) {
  await getSession(maBuoiHoc);
  const pool = await getPool();
  await pool
    .request()
    .input('maBuoiHoc', sql.UniqueIdentifier, maBuoiHoc)
    .query('DELETE FROM dbo.BuoiHoc WHERE [MãBuổiHọc] = @maBuoiHoc');
  return { ok: true };
}
