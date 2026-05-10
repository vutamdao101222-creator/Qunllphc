import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

export async function assertParentLinkedToClass(maPhuHuynh, maLop, maHocSinh) {
  const pool = await getPool();
  const hasMaLopCol = await pool.request().query(`
    SELECT CASE WHEN COL_LENGTH('dbo.PhuHuynh_HocSinh', 'MaLop') IS NOT NULL THEN 1 ELSE 0 END AS ok
  `);
  const useLop = hasMaLopCol.recordset[0]?.ok === 1;

  if (useLop) {
    const r = await pool
      .request()
      .input('p', sql.UniqueIdentifier, maPhuHuynh)
      .input('l', sql.NVarChar, maLop)
      .input('h', sql.NVarChar, maHocSinh)
      .query(`
        SELECT TOP 1 1 AS ok
        FROM dbo.PhuHuynh_HocSinh
        WHERE [MaPhuHuynh] = @p AND [MaHocSinh] = @h
          AND ([MaLop] = @l OR [MaLop] IS NULL)
      `);
    if (r.recordset[0]) return;
    throw new HttpError(403, 'Phu huynh khong lien ket voi hoc sinh / lop hop le');
  }

  const r2 = await pool
    .request()
    .input('p', sql.UniqueIdentifier, maPhuHuynh)
    .input('h', sql.NVarChar, maHocSinh)
    .query(
      'SELECT TOP 1 1 AS ok FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p AND [MaHocSinh] = @h',
    );
  if (r2.recordset[0]) return;
  throw new HttpError(403, 'Phu huynh khong lien ket voi hoc sinh nay');
}

export async function listExchangeForClass({ maLop, maHocSinh }) {
  const pool = await getPool();
  let filter = 'WHERE t.[MaLop] = @maLop';
  const req = pool.request().input('maLop', sql.NVarChar, maLop);
  if (maHocSinh) {
    filter += ' AND (t.[MaHocSinh] = @hs OR t.[MaHocSinh] IS NULL)';
    req.input('hs', sql.NVarChar, maHocSinh);
  }
  const result = await req.query(`
    SELECT
      t.[MaTraoDoi] AS maTraoDoi,
      t.[MaLop] AS maLop,
      t.[MaHocSinh] AS maHocSinh,
      t.[MaNguoiGui] AS maNguoiGui,
      tk.[TênĐăngNhập] AS tenNguoiGui,
      tk.[HọTên] AS hoTenNguoiGui,
      t.[VaiTroGui] AS vaiTroGui,
      t.[TieuDe] AS tieuDe,
      t.[NoiDung] AS noiDung,
      t.[ThoiDiem] AS thoiDiem
    FROM dbo.TraoDoiPhHuynhGiaoVien t
    INNER JOIN dbo.TaiKhoan tk ON tk.[MãTàiKhoản] = t.[MaNguoiGui]
    ${filter}
    ORDER BY t.[ThoiDiem] ASC
  `);
  return result.recordset;
}

function sqlErrorNumber(err) {
  if (err == null) return undefined;
  if (typeof err.number === 'number') return err.number;
  if (typeof err.originalError?.info?.number === 'number') return err.originalError.info.number;
  return undefined;
}

export async function createExchange({ maLop, maHocSinh, maNguoiGui, vaiTroGui, tieuDe, noiDung, thoiDiem }) {
  const pool = await getPool();
  try {
    const ins = await pool
      .request()
      .input('maLop', sql.NVarChar, maLop)
      .input('maHocSinh', sql.NVarChar, maHocSinh ?? null)
      .input('maNguoiGui', sql.UniqueIdentifier, maNguoiGui)
      .input('vaiTroGui', sql.NVarChar, vaiTroGui)
      .input('tieuDe', sql.NVarChar, tieuDe ?? 'Trao đổi')
      .input('noiDung', sql.NVarChar, noiDung)
      .input('thoiDiem', sql.DateTime2, thoiDiem ?? new Date())
      .query(`
      INSERT INTO dbo.TraoDoiPhHuynhGiaoVien
        ([MaLop], [MaHocSinh], [MaNguoiGui], [VaiTroGui], [TieuDe], [NoiDung], [ThoiDiem])
      OUTPUT INSERTED.[MaTraoDoi] AS maTraoDoi
      VALUES (@maLop, @maHocSinh, @maNguoiGui, @vaiTroGui, @tieuDe, @noiDung, @thoiDiem)
    `);
    return ins.recordset[0]?.maTraoDoi;
  } catch (err) {
    const n = sqlErrorNumber(err);
    const text = String(err?.message ?? err);
    if (n === 547 || /FOREIGN KEY constraint|REFERENCE constraint/i.test(text)) {
      if (/FK_TraoDoi_Lop|MãLớp|"MaLop"/i.test(text) || /dbo\.LopHoc/i.test(text)) {
        throw new HttpError(
          400,
          `Ma lop "${maLop}" chua co trong bang LopHoc (FK). Giao dien demo dung T10A; script seed co the chi co L10A1. Chay migrations/009_ensure_ma_lop_t10a_demo.sql hoac them dong LopHoc tuong ung.`,
        );
      }
      if (/FK_TraoDoi_NguoiGui|TàiKhoản|TaiKhoan/i.test(text)) {
        throw new HttpError(400, `Tai khoan nguoi gui khong ton tai trong TaiKhoan.`);
      }
      throw new HttpError(
        400,
        `Loi rang buoc SQL (foreign key): ${text.slice(0, 280)}`,
      );
    }
    throw err;
  }
}

export async function listExchangeForParent(maPhuHuynh) {
  const pool = await getPool();
  const chk = await pool.request().query(`
    SELECT CASE WHEN COL_LENGTH('dbo.PhuHuynh_HocSinh', 'MaLop') IS NOT NULL THEN 1 ELSE 0 END AS ok
  `);
  const useLop = chk.recordset[0]?.ok === 1;

  const links = await pool
    .request()
    .input('p', sql.UniqueIdentifier, maPhuHuynh)
    .query(
      useLop
        ? 'SELECT [MaHocSinh] AS maHocSinh, [MaLop] AS maLop FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p'
        : 'SELECT [MaHocSinh] AS maHocSinh, CAST(NULL AS NVARCHAR(20)) AS maLop FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p',
    );
  const rows = links.recordset;
  if (!rows.length) return [];

  const parts = [];
  const req = pool.request();
  let idx = 0;
  for (const row of rows) {
    const l = row.maLop;
    const h = row.maHocSinh;
    if (!h) continue;
    if (l) {
      parts.push(`(t.[MaLop] = @l${idx} AND (t.[MaHocSinh] = @h${idx} OR t.[MaHocSinh] IS NULL))`);
      req.input(`l${idx}`, sql.NVarChar, l);
      req.input(`h${idx}`, sql.NVarChar, h);
    } else {
      parts.push(`(t.[MaHocSinh] = @h${idx})`);
      req.input(`h${idx}`, sql.NVarChar, h);
    }
    idx += 1;
  }
  if (!parts.length) return [];
  const where = `WHERE (${parts.join(' OR ')})`;
  const result = await req.query(`
    SELECT TOP 100
      t.[MaTraoDoi] AS maTraoDoi,
      t.[MaLop] AS maLop,
      t.[MaHocSinh] AS maHocSinh,
      t.[MaNguoiGui] AS maNguoiGui,
      tk.[HọTên] AS hoTenNguoiGui,
      t.[VaiTroGui] AS vaiTroGui,
      t.[TieuDe] AS tieuDe,
      t.[NoiDung] AS noiDung,
      t.[ThoiDiem] AS thoiDiem
    FROM dbo.TraoDoiPhHuynhGiaoVien t
    INNER JOIN dbo.TaiKhoan tk ON tk.[MãTàiKhoản] = t.[MaNguoiGui]
    ${where}
    ORDER BY t.[ThoiDiem] DESC
  `);
  return result.recordset;
}
