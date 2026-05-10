-- Bảng thông báo (thiếu trong DB cũ) + bổ sung cột DieuChinhLichHocLop nếu bảng tồn tại nhưng thiếu cột

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.ThongBao', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ThongBao
  (
    [MãThôngBáo] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [TiêuĐề] NVARCHAR(255) NOT NULL,
    [NộiDung] NVARCHAR(1000) NOT NULL,
    [Loại] NVARCHAR(30) NOT NULL DEFAULT N'info',
    [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
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

IF OBJECT_ID(N'dbo.DieuChinhLichHocLop', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.DieuChinhLichHocLop', 'CapNhatBoi') IS NULL
    ALTER TABLE dbo.DieuChinhLichHocLop ADD [CapNhatBoi] NVARCHAR(100) NOT NULL CONSTRAINT DF_DieuChinh_CapNhatBoi DEFAULT N'system';

  IF COL_LENGTH('dbo.DieuChinhLichHocLop', 'CapNhatLuc') IS NULL
    ALTER TABLE dbo.DieuChinhLichHocLop ADD [CapNhatLuc] DATETIME2 NOT NULL CONSTRAINT DF_DieuChinh_CapNhatLuc DEFAULT SYSDATETIME();
END;
GO
