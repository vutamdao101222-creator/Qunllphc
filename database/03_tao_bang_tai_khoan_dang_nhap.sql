-- Tao bang tai khoan dang nhap voi cac cap quyen boolean
-- Chay sau khi da tao database TruongHocViet

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NOT NULL
    DROP TABLE dbo.TaiKhoan;
GO

CREATE TABLE dbo.TaiKhoan
(
    [MãTàiKhoản] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [TênĐăngNhập] NVARCHAR(50) NOT NULL,
    [MậtKhẩu] NVARCHAR(255) NOT NULL,
    [HọTên] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(120) NULL,
    [LàQuảnTrị] BIT NOT NULL DEFAULT 0,
    [LàGiáoViên] BIT NOT NULL DEFAULT 0,
    [LàPhụHuynh] BIT NOT NULL DEFAULT 0,
    [HoạtĐộng] BIT NOT NULL DEFAULT 1,
    [NgàyTạo] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_TaiKhoan_TenDangNhap UNIQUE ([TênĐăngNhập]),
    CONSTRAINT CK_TaiKhoan_ItNhatMotVaiTro CHECK ([LàQuảnTrị] = 1 OR [LàGiáoViên] = 1 OR [LàPhụHuynh] = 1)
);
GO

-- Du lieu mau (ban co the doi mat khau sau)
INSERT INTO dbo.TaiKhoan
(
    [TênĐăngNhập], [MậtKhẩu], [HọTên], [Email],
    [LàQuảnTrị], [LàGiáoViên], [LàPhụHuynh], [HoạtĐộng]
)
VALUES
    (N'admin', N'admin123', N'Nguyen Quan Tri', N'admin@truong.vn', 1, 0, 0, 1),
    (N'gv.nguyenan', N'teacher123', N'Nguyen Van An', N'nvan@truong.vn', 0, 1, 0, 1),
    (N'ph.huynha', N'parent123', N'Phu Huynh A', N'phuhuynha@gmail.com', 0, 0, 1, 1);
GO

-- Truy van kiem tra
SELECT
    [MãTàiKhoản],
    [TênĐăngNhập],
    [HọTên],
    [LàQuảnTrị],
    [LàGiáoViên],
    [LàPhụHuynh],
    [HoạtĐộng]
FROM dbo.TaiKhoan;
GO

-- Login test nhanh (demo):
-- Thay gia tri N'admin' va N'admin123' de thu dang nhap
DECLARE @TenDangNhap NVARCHAR(50) = N'admin';
DECLARE @MatKhau NVARCHAR(255) = N'admin123';

SELECT TOP 1
    [MãTàiKhoản],
    [TênĐăngNhập],
    [HọTên],
    [LàQuảnTrị],
    [LàGiáoViên],
    [LàPhụHuynh]
FROM dbo.TaiKhoan
WHERE [TênĐăngNhập] = @TenDangNhap
  AND [MậtKhẩu] = @MatKhau
  AND [HoạtĐộng] = 1;
GO
