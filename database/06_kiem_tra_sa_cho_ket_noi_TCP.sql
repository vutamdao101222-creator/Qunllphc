/*
  Chạy trong SSMS đã kết nối được (Windows Auth hoặc sqlcmd -S BINMILO -E).
  Đích: tcp:127.0.0.1,1433 + sa báo Login failed trong khi Shared memory vẫn vào được.
*/

USE master;
GO

-- Xem trạng thái login sa
SELECT
  name,
  type_desc,
  is_disabled,
  create_date
FROM sys.server_principals
WHERE name = N'sa';
GO

-- Nếu bị ép đổi mật khẩu lần đầu, driver Node/sqlcmd ODBC thường báo Login failed chung:
ALTER LOGIN sa WITH PASSWORD = N'123456aA@', MUST_CHANGE = OFF,
  CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
GO

ALTER LOGIN sa ENABLE;
GO

-- Mixed Mode đã bật và TCP đã Enabled (Configuration Manager): restart SQL sau khi bật.
-- Kiểm tra lại TCP ngoài Windows:
PRINT N'Sau đó trong CMD chạy: sqlcmd -S "tcp:127.0.0.1,1433" -U sa -P "123456aA@" -Q "SELECT 1" -b';
