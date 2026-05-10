import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';
import { logError } from '../utils/logger.js';

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

export async function listNotificationsForUser({ page, pageSize, maTaiKhoan, loai }) {
  try {
    const pool = await getPool();

    const tbl = await pool.request().query(`SELECT OBJECT_ID(N'dbo.ThongBao', N'U') AS oid`);
    if (!tbl.recordset[0]?.oid) {
      return { items: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;
    const filters = [];
    if (loai) filters.push('t.[Loại] = @loai');
    const whereExtra = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const chk = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.ThongBaoDaDoc', N'U') IS NOT NULL THEN 1 ELSE 0 END AS ok
    `);
    const hasRead = chk.recordset[0]?.ok === 1;

    const totalReq = pool.request();
    if (loai) totalReq.input('loai', sql.NVarChar, loai);
    const total = (
      await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.ThongBao t WHERE 1=1 ${whereExtra}`)
    ).recordset[0].total;

    const request = pool.request();
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);
    request.input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan);
    if (loai) request.input('loai', sql.NVarChar, loai);

    const readSelect = hasRead
      ? `CASE WHEN d.[MaThongBao] IS NOT NULL THEN 1 ELSE 0 END AS daDoc`
      : `CONVERT(bit, 0) AS daDoc`;

    const readJoin = hasRead
      ? `LEFT JOIN dbo.ThongBaoDaDoc d ON d.[MaThongBao] = t.[MãThôngBáo] AND d.[MaTaiKhoan] = @maTaiKhoan`
      : '';

    const result = await request.query(`
      SELECT
        t.[MãThôngBáo] AS maThongBao,
        t.[TiêuĐề] AS tieuDe,
        t.[NộiDung] AS noiDung,
        t.[Loại] AS loai,
        t.[ThờiĐiểm] AS thoiDiem,
        ${readSelect}
      FROM dbo.ThongBao t
      ${readJoin}
      WHERE 1=1 ${whereExtra}
      ORDER BY t.[ThờiĐiểm] DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return { items: result.recordset.map((row) => ({ ...mapRow(row), daDoc: Boolean(row.daDoc) })), total };
  } catch (e) {
    logError('listNotificationsForUser failed', e);
    return { items: [], total: 0 };
  }
}

export async function markNotificationRead(maTaiKhoan, maThongBao) {
  const pool = await getPool();
  const chk = await pool.request().query(`
    SELECT CASE WHEN OBJECT_ID(N'dbo.ThongBaoDaDoc', N'U') IS NOT NULL THEN 1 ELSE 0 END AS ok
  `);
  if (chk.recordset[0]?.ok !== 1) return { ok: true, skipped: true };
  await getNotification(maThongBao);
  await pool
    .request()
    .input('maTaiKhoan', sql.UniqueIdentifier, maTaiKhoan)
    .input('maThongBao', sql.UniqueIdentifier, maThongBao)
    .query(`
      INSERT INTO dbo.ThongBaoDaDoc ([MaTaiKhoan], [MaThongBao])
      SELECT @maTaiKhoan, @maThongBao
      WHERE NOT EXISTS (
        SELECT 1 FROM dbo.ThongBaoDaDoc
        WHERE [MaTaiKhoan] = @maTaiKhoan AND [MaThongBao] = @maThongBao
      )
    `);
  return { ok: true };
}
