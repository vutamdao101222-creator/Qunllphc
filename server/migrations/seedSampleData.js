import { logInfo } from '../utils/logger.js';
import { sql } from '../db.js';

const DEFAULT_SEED_COUNT = 30;

async function seedBulkParentsC1(pool) {
  for (let i = 1; i <= 20; i += 1) {
    const pad = String(i).padStart(2, '0');
    const username = `phuhuynh${pad}`;
    const studentCode = `c1-hs-${pad}`;

    const existing = await pool
      .request()
      .input('u', sql.NVarChar, username)
      .query('SELECT TOP 1 [MãTàiKhoản] AS id FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = @u');
    let parentId = existing.recordset[0]?.id;

    if (!parentId) {
      const ins = await pool
        .request()
        .input('tenDangNhap', sql.NVarChar, username)
        .input('matKhau', sql.NVarChar, '123456')
        .input('hoTen', sql.NVarChar, `Phụ huynh HS ${pad}`)
        .input('email', sql.NVarChar, `phuhuynh${pad}@school.local`)
        .query(`
          INSERT INTO dbo.TaiKhoan (
            [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
            [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
          )
          OUTPUT INSERTED.[MãTàiKhoản] AS id
          VALUES (@tenDangNhap, @matKhau, NULL, @hoTen, @email, 0, 0, 1, 1)
        `);
      parentId = ins.recordset[0]?.id;
    }

    if (!parentId) continue;

    const linkOk = await pool
      .request()
      .input('p', sql.UniqueIdentifier, parentId)
      .input('s', sql.NVarChar, studentCode)
      .query('SELECT TOP 1 1 AS ok FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p AND [MaHocSinh] = @s');

    if (!linkOk.recordset[0]) {
      await pool
        .request()
        .input('p', sql.UniqueIdentifier, parentId)
        .input('s', sql.NVarChar, studentCode)
        .query(`
          INSERT INTO dbo.PhuHuynh_HocSinh ([MaPhuHuynh], [MaHocSinh], [QuanHe])
          VALUES (@p, @s, N'guardian')
        `);
    }
  }
}

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

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV004')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV004', N'Pham Thi Mai', N'Hoa hoc', N'0901000004', N'gv004@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV005')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV005', N'Hoang Van Nam', N'Sinh hoc', N'0901000005', N'gv005@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV006')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV006', N'Vo Thi Lan', N'Lich su', N'0901000006', N'gv006@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV007')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV007', N'Dang Quoc Hung', N'Dia ly', N'0901000007', N'gv007@school.local');

    IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV008')
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (N'GV008', N'Bui Thi Ha', N'Tin hoc', N'0901000008', N'gv008@school.local');

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
        N'admin', N'admin123', NULL, N'Quan tri he thong', N'admin@school.local',
        1, 0, 0, 1
      );

    /* Đồng bộ mật khẩu demo (chỉ khi vẫn dùng mật khẩu lưu dạng plain cũ 123456) */
    UPDATE dbo.TaiKhoan
    SET [MậtKhẩu] = N'admin123'
    WHERE [TênĐăngNhập] = N'admin' AND [MậtKhẩu] = N'123456' AND [MậtKhẩuHash] IS NULL;

    /* Giáo viên: Email trùng GiaoVien để findTeacherCodeByAccount hoạt động */
    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'gv.nguyenan')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'gv.nguyenan', N'teacher123', NULL, N'Nguyen Van An', N'gv001@school.local',
        0, 1, 0, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'gv.phammai')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'gv.phammai', N'teacher123', NULL, N'Pham Thi Mai', N'gv004@school.local',
        0, 1, 0, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'gv.hoangnam')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'gv.hoangnam', N'teacher123', NULL, N'Hoang Van Nam', N'gv005@school.local',
        0, 1, 0, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'gv.volanh')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'gv.volanh', N'teacher123', NULL, N'Vo Thi Lan', N'gv006@school.local',
        0, 1, 0, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'gv.danghung')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'gv.danghung', N'teacher123', NULL, N'Dang Quoc Hung', N'gv007@school.local',
        0, 1, 0, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'gv.buiha')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'gv.buiha', N'teacher123', NULL, N'Bui Thi Ha', N'gv008@school.local',
        0, 1, 0, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE [TênĐăngNhập] = N'phuhuynha')
      INSERT INTO dbo.TaiKhoan
      (
        [TênĐăngNhập], [MậtKhẩu], [MậtKhẩuHash], [HọTên], [Email],
        [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
      )
      VALUES
      (
        N'phuhuynha', N'parent123', NULL, N'Phu huynh demo', N'phuhuynha@school.local',
        0, 0, 1, 1
      );

    IF OBJECT_ID(N'dbo.BuoiHoc', N'U') IS NOT NULL
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM dbo.BuoiHoc
        WHERE [TrạngThái] = N'active'
          AND [ThờiGianKếtThúc] > SYSDATETIME()
      )
      BEGIN
        INSERT INTO dbo.BuoiHoc ([MãLớp], [ThờiGianBắtĐầu], [ThờiGianKếtThúc], [TrạngThái])
        VALUES
          (N'LH10A1', DATEADD(MINUTE, -45, SYSDATETIME()), DATEADD(HOUR, 4, SYSDATETIME()), N'active'),
          (N'LH11A1', DATEADD(MINUTE, -40, SYSDATETIME()), DATEADD(HOUR, 4, SYSDATETIME()), N'active'),
          (N'LH12A1', DATEADD(MINUTE, -35, SYSDATETIME()), DATEADD(HOUR, 4, SYSDATETIME()), N'active');
      END
    END
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

  try {
    await seedBulkParentsC1(pool);
  } catch (e) {
    logInfo('Optional parent bulk seed skipped', { message: e?.message || String(e) });
  }

  const countResult = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.BuoiHoc) AS buoiHocCount,
      (SELECT COUNT(*) FROM dbo.DiemDanh) AS diemDanhCount,
      (SELECT COUNT(*) FROM dbo.ChiSoTapTrung) AS chiSoTapTrungCount
  `);

  logInfo('Sample seed completed', { targetPerTable: safeSeedCount, ...countResult.recordset[0] });
}
