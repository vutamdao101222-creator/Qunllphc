import { getPool } from '../db.js';

function buildIntervention(score) {
  if (score >= 75) return 'Duy tri nhom hoc hien tai va tang bai tap nang cao.';
  if (score >= 55) return 'Tang tuong tac tren lop va chia nho bai hoc theo 15 phut.';
  return 'Can can thiep som: lien he phu huynh, kiem tra diem danh, va bo tri tutor.';
}

export async function generateAiPredictions() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      l.[MãLớp] AS maLop,
      l.[TênLớp] AS tenLop,
      AVG(CAST(c.[MứcTậpTrung] AS FLOAT)) AS avgConcentration,
      AVG(CAST(c.[SĩSốHiệnTại] AS FLOAT)) AS avgStudents,
      MAX(l.[SĩSốDựKiến]) AS expectedStudents
    FROM dbo.ChiSoTapTrung c
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = c.[MãLớp]
    WHERE c.[ThờiĐiểm] >= DATEADD(DAY, -7, SYSDATETIME())
    GROUP BY l.[MãLớp], l.[TênLớp]
    ORDER BY l.[MãLớp]
  `);

  const predictions = result.recordset.map((row) => {
    const attendanceRate = row.expectedStudents ? (row.avgStudents / row.expectedStudents) * 100 : 0;
    const riskScore = Math.max(0, Math.min(100, Math.round(0.65 * row.avgConcentration + 0.35 * attendanceRate)));
    const riskLevel = riskScore >= 75 ? 'low' : riskScore >= 55 ? 'medium' : 'high';
    return {
      maLop: row.maLop,
      tenLop: row.tenLop,
      riskScore,
      riskLevel,
      intervention: buildIntervention(riskScore),
    };
  });

  for (const p of predictions) {
    await pool
      .request()
      .input('maLop', p.maLop)
      .input('riskScore', p.riskScore)
      .input('riskLevel', p.riskLevel)
      .input('goiYCanThiep', p.intervention)
      .query(`
        INSERT INTO dbo.AiDuDoan ([MãLớp], [ĐiểmRủiRo], [MứcRủiRo], [GợiÝCanThiệp])
        VALUES (@maLop, @riskScore, @riskLevel, @goiYCanThiep)
      `);
  }

  return predictions;
}

export async function getLatestAiPredictions() {
  const pool = await getPool();
  const result = await pool.request().query(`
    ;WITH ranked AS (
      SELECT
        [MãLớp] AS maLop,
        [ĐiểmRủiRo] AS riskScore,
        [MứcRủiRo] AS riskLevel,
        [GợiÝCanThiệp] AS intervention,
        [ThờiĐiểm] AS thoiDiem,
        ROW_NUMBER() OVER (PARTITION BY [MãLớp] ORDER BY [ThờiĐiểm] DESC) AS rn
      FROM dbo.AiDuDoan
    )
    SELECT
      r.maLop,
      l.[TênLớp] AS tenLop,
      r.riskScore,
      r.riskLevel,
      r.intervention,
      r.thoiDiem
    FROM ranked r
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = r.maLop
    WHERE r.rn = 1
    ORDER BY r.riskScore ASC
  `);
  return result.recordset;
}

export async function listAiPredictionHistory({ page, pageSize, maLop, from, to }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const filters = [];
  if (maLop) filters.push('a.[MãLớp] = @maLop');
  if (from) filters.push('a.[ThờiĐiểm] >= @from');
  if (to) filters.push('a.[ThờiĐiểm] <= @to');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const totalReq = pool.request();
  if (maLop) totalReq.input('maLop', maLop);
  if (from) totalReq.input('from', from);
  if (to) totalReq.input('to', to);
  const total = (
    await totalReq.query(`SELECT COUNT(*) AS total FROM dbo.AiDuDoan a ${where}`)
  ).recordset[0].total;

  const request = pool.request();
  if (maLop) request.input('maLop', maLop);
  if (from) request.input('from', from);
  if (to) request.input('to', to);
  request.input('offset', offset);
  request.input('pageSize', pageSize);
  const result = await request.query(`
    SELECT
      a.[MãDựĐoán] AS maDuDoan,
      a.[MãLớp] AS maLop,
      l.[TênLớp] AS tenLop,
      a.[ĐiểmRủiRo] AS riskScore,
      a.[MứcRủiRo] AS riskLevel,
      a.[GợiÝCanThiệp] AS intervention,
      a.[ThờiĐiểm] AS thoiDiem
    FROM dbo.AiDuDoan a
    INNER JOIN dbo.LopHoc l ON l.[MãLớp] = a.[MãLớp]
    ${where}
    ORDER BY a.[ThờiĐiểm] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);
  return { items: result.recordset, total };
}
