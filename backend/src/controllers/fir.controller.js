const db = require('../config/db');
const crypto = require('crypto');

// Helper to check if case exists
async function checkCaseExists(caseId) {
  const result = await db.query('SELECT id FROM "case" WHERE id = $1', [caseId]);
  return result.rows.length > 0;
}

exports.createFir = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { firNumber, incidentDate, location, description, sourceFile } = req.body;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!firNumber || typeof firNumber !== 'string' || firNumber.trim().length === 0) {
      return res.status(400).json({ error: 'firNumber is required and must be a non-empty string' });
    }

    if (!incidentDate) {
      return res.status(400).json({ error: 'incidentDate is required' });
    }

    const parsedDate = new Date(incidentDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'incidentDate must be a valid date' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const result = await db.query(
      `INSERT INTO "firRecord" (id, "caseId", "firNumber", "incidentDate", location, description, "sourceFile", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        caseId,
        firNumber.trim(),
        parsedDate,
        location ? location.trim() : null,
        description ? description.trim() : null,
        sourceFile ? sourceFile.trim() : null,
        now
      ]
    );

    res.status(201).json({ message: 'FIR record created successfully', firRecord: result.rows[0] });
  } catch (error) {
    console.error('Create FIR Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getFirs = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const result = await db.query(
      `SELECT * FROM "firRecord" WHERE "caseId" = $1 ORDER BY "createdAt" DESC`,
      [caseId]
    );

    res.status(200).json({ firRecords: result.rows });
  } catch (error) {
    console.error('Get FIRs Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getFirById = async (req, res) => {
  try {
    const { caseId, firId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const result = await db.query(
      `SELECT * FROM "firRecord" WHERE id = $1 AND "caseId" = $2`,
      [firId, caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FIR record not found' });
    }

    res.status(200).json({ firRecord: result.rows[0] });
  } catch (error) {
    console.error('Get FIR by ID Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateFir = async (req, res) => {
  try {
    const { caseId, firId } = req.params;
    const { firNumber, incidentDate, location, description, sourceFile } = req.body;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const existing = await db.query(
      `SELECT id FROM "firRecord" WHERE id = $1 AND "caseId" = $2`,
      [firId, caseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'FIR record not found' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (firNumber !== undefined) {
      if (typeof firNumber !== 'string' || firNumber.trim().length === 0) {
        return res.status(400).json({ error: 'firNumber must be a non-empty string' });
      }
      updates.push(`"firNumber" = $${idx++}`);
      values.push(firNumber.trim());
    }

    if (incidentDate !== undefined) {
      const parsedDate = new Date(incidentDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'incidentDate must be a valid date' });
      }
      updates.push(`"incidentDate" = $${idx++}`);
      values.push(parsedDate);
    }

    if (location !== undefined) {
      updates.push(`location = $${idx++}`);
      values.push(location ? location.trim() : null);
    }

    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description ? description.trim() : null);
    }

    if (sourceFile !== undefined) {
      updates.push(`"sourceFile" = $${idx++}`);
      values.push(sourceFile ? sourceFile.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(firId);
    const query = `UPDATE "firRecord" SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);

    res.status(200).json({ message: 'FIR record updated successfully', firRecord: result.rows[0] });
  } catch (error) {
    console.error('Update FIR Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteFir = async (req, res) => {
  try {
    const { caseId, firId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const existing = await db.query(
      `SELECT id FROM "firRecord" WHERE id = $1 AND "caseId" = $2`,
      [firId, caseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'FIR record not found' });
    }

    await db.query(`DELETE FROM "firRecord" WHERE id = $1 AND "caseId" = $2`, [firId, caseId]);

    res.status(200).json({ message: 'FIR record deleted successfully' });
  } catch (error) {
    console.error('Delete FIR Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
