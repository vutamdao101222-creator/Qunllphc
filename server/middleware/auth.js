import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

function parseRole(user) {
  if (user.laQuanTri) return 'admin';
  if (user.laGiaoVien) return 'teacher';
  if (user.laPhuHuynh) return 'parent';
  return 'parent';
}

export function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return next(new HttpError(401, 'Chua dang nhap'));
  }
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.auth = {
      ...payload,
      role: payload.role || parseRole(payload),
    };
    return next();
  } catch {
    return next(new HttpError(401, 'Token khong hop le hoac het han'));
  }
}

export function requireRoles(roles) {
  return (req, _res, next) => {
    if (!req.auth?.role || !roles.includes(req.auth.role)) {
      return next(new HttpError(403, 'Ban khong co quyen truy cap tai nguyen nay'));
    }
    return next();
  };
}
