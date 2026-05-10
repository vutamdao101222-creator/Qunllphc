import { writeAudit } from '../services/auditService.js';

export function auditFromReq(req, hanhDong, doiTuong, chiTiet) {
  const detail =
    typeof chiTiet === 'string' ? chiTiet.slice(0, 4000) : JSON.stringify(chiTiet ?? {}).slice(0, 4000);
  void writeAudit({
    maTaiKhoan: req.auth?.maTaiKhoan ?? null,
    tenDangNhap: req.auth?.tenDangNhap ?? null,
    hanhDong,
    doiTuong: doiTuong ?? null,
    chiTiet: detail,
    diaChiIp: req.ip || req.headers['x-forwarded-for'] || null,
  });
}
