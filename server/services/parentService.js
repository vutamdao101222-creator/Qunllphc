import { getPool, sql } from '../db.js';
import { getLatestRealtime } from './monitoringService.js';

export async function getParentOverview() {
  const realtime = await getLatestRealtime();
  const pool = await getPool();
  const notificationResult = await pool.request().query(`
    SELECT TOP 20
      [MãThôngBáo] AS maThongBao,
      [TiêuĐề] AS tieuDe,
      [NộiDung] AS noiDung,
      [Loại] AS loai,
      [ThờiĐiểm] AS thoiDiem
    FROM dbo.ThongBao
    ORDER BY [ThờiĐiểm] DESC
  `);
  return {
    classes: realtime,
    notifications: notificationResult.recordset,
  };
}

export async function listMyParentLinks(maPhuHuynh) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maPhuHuynh', sql.UniqueIdentifier, maPhuHuynh)
    .query(`
      SELECT
        [MaLienKet] AS id,
        [MaPhuHuynh] AS parentId,
        [MaHocSinh] AS studentId,
        [QuanHe] AS relationship,
        [NgayTao] AS createdAt
      FROM dbo.PhuHuynh_HocSinh
      WHERE [MaPhuHuynh] = @maPhuHuynh
      ORDER BY [NgayTao] DESC
    `);
  return result.recordset;
}
