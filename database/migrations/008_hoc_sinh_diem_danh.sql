-- Điểm danh theo từng học sinh + thời điểm ghi (now hoặc chọn giờ)
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.HocSinhDiemDanh', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.HocSinhDiemDanh
  (
    [Ma] BIGINT NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    [MaLop] NVARCHAR(20) NOT NULL,
    [MaHocSinh] NVARCHAR(50) NOT NULL,
    [ThoiDiem] DATETIME2 NOT NULL,
    [TrangThai] NVARCHAR(20) NOT NULL,
    [GhiChu] NVARCHAR(500) NULL,
    [TaoLuc] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    [TaoBoi] UNIQUEIDENTIFIER NULL,
    CONSTRAINT CK_HSDD_TrangThai CHECK ([TrangThai] IN (N'present', N'late', N'absent')),
    CONSTRAINT FK_HSDD_Lop FOREIGN KEY ([MaLop]) REFERENCES dbo.LopHoc ([MãLớp]),
    CONSTRAINT FK_HSDD_NguoiTao FOREIGN KEY ([TaoBoi]) REFERENCES dbo.TaiKhoan ([MãTàiKhoản])
  );
  CREATE INDEX IX_HSDD_Lop_HS_ThoiDiem ON dbo.HocSinhDiemDanh ([MaLop], [MaHocSinh], [ThoiDiem] DESC);
END;
GO
