import { getPool, sql } from '../db.js';

const SELECT_COLUMNS = `
  c.[MãChiSố] AS maChiSo,
  c.[MãLớp] AS maLop,
  l.[TênLớp] AS tenLop,
  c.[ThờiĐiểm] AS thoiDiem,
  c.[SĩSốHiệnTại] AS siSoHienTai,
  c.[MứcTậpTrung] AS mucTapTrung
`;

function mapRow(row) {
  return {
    maChiSo: row.maChiSo,
    maLop: row.maLop,
    tenLop: row.tenLop,
    thoiDiem: row.thoiDiem,
    siSoHienTai: row.siSoHienTai,
    mucTapTrung: row.mucTapTrung,
  };
}

export async function listMetrics({ page, pageSize, maLop, from, to }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const filters = [];
  if (maLop) filters.push('c.[MãLớp] = @maLop');
  if (from) filters.push('c.[ThờiĐiểm] >= @from');
  if (to) filters.push('c.[ThờiĐiểm] <= @to');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (maLop) totalReq.input('maLop', sql.NVarChar, maLop);
  if (from) totalReq.input('from', sql.DateTime2, from);
  if (to) totalReq.input('to', sql.DateTime2, to);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.ChiSoTapTrung c ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (maLop) request.input('maLop', sql.NVarChar, maLop);
  if (from) request.input('from', sql.DateTime2, from);
  if (to) request.input('to', sql.DateTime2, to);
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, pageSize);
  const result = await request.query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.ChiSoTapTrung c
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
    ${where}
    ORDER BY c.[ThờiĐiểm] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset.map(mapRow), total };
}

export async function createMetric(data) {
  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('maLop', sql.NVarChar, data.maLop)
    .input('thoiDiem', sql.DateTime2, data.thoiDiem ?? new Date())
    .input('siSoHienTai', sql.Int, data.siSoHienTai)
    .input('mucTapTrung', sql.Int, data.mucTapTrung)
    .query(`
      INSERT INTO dbo.ChiSoTapTrung ([MãLớp], [ThờiĐiểm], [SĩSốHiệnTại], [MứcTậpTrung])
      OUTPUT inserted.[MãChiSố] AS maChiSo
      VALUES (@maLop, @thoiDiem, @siSoHienTai, @mucTapTrung)
    `);
  const id = inserted.recordset[0].maChiSo;
  const row = (
    await pool
      .request()
      .input('maChiSo', sql.UniqueIdentifier, id)
      .query(`
        SELECT ${SELECT_COLUMNS}
        FROM dbo.ChiSoTapTrung c
        INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
        WHERE c.[MãChiSố] = @maChiSo
      `)
  ).recordset[0];
  return mapRow(row);
}
