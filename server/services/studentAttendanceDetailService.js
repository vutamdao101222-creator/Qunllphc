import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

async function hasMaLopOnLinks(pool) {
  const r = await pool.request().query(`
    SELECT CASE WHEN COL_LENGTH('dbo.PhuHuynh_HocSinh', 'MaLop') IS NOT NULL THEN 1 ELSE 0 END AS ok
  `);
  return r.recordset[0]?.ok === 1;
}

export async function assertParentCanSeeStudent(maPhuHuynh, maLop, maHocSinh) {
  const pool = await getPool();
  if (await hasMaLopOnLinks(pool)) {
    const r = await pool
      .request()
      .input('p', sql.UniqueIdentifier, maPhuHuynh)
      .input('l', sql.NVarChar, maLop)
      .input('h', sql.NVarChar, maHocSinh)
      .query(`
        SELECT TOP 1 1 AS ok FROM dbo.PhuHuynh_HocSinh
        WHERE [MaPhuHuynh] = @p AND [MaHocSinh] = @h
          AND ([MaLop] = @l OR [MaLop] IS NULL)
      `);
    if (r.recordset[0]) return;
    throw new HttpError(403, 'Khong co quyen xem diem danh');
  }
  const r2 = await pool
    .request()
    .input('p', sql.UniqueIdentifier, maPhuHuynh)
    .input('h', sql.NVarChar, maHocSinh)
    .query(
      'SELECT TOP 1 1 AS ok FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p AND [MaHocSinh] = @h',
    );
  if (r2.recordset[0]) return;
  throw new HttpError(403, 'Khong co quyen xem diem danh');
}

export async function listStudentAttendanceForClass({ maLop, maHocSinh, from, to }) {
  const pool = await getPool();
  const filters = ['h.[MaLop] = @maLop'];
  const req = pool.request().input('maLop', sql.NVarChar, maLop);
  if (maHocSinh) {
    filters.push('h.[MaHocSinh] = @hs');
    req.input('hs', sql.NVarChar, maHocSinh);
  }
  if (from) {
    filters.push('h.[ThoiDiem] >= @from');
    req.input('from', sql.DateTime2, from);
  }
  if (to) {
    filters.push('h.[ThoiDiem] <= @to');
    req.input('to', sql.DateTime2, to);
  }
  const where = `WHERE ${filters.join(' AND ')}`;
  const result = await req.query(`
    SELECT
      h.[Ma] AS ma,
      h.[MaLop] AS maLop,
      h.[MaHocSinh] AS maHocSinh,
      h.[ThoiDiem] AS thoiDiem,
      h.[TrangThai] AS trangThai,
      h.[GhiChu] AS ghiChu,
      h.[TaoLuc] AS taoLuc
    FROM dbo.HocSinhDiemDanh h
    ${where}
    ORDER BY h.[ThoiDiem] DESC
  `);
  return result.recordset;
}

export async function createStudentAttendance({ maLop, maHocSinh, thoiDiem, trangThai, ghiChu, taoBoi }) {
  const pool = await getPool();
  const ins = await pool
    .request()
    .input('maLop', sql.NVarChar, maLop)
    .input('maHocSinh', sql.NVarChar, maHocSinh)
    .input('thoiDiem', sql.DateTime2, thoiDiem ?? new Date())
    .input('trangThai', sql.NVarChar, trangThai)
    .input('ghiChu', sql.NVarChar, ghiChu ?? null)
    .input('taoBoi', sql.UniqueIdentifier, taoBoi ?? null)
    .query(`
      INSERT INTO dbo.HocSinhDiemDanh ([MaLop], [MaHocSinh], [ThoiDiem], [TrangThai], [GhiChu], [TaoBoi])
      OUTPUT INSERTED.[Ma] AS ma
      VALUES (@maLop, @maHocSinh, @thoiDiem, @trangThai, @ghiChu, @taoBoi)
    `);
  return ins.recordset[0]?.ma;
}

export async function listStudentAttendanceForParent(maPhuHuynh, { from, to, maHocSinh }) {
  const pool = await getPool();
  const useLop = await hasMaLopOnLinks(pool);
  const links = await pool
    .request()
    .input('p', sql.UniqueIdentifier, maPhuHuynh)
    .query(
      useLop
        ? 'SELECT [MaHocSinh] AS maHocSinh, [MaLop] AS maLop FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p'
        : 'SELECT [MaHocSinh] AS maHocSinh, CAST(NULL AS NVARCHAR(20)) AS maLop FROM dbo.PhuHuynh_HocSinh WHERE [MaPhuHuynh] = @p',
    );
  const pairs = links.recordset.filter((r) => r.maHocSinh);
  if (!pairs.length) return [];

  const req = pool.request().input('from', sql.DateTime2, from).input('to', sql.DateTime2, to);
  const conds = [];
  let idx = 0;
  for (const row of pairs) {
    if (maHocSinh && row.maHocSinh !== maHocSinh) continue;
    if (row.maLop) {
      conds.push(`([MaLop] = @l${idx} AND [MaHocSinh] = @h${idx})`);
      req.input(`l${idx}`, sql.NVarChar, row.maLop);
      req.input(`h${idx}`, sql.NVarChar, row.maHocSinh);
    } else {
      conds.push(`([MaHocSinh] = @h${idx})`);
      req.input(`h${idx}`, sql.NVarChar, row.maHocSinh);
    }
    idx += 1;
  }
  if (!conds.length) return [];
  const where = `(${conds.join(' OR ')}) AND [ThoiDiem] >= @from AND [ThoiDiem] <= @to`;
  const result = await req.query(`
    SELECT TOP 200
      [Ma] AS ma,
      [MaLop] AS maLop,
      [MaHocSinh] AS maHocSinh,
      [ThoiDiem] AS thoiDiem,
      [TrangThai] AS trangThai,
      [GhiChu] AS ghiChu
    FROM dbo.HocSinhDiemDanh
    WHERE ${where}
    ORDER BY [ThoiDiem] DESC
  `);
  return result.recordset;
}
