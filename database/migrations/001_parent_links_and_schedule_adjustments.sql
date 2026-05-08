-- Auto-migration: parent-student links + class schedule adjustments
-- These tables are designed to be minimal and not depend on a full Student master table.
-- They enable "unlink parent-student", "save schedule adjustment", and "reset to default (delete adjustment)".

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.PhuHuynh_HocSinh', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PhuHuynh_HocSinh
  (
    [MaLienKet] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [MaPhuHuynh] UNIQUEIDENTIFIER NOT NULL,
    [MaHocSinh] NVARCHAR(50) NOT NULL,
    [QuanHe] NVARCHAR(20) NOT NULL DEFAULT N'guardian',
    [NgayTao] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_PhuHuynh_HocSinh_TaiKhoan FOREIGN KEY ([MaPhuHuynh]) REFERENCES dbo.TaiKhoan([MãTàiKhoản]),
    CONSTRAINT UQ_PhuHuynh_HocSinh UNIQUE ([MaPhuHuynh], [MaHocSinh])
  );
END;
GO

IF OBJECT_ID(N'dbo.DieuChinhLichHocLop', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.DieuChinhLichHocLop
  (
    [MaDieuChinh] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [MaLop] NVARCHAR(20) NOT NULL,
    [SchedulesJson] NVARCHAR(MAX) NOT NULL,
    [LyDo] NVARCHAR(255) NOT NULL,
    [CapNhatBoi] NVARCHAR(100) NOT NULL,
    [CapNhatLuc] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_DieuChinhLichHocLop_MaLop UNIQUE ([MaLop])
  );
END;
GO

