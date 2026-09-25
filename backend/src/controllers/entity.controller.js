const db = require('../config/db');
const { extractEntitiesForCase } = require('../services/entityExtraction.service');
const { isValidEntityType, VALID_ENTITY_TYPES } = require('../utils/entityNormalizer');

async function checkCaseExists(caseId) {
  const result = await db.query('SELECT id FROM "case" WHERE id = $1', [caseId]);
  return result.rows.length > 0;
}

exports.extractEntities = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const summary = await extractEntitiesForCase(caseId);

    res.status(200).json({
      message: 'Entity extraction completed',
      caseId,
      summary
    });
  } catch (error) {
    console.error('Extract Entities Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getEntities = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { type } = req.query;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (type !== undefined) {
      if (!isValidEntityType(type)) {
        return res.status(400).json({
          error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`
        });
      }
    }

    let query = `
      SELECT DISTINCT e.id, e."entityType", e."entityValue", e."normalizedValue", e."createdAt"
      FROM "entity" e
      JOIN "recordEntity" re ON re."entityId" = e.id
      WHERE re."recordId" IN (
        SELECT id FROM "firRecord" WHERE "caseId" = $1
        UNION
        SELECT id FROM "callRecord" WHERE "caseId" = $1
        UNION
        SELECT id FROM "financialTransaction" WHERE "caseId" = $1
      )
    `;
    const params = [caseId];

    if (type) {
      query += ` AND e."entityType" = $2`;
      params.push(type);
    }

    query += ` ORDER BY e."createdAt" ASC, e."entityType" ASC`;

    const result = await db.query(query, params);

    res.status(200).json({
      caseId,
      count: result.rows.length,
      entities: result.rows
    });
  } catch (error) {
    console.error('Get Entities Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getEntityById = async (req, res) => {
  try {
    const { caseId, entityId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Verify entity exists and is associated with this case
    const entityRes = await db.query(
      `
      SELECT DISTINCT e.id, e."entityType", e."entityValue", e."normalizedValue", e."createdAt"
      FROM "entity" e
      JOIN "recordEntity" re ON re."entityId" = e.id
      WHERE e.id = $1 AND re."recordId" IN (
        SELECT id FROM "firRecord" WHERE "caseId" = $2
        UNION
        SELECT id FROM "callRecord" WHERE "caseId" = $2
        UNION
        SELECT id FROM "financialTransaction" WHERE "caseId" = $2
      )
      `,
      [entityId, caseId]
    );

    if (entityRes.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found in this case' });
    }

    const entity = entityRes.rows[0];

    // Source FIR records
    const firsRes = await db.query(
      `
      SELECT 'FIR' as "recordType", f.id as "recordId", f."firNumber", COALESCE(f.description, 'FIR record') as description, f.location, f."incidentDate"
      FROM "firRecord" f
      JOIN "recordEntity" re ON re."recordId" = f.id
      WHERE re."entityId" = $1 AND f."caseId" = $2
      `,
      [entityId, caseId]
    );

    // Source Call records
    const callsRes = await db.query(
      `
      SELECT 'CALL' as "recordType", c.id as "recordId", 'CDR record' as description, c."callerPhone", c."receiverPhone", c."callDate", c."durationSeconds"
      FROM "callRecord" c
      JOIN "recordEntity" re ON re."recordId" = c.id
      WHERE re."entityId" = $1 AND c."caseId" = $2
      `,
      [entityId, caseId]
    );

    // Source Transaction records
    const txsRes = await db.query(
      `
      SELECT 'TRANSACTION' as "recordType", t.id as "recordId", 'Financial transaction record' as description, t.sender, t.receiver, t.amount, t."transactionDate", t."transactionReference"
      FROM "financialTransaction" t
      JOIN "recordEntity" re ON re."recordId" = t.id
      WHERE re."entityId" = $1 AND t."caseId" = $2
      `,
      [entityId, caseId]
    );

    const sourceRecords = [
      ...firsRes.rows,
      ...callsRes.rows,
      ...txsRes.rows
    ];

    res.status(200).json({
      entity,
      sourceRecords
    });
  } catch (error) {
    console.error('Get Entity By ID Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getEntitySummary = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!(await checkCaseExists(caseId))) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const countsRes = await db.query(
      `
      SELECT e."entityType", count(DISTINCT e.id) as count
      FROM "entity" e
      JOIN "recordEntity" re ON re."entityId" = e.id
      WHERE re."recordId" IN (
        SELECT id FROM "firRecord" WHERE "caseId" = $1
        UNION
        SELECT id FROM "callRecord" WHERE "caseId" = $1
        UNION
        SELECT id FROM "financialTransaction" WHERE "caseId" = $1
      )
      GROUP BY e."entityType"
      `,
      [caseId]
    );

    const byType = {
      PHONE: 0,
      ACCOUNT: 0,
      LOCATION: 0,
      PERSON: 0,
      ORGANIZATION: 0,
      VEHICLE: 0
    };

    let totalEntities = 0;

    for (const row of countsRes.rows) {
      const cnt = parseInt(row.count, 10);
      byType[row.entityType] = cnt;
      totalEntities += cnt;
    }

    res.status(200).json({
      caseId,
      totalEntities,
      byType
    });
  } catch (error) {
    console.error('Get Entity Summary Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
