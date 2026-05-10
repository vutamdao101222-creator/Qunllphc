-- Bổ sung schema khi DB tạo từ script cũ (03_tao_bang_tai_khoan) thiếu cột/hash và bảng realtime.
-- Phải có dbo.LopHoc (khóa ngoại BuoiHoc / DiemDanh / ChiSoTapTrung).

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.TaiKhoan', N'MậtKhẩuHash') IS NULL
  BEGIN
    BEGIN TRY
      ALTER TABLE dbo.TaiKhoan ADD [MậtKhẩuHash] NVARCHAR(255) NULL;
    END TRY
    BEGIN CATCH
      IF ERROR_NUMBER() <> 2705 THROW;
    END CATCH
  END;
END;
GO

IF OBJECT_ID(N'dbo.BuoiHoc', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.BuoiHoc
  (
    [MãBuổiHọc] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [MãLớp] NVARCHAR(20) NOT NULL,
    [ThờiGianBắtĐầu] DATETIME2 NOT NULL,
    [ThờiGianKếtThúc] DATETIME2 NULL,
    [TrạngThái] NVARCHAR(30) NOT NULL DEFAULT N'planned',
    CONSTRAINT FK_BuoiHoc_Lop FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc ([MãLớp])
  );
END;
GO

IF OBJECT_ID(N'dbo.DiemDanh', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.DiemDanh
  (
    [MãĐiểmDanh] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [MãLớp] NVARCHAR(20) NOT NULL,
    [ThờiĐiểm] DATETIME2 NOT NULL,
    [SĩSốHiệnDiện] INT NOT NULL,
    [SĩSốDựKiến] INT NOT NULL,
    CONSTRAINT FK_DiemDanh_Lop FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc ([MãLớp])
  );
END;
GO

IF OBJECT_ID(N'dbo.ChiSoTapTrung', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ChiSoTapTrung
  (
    [MãChiSố] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [MãLớp] NVARCHAR(20) NOT NULL,
    [MãBuổiHọc] UNIQUEIDENTIFIER NULL,
    [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    [SĩSốHiệnTại] INT NOT NULL,
    [MứcTậpTrung] INT NOT NULL,
    CONSTRAINT FK_ChiSoTapTrung_Lop FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc ([MãLớp])
  );
END
ELSE IF COL_LENGTH(N'dbo.ChiSoTapTrung', N'MãBuổiHọc') IS NULL
BEGIN
  BEGIN TRY
    ALTER TABLE dbo.ChiSoTapTrung ADD [MãBuổiHọc] UNIQUEIDENTIFIER NULL;
  END TRY
  BEGIN CATCH
    IF ERROR_NUMBER() <> 2705 THROW;
  END CATCH
END;
GO
