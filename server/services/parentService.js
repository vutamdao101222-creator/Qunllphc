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
  try {
    const result = await pool
      .request()
      .input('maPhuHuynh', sql.UniqueIdentifier, maPhuHuynh)
      .query(`
      SELECT
        [MaLienKet] AS id,
        [MaPhuHuynh] AS parentId,
        [MaHocSinh] AS studentId,
        [QuanHe] AS relationship,
        [MaLop] AS maLop,
        [NgayTao] AS createdAt
      FROM dbo.PhuHuynh_HocSinh
      WHERE [MaPhuHuynh] = @maPhuHuynh
      ORDER BY [NgayTao] DESC
    `);
    return result.recordset;
  } catch {
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
    return result.recordset.map((r) => ({ ...r, maLop: null }));
  }
}

export async function getParentSummaryReport(maPhuHuynh, { from, to }) {
  const pool = await getPool();
  const links = await listMyParentLinks(maPhuHuynh);
  const maLops = [...new Set(links.map((l) => l.maLop).filter(Boolean))];

  const reqAtt = pool.request().input('from', sql.DateTime2, from).input('to', sql.DateTime2, to);
  let attFilter = '';
  if (maLops.length > 0) {
    attFilter = `AND d.[MãLớp] IN (${maLops.map((_, i) => `@c${i}`).join(', ')})`;
    maLops.forEach((ml, i) => reqAtt.input(`c${i}`, sql.NVarChar, ml));
  }

  const att = await reqAtt.query(`
    SELECT
      AVG(CAST(d.[SĩSốHiệnDiện] AS FLOAT) / NULLIF(d.[SĩSốDựKiến], 0)) * 100 AS tyLeThamDuTrungBinh,
      COUNT(*) AS soLanDiemDanh
    FROM dbo.DiemDanh d
    WHERE d.[ThờiĐiểm] >= @from AND d.[ThờiĐiểm] <= @to
    ${attFilter}
  `);

  const reqConc = pool.request().input('from', sql.DateTime2, from).input('to', sql.DateTime2, to);
  let concFilter = '';
  if (maLops.length > 0) {
    concFilter = `AND c.[MãLớp] IN (${maLops.map((_, i) => `@k${i}`).join(', ')})`;
    maLops.forEach((ml, i) => reqConc.input(`k${i}`, sql.NVarChar, ml));
  }

  const conc = await reqConc.query(`
    SELECT AVG(CAST(c.[MứcTậpTrung] AS FLOAT)) AS mucTapTrungTrungBinh
    FROM dbo.ChiSoTapTrung c
    WHERE c.[ThờiĐiểm] >= @from AND c.[ThờiĐiểm] <= @to
    ${concFilter}
  `);

  return {
    period: { from, to },
    scope: maLops.length > 0 ? 'linked_classes' : 'whole_school',
    maLops,
    linkedStudents: links.length,
    attendance: att.recordset[0] || {},
    concentration: conc.recordset[0] || {},
  };
}
