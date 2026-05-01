import { getPool } from '../db.js';
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
