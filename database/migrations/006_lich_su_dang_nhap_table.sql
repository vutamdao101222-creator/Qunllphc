-- Nhật ký đăng nhập (POST /auth/dang-nhap ghi LOGIN_SUCCESS vào đây)
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.LichSuDangNhap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.LichSuDangNhap
  (
    [MãLịchSử] BIGINT NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    [MãTàiKhoản] UNIQUEIDENTIFIER NULL,
    [HànhĐộng] NVARCHAR(80) NOT NULL,
    [GhiChú] NVARCHAR(500) NULL,
    [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_LichSuDangNhap_TaiKhoan FOREIGN KEY ([MãTàiKhoản])
      REFERENCES dbo.TaiKhoan ([MãTàiKhoản])
  );
  CREATE INDEX IX_LichSuDangNhap_ThoiDiem ON dbo.LichSuDangNhap ([ThờiĐiểm] DESC);
  CREATE INDEX IX_LichSuDangNhap_TaiKhoan ON dbo.LichSuDangNhap ([MãTàiKhoản]);
END;
GO
