import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

export async function listDevices() {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        [MaThietBi] AS maThietBi,
        [Ten] AS ten,
        [MaLop] AS maLop,
        [UrlKetNoi] AS urlKetNoi,
        [TrangThai] AS trangThai,
        [GhiChu] AS ghiChu,
        [NgayTao] AS ngayTao
      FROM dbo.ThietBiGiamSat
      ORDER BY [NgayTao] DESC
    `);
    return r.recordset;
  } catch {
    return [];
  }
}

export async function createDevice(data) {
  const pool = await getPool();
  const ins = await pool
    .request()
    .input('ten', sql.NVarChar, data.ten)
    .input('maLop', sql.NVarChar, data.maLop ?? null)
    .input('url', sql.NVarChar, data.urlKetNoi ?? null)
    .input('trangThai', sql.NVarChar, data.trangThai ?? 'offline')
    .input('ghiChu', sql.NVarChar, data.ghiChu ?? null)
    .query(`
      INSERT INTO dbo.ThietBiGiamSat ([Ten], [MaLop], [UrlKetNoi], [TrangThai], [GhiChu])
      OUTPUT inserted.[MaThietBi] AS maThietBi
      VALUES (@ten, @maLop, @url, @trangThai, @ghiChu)
    `);
  const id = ins.recordset[0].maThietBi;
  return getDevice(id);
}

export async function getDevice(maThietBi) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('id', sql.UniqueIdentifier, maThietBi)
    .query(`
      SELECT
        [MaThietBi] AS maThietBi,
        [Ten] AS ten,
        [MaLop] AS maLop,
        [UrlKetNoi] AS urlKetNoi,
        [TrangThai] AS trangThai,
        [GhiChu] AS ghiChu,
        [NgayTao] AS ngayTao
      FROM dbo.ThietBiGiamSat
      WHERE [MaThietBi] = @id
    `);
  const row = r.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay thiet bi');
  return row;
}

export async function updateDevice(maThietBi, data) {
  await getDevice(maThietBi);
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, maThietBi)
    .input('ten', sql.NVarChar, data.ten ?? null)
    .input('maLop', sql.NVarChar, data.maLop ?? null)
    .input('url', sql.NVarChar, data.urlKetNoi ?? null)
    .input('trangThai', sql.NVarChar, data.trangThai ?? null)
    .input('ghiChu', sql.NVarChar, data.ghiChu ?? null)
    .query(`
      UPDATE dbo.ThietBiGiamSat
      SET
        [Ten] = COALESCE(@ten, [Ten]),
        [MaLop] = @maLop,
        [UrlKetNoi] = COALESCE(@url, [UrlKetNoi]),
        [TrangThai] = COALESCE(@trangThai, [TrangThai]),
        [GhiChu] = COALESCE(@ghiChu, [GhiChu])
      WHERE [MaThietBi] = @id
    `);
  return getDevice(maThietBi);
}
