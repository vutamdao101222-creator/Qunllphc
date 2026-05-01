import { getPool } from '../db.js';
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

export async function getReportSummary() {
  const overview = await getDashboardOverview();
  const pool = await getPool();
  const alertsResult = await pool.request().query(`
    SELECT TOP 50
      [MãLớp] AS maLop,
      [MứcĐộ] AS mucDo,
      [NộiDung] AS noiDung,
      [ThờiĐiểm] AS thoiDiem
    FROM dbo.CanhBao
    ORDER BY [ThờiĐiểm] DESC
  `);

  const timelineResult = await pool.request().query(`
    SELECT
      CONVERT(VARCHAR(10), [ThờiĐiểm], 120) AS ngay,
      AVG(CAST([MứcTậpTrung] AS FLOAT)) AS avgConcentration,
      AVG(CAST([SĩSốHiệnTại] AS FLOAT)) AS avgStudents
    FROM dbo.ChiSoTapTrung
    GROUP BY CONVERT(VARCHAR(10), [ThờiĐiểm], 120)
    ORDER BY ngay DESC
  `);

  return {
    ...overview,
    recentAlerts: alertsResult.recordset,
    timeline: timelineResult.recordset.slice(0, 14).reverse(),
  };
}

export async function getCsvReport() {
  const summary = await getReportSummary();
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
