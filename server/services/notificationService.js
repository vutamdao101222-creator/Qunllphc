import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SELECT_COLUMNS = `
  [MãThôngBáo] AS maThongBao,
  [TiêuĐề] AS tieuDe,
  [NộiDung] AS noiDung,
  [Loại] AS loai,
  [ThờiĐiểm] AS thoiDiem
`;

function mapRow(row) {
  return {
    maThongBao: row.maThongBao,
    tieuDe: row.tieuDe,
    noiDung: row.noiDung,
    loai: row.loai,
    thoiDiem: row.thoiDiem,
  };
}

export async function listNotifications({ page, pageSize, loai }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const filters = [];
  if (loai) filters.push('[Loại] = @loai');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (loai) totalReq.input('loai', sql.NVarChar, loai);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.ThongBao ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (loai) request.input('loai', sql.NVarChar, loai);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.ThongBao
    ${where}
    ORDER BY [ThờiĐiểm] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function getNotification(maThongBao) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maThongBao', sql.UniqueIdentifier, maThongBao)
    .query(`SELECT ${SELECT_COLUMNS} FROM dbo.ThongBao WHERE [MãThôngBáo] = @maThongBao`);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay thong bao');
  return mapRow(row);
}

export async function createNotification(data) {
  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('tieuDe', sql.NVarChar, data.tieuDe)
    .input('noiDung', sql.NVarChar, data.noiDung)
    .input('loai', sql.NVarChar, data.loai ?? 'info')
    .query(`
      INSERT INTO dbo.ThongBao ([TiêuĐề], [NộiDung], [Loại])
      OUTPUT inserted.[MãThôngBáo] AS maThongBao
      VALUES (@tieuDe, @noiDung, @loai)
    `);
  return getNotification(inserted.recordset[0].maThongBao);
}

export async function updateNotification(maThongBao, data) {
  await getNotification(maThongBao);
  const pool = await getPool();
  await pool
    .request()
    .input('maThongBao', sql.UniqueIdentifier, maThongBao)
    .input('tieuDe', sql.NVarChar, data.tieuDe ?? null)
    .input('noiDung', sql.NVarChar, data.noiDung ?? null)
    .input('loai', sql.NVarChar, data.loai ?? null)
    .query(`
      UPDATE dbo.ThongBao
      SET
        [TiêuĐề] = COALESCE(@tieuDe, [TiêuĐề]),
        [NộiDung] = COALESCE(@noiDung, [NộiDung]),
        [Loại] = COALESCE(@loai, [Loại])
      WHERE [MãThôngBáo] = @maThongBao
    `);
  return getNotification(maThongBao);
}

export async function deleteNotification(maThongBao) {
  await getNotification(maThongBao);
  const pool = await getPool();
  await pool
    .request()
    .input('maThongBao', sql.UniqueIdentifier, maThongBao)
    .query('DELETE FROM dbo.ThongBao WHERE [MãThôngBáo] = @maThongBao');
  return { ok: true };
}
