import { logInfo } from '../utils/logger.js';

const DEFAULT_SEED_COUNT = 30;

export async function seedSampleData(pool, seedCount = DEFAULT_SEED_COUNT) {
  const safeSeedCount = Number.isFinite(seedCount) && seedCount > 0 ? Math.floor(seedCount) : DEFAULT_SEED_COUNT;

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV001')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV001', N'Nguyen Van An', N'Toan', N'0901000001', N'gv001@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV002')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV002', N'Tran Thi Binh', N'Ngu van', N'0901000002', N'gv002@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV003')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV003', N'Le Quoc Cuong', N'Vat ly', N'0901000003', N'gv003@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'LH10A1')
      INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
      VALUES (N'LH10A1', N'Lop 10A1', N'10', N'Toan', N'GV001', 35);

    IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'LH11A1')
      INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
      VALUES (N'LH11A1', N'Lop 11A1', N'11', N'Ngu van', N'GV002', 38);

    IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'LH12A1')
      INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
      VALUES (N'LH12A1', N'Lop 12A1', N'12', N'Vat ly', N'GV003', 40);

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'admin')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'admin', N'123456', NULL, N'Quan tri he thong', N'admin@school.local',
        1, 0, 0, 1
      );
  `);

  const request = pool.request().input('seedCount', safeSeedCount);
  await request.batch(`
    DECLARE @existingBuoiHoc INT = (SELECT COUNT(*) FROM dbo.BuoiHoc);
    DECLARE @needBuoiHoc INT = CASE WHEN @existingBuoiHoc < @seedCount THEN @seedCount - @existingBuoiHoc ELSE 0 END;

    IF @needBuoiHoc > 0
    BEGIN
      ;WITH nums AS
      (
        SELECT TOP (@needBuoiHoc) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
      )
      INSERT INTO dbo.BuoiHoc ([MãLớp], [ThờiGianBắtĐầu], [ThờiGianKếtThúc], [TrạngThái])
      SELECT
        CASE (n - 1) % 3
          WHEN 0 THEN N'LH10A1'
          WHEN 1 THEN N'LH11A1'
          ELSE N'LH12A1'
        END,
        DATEADD(MINUTE, -45, DATEADD(HOUR, -n, SYSDATETIME())),
        DATEADD(HOUR, -n, SYSDATETIME()),
        N'completed'
      FROM nums;
    END;

    DECLARE @existingDiemDanh INT = (SELECT COUNT(*) FROM dbo.DiemDanh);
    DECLARE @needDiemDanh INT = CASE WHEN @existingDiemDanh < @seedCount THEN @seedCount - @existingDiemDanh ELSE 0 END;

    IF @needDiemDanh > 0
    BEGIN
      ;WITH nums AS
      (
        SELECT TOP (@needDiemDanh) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
      )
      INSERT INTO dbo.DiemDanh ([MãLớp], [ThờiĐiểm], [SĩSốHiệnDiện], [SĩSốDựKiến])
      SELECT
        CASE (n - 1) % 3
          WHEN 0 THEN N'LH10A1'
          WHEN 1 THEN N'LH11A1'
          ELSE N'LH12A1'
        END,
        DATEADD(MINUTE, -n * 10, SYSDATETIME()),
        CASE (n - 1) % 3
          WHEN 0 THEN 30 + (n % 6)
          WHEN 1 THEN 32 + (n % 7)
          ELSE 34 + (n % 6)
        END,
        CASE (n - 1) % 3
          WHEN 0 THEN 35
          WHEN 1 THEN 38
          ELSE 40
        END
      FROM nums;
    END;

    DECLARE @existingChiSo INT = (SELECT COUNT(*) FROM dbo.ChiSoTapTrung);
    DECLARE @needChiSo INT = CASE WHEN @existingChiSo < @seedCount THEN @seedCount - @existingChiSo ELSE 0 END;

    IF @needChiSo > 0
    BEGIN
      ;WITH nums AS
      (
        SELECT TOP (@needChiSo) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
      )
      INSERT INTO dbo.ChiSoTapTrung ([MãLớp], [ThờiĐiểm], [SĩSốHiệnTại], [MứcTậpTrung])
      SELECT
        CASE (n - 1) % 3
          WHEN 0 THEN N'LH10A1'
          WHEN 1 THEN N'LH11A1'
          ELSE N'LH12A1'
        END,
        DATEADD(MINUTE, -n * 5, SYSDATETIME()),
        CASE (n - 1) % 3
          WHEN 0 THEN 30 + (n % 6)
          WHEN 1 THEN 32 + (n % 7)
          ELSE 34 + (n % 6)
        END,
        60 + ((n * 3) % 35)
      FROM nums;
    END;
  `);

  const countResult = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.BuoiHoc) AS buoiHocCount,
      (SELECT COUNT(*) FROM dbo.DiemDanh) AS diemDanhCount,
      (SELECT COUNT(*) FROM dbo.ChiSoTapTrung) AS chiSoTapTrungCount
  `);

  logInfo('Sample seed completed', { targetPerTable: safeSeedCount, ...countResult.recordset[0] });
}
