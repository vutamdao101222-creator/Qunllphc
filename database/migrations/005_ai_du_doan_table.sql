-- Bảng dự đoán AI (seed/simulation + API /api/v1/ai*)
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.AiDuDoan', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AiDuDoan
  (
    [MãDựĐoán] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [MãLớp] NVARCHAR(20) NOT NULL,
    [ĐiểmRủiRo] INT NOT NULL,
    [MứcRủiRo] NVARCHAR(20) NOT NULL,
    [GợiÝCanThiệp] NVARCHAR(MAX) NOT NULL,
    [ThờiĐiểm] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AiDuDoan_Lop FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc ([MãLớp])
  );
END;
GO
