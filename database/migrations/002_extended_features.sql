-- Cấu hình ngưỡng, audit, thông báo đã đọc, liên kết buổi học–chỉ số, thiết bị stub, quyền chỉ đọc

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.CauHinhHeThong', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CauHinhHeThong
  (
    [MaKhoa] NVARCHAR(100) NOT NULL PRIMARY KEY,
    [GiaTri] NVARCHAR(MAX) NOT NULL,
    [MoTa] NVARCHAR(255) NULL,
    [CapNhatLuc] DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.CauHinhHeThong WHERE [MaKhoa] = N'realtime.tyLeThamDuToiThieu')
  INSERT INTO dbo.CauHinhHeThong ([MaKhoa], [GiaTri], [MoTa])
  VALUES (N'realtime.tyLeThamDuToiThieu', N'0.7', N'Tỷ lệ hiện diện tối thiểu (0–1); dưới ngưỡng = cảnh báo tham dự');

IF NOT EXISTS (SELECT 1 FROM dbo.CauHinhHeThong WHERE [MaKhoa] = N'realtime.nguongTapTrungToiThieu')
  INSERT INTO dbo.CauHinhHeThong ([MaKhoa], [GiaTri], [MoTa])
  VALUES (N'realtime.nguongTapTrungToiThieu', N'60', N'Điểm tập trung tối thiểu (0–100); dưới ngưỡng = cảnh báo');

IF NOT EXISTS (SELECT 1 FROM dbo.CauHinhHeThong WHERE [MaKhoa] = N'tenant.tenHienThi')
  INSERT INTO dbo.CauHinhHeThong ([MaKhoa], [GiaTri], [MoTa])
  VALUES (N'tenant.tenHienThi', N'EduMonitor (demo đơn cơ sở)', N'Tên hiển thị / stub đa cơ sở');

IF NOT EXISTS (SELECT 1 FROM dbo.CauHinhHeThong WHERE [MaKhoa] = N'camera.cheDo')
  INSERT INTO dbo.CauHinhHeThong ([MaKhoa], [GiaTri], [MoTa])
  VALUES (N'camera.cheDo', N'moPhong', N'moPhong | tichHop — stub cấu hình luồng camera');
GO

IF OBJECT_ID(N'dbo.NhatKyThaoTac', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.NhatKyThaoTac
  (
    [MaNhatKy] BIGINT NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    [MaTaiKhoan] UNIQUEIDENTIFIER NULL,
    [TenDangNhap] NVARCHAR(50) NULL,
    [HanhDong] NVARCHAR(80) NOT NULL,
    [DoiTuong] NVARCHAR(120) NULL,
    [ChiTiet] NVARCHAR(MAX) NULL,
    [ThoiDiem] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    [DiaChiIp] NVARCHAR(45) NULL
  );
  CREATE INDEX IX_NhatKyThaoTac_ThoiDiem ON dbo.NhatKyThaoTac ([ThoiDiem] DESC);
END;
GO

IF OBJECT_ID(N'dbo.ThongBaoDaDoc', N'U') IS NULL
  AND OBJECT_ID(N'dbo.ThongBao', N'U') IS NOT NULL
  AND OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NOT NULL
BEGIN
  CREATE TABLE dbo.ThongBaoDaDoc
  (
    [MaTaiKhoan] UNIQUEIDENTIFIER NOT NULL,
    [MaThongBao] UNIQUEIDENTIFIER NOT NULL,
    [ThoiDiemDoc] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_ThongBaoDaDoc PRIMARY KEY ([MaTaiKhoan], [MaThongBao]),
    CONSTRAINT FK_ThongBaoDaDoc_TK FOREIGN KEY ([MaTaiKhoan]) REFERENCES dbo.TaiKhoan ([MãTàiKhoản]),
    CONSTRAINT FK_ThongBaoDaDoc_TB FOREIGN KEY ([MaThongBao]) REFERENCES dbo.ThongBao ([MãThôngBáo])
  );
END;
GO

IF OBJECT_ID(N'dbo.ChiSoTapTrung', N'U') IS NOT NULL
  AND COL_LENGTH('dbo.ChiSoTapTrung', 'MãBuổiHọc') IS NULL
BEGIN
  ALTER TABLE dbo.ChiSoTapTrung ADD [MãBuổiHọc] UNIQUEIDENTIFIER NULL;
END;
GO

IF OBJECT_ID(N'dbo.ChiSoTapTrung', N'U') IS NOT NULL
  AND OBJECT_ID(N'dbo.BuoiHoc', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ChiSoTapTrung_BuoiHoc')
BEGIN
  ALTER TABLE dbo.ChiSoTapTrung
  ADD CONSTRAINT FK_ChiSoTapTrung_BuoiHoc FOREIGN KEY ([MãBuổiHọc]) REFERENCES dbo.BuoiHoc ([MãBuổiHọc]);
END;
GO

IF OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NOT NULL
  AND COL_LENGTH('dbo.TaiKhoan', 'ChỉĐọc') IS NULL
BEGIN
  ALTER TABLE dbo.TaiKhoan ADD [ChỉĐọc] BIT NOT NULL DEFAULT 0;
END;
GO

IF OBJECT_ID(N'dbo.PhuHuynh_HocSinh', N'U') IS NOT NULL
  AND COL_LENGTH('dbo.PhuHuynh_HocSinh', 'MaLop') IS NULL
BEGIN
  ALTER TABLE dbo.PhuHuynh_HocSinh ADD [MaLop] NVARCHAR(20) NULL;
END;
GO

IF OBJECT_ID(N'dbo.ThietBiGiamSat', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ThietBiGiamSat
  (
    [MaThietBi] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [Ten] NVARCHAR(120) NOT NULL,
    [MaLop] NVARCHAR(20) NULL,
    [UrlKetNoi] NVARCHAR(500) NULL,
    [TrangThai] NVARCHAR(30) NOT NULL DEFAULT N'offline',
    [GhiChu] NVARCHAR(500) NULL,
    [NgayTao] DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;
GO
