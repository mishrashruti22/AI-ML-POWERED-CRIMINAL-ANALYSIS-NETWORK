const db = require('../config/db');
const crypto = require('crypto');

// Helper to check if case exists
async function checkCaseExists(caseId) {
  const result = await db.query('SELECT id FROM "case" WHERE id = $1', [caseId]);
  return result.rows.length > 0;
}

// Helper to validate phone number format
function isValidPhoneNumber(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return phoneRegex.test(trimmed) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

exports.createCall = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { callerPhone, receiverPhone, callDate, durationSeconds } = req.body;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!callerPhone || !isValidPhoneNumber(callerPhone)) {
      return res.status(400).json({ error: 'callerPhone is required and must be a valid phone number' });
    }

    if (!receiverPhone || !isValidPhoneNumber(receiverPhone)) {
      return res.status(400).json({ error: 'receiverPhone is required and must be a valid phone number' });
    }

    if (!callDate) {
      return res.status(400).json({ error: 'callDate is required' });
    }

    const parsedDate = new Date(callDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'callDate must be a valid date' });
    }

    let parsedDuration = null;
    if (durationSeconds !== undefined && durationSeconds !== null) {
      const dur = Number(durationSeconds);
      if (!Number.isInteger(dur) || dur < 0) {
        return res.status(400).json({ error: 'durationSeconds must be an integer greater than or equal to 0' });
      }
      parsedDuration = dur;
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const result = await db.query(
      `INSERT INTO "callRecord" (id, "caseId", "callerPhone", "receiverPhone", "callDate", "durationSeconds", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        caseId,
        callerPhone.trim(),
        receiverPhone.trim(),
        parsedDate,
        parsedDuration,
        now
      ]
    );

    res.status(201).json({ message: 'Call record created successfully', callRecord: result.rows[0] });
  } catch (error) {
    console.error('Create Call Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCalls = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const result = await db.query(
      `SELECT * FROM "callRecord" WHERE "caseId" = $1 ORDER BY "callDate" DESC, "createdAt" DESC`,
      [caseId]
    );

    res.status(200).json({ callRecords: result.rows });
  } catch (error) {
    console.error('Get Calls Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCallById = async (req, res) => {
  try {
    const { caseId, callId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const result = await db.query(
      `SELECT * FROM "callRecord" WHERE id = $1 AND "caseId" = $2`,
      [callId, caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call record not found' });
    }

    res.status(200).json({ callRecord: result.rows[0] });
  } catch (error) {
    console.error('Get Call by ID Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateCall = async (req, res) => {
  try {
    const { caseId, callId } = req.params;
    const { callerPhone, receiverPhone, callDate, durationSeconds } = req.body;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const existing = await db.query(
      `SELECT id FROM "callRecord" WHERE id = $1 AND "caseId" = $2`,
      [callId, caseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Call record not found' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (callerPhone !== undefined) {
      if (!isValidPhoneNumber(callerPhone)) {
        return res.status(400).json({ error: 'callerPhone must be a valid phone number' });
      }
      updates.push(`"callerPhone" = $${idx++}`);
      values.push(callerPhone.trim());
    }

    if (receiverPhone !== undefined) {
      if (!isValidPhoneNumber(receiverPhone)) {
        return res.status(400).json({ error: 'receiverPhone must be a valid phone number' });
      }
      updates.push(`"receiverPhone" = $${idx++}`);
      values.push(receiverPhone.trim());
    }

    if (callDate !== undefined) {
      const parsedDate = new Date(callDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'callDate must be a valid date' });
      }
      updates.push(`"callDate" = $${idx++}`);
      values.push(parsedDate);
    }

    if (durationSeconds !== undefined) {
      if (durationSeconds === null) {
        updates.push(`"durationSeconds" = $${idx++}`);
        values.push(null);
      } else {
        const dur = Number(durationSeconds);
        if (!Number.isInteger(dur) || dur < 0) {
          return res.status(400).json({ error: 'durationSeconds must be an integer greater than or equal to 0' });
        }
        updates.push(`"durationSeconds" = $${idx++}`);
        values.push(dur);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(callId);
    const query = `UPDATE "callRecord" SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);

    res.status(200).json({ message: 'Call record updated successfully', callRecord: result.rows[0] });
  } catch (error) {
    console.error('Update Call Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteCall = async (req, res) => {
  try {
    const { caseId, callId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const existing = await db.query(
      `SELECT id FROM "callRecord" WHERE id = $1 AND "caseId" = $2`,
      [callId, caseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Call record not found' });
    }

    await db.query(`DELETE FROM "callRecord" WHERE id = $1 AND "caseId" = $2`, [callId, caseId]);

    res.status(200).json({ message: 'Call record deleted successfully' });
  } catch (error) {
    console.error('Delete Call Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
