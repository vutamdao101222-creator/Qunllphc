-- Kiem tra ket noi den SQL Server va database moi tao
-- Chay tung doan trong SSMS

-- 1) Xac nhan dang ket noi dung SQL Server instance
SELECT @@SERVERNAME AS TenMayChu;
GO

-- 2) Kiem tra database da ton tai
SELECT name AS TenDatabase
FROM sys.databases
WHERE name = N'TruongHocViet';
GO

-- 3) Chuyen sang database va doc du lieu
USE TruongHocViet;
GO

SELECT TOP 10 *
FROM dbo.GiaoVien;
GO

SELECT TOP 10 *
FROM dbo.LopHoc;
GO
