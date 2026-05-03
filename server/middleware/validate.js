import { HttpError } from '../utils/httpError.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Du lieu khong hop le';
      return next(new HttpError(400, message));
    }
    req.body = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Tham so khong hop le';
      return next(new HttpError(400, message));
    }
    req.validatedQuery = result.data;
    return next();
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Tham so duong dan khong hop le';
      return next(new HttpError(400, message));
    }
    req.params = result.data;
    return next();
  };
}
