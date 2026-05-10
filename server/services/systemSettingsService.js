import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const KEYS = {
  attendanceRatio: 'realtime.tyLeThamDuToiThieu',
  concentrationMin: 'realtime.nguongTapTrungToiThieu',
  tenantName: 'tenant.tenHienThi',
  cameraMode: 'camera.cheDo',
};

export async function getMonitoringThresholds() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT [MaKhoa] AS maKhoa, [GiaTri] AS giaTri
    FROM dbo.CauHinhHeThong
    WHERE [MaKhoa] IN (N'realtime.tyLeThamDuToiThieu', N'realtime.nguongTapTrungToiThieu')
  `);
  const map = Object.fromEntries((result.recordset || []).map((r) => [r.maKhoa, r.giaTri]));
  const tyLe = parseFloat(map[KEYS.attendanceRatio] ?? '0.7');
  const tapTrung = parseInt(map[KEYS.concentrationMin] ?? '60', 10);
  return {
    tyLeThamDuToiThieu: Number.isFinite(tyLe) ? Math.min(1, Math.max(0, tyLe)) : 0.7,
    nguongTapTrungToiThieu: Number.isFinite(tapTrung) ? Math.min(100, Math.max(0, tapTrung)) : 60,
  };
}

export async function getPublicSystemInfo() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT [MaKhoa] AS maKhoa, [GiaTri] AS giaTri, [MoTa] AS moTa
    FROM dbo.CauHinhHeThong
    WHERE [MaKhoa] IN (
      N'tenant.tenHienThi',
      N'camera.cheDo',
      N'realtime.tyLeThamDuToiThieu',
      N'realtime.nguongTapTrungToiThieu'
    )
  `);
  const rows = result.recordset || [];
  const t = await getMonitoringThresholds();
  return {
    tenantDisplayName: rows.find((r) => r.maKhoa === KEYS.tenantName)?.giaTri ?? 'EduMonitor',
    cameraMode: rows.find((r) => r.maKhoa === KEYS.cameraMode)?.giaTri ?? 'moPhong',
    thresholds: t,
    rows,
  };
}

export async function updateMonitoringThresholds({ tyLeThamDuToiThieu, nguongTapTrungToiThieu }) {
  if (tyLeThamDuToiThieu !== undefined) {
    const v = Number(tyLeThamDuToiThieu);
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      throw new HttpError(400, 'tyLeThamDuToiThieu phai tu 0 den 1');
    }
  }
  if (nguongTapTrungToiThieu !== undefined) {
    const v = Number(nguongTapTrungToiThieu);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      throw new HttpError(400, 'nguongTapTrungToiThieu phai tu 0 den 100');
    }
  }
  const pool = await getPool();
  if (tyLeThamDuToiThieu !== undefined) {
    await pool
      .request()
      .input('k', sql.NVarChar, KEYS.attendanceRatio)
      .input('v', sql.NVarChar, String(tyLeThamDuToiThieu))
      .query(`
        MERGE dbo.CauHinhHeThong AS t
        USING (SELECT @k AS k, @v AS v) AS s ON t.[MaKhoa] = s.k
        WHEN MATCHED THEN UPDATE SET [GiaTri] = s.v, [CapNhatLuc] = SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT ([MaKhoa], [GiaTri]) VALUES (s.k, s.v);
      `);
  }
  if (nguongTapTrungToiThieu !== undefined) {
    await pool
      .request()
      .input('k', sql.NVarChar, KEYS.concentrationMin)
      .input('v', sql.NVarChar, String(Math.round(nguongTapTrungToiThieu)))
      .query(`
        MERGE dbo.CauHinhHeThong AS t
        USING (SELECT @k AS k, @v AS v) AS s ON t.[MaKhoa] = s.k
        WHEN MATCHED THEN UPDATE SET [GiaTri] = s.v, [CapNhatLuc] = SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT ([MaKhoa], [GiaTri]) VALUES (s.k, s.v);
      `);
  }
  return getMonitoringThresholds();
}

export async function updateTenantDisplayName(tenHienThi) {
  const pool = await getPool();
  await pool
    .request()
    .input('k', sql.NVarChar, KEYS.tenantName)
    .input('v', sql.NVarChar, String(tenHienThi).slice(0, 200))
    .query(`
      MERGE dbo.CauHinhHeThong AS t
      USING (SELECT @k AS k, @v AS v) AS s ON t.[MaKhoa] = s.k
      WHEN MATCHED THEN UPDATE SET [GiaTri] = s.v, [CapNhatLuc] = SYSDATETIME()
      WHEN NOT MATCHED THEN INSERT ([MaKhoa], [GiaTri]) VALUES (s.k, s.v);
    `);
  return { ok: true };
}
