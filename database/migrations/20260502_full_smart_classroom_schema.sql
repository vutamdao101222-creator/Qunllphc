-- Migration an toan cho Smart Classroom (khong xoa du lieu cu)
USE TruongHocViet;
GO

IF COL_LENGTH('dbo.TaiKhoan', 'MậtKhẩuHash') IS NULL
BEGIN
    ALTER TABLE dbo.TaiKhoan ADD [MậtKhẩuHash] NVARCHAR(255) NULL;
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
        [TrạngThái] NVARCHAR(20) NOT NULL DEFAULT N'active',
        [NgàyTạo] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc([MãLớp])
    );
END;
GO

IF OBJECT_ID(N'dbo.DiemDanh', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DiemDanh
    (
        [MãĐiểmDanh] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [MãLớp] NVARCHAR(20) NOT NULL,
        [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [SĩSốHiệnDiện] INT NOT NULL,
        [SĩSốDựKiến] INT NOT NULL,
        FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc([MãLớp])
    );
END;
GO

IF OBJECT_ID(N'dbo.ChiSoTapTrung', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChiSoTapTrung
    (
        [MãChiSố] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [MãLớp] NVARCHAR(20) NOT NULL,
        [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [SĩSốHiệnTại] INT NOT NULL,
        [MứcTậpTrung] INT NOT NULL,
        FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc([MãLớp])
    );
END;
GO

IF OBJECT_ID(N'dbo.CanhBao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CanhBao
    (
        [MãCảnhBáo] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [MãLớp] NVARCHAR(20) NOT NULL,
        [MứcĐộ] NVARCHAR(30) NOT NULL,
        [NộiDung] NVARCHAR(500) NOT NULL,
        [ĐãXửLý] BIT NOT NULL DEFAULT 0,
        [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc([MãLớp])
    );
END;
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

IF OBJECT_ID(N'dbo.LichSuDangNhap', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LichSuDangNhap
    (
        [MãLịchSử] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [MãTàiKhoản] UNIQUEIDENTIFIER NOT NULL,
        [HànhĐộng] NVARCHAR(50) NOT NULL,
        [GhiChú] NVARCHAR(500) NULL,
        [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY ([MãTàiKhoản]) REFERENCES dbo.TaiKhoan([MãTàiKhoản])
    );
END;
GO

IF OBJECT_ID(N'dbo.AiDuDoan', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AiDuDoan
    (
        [MãDựĐoán] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [MãLớp] NVARCHAR(20) NOT NULL,
        [ĐiểmRủiRo] INT NOT NULL,
        [MứcRủiRo] NVARCHAR(20) NOT NULL,
        [GợiÝCanThiệp] NVARCHAR(1000) NOT NULL,
        [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc([MãLớp])
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ThongBao)
BEGIN
    INSERT INTO dbo.ThongBao ([TiêuĐề], [NộiDung], [Loại])
    VALUES
      (N'Khởi tạo hệ thống', N'Hệ thống Smart Classroom đã sẵn sàng.', N'success'),
      (N'Theo dõi thời gian thực', N'Dữ liệu lớp học sẽ tự động cập nhật theo chu kỳ.', N'info');
END;
GO
