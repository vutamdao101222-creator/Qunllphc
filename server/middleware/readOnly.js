import { HttpError } from '../utils/httpError.js';

/** Chặn giáo viên / phụ huynh tài khoản chỉ đọc thực hiện thay đổi dữ liệu */
export function denyIfReadOnly(req, _res, next) {
  if (req.auth?.role === 'admin') return next();
  if (req.auth?.chiDoc) {
    return next(new HttpError(403, 'Tai khoan chi duoc xem, khong the thay doi du lieu'));
  }
  return next();
}
