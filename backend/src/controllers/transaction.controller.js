const db = require('../config/db');
const crypto = require('crypto');

// Helper to check if case exists
async function checkCaseExists(caseId) {
  const result = await db.query('SELECT id FROM "case" WHERE id = $1', [caseId]);
  return result.rows.length > 0;
}

exports.createTransaction = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { sender, receiver, amount, transactionDate, transactionReference } = req.body;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!sender || typeof sender !== 'string' || sender.trim().length === 0) {
      return res.status(400).json({ error: 'sender is required and must be a non-empty string' });
    }

    if (!receiver || typeof receiver !== 'string' || receiver.trim().length === 0) {
      return res.status(400).json({ error: 'receiver is required and must be a non-empty string' });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a valid number greater than 0' });
    }

    if (!transactionDate) {
      return res.status(400).json({ error: 'transactionDate is required' });
    }

    const parsedDate = new Date(transactionDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'transactionDate must be a valid date' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const result = await db.query(
      `INSERT INTO "financialTransaction" (id, "caseId", sender, receiver, amount, "transactionDate", "transactionReference", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        caseId,
        sender.trim(),
        receiver.trim(),
        numAmount,
        parsedDate,
        transactionReference ? transactionReference.trim() : null,
        now
      ]
    );

    res.status(201).json({ message: 'Financial transaction created successfully', transaction: result.rows[0] });
  } catch (error) {
    console.error('Create Transaction Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const result = await db.query(
      `SELECT * FROM "financialTransaction" WHERE "caseId" = $1 ORDER BY "transactionDate" DESC, "createdAt" DESC`,
      [caseId]
    );

    res.status(200).json({ transactions: result.rows });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { caseId, transactionId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const result = await db.query(
      `SELECT * FROM "financialTransaction" WHERE id = $1 AND "caseId" = $2`,
      [transactionId, caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financial transaction not found' });
    }

    res.status(200).json({ transaction: result.rows[0] });
  } catch (error) {
    console.error('Get Transaction by ID Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { caseId, transactionId } = req.params;
    const { sender, receiver, amount, transactionDate, transactionReference } = req.body;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const existing = await db.query(
      `SELECT id FROM "financialTransaction" WHERE id = $1 AND "caseId" = $2`,
      [transactionId, caseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Financial transaction not found' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (sender !== undefined) {
      if (typeof sender !== 'string' || sender.trim().length === 0) {
        return res.status(400).json({ error: 'sender must be a non-empty string' });
      }
      updates.push(`sender = $${idx++}`);
      values.push(sender.trim());
    }

    if (receiver !== undefined) {
      if (typeof receiver !== 'string' || receiver.trim().length === 0) {
        return res.status(400).json({ error: 'receiver must be a non-empty string' });
      }
      updates.push(`receiver = $${idx++}`);
      values.push(receiver.trim());
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'amount must be a valid number greater than 0' });
      }
      updates.push(`amount = $${idx++}`);
      values.push(numAmount);
    }

    if (transactionDate !== undefined) {
      const parsedDate = new Date(transactionDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'transactionDate must be a valid date' });
      }
      updates.push(`"transactionDate" = $${idx++}`);
      values.push(parsedDate);
    }

    if (transactionReference !== undefined) {
      updates.push(`"transactionReference" = $${idx++}`);
      values.push(transactionReference ? transactionReference.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(transactionId);
    const query = `UPDATE "financialTransaction" SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);

    res.status(200).json({ message: 'Financial transaction updated successfully', transaction: result.rows[0] });
  } catch (error) {
    console.error('Update Transaction Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { caseId, transactionId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const existing = await db.query(
      `SELECT id FROM "financialTransaction" WHERE id = $1 AND "caseId" = $2`,
      [transactionId, caseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Financial transaction not found' });
    }

    await db.query(`DELETE FROM "financialTransaction" WHERE id = $1 AND "caseId" = $2`, [transactionId, caseId]);

    res.status(200).json({ message: 'Financial transaction deleted successfully' });
  } catch (error) {
    console.error('Delete Transaction Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
