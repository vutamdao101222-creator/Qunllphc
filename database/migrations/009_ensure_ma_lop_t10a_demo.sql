-- Giao diện mock (lop c1) dùng ma lop "T10A"; script seed 01 dùng L10A1 / L11B2 / L12C1.
-- Neu khong co dong T10A trong LopHoc, POST trao doi se loi FK va API tra 500 ("Loi he thong").
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.LopHoc', N'U') IS NULL
BEGIN
  RAISERROR(N'Chua co bang dbo.LopHoc', 16, 1);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'T10A')
BEGIN
  DECLARE @gv NVARCHAR(20) =
    (SELECT TOP 1 [MãGiáoViên] FROM dbo.GiaoVien ORDER BY [MãGiáoViên]);

  IF @gv IS NOT NULL
  BEGIN
    INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
    VALUES (N'T10A', N'Toán 10A (demo EduMonitor)', N'10', N'Toán học', @gv, 35);
    PRINT N'Da them lop T10A (giao vien: ' + @gv + N').';
  END
  ELSE
    PRINT N'Bo qua: chua co dong nao trong GiaoVien — can them giao vien truoc.';
END
ELSE
  PRINT N'Lop T10A da ton tai.';
GO
