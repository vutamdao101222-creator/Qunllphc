-- Tao database va bang du lieu tieng Viet cho SQL Server
-- Chay file nay trong SSMS bang tai khoan co quyen tao database

IF DB_ID(N'TruongHocViet') IS NULL
BEGIN
    CREATE DATABASE TruongHocViet;
END;
GO

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.LopHoc', N'U') IS NOT NULL DROP TABLE dbo.LopHoc;
IF OBJECT_ID(N'dbo.GiaoVien', N'U') IS NOT NULL DROP TABLE dbo.GiaoVien;
GO

CREATE TABLE dbo.GiaoVien
(
    [MãGiáoViên] NVARCHAR(20) NOT NULL PRIMARY KEY,
    [HọTên] NVARCHAR(100) NOT NULL,
    [MônHọc] NVARCHAR(100) NOT NULL,
    [SốĐiệnThoại] NVARCHAR(20) NULL,
    Email NVARCHAR(120) NULL
);
GO

CREATE TABLE dbo.LopHoc
(
    [MãLớp] NVARCHAR(20) NOT NULL PRIMARY KEY,
    [TênLớp] NVARCHAR(100) NOT NULL,
    Khoi NVARCHAR(10) NOT NULL,
    [MônHọc] NVARCHAR(100) NOT NULL,
    [MãGiáoViên] NVARCHAR(20) NOT NULL,
    [SĩSốDựKiến] INT NOT NULL,
    FOREIGN KEY ([MãGiáoViên]) REFERENCES dbo.GiaoVien([MãGiáoViên])
);
GO

INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
VALUES
    (N'GV01', N'Nguyen Van An', N'Toan hoc', N'0912345678', N'nvan@truong.vn'),
    (N'GV02', N'Tran Thi Binh', N'Ngu van', N'0923456789', N'ttbinh@truong.vn'),
    (N'GV03', N'Le Van Cuong', N'Vat ly', N'0934567890', N'lvcuong@truong.vn');
GO

INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
VALUES
    (N'L10A1', N'Toan 10A1', N'10', N'Toan hoc', N'GV01', 40),
    (N'L11B2', N'Van 11B2', N'11', N'Ngu van', N'GV02', 38),
    (N'L12C1', N'Ly 12C1', N'12', N'Vat ly', N'GV03', 36);
GO

-- Truy van nhanh de kiem tra du lieu
SELECT * FROM dbo.GiaoVien;
SELECT * FROM dbo.LopHoc;
GO
