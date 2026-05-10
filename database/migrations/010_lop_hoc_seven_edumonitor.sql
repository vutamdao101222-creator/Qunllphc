-- Bổ sung 7 lớp khớp mock EduMonitor (ClassManagement / frontend),
-- cùng giáo viên GV04–GV06 nếu DB chỉ có seed 01 (3 GV + 3 lớp L10A1…).
-- Idempotent: chỉ INSERT khi chưa có MãGiáoViên / MãLớp.
-- Các dòng cũ (L10A1, L11B2, L12C1, …) không xóa — có thể gỡ tay nếu muốn chỉ còn 7 mã này.
USE TruongHocViet;
GO

IF OBJECT_ID(N'dbo.GiaoVien', N'U') IS NULL OR OBJECT_ID(N'dbo.LopHoc', N'U') IS NULL
BEGIN
  RAISERROR(N'Chua co bang GiaoVien hoac LopHoc — chay database/01_tao_database_tieng_viet.sql hoac migration tao bang truoc.', 16, 1);
END;
GO

-- Giáo viên bổ sung (khớp TEACHERS t4–t6 trong mockData)
IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV04')
  INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
  VALUES (N'GV04', N'Phạm Thị Dung', N'Hóa học', N'0945678901', N'ptdung@truong.vn');

IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV05')
  INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
  VALUES (N'GV05', N'Hoàng Văn Em', N'Sinh học', N'0956789012', N'hvem@truong.vn');

IF NOT EXISTS (SELECT 1 FROM dbo.GiaoVien WHERE [MãGiáoViên] = N'GV06')
  INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
  VALUES (N'GV06', N'Đỗ Thị Phương', N'Tiếng Anh', N'0967890123', N'dtphuong@truong.vn');
GO

-- Can co GV01–GV03 (seed 01). Neu thieu, INSERT LopHoc se loi FK.
DECLARE @gv1 NVARCHAR(20) = N'GV01';
DECLARE @gv2 NVARCHAR(20) = N'GV02';
DECLARE @gv3 NVARCHAR(20) = N'GV03';

-- 7 lớp khớp bảng Quản lý lớp học (mock CLASSES — code / tên / môn / GV / sĩ số)
IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'T10A')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'T10A', N'Toán 10A', N'10', N'Toán học', @gv1, 35);

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'V11B')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'V11B', N'Văn 11B', N'11', N'Ngữ văn', @gv2, 28);

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'L12C')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'L12C', N'Lý 12C', N'12', N'Vật lý', @gv3, 32);

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'T10B')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'T10B', N'Toán 10B', N'10', N'Toán học', @gv1, 30);

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'H11A')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'H11A', N'Hóa 11A', N'11', N'Hóa học', N'GV04', 30);

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'S11A')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'S11A', N'Sinh 11A', N'11', N'Sinh học', N'GV05', 25);

IF NOT EXISTS (SELECT 1 FROM dbo.LopHoc WHERE [MãLớp] = N'A12A')
  INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
  VALUES (N'A12A', N'Anh 12A', N'12', N'Tiếng Anh', N'GV06', 32);
GO

PRINT N'Da dam bao 7 ma lop EduMonitor (T10A, V11B, L12C, T10B, H11A, S11A, A12A) + GV04-GV06 neu thieu.';
SELECT [MãLớp], [TênLớp], [MônHọc], [MãGiáoViên], [SĩSốDựKiến]
FROM dbo.LopHoc
WHERE [MãLớp] IN (N'T10A', N'V11B', N'L12C', N'T10B', N'H11A', N'S11A', N'A12A')
ORDER BY [MãLớp];
GO
