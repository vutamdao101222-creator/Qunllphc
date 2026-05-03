import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SORTABLE = new Set(['maGiaoVien', 'hoTen', 'monHoc', 'email']);
const SORT_COLUMN_MAP = {
  maGiaoVien: '[MãGiáoViên]',
  hoTen: '[HọTên]',
  monHoc: '[MônHọc]',
  email: '[Email]',
};

function mapRow(row) {
  return {
    maGiaoVien: row.maGiaoVien,
    hoTen: row.hoTen,
    monHoc: row.monHoc,
    soDienThoai: row.soDienThoai,
    email: row.email,
  };
}

export async function listTeachers({ page, pageSize, q, sort, order }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const sortKey = SORTABLE.has(sort) ? sort : 'maGiaoVien';
  const sortColumn = SORT_COLUMN_MAP[sortKey];
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const where = q
    ? 'WHERE [HọTên] LIKE @q OR [MãGiáoViên] LIKE @q OR [Email] LIKE @q OR [MônHọc] LIKE @q'
    : '';

  const totalReq = pool.request();
  if (q) totalReq.input('q', sql.NVarChar, `%${q}%`);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.GiaoVien ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (q) request.input('q', sql.NVarChar, `%${q}%`);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT
      [MãGiáoViên] AS maGiaoVien,
      [HọTên] AS hoTen,
      [MônHọc] AS monHoc,
      [SốĐiệnThoại] AS soDienThoai,
      [Email] AS email
    FROM dbo.GiaoVien
    ${where}
    ORDER BY ${sortColumn} ${sortDir}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return { items: result.recordset.map(mapRow), total };
}

export async function getTeacher(maGiaoVien) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, maGiaoVien)
    .query(`
      SELECT
        [MãGiáoViên] AS maGiaoVien,
        [HọTên] AS hoTen,
        [MônHọc] AS monHoc,
        [SốĐiệnThoại] AS soDienThoai,
        [Email] AS email
      FROM dbo.GiaoVien
      WHERE [MãGiáoViên] = @maGiaoVien
    `);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay giao vien');
  return mapRow(row);
}

export async function createTeacher(data) {
  const pool = await getPool();
  const exists = await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, data.maGiaoVien)
    .query('SELECT TOP 1 1 AS ok FROM dbo.GiaoVien WHERE [MãGiáoViên] = @maGiaoVien');
  if (exists.recordset[0]) throw new HttpError(409, 'Ma giao vien da ton tai');

  await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, data.maGiaoVien)
    .input('hoTen', sql.NVarChar, data.hoTen)
    .input('monHoc', sql.NVarChar, data.monHoc)
    .input('soDienThoai', sql.NVarChar, data.soDienThoai ?? null)
    .input('email', sql.NVarChar, data.email ?? null)
    .query(`
      INSERT INTO dbo.GiaoVien ([MãGiáoViên], [HọTên], [MônHọc], [SốĐiệnThoại], Email)
      VALUES (@maGiaoVien, @hoTen, @monHoc, @soDienThoai, @email)
    `);
  return getTeacher(data.maGiaoVien);
}

export async function updateTeacher(maGiaoVien, data) {
  await getTeacher(maGiaoVien);
  const pool = await getPool();
  await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, maGiaoVien)
    .input('hoTen', sql.NVarChar, data.hoTen ?? null)
    .input('monHoc', sql.NVarChar, data.monHoc ?? null)
    .input('soDienThoai', sql.NVarChar, data.soDienThoai ?? null)
    .input('email', sql.NVarChar, data.email ?? null)
    .query(`
      UPDATE dbo.GiaoVien
      SET
        [HọTên] = COALESCE(@hoTen, [HọTên]),
        [MônHọc] = COALESCE(@monHoc, [MônHọc]),
        [SốĐiệnThoại] = COALESCE(@soDienThoai, [SốĐiệnThoại]),
        Email = COALESCE(@email, Email)
      WHERE [MãGiáoViên] = @maGiaoVien
    `);
  return getTeacher(maGiaoVien);
}

export async function deleteTeacher(maGiaoVien) {
  await getTeacher(maGiaoVien);
  const pool = await getPool();
  const inUse = await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, maGiaoVien)
    .query('SELECT TOP 1 1 AS ok FROM dbo.LopHoc WHERE [MãGiáoViên] = @maGiaoVien');
  if (inUse.recordset[0]) {
    throw new HttpError(409, 'Khong the xoa: giao vien dang chu nhiem mot hoac nhieu lop');
  }
  await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, maGiaoVien)
    .query('DELETE FROM dbo.GiaoVien WHERE [MãGiáoViên] = @maGiaoVien');
  return { ok: true };
}

export async function listClassesByTeacher(maGiaoVien) {
  await getTeacher(maGiaoVien);
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, maGiaoVien)
    .query(`
      SELECT
        [MãLớp] AS maLop,
        [TênLớp] AS tenLop,
        Khoi AS khoi,
        [MônHọc] AS monHoc,
        [MãGiáoViên] AS maGiaoVien,
        [SĩSốDựKiến] AS siSoDuKien
      FROM dbo.LopHoc
      WHERE [MãGiáoViên] = @maGiaoVien
      ORDER BY [MãLớp]
    `);
  return result.recordset;
}
