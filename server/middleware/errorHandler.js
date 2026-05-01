import { HttpError } from '../utils/httpError.js';
import { logError } from '../utils/logger.js';

export function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, 'Khong tim thay endpoint'));
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  logError('Unhandled API error', err);
  return res.status(500).json({ message: 'Loi he thong, vui long thu lai' });
}
