import { getPool } from '../db.js';
import { HttpError } from '../utils/httpError.js';

export async function findTeacherCodeByAccount(maTaiKhoan) {
  if (!maTaiKhoan) return null;
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maTaiKhoan', maTaiKhoan)
    .query(`
      SELECT TOP 1
        g.[MãGiáoViên] AS maGiaoVien
      FROM dbo.TaiKhoan t
      INNER JOIN dbo.GiaoVien g ON g.[Email] = t.[Email]
      WHERE t.[MãTàiKhoản] = @maTaiKhoan
    `);
  return result.recordset[0]?.maGiaoVien || null;
}

/** Ưu tiên mã giáo viên trong JWT (sau đăng nhập), fallback tra DB. */
export async function resolveTeacherMaGiaoVien(req) {
  if (!req.auth || req.auth.role !== 'teacher') return null;
  if (req.auth.maGiaoVien) return req.auth.maGiaoVien;
  return findTeacherCodeByAccount(req.auth.maTaiKhoan);
}

export async function assertTeacherOwnsClass(req, maLop) {
  if (!req.auth) throw new HttpError(401, 'Chua dang nhap');
  if (req.auth.role === 'admin') return;
  if (req.auth.role !== 'teacher') throw new HttpError(403, 'Ban khong co quyen voi lop nay');

  const teacherCode = await resolveTeacherMaGiaoVien(req);
  if (!teacherCode) throw new HttpError(403, 'Tai khoan giao vien chua duoc gan ma giao vien');

  const pool = await getPool();
  const result = await pool
    .request()
    .input('maLop', maLop)
    .query('SELECT TOP 1 [MãGiáoViên] AS maGiaoVien FROM dbo.LopHoc WHERE [MãLớp] = @maLop');
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay lop hoc');
  if (row.maGiaoVien !== teacherCode) throw new HttpError(403, 'Ban khong phu trach lop nay');
}
