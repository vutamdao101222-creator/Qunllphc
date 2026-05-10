-- Chạy trong SSMS (Đăng nhập Windows Authentication) khi API báo: Login failed for user 'sa'.
-- USE master;

/*
  Bước 1 — Mixed Mode (nếu hiện chỉ Windows):
  SSMS → chuột phải Server → Properties → Security
  → SQL Server and Windows Authentication mode → OK → Khởi động lại dịch vụ SQL Server.
*/

/*
  Bước 2 — Bật sa và đặt mật khẩu (khớp DB_PASSWORD trong .env):
ALTER LOGIN sa ENABLE;
ALTER LOGIN sa WITH PASSWORD = N'123456aA@';
*/

/*
  Bước 3 (khuyến nghị thay vì sa): tạo login riêng cho ứng dụng
*/
/*
CREATE LOGIN EduApi WITH PASSWORD = N'123456aA@', CHECK_POLICY = OFF;
USE TruongHocViet;
CREATE USER EduApi FOR LOGIN EduApi;
ALTER ROLE db_owner ADD MEMBER EduApi;
*/

-- Sau đó trong .env: DB_USER=EduApi  và DB_PASSWORD=... (hoặc giữ sa nếu dùng Bước 2)
