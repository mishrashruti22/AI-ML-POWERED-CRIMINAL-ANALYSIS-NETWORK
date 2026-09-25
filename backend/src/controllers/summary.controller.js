const db = require('../config/db');

// Helper to check if case exists
async function checkCaseExists(caseId) {
  const result = await db.query('SELECT id FROM "case" WHERE id = $1', [caseId]);
  return result.rows.length > 0;
}

exports.getDataSummary = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const firCountRes = await db.query(
      'SELECT count(*) FROM "firRecord" WHERE "caseId" = $1',
      [caseId]
    );
    const callCountRes = await db.query(
      'SELECT count(*) FROM "callRecord" WHERE "caseId" = $1',
      [caseId]
    );
    const txCountRes = await db.query(
      'SELECT count(*) FROM "financialTransaction" WHERE "caseId" = $1',
      [caseId]
    );

    const firRecords = parseInt(firCountRes.rows[0].count, 10);
    const callRecords = parseInt(callCountRes.rows[0].count, 10);
    const financialTransactions = parseInt(txCountRes.rows[0].count, 10);
    const totalRecords = firRecords + callRecords + financialTransactions;

    res.status(200).json({
      firRecords,
      callRecords,
      financialTransactions,
      totalRecords
    });
  } catch (error) {
    console.error('Get Data Summary Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
