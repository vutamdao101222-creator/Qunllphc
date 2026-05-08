import { getPool, sql } from '../db.js';
import { HttpError } from '../utils/httpError.js';

function mapLinkRow(row) {
  return {
    id: row.id,
    parentId: row.parentId,
    studentId: row.studentId,
    relationship: row.relationship,
    createdAt: row.createdAt,
  };
}

function mapAdjustmentRow(row) {
  return {
    id: row.id,
    classId: row.classId,
    schedules: row.schedules,
    reason: row.reason,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  };
}

export async function listParentStudentLinks({ parentId } = {}) {
  const pool = await getPool();
  const request = pool.request();
  const filters = [];
  if (parentId) {
    filters.push('[MaPhuHuynh] = @parentId');
    request.input('parentId', sql.UniqueIdentifier, parentId);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT
      [MaLienKet] AS id,
      [MaPhuHuynh] AS parentId,
      [MaHocSinh] AS studentId,
      [QuanHe] AS relationship,
      [NgayTao] AS createdAt
    FROM dbo.PhuHuynh_HocSinh
    ${where}
    ORDER BY [NgayTao] DESC
  `);
  return result.recordset.map(mapLinkRow);
}

export async function createParentStudentLink({ parentId, studentId, relationship }) {
  const pool = await getPool();
  try {
    const inserted = await pool
      .request()
      .input('parentId', sql.UniqueIdentifier, parentId)
      .input('studentId', sql.NVarChar, studentId)
      .input('relationship', sql.NVarChar, relationship || 'guardian')
      .query(`
        INSERT INTO dbo.PhuHuynh_HocSinh ([MaPhuHuynh], [MaHocSinh], [QuanHe])
        OUTPUT inserted.[MaLienKet] AS id
        VALUES (@parentId, @studentId, @relationship)
      `);
    const id = inserted.recordset[0]?.id;
    const row = (
      await pool
        .request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT
            [MaLienKet] AS id,
            [MaPhuHuynh] AS parentId,
            [MaHocSinh] AS studentId,
            [QuanHe] AS relationship,
            [NgayTao] AS createdAt
          FROM dbo.PhuHuynh_HocSinh
          WHERE [MaLienKet] = @id
        `)
    ).recordset[0];
    return mapLinkRow(row);
  } catch (e) {
    // Unique constraint -> treat as idempotent
    return null;
  }
}

export async function deleteParentStudentLink(linkId) {
  const pool = await getPool();
  const existing = await pool
    .request()
    .input('id', sql.UniqueIdentifier, linkId)
    .query('SELECT TOP 1 1 AS ok FROM dbo.PhuHuynh_HocSinh WHERE [MaLienKet] = @id');
  if (!existing.recordset[0]) throw new HttpError(404, 'Khong tim thay lien ket');

  await pool
    .request()
    .input('id', sql.UniqueIdentifier, linkId)
    .query('DELETE FROM dbo.PhuHuynh_HocSinh WHERE [MaLienKet] = @id');
  return { ok: true };
}

export async function listScheduleAdjustments({ classId } = {}) {
  const pool = await getPool();
  const request = pool.request();
  const filters = [];
  if (classId) {
    filters.push('[MaLop] = @classId');
    request.input('classId', sql.NVarChar, classId);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT
      [MaDieuChinh] AS id,
      [MaLop] AS classId,
      [SchedulesJson] AS schedulesJson,
      [LyDo] AS reason,
      [CapNhatBoi] AS updatedBy,
      [CapNhatLuc] AS updatedAt
    FROM dbo.DieuChinhLichHocLop
    ${where}
    ORDER BY [CapNhatLuc] DESC
  `);
  return result.recordset.map((row) => {
    let schedules = [];
    try {
      schedules = JSON.parse(row.schedulesJson || '[]');
    } catch {
      schedules = [];
    }
    return mapAdjustmentRow({
      id: row.id,
      classId: row.classId,
      schedules,
      reason: row.reason,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    });
  });
}

export async function upsertScheduleAdjustment({ classId, schedules, reason, updatedBy }) {
  const pool = await getPool();
  const schedulesJson = JSON.stringify(Array.isArray(schedules) ? schedules : []);

  await pool
    .request()
    .input('classId', sql.NVarChar, classId)
    .input('schedulesJson', sql.NVarChar(sql.MAX), schedulesJson)
    .input('reason', sql.NVarChar, reason)
    .input('updatedBy', sql.NVarChar, updatedBy)
    .query(`
      MERGE dbo.DieuChinhLichHocLop AS target
      USING (SELECT @classId AS [MaLop]) AS src
      ON target.[MaLop] = src.[MaLop]
      WHEN MATCHED THEN
        UPDATE SET
          [SchedulesJson] = @schedulesJson,
          [LyDo] = @reason,
          [CapNhatBoi] = @updatedBy,
          [CapNhatLuc] = SYSDATETIME()
      WHEN NOT MATCHED THEN
        INSERT ([MaLop], [SchedulesJson], [LyDo], [CapNhatBoi])
        VALUES (@classId, @schedulesJson, @reason, @updatedBy);
    `);

  const rows = await listScheduleAdjustments({ classId });
  return rows[0] || null;
}

export async function resetScheduleAdjustment(classId) {
  const pool = await getPool();
  await pool
    .request()
    .input('classId', sql.NVarChar, classId)
    .query('DELETE FROM dbo.DieuChinhLichHocLop WHERE [MaLop] = @classId');
  return { ok: true };
}

