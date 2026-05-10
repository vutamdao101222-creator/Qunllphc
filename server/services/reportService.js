import { getPool, sql } from '../db.js';
import { getDashboardOverview } from './monitoringService.js';

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers
      .map((key) => {
        const value = row[key] ?? '';
        const text = String(value).replace(/"/g, '""');
        return `"${text}"`;
      })
      .join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

export async function getReportSummary(options = {}) {
  const { maGiaoVien } = options;
  const overview = await getDashboardOverview(maGiaoVien || null);
  const pool = await getPool();

  const alertsReq = pool.request();
  if (maGiaoVien) {
    alertsReq.input('maGiaoVien', sql.NVarChar, maGiaoVien);
  }
  const alertsJoin = maGiaoVien
    ? `INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
         AND l.[MãGiáoViên] COLLATE DATABASE_DEFAULT = @maGiaoVien COLLATE DATABASE_DEFAULT`
    : '';
  const alertsResult = await alertsReq.query(`
    SELECT TOP 50
      c.[MãLớp] AS maLop,
      c.[MứcĐộ] AS mucDo,
      c.[NộiDung] AS noiDung,
      c.[ThờiĐiểm] AS thoiDiem
    FROM dbo.CanhBao c
    ${alertsJoin}
    ORDER BY c.[ThờiĐiểm] DESC
  `);

  const timelineReq = pool.request();
  if (maGiaoVien) {
    timelineReq.input('maGiaoVien', sql.NVarChar, maGiaoVien);
  }
  const timelineJoin = maGiaoVien
    ? `INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
         AND l.[MãGiáoViên] COLLATE DATABASE_DEFAULT = @maGiaoVien COLLATE DATABASE_DEFAULT`
    : '';
  const timelineResult = await timelineReq.query(`
    SELECT
      CONVERT(VARCHAR(10), c.[ThờiĐiểm], 120) AS ngay,
      AVG(CAST(c.[MứcTậpTrung] AS FLOAT)) AS avgConcentration,
      AVG(CAST(c.[SĩSốHiệnTại] AS FLOAT)) AS avgStudents
    FROM dbo.ChiSoTapTrung c
    ${timelineJoin}
    GROUP BY CONVERT(VARCHAR(10), c.[ThờiĐiểm], 120)
    ORDER BY ngay DESC
  `);

  return {
    ...overview,
    recentAlerts: alertsResult.recordset,
    timeline: timelineResult.recordset.slice(0, 14).reverse(),
  };
}

export async function getCsvReport(options = {}) {
  const summary = await getReportSummary(options);
  const rows = summary.classes.map((item) => ({
    maLop: item.maLop,
    tenLop: item.tenLop,
    tenGiaoVien: item.tenGiaoVien,
    currentStudents: item.currentStudents,
    siSoDuKien: item.siSoDuKien,
    concentrationLevel: item.concentrationLevel,
    alertStatus: item.alertStatus,
    thoiDiem: item.thoiDiem,
  }));
  return toCsv(rows);
}
