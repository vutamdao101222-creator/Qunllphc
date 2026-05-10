import { getPool, sql } from '../db.js';
import { getMonitoringThresholds } from './systemSettingsService.js';

export function getAlertStatus(concentration, currentStudents, expectedStudents, thresholds = null) {
  const t = thresholds || { tyLeThamDuToiThieu: 0.7, nguongTapTrungToiThieu: 60 };
  const minPresent = Math.round(expectedStudents * t.tyLeThamDuToiThieu);
  if (expectedStudents > 0 && currentStudents < minPresent) return 'low_attendance';
  if (concentration < t.nguongTapTrungToiThieu) return 'low_concentration';
  return 'normal';
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function findActiveSessionMaBuoiHoc(maLop) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maLop', sql.NVarChar, maLop)
    .query(`
      SELECT TOP 1 b.[MãBuổiHọc] AS maBuoiHoc
      FROM dbo.BuoiHoc b
      WHERE b.[MãLớp] = @maLop
        AND b.[TrạngThái] = N'active'
        AND b.[ThờiGianBắtĐầu] <= SYSDATETIME()
        AND (b.[ThờiGianKếtThúc] IS NULL OR b.[ThờiGianKếtThúc] >= SYSDATETIME())
      ORDER BY b.[ThờiGianBắtĐầu] DESC
    `);
  return result.recordset[0]?.maBuoiHoc ?? null;
}

export async function getClasses() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      l.[MãLớp] AS maLop,
      l.[TênLớp] AS tenLop,
      l.[Khoi] AS khoi,
      l.[MônHọc] AS monHoc,
      l.[MãGiáoViên] AS maGiaoVien,
      g.[HọTên] AS tenGiaoVien,
      l.[SĩSốDựKiến] AS siSoDuKien
    FROM dbo.LopHoc l
    INNER JOIN dbo.GiaoVien g ON l.[MãGiáoViên] = g.[MãGiáoViên]
    ORDER BY l.[MãLớp]
  `);
  return result.recordset;
}

export async function getTeachers() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      [MãGiáoViên] AS maGiaoVien,
      [HọTên] AS hoTen,
      [MônHọc] AS monHoc,
      [SốĐiệnThoại] AS soDienThoai,
      [Email] AS email
    FROM dbo.GiaoVien
    ORDER BY [MãGiáoViên]
  `);
  return result.recordset;
}

export async function createRealtimeSnapshot() {
  const pool = await getPool();
  const [classes, thresholds] = await Promise.all([getClasses(), getMonitoringThresholds()]);
  const now = new Date();
  const timestamp = now.toISOString();

  const snapshots = [];
  for (const cls of classes) {
    const maBuoiHoc = await findActiveSessionMaBuoiHoc(cls.maLop);
    if (!maBuoiHoc) continue;

    const currentStudents = randomInRange(Math.max(8, cls.siSoDuKien - 12), cls.siSoDuKien);
    const concentration = randomInRange(45, 95);
    const alertStatus = getAlertStatus(concentration, currentStudents, cls.siSoDuKien, thresholds);

    snapshots.push({
      classId: cls.maLop,
      maBuoiHoc,
      timestamp,
      currentStudents,
      expectedStudents: cls.siSoDuKien,
      concentrationLevel: concentration,
      isActive: true,
      alertStatus,
    });

    try {
      await pool
        .request()
        .input('maLop', sql.NVarChar, cls.maLop)
        .input('maBuoiHoc', sql.UniqueIdentifier, maBuoiHoc)
        .input('thoiDiem', sql.DateTime2, new Date(timestamp))
        .input('siSoHienTai', sql.Int, currentStudents)
        .input('mucTapTrung', sql.Int, concentration)
        .query(`
          INSERT INTO dbo.ChiSoTapTrung ([MãLớp], [MãBuổiHọc], [ThờiĐiểm], [SĩSốHiệnTại], [MứcTậpTrung])
          VALUES (@maLop, @maBuoiHoc, @thoiDiem, @siSoHienTai, @mucTapTrung)
        `);
    } catch {
      await pool
        .request()
        .input('maLop', sql.NVarChar, cls.maLop)
        .input('thoiDiem', sql.DateTime2, new Date(timestamp))
        .input('siSoHienTai', sql.Int, currentStudents)
        .input('mucTapTrung', sql.Int, concentration)
        .query(`
          INSERT INTO dbo.ChiSoTapTrung ([MãLớp], [ThờiĐiểm], [SĩSốHiệnTại], [MứcTậpTrung])
          VALUES (@maLop, @thoiDiem, @siSoHienTai, @mucTapTrung)
        `);
    }
  }

  return snapshots;
}

export async function getLatestRealtime() {
  const pool = await getPool();
  const thresholds = await getMonitoringThresholds();
  const result = await pool.request().query(`
    ;WITH ranked AS (
      SELECT
        c.[MãLớp] AS maLop,
        c.[ThờiĐiểm] AS thoiDiem,
        c.[SĩSốHiệnTại] AS siSoHienTai,
        c.[MứcTậpTrung] AS mucTapTrung,
        c.[MãBuổiHọc] AS maBuoiHocChiSo,
        ROW_NUMBER() OVER (PARTITION BY c.[MãLớp] ORDER BY c.[ThờiĐiểm] DESC) AS rn
      FROM dbo.ChiSoTapTrung c
    ),
    active AS (
      SELECT maLop, maBuoiHocDangHoatDong
      FROM (
        SELECT
          b.[MãLớp] AS maLop,
          b.[MãBuổiHọc] AS maBuoiHocDangHoatDong,
          ROW_NUMBER() OVER (PARTITION BY b.[MãLớp] ORDER BY b.[ThờiGianBắtĐầu] DESC) AS rn
        FROM dbo.BuoiHoc b
        WHERE b.[TrạngThái] = N'active'
          AND b.[ThờiGianBắtĐầu] <= SYSDATETIME()
          AND (b.[ThờiGianKếtThúc] IS NULL OR b.[ThờiGianKếtThúc] >= SYSDATETIME())
      ) x
      WHERE x.rn = 1
    )
    SELECT
      l.[MãLớp] AS maLop,
      l.[TênLớp] AS tenLop,
      l.[MônHọc] AS monHoc,
      l.[SĩSốDựKiến] AS siSoDuKien,
      g.[HọTên] AS tenGiaoVien,
      r.thoiDiem,
      ISNULL(r.siSoHienTai, 0) AS currentStudents,
      ISNULL(r.mucTapTrung, 0) AS concentrationLevel,
      r.maBuoiHocChiSo,
      act.maBuoiHocDangHoatDong
    FROM dbo.LopHoc l
    INNER JOIN dbo.GiaoVien g ON g.[MãGiáoViên] = l.[MãGiáoViên]
    LEFT JOIN ranked r ON r.maLop = l.[MãLớp] AND r.rn = 1
    LEFT JOIN active act ON act.maLop = l.[MãLớp]
    ORDER BY l.[MãLớp]
  `);

  return result.recordset.map((row) => {
    const sessionOn = !!row.maBuoiHocDangHoatDong;
    const metricForSession =
      sessionOn &&
      row.maBuoiHocChiSo &&
      String(row.maBuoiHocChiSo).toLowerCase() === String(row.maBuoiHocDangHoatDong).toLowerCase();
    const isActive = sessionOn && metricForSession;
    const conc = Number(row.concentrationLevel) || 0;
    const present = Number(row.currentStudents) || 0;
    const expected = Number(row.siSoDuKien) || 0;
    const alertStatus = isActive
      ? getAlertStatus(conc, present, expected, thresholds)
      : 'normal';
    return {
      maLop: row.maLop,
      tenLop: row.tenLop,
      monHoc: row.monHoc,
      siSoDuKien: row.siSoDuKien,
      tenGiaoVien: row.tenGiaoVien,
      thoiDiem: row.thoiDiem,
      currentStudents: present,
      concentrationLevel: conc,
      maBuoiHoc: row.maBuoiHocChiSo || null,
      maBuoiHocDangHoatDong: row.maBuoiHocDangHoatDong || null,
      isActive,
      alertStatus,
    };
  });
}

export async function upsertAlertsFromRealtime(items) {
  const pool = await getPool();
  for (const item of items) {
    if (!item.isActive || item.alertStatus === 'normal') continue;
    await pool
      .request()
      .input('maLop', item.maLop || item.classId)
      .input('mucDo', item.alertStatus)
      .input('noiDung', `${item.tenLop || item.classId} can chu y: ${item.alertStatus}`)
      .query(`
        INSERT INTO dbo.CanhBao ([MãLớp], [MứcĐộ], [NộiDung], [ĐãXửLý])
        VALUES (@maLop, @mucDo, @noiDung, 0)
      `);
  }
}

export async function getDashboardOverview() {
  const items = await getLatestRealtime();
  const active = items.filter((i) => i.isActive);
  const totalStudents = active.reduce((sum, i) => sum + i.currentStudents, 0);
  const avgConcentration = active.length
    ? Math.round(active.reduce((sum, i) => sum + i.concentrationLevel, 0) / active.length)
    : 0;
  const alerts = active.filter((i) => i.alertStatus !== 'normal');
  return {
    activeClasses: active.length,
    totalClasses: items.length,
    totalStudents,
    avgConcentration,
    alerts,
    classes: items,
  };
}
