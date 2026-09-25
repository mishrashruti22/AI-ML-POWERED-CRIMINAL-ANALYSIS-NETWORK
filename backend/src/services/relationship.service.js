const db = require('../config/db');
const crypto = require('crypto');
const { normalizePhone, normalizeAccount } = require('../utils/entityNormalizer');
const { extractEntitiesForCase } = require('./entityExtraction.service');

// Helper to resolve case by id (UUID) or caseNumber (e.g. PNX-2026-001)
async function resolveCase(caseIdOrNumber) {
  const res = await db.query(
    'SELECT id, "caseNumber", title FROM "case" WHERE id = $1 OR "caseNumber" = $1',
    [caseIdOrNumber]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

async function buildRelationshipsForCase(caseIdOrNumber) {
  const caseObj = await resolveCase(caseIdOrNumber);
  if (!caseObj) return null;
  const caseId = caseObj.id;

  // 1. Ensure entities are extracted and normalized for this case
  await extractEntitiesForCase(caseId);

  let newRelationships = 0;
  let existingRelationshipsReused = 0;

  // 2. Build Call / CDR relationships: PHONE --CALLED--> PHONE
  const callsRes = await db.query(
    'SELECT id, "callerPhone", "receiverPhone", "durationSeconds" FROM "callRecord" WHERE "caseId" = $1',
    [caseId]
  );

  for (const call of callsRes.rows) {
    const callerNorm = normalizePhone(call.callerPhone);
    const receiverNorm = normalizePhone(call.receiverPhone);

    const callerEntityRes = await db.query(
      'SELECT id FROM "entity" WHERE "entityType" = \'PHONE\' AND "normalizedValue" = $1',
      [callerNorm]
    );
    const receiverEntityRes = await db.query(
      'SELECT id FROM "entity" WHERE "entityType" = \'PHONE\' AND "normalizedValue" = $1',
      [receiverNorm]
    );

    if (callerEntityRes.rows.length > 0 && receiverEntityRes.rows.length > 0) {
      const entityAId = callerEntityRes.rows[0].id;
      const entityBId = receiverEntityRes.rows[0].id;
      const relationshipType = 'CALLED';
      const sourceRecordId = call.id;
      const weight = 1.0;
      const confidenceScore = 1.0;

      // Check if relationship already exists
      const existingRes = await db.query(
        `SELECT id FROM "relationship" 
         WHERE "entityAId" = $1 AND "entityBId" = $2 AND "relationshipType" = $3 AND "sourceRecordId" = $4`,
        [entityAId, entityBId, relationshipType, sourceRecordId]
      );

      if (existingRes.rows.length > 0) {
        existingRelationshipsReused++;
      } else {
        const id = crypto.randomUUID();
        const now = new Date();
        await db.query(
          `INSERT INTO "relationship" (id, "entityAId", "entityBId", "relationshipType", weight, "sourceRecordId", "confidenceScore", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, entityAId, entityBId, relationshipType, weight, sourceRecordId, confidenceScore, now]
        );
        newRelationships++;
      }
    }
  }

  // 3. Build Financial relationships: ACCOUNT --TRANSFERRED_TO--> ACCOUNT
  const txsRes = await db.query(
    'SELECT id, sender, receiver, amount FROM "financialTransaction" WHERE "caseId" = $1',
    [caseId]
  );

  for (const tx of txsRes.rows) {
    const senderNorm = normalizeAccount(tx.sender);
    const receiverNorm = normalizeAccount(tx.receiver);

    const senderEntityRes = await db.query(
      'SELECT id FROM "entity" WHERE "entityType" = \'ACCOUNT\' AND "normalizedValue" = $1',
      [senderNorm]
    );
    const receiverEntityRes = await db.query(
      'SELECT id FROM "entity" WHERE "entityType" = \'ACCOUNT\' AND "normalizedValue" = $1',
      [receiverNorm]
    );

    if (senderEntityRes.rows.length > 0 && receiverEntityRes.rows.length > 0) {
      const entityAId = senderEntityRes.rows[0].id;
      const entityBId = receiverEntityRes.rows[0].id;
      const relationshipType = 'TRANSFERRED_TO';
      const sourceRecordId = tx.id;
      const weight = Number(tx.amount) > 0 ? Number(tx.amount) : 1.0;
      const confidenceScore = 1.0;

      const existingRes = await db.query(
        `SELECT id FROM "relationship" 
         WHERE "entityAId" = $1 AND "entityBId" = $2 AND "relationshipType" = $3 AND "sourceRecordId" = $4`,
        [entityAId, entityBId, relationshipType, sourceRecordId]
      );

      if (existingRes.rows.length > 0) {
        existingRelationshipsReused++;
      } else {
        const id = crypto.randomUUID();
        const now = new Date();
        await db.query(
          `INSERT INTO "relationship" (id, "entityAId", "entityBId", "relationshipType", weight, "sourceRecordId", "confidenceScore", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, entityAId, entityBId, relationshipType, weight, sourceRecordId, confidenceScore, now]
        );
        newRelationships++;
      }
    }
  }

  // Total relationships for this case
  const totalRes = await db.query(
    `SELECT count(*) FROM "relationship"
     WHERE "sourceRecordId" IN (
       SELECT id FROM "callRecord" WHERE "caseId" = $1
       UNION
       SELECT id FROM "financialTransaction" WHERE "caseId" = $1
       UNION
       SELECT id FROM "firRecord" WHERE "caseId" = $1
     )`,
    [caseId]
  );
  const totalRelationships = parseInt(totalRes.rows[0].count, 10);

  return {
    caseId,
    caseNumber: caseObj.caseNumber,
    newRelationships,
    existingRelationshipsReused,
    totalRelationships
  };
}

async function getRelationshipsForCase(caseIdOrNumber, typeFilter) {
  const caseObj = await resolveCase(caseIdOrNumber);
  if (!caseObj) return null;
  const caseId = caseObj.id;

  let query = `
    SELECT r.id, r."entityAId", r."entityBId", r."relationshipType", r.weight, r."sourceRecordId", r."confidenceScore", r."createdAt",
           ea."entityType" as "sourceType", ea."entityValue" as "sourceValue", ea."normalizedValue" as "sourceNormalized",
           eb."entityType" as "targetType", eb."entityValue" as "targetValue", eb."normalizedValue" as "targetNormalized"
    FROM "relationship" r
    JOIN "entity" ea ON r."entityAId" = ea.id
    JOIN "entity" eb ON r."entityBId" = eb.id
    WHERE r."sourceRecordId" IN (
      SELECT id FROM "callRecord" WHERE "caseId" = $1
      UNION
      SELECT id FROM "financialTransaction" WHERE "caseId" = $1
      UNION
      SELECT id FROM "firRecord" WHERE "caseId" = $1
    )
  `;
  const params = [caseId];

  if (typeFilter) {
    query += ` AND r."relationshipType" = $2`;
    params.push(typeFilter);
  }

  query += ` ORDER BY r."createdAt" ASC`;

  const result = await db.query(query, params);
  return {
    caseId,
    caseNumber: caseObj.caseNumber,
    count: result.rows.length,
    relationships: result.rows
  };
}

async function getRelationshipSummaryForCase(caseIdOrNumber) {
  const caseObj = await resolveCase(caseIdOrNumber);
  if (!caseObj) return null;
  const caseId = caseObj.id;

  const result = await db.query(
    `SELECT r."relationshipType", count(*) as count
     FROM "relationship" r
     WHERE r."sourceRecordId" IN (
       SELECT id FROM "callRecord" WHERE "caseId" = $1
       UNION
       SELECT id FROM "financialTransaction" WHERE "caseId" = $1
       UNION
       SELECT id FROM "firRecord" WHERE "caseId" = $1
     )
     GROUP BY r."relationshipType"`,
    [caseId]
  );

  const byType = {
    CALLED: 0,
    TRANSFERRED_TO: 0,
    ASSOCIATED_WITH: 0
  };

  let totalRelationships = 0;
  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    byType[row.relationshipType] = count;
    totalRelationships += count;
  }

  return {
    caseId,
    caseNumber: caseObj.caseNumber,
    totalRelationships,
    byType
  };
}

async function getNetworkForCase(caseIdOrNumber) {
  const caseObj = await resolveCase(caseIdOrNumber);
  if (!caseObj) return null;
  const caseId = caseObj.id;

  // Nodes: Entities associated with this case's records
  const nodesRes = await db.query(
    `SELECT DISTINCT e.id, e."entityType", e."entityValue", e."normalizedValue"
     FROM "entity" e
     JOIN "recordEntity" re ON re."entityId" = e.id
     WHERE re."recordId" IN (
       SELECT id FROM "firRecord" WHERE "caseId" = $1
       UNION
       SELECT id FROM "callRecord" WHERE "caseId" = $1
       UNION
       SELECT id FROM "financialTransaction" WHERE "caseId" = $1
     )
     ORDER BY e."entityType" ASC, e."entityValue" ASC`,
    [caseId]
  );

  // Edges: Relationships for this case
  const edgesRes = await db.query(
    `SELECT r.id, r."entityAId" as "source", r."entityBId" as "target", r."relationshipType", r.weight, r."confidenceScore", r."sourceRecordId"
     FROM "relationship" r
     WHERE r."sourceRecordId" IN (
       SELECT id FROM "callRecord" WHERE "caseId" = $1
       UNION
       SELECT id FROM "financialTransaction" WHERE "caseId" = $1
       UNION
       SELECT id FROM "firRecord" WHERE "caseId" = $1
     )
     ORDER BY r."createdAt" ASC`,
    [caseId]
  );

  return {
    caseId,
    caseNumber: caseObj.caseNumber,
    nodes: nodesRes.rows,
    edges: edgesRes.rows
  };
}

module.exports = {
  resolveCase,
  buildRelationshipsForCase,
  getRelationshipsForCase,
  getRelationshipSummaryForCase,
  getNetworkForCase
};
