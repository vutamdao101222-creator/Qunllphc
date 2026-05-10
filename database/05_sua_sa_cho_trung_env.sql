-- SSMS: đăng nhập bằng Windows Authentication.
-- Bước A — Nếu không đăng nhập SQL bằng sa được trong SSMS:
--   Chuột phải server → Properties → Security → "SQL Server and Windows Authentication mode" → OK
--   Rồi restart dịch vụ "SQL Server (...)" trong services.msc
--
-- Bước B — Chạy lệnh sau (mật khẩu trùng DB_PASSWORD trong .env):

USE master;
GO
ALTER LOGIN sa ENABLE;
GO
ALTER LOGIN sa WITH PASSWORD = N'123456aA@';
GO
