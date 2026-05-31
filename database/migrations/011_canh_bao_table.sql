-- Cảnh báo realtime (simulation job -> upsertAlertsFromRealtime, API /canh-bao).
-- Phụ thuộc dbo.LopHoc.

USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.CanhBao', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CanhBao
  (
    [MãCảnhBáo] UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CanhBao PRIMARY KEY DEFAULT (NEWID()),
    [MãLớp] NVARCHAR(20) NOT NULL,
    [MứcĐộ] NVARCHAR(40) NOT NULL,
    [NộiDung] NVARCHAR(1000) NOT NULL,
    [ĐãXửLý] BIT NOT NULL CONSTRAINT DF_CanhBao_DaXuLy DEFAULT (0),
    [ThờiĐiểm] DATETIME2 NOT NULL CONSTRAINT DF_CanhBao_ThoiDiem DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_CanhBao_LopHoc FOREIGN KEY ([MãLớp]) REFERENCES dbo.LopHoc ([MãLớp])
  );

  CREATE NONCLUSTERED INDEX IX_CanhBao_ThoiDiem ON dbo.CanhBao ([ThờiĐiểm] DESC);
  CREATE NONCLUSTERED INDEX IX_CanhBao_MaLop ON dbo.CanhBao ([MãLớp]);
END;
GO
