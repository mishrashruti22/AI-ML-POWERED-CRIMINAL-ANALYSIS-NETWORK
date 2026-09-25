const db = require('../config/db');
const crypto = require('crypto');

const VALID_STATUSES = ['OPEN', 'UNDER_INVESTIGATION', 'ON_HOLD', 'CLOSED'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

exports.createCase = async (req, res) => {
  try {
    const { caseNumber, title, description, status, priority } = req.body;
    const createdById = req.user.id;

    if (!caseNumber || typeof caseNumber !== 'string' || caseNumber.trim().length === 0) {
      return res.status(400).json({ error: 'caseNumber is required and must be a valid string' });
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required and must be a valid string' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + VALID_STATUSES.join(', ') });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be one of: ' + VALID_PRIORITIES.join(', ') });
    }

    const checkDuplicate = await db.query('SELECT id FROM "case" WHERE "caseNumber" = $1', [caseNumber]);
    if (checkDuplicate.rows.length > 0) {
      return res.status(400).json({ error: 'caseNumber already exists' });
    }

    const id = crypto.randomUUID();
    const finalStatus = status || 'OPEN';
    const finalPriority = priority || 'MEDIUM';
    const finalDescription = description || null;
    const now = new Date();

    const result = await db.query(
      'INSERT INTO "case" (id, "caseNumber", title, description, status, priority, "createdById", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [id, caseNumber, title, finalDescription, finalStatus, finalPriority, createdById, now, now]
    );

    res.status(201).json({ message: 'Case created successfully', case: result.rows[0] });
  } catch (error) {
    console.error('Create Case Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCases = async (req, res) => {
  try {
    const { status, priority, search } = req.query;

    let query = 'SELECT id, "caseNumber", title, description, status, priority, "createdAt", "updatedAt" FROM "case" WHERE 1=1';
    const values = [];
    let idx = 1;

    if (status) {
      query += ' AND status = $' + idx++;
      values.push(status);
    }
    if (priority) {
      query += ' AND priority = $' + idx++;
      values.push(priority);
    }
    if (search) {
      query += ' AND (title ILIKE $' + idx + ' OR description ILIKE $' + idx + ' OR "caseNumber" ILIKE $' + idx + ')';
      values.push('%' + search + '%');
      idx++;
    }

    query += ' ORDER BY "createdAt" DESC';

    const result = await db.query(query, values);
    res.status(200).json({ cases: result.rows });
  } catch (error) {
    console.error('Get Cases Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const caseResult = await db.query('SELECT * FROM "case" WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const c = caseResult.rows[0];

    const firCount = await db.query('SELECT count(*) FROM "firRecord" WHERE "caseId" = $1', [id]);
    const callCount = await db.query('SELECT count(*) FROM "callRecord" WHERE "caseId" = $1', [id]);
    const txCount = await db.query('SELECT count(*) FROM "financialTransaction" WHERE "caseId" = $1', [id]);
    const patternCount = await db.query('SELECT count(*) FROM "suspiciousPattern" WHERE "caseId" = $1', [id]);
    const predictionCount = await db.query('SELECT count(*) FROM "prediction" WHERE "caseId" = $1', [id]);

    res.status(200).json({
      case: c,
      relatedCounts: {
        firRecords: parseInt(firCount.rows[0].count),
        callRecords: parseInt(callCount.rows[0].count),
        financialTransactions: parseInt(txCount.rows[0].count),
        suspiciousPatterns: parseInt(patternCount.rows[0].count),
        predictions: parseInt(predictionCount.rows[0].count),
        entities: 0,
        relationships: 0
      }
    });
  } catch (error) {
    console.error('Get Case By ID Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;

    const caseResult = await db.query('SELECT id FROM "case" WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + VALID_STATUSES.join(', ') });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be one of: ' + VALID_PRIORITIES.join(', ') });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      updates.push('title = $' + idx++);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = $' + idx++);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push('status = $' + idx++);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = $' + idx++);
      values.push(priority);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    updates.push('"updatedAt" = $' + idx++);
    values.push(new Date());

    values.push(id);
    const query = 'UPDATE "case" SET ' + updates.join(', ') + ' WHERE id = $' + idx + ' RETURNING *';

    const updateResult = await db.query(query, values);

    res.status(200).json({ message: 'Case updated successfully', case: updateResult.rows[0] });
  } catch (error) {
    console.error('Update Case Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteCase = async (req, res) => {
  try {
    const { id } = req.params;

    const caseResult = await db.query('SELECT id FROM "case" WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const firCount = await db.query('SELECT count(*) FROM "firRecord" WHERE "caseId" = $1', [id]);
    const callCount = await db.query('SELECT count(*) FROM "callRecord" WHERE "caseId" = $1', [id]);
    const txCount = await db.query('SELECT count(*) FROM "financialTransaction" WHERE "caseId" = $1', [id]);
    const patternCount = await db.query('SELECT count(*) FROM "suspiciousPattern" WHERE "caseId" = $1', [id]);
    const predictionCount = await db.query('SELECT count(*) FROM "prediction" WHERE "caseId" = $1', [id]);
    const communityCount = await db.query('SELECT count(*) FROM "community" WHERE "caseId" = $1', [id]);

    const totalRelated = parseInt(firCount.rows[0].count) + 
                         parseInt(callCount.rows[0].count) + 
                         parseInt(txCount.rows[0].count) + 
                         parseInt(patternCount.rows[0].count) + 
                         parseInt(predictionCount.rows[0].count) +
                         parseInt(communityCount.rows[0].count);

    if (totalRelated > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete case because it has related investigation records.',
        relatedRecordsCount: totalRelated
      });
    }

    await db.query('DELETE FROM "case" WHERE id = $1', [id]);
    res.status(200).json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Delete Case Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCaseStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const caseResult = await db.query('SELECT id FROM "case" WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const firCount = await db.query('SELECT count(*) FROM "firRecord" WHERE "caseId" = $1', [id]);
    const callCount = await db.query('SELECT count(*) FROM "callRecord" WHERE "caseId" = $1', [id]);
    const txCount = await db.query('SELECT count(*) FROM "financialTransaction" WHERE "caseId" = $1', [id]);
    const patternCount = await db.query('SELECT count(*) FROM "suspiciousPattern" WHERE "caseId" = $1', [id]);
    const predictionCount = await db.query('SELECT count(*) FROM "prediction" WHERE "caseId" = $1', [id]);

    res.status(200).json({
      firRecords: parseInt(firCount.rows[0].count),
      callRecords: parseInt(callCount.rows[0].count),
      financialTransactions: parseInt(txCount.rows[0].count),
      entities: 0,
      relationships: 0,
      suspiciousPatterns: parseInt(patternCount.rows[0].count),
      predictions: parseInt(predictionCount.rows[0].count)
    });
  } catch (error) {
    console.error('Get Case Stats Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
