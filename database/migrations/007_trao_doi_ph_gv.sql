-- Trao đổi 2 chiều giáo viên ↔ phụ huynh theo lớp / mã học sinh
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.TraoDoiPhHuynhGiaoVien', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TraoDoiPhHuynhGiaoVien
  (
    [MaTraoDoi] BIGINT NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    [MaLop] NVARCHAR(20) NOT NULL,
    [MaHocSinh] NVARCHAR(50) NULL,
    [MaNguoiGui] UNIQUEIDENTIFIER NOT NULL,
    [VaiTroGui] NVARCHAR(20) NOT NULL,
    [TieuDe] NVARCHAR(255) NOT NULL DEFAULT N'Trao đổi',
    [NoiDung] NVARCHAR(2000) NOT NULL,
    [ThoiDiem] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CK_TraoDoi_VaiTroGui CHECK ([VaiTroGui] IN (N'teacher', N'parent')),
    CONSTRAINT FK_TraoDoi_Lop FOREIGN KEY ([MaLop]) REFERENCES dbo.LopHoc ([MãLớp]),
    CONSTRAINT FK_TraoDoi_NguoiGui FOREIGN KEY ([MaNguoiGui]) REFERENCES dbo.TaiKhoan ([MãTàiKhoản])
  );
  CREATE INDEX IX_TraoDoi_Lop_ThoiDiem ON dbo.TraoDoiPhHuynhGiaoVien ([MaLop], [ThoiDiem] DESC);
  CREATE INDEX IX_TraoDoi_HS ON dbo.TraoDoiPhHuynhGiaoVien ([MaLop], [MaHocSinh], [ThoiDiem] DESC);
END;
GO
