-- Migration an toan cho Smart Classroom (khong xoa du lieu cu)
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.GiaoVien', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GiaoVien
    (
        [MãGiáoViên] NVARCHAR(20) NOT NULL PRIMARY KEY,
        [HọTên] NVARCHAR(100) NOT NULL,
        [MônHọc] NVARCHAR(100) NOT NULL,
        [SốĐiệnThoại] NVARCHAR(20) NULL,
        Email NVARCHAR(120) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.LopHoc', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.TaiKhoan', N'U') IS NULL
BEGIN
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
END;
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
