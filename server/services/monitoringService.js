import { getPool } from '../db.js';

export function getAlertStatus(concentration, currentStudents, expectedStudents) {
  if (currentStudents < Math.round(expectedStudents * 0.7)) return 'low_attendance';
  if (concentration < 60) return 'low_concentration';
  return 'normal';
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  const classes = await getClasses();
  const now = new Date();
  const timestamp = now.toISOString();

  const snapshots = [];
  for (const cls of classes) {
    const currentStudents = randomInRange(Math.max(8, cls.siSoDuKien - 12), cls.siSoDuKien);
    const concentration = randomInRange(45, 95);
    const alertStatus = getAlertStatus(concentration, currentStudents, cls.siSoDuKien);

    snapshots.push({
      classId: cls.maLop,
      timestamp,
      currentStudents,
      expectedStudents: cls.siSoDuKien,
      concentrationLevel: concentration,
      isActive: true,
      alertStatus,
    });

    await pool
      .request()
      .input('maLop', cls.maLop)
      .input('thoiDiem', timestamp)
      .input('siSoHienTai', currentStudents)
      .input('mucTapTrung', concentration)
      .query(`
        INSERT INTO dbo.ChiSoTapTrung ([MãLớp], [ThờiĐiểm], [SĩSốHiệnTại], [MứcTậpTrung])
        VALUES (@maLop, @thoiDiem, @siSoHienTai, @mucTapTrung)
      `);
  }

  return snapshots;
}

export async function getLatestRealtime() {
  const pool = await getPool();
  const result = await pool.request().query(`
    ;WITH ranked AS (
      SELECT
        c.[MãLớp] AS maLop,
        c.[ThờiĐiểm] AS thoiDiem,
        c.[SĩSốHiệnTại] AS siSoHienTai,
        c.[MứcTậpTrung] AS mucTapTrung,
        ROW_NUMBER() OVER (PARTITION BY c.[MãLớp] ORDER BY c.[ThờiĐiểm] DESC) AS rn
      FROM dbo.ChiSoTapTrung c
    )
    SELECT
      l.[MãLớp] AS maLop,
      l.[TênLớp] AS tenLop,
      l.[MônHọc] AS monHoc,
      l.[SĩSốDựKiến] AS siSoDuKien,
      g.[HọTên] AS tenGiaoVien,
      r.thoiDiem,
      ISNULL(r.siSoHienTai, 0) AS currentStudents,
      ISNULL(r.mucTapTrung, 0) AS concentrationLevel
    FROM dbo.LopHoc l
    INNER JOIN dbo.GiaoVien g ON g.[MãGiáoViên] = l.[MãGiáoViên]
    LEFT JOIN ranked r ON r.maLop = l.[MãLớp] AND r.rn = 1
    ORDER BY l.[MãLớp]
  `);

  return result.recordset.map((row) => ({
    ...row,
    isActive: true,
    alertStatus: getAlertStatus(row.concentrationLevel, row.currentStudents, row.siSoDuKien),
  }));
}

export async function upsertAlertsFromRealtime(items) {
  const pool = await getPool();
  for (const item of items) {
    if (item.alertStatus === 'normal') continue;
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
