import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SORTABLE = new Set(['maLop', 'tenLop', 'khoi', 'monHoc', 'siSoDuKien']);
const SORT_COLUMN_MAP = {
  maLop: 'l.[MãLớp]',
  tenLop: 'l.[TênLớp]',
  khoi: 'l.Khoi',
  monHoc: 'l.[MônHọc]',
  siSoDuKien: 'l.[SĩSốDựKiến]',
};

function mapRow(row) {
  return {
    maLop: row.maLop,
    tenLop: row.tenLop,
    khoi: row.khoi,
    monHoc: row.monHoc,
    maGiaoVien: row.maGiaoVien,
    tenGiaoVien: row.tenGiaoVien,
    siSoDuKien: row.siSoDuKien,
  };
}

export async function listClasses({ page, pageSize, q, sort, order, maGiaoVien }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const sortKey = SORTABLE.has(sort) ? sort : 'maLop';
  const sortColumn = SORT_COLUMN_MAP[sortKey];
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const filters = [];
  if (q) filters.push('(l.[TênLớp] LIKE @q OR l.[MãLớp] LIKE @q OR l.[MônHọc] LIKE @q)');
  if (maGiaoVien) filters.push('l.[MãGiáoViên] = @maGiaoVien');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (q) totalReq.input('q', sql.NVarChar, `%${q}%`);
  if (maGiaoVien) totalReq.input('maGiaoVien', sql.NVarChar, maGiaoVien);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.LopHoc l ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (q) request.input('q', sql.NVarChar, `%${q}%`);
  if (maGiaoVien) request.input('maGiaoVien', sql.NVarChar, maGiaoVien);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT
      l.[MãLớp] AS maLop,
      l.[TênLớp] AS tenLop,
      l.Khoi AS khoi,
      l.[MônHọc] AS monHoc,
      l.[MãGiáoViên] AS maGiaoVien,
      g.[HọTên] AS tenGiaoVien,
      l.[SĩSốDựKiến] AS siSoDuKien
    FROM dbo.LopHoc l
    INNER JOIN dbo.GiaoVien g ON g.[MãGiáoViên] = l.[MãGiáoViên]
    ${where}
    ORDER BY ${sortColumn} ${sortDir}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function getClass(maLop) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maLop', sql.NVarChar, maLop)
    .query(`
      SELECT
        l.[MãLớp] AS maLop,
        l.[TênLớp] AS tenLop,
        l.Khoi AS khoi,
        l.[MônHọc] AS monHoc,
        l.[MãGiáoViên] AS maGiaoVien,
        g.[HọTên] AS tenGiaoVien,
        l.[SĩSốDựKiến] AS siSoDuKien
      FROM dbo.LopHoc l
      INNER JOIN dbo.GiaoVien g ON g.[MãGiáoViên] = l.[MãGiáoViên]
      WHERE l.[MãLớp] = @maLop
    `);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'Khong tim thay lop hoc');
  return mapRow(row);
}

async function ensureTeacherExists(maGiaoVien) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('maGiaoVien', sql.NVarChar, maGiaoVien)
    .query('SELECT TOP 1 1 AS ok FROM dbo.GiaoVien WHERE [MãGiáoViên] = @maGiaoVien');
  if (!result.recordset[0]) throw new HttpError(400, 'Ma giao vien khong ton tai');
}

export async function createClass(data) {
  const pool = await getPool();
  const exists = await pool
    .request()
    .input('maLop', sql.NVarChar, data.maLop)
    .query('SELECT TOP 1 1 AS ok FROM dbo.LopHoc WHERE [MãLớp] = @maLop');
  if (exists.recordset[0]) throw new HttpError(409, 'Ma lop da ton tai');

  await ensureTeacherExists(data.maGiaoVien);

  await pool
    .request()
    .input('maLop', sql.NVarChar, data.maLop)
    .input('tenLop', sql.NVarChar, data.tenLop)
    .input('khoi', sql.NVarChar, data.khoi)
    .input('monHoc', sql.NVarChar, data.monHoc)
    .input('maGiaoVien', sql.NVarChar, data.maGiaoVien)
    .input('siSoDuKien', sql.Int, data.siSoDuKien)
    .query(`
      INSERT INTO dbo.LopHoc ([MãLớp], [TênLớp], Khoi, [MônHọc], [MãGiáoViên], [SĩSốDựKiến])
      VALUES (@maLop, @tenLop, @khoi, @monHoc, @maGiaoVien, @siSoDuKien)
    `);
  return getClass(data.maLop);
}

export async function updateClass(maLop, data) {
  await getClass(maLop);
  if (data.maGiaoVien) await ensureTeacherExists(data.maGiaoVien);

  const pool = await getPool();
  await pool
    .request()
    .input('maLop', sql.NVarChar, maLop)
    .input('tenLop', sql.NVarChar, data.tenLop ?? null)
    .input('khoi', sql.NVarChar, data.khoi ?? null)
    .input('monHoc', sql.NVarChar, data.monHoc ?? null)
    .input('maGiaoVien', sql.NVarChar, data.maGiaoVien ?? null)
    .input('siSoDuKien', sql.Int, data.siSoDuKien ?? null)
    .query(`
      UPDATE dbo.LopHoc
      SET
        [TênLớp] = COALESCE(@tenLop, [TênLớp]),
        Khoi = COALESCE(@khoi, Khoi),
        [MônHọc] = COALESCE(@monHoc, [MônHọc]),
        [MãGiáoViên] = COALESCE(@maGiaoVien, [MãGiáoViên]),
        [SĩSốDựKiến] = COALESCE(@siSoDuKien, [SĩSốDựKiến])
      WHERE [MãLớp] = @maLop
    `);
  return getClass(maLop);
}

export async function deleteClass(maLop) {
  await getClass(maLop);
  const pool = await getPool();
  const inUse = await pool
    .request()
    .input('maLop', sql.NVarChar, maLop)
    .query(`
      SELECT TOP 1 1 AS ok
      FROM (
        SELECT [MãLớp] FROM dbo.BuoiHoc WHERE [MãLớp] = @maLop
        UNION ALL SELECT [MãLớp] FROM dbo.DiemDanh WHERE [MãLớp] = @maLop
        UNION ALL SELECT [MãLớp] FROM dbo.ChiSoTapTrung WHERE [MãLớp] = @maLop
        UNION ALL SELECT [MãLớp] FROM dbo.CanhBao WHERE [MãLớp] = @maLop
        UNION ALL SELECT [MãLớp] FROM dbo.AiDuDoan WHERE [MãLớp] = @maLop
      ) t
    `);
  if (inUse.recordset[0]) {
    throw new HttpError(409, 'Khong the xoa: lop dang co du lieu lien quan');
  }
  await pool
    .request()
    .input('maLop', sql.NVarChar, maLop)
    .query('DELETE FROM dbo.LopHoc WHERE [MãLớp] = @maLop');
  return { ok: true };
}
