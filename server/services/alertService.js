import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SELECT_COLUMNS = `
  c.[MãCảnhBáo] AS maCanhBao,
  c.[MãLớp] AS maLop,
  l.[TênLớp] AS tenLop,
  c.[MứcĐộ] AS mucDo,
  c.[NộiDung] AS noiDung,
  c.[ĐãXửLý] AS daXuLy,
  c.[ThờiĐiểm] AS thoiDiem
`;

function mapRow(row) {
  return {
    maCanhBao: row.maCanhBao,
    maLop: row.maLop,
    tenLop: row.tenLop,
    mucDo: row.mucDo,
    noiDung: row.noiDung,
    daXuLy: Boolean(row.daXuLy),
    thoiDiem: row.thoiDiem,
  };
}

export async function listAlerts({ page, pageSize, maLop, daXuLy, mucDo, from, to }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const filters = [];
  if (maLop) filters.push('c.[MãLớp] = @maLop');
  if (typeof daXuLy === 'boolean') filters.push('c.[ĐãXửLý] = @daXuLy');
  if (mucDo) filters.push('c.[MứcĐộ] = @mucDo');
  if (from) filters.push('c.[ThờiĐiểm] >= @from');
  if (to) filters.push('c.[ThờiĐiểm] <= @to');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (maLop) totalReq.input('maLop', sql.NVarChar, maLop);
  if (typeof daXuLy === 'boolean') totalReq.input('daXuLy', sql.Bit, daXuLy ? 1 : 0);
  if (mucDo) totalReq.input('mucDo', sql.NVarChar, mucDo);
  if (from) totalReq.input('from', sql.DateTime2, from);
  if (to) totalReq.input('to', sql.DateTime2, to);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.CanhBao c ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (maLop) request.input('maLop', sql.NVarChar, maLop);
  if (typeof daXuLy === 'boolean') request.input('daXuLy', sql.Bit, daXuLy ? 1 : 0);
  if (mucDo) request.input('mucDo', sql.NVarChar, mucDo);
  if (from) request.input('from', sql.DateTime2, from);
  if (to) request.input('to', sql.DateTime2, to);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.CanhBao c
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
    ${where}
    ORDER BY c.[ThờiĐiểm] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function getAlert(maCanhBao) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maCanhBao', sql.UniqueIdentifier, maCanhBao)
    .query(`
      SELECT ${SELECT_COLUMNS}
      FROM dbo.CanhBao c
      INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
      WHERE c.[MãCảnhBáo] = @maCanhBao
    `);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay canh bao');
  return mapRow(row);
}

export async function createAlert(data) {
  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('maLop', sql.NVarChar, data.maLop)
    .input('mucDo', sql.NVarChar, data.mucDo)
    .input('noiDung', sql.NVarChar, data.noiDung)
    .query(`
      INSERT INTO dbo.CanhBao ([MãLớp], [MứcĐộ], [NộiDung], [ĐãXửLý])
      OUTPUT inserted.[MãCảnhBáo] AS maCanhBao
      VALUES (@maLop, @mucDo, @noiDung, 0)
    `);
  return getAlert(inserted.recordset[0].maCanhBao);
}

export async function setAlertResolved(maCanhBao, daXuLy) {
  await getAlert(maCanhBao);
  const pool = await getPool();
  await pool
    .request()
    .input('maCanhBao', sql.UniqueIdentifier, maCanhBao)
    .input('daXuLy', sql.Bit, daXuLy ? 1 : 0)
    .query('UPDATE dbo.CanhBao SET [ĐãXửLý] = @daXuLy WHERE [MãCảnhBáo] = @maCanhBao');
  return getAlert(maCanhBao);
}

export async function deleteAlert(maCanhBao) {
  await getAlert(maCanhBao);
  const pool = await getPool();
  await pool
    .request()
    .input('maCanhBao', sql.UniqueIdentifier, maCanhBao)
    .query('DELETE FROM dbo.CanhBao WHERE [MãCảnhBáo] = @maCanhBao');
  return { ok: true };
}
