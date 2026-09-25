const db = require('../config/db');
const crypto = require('crypto');
const { normalizeEntity } = require('../utils/entityNormalizer');

async function extractEntitiesForCase(caseId) {
  // 1. Fetch raw records for this case
  const firsRes = await db.query(
    'SELECT id, location, description FROM "firRecord" WHERE "caseId" = $1',
    [caseId]
  );
  const callsRes = await db.query(
    'SELECT id, "callerPhone", "receiverPhone" FROM "callRecord" WHERE "caseId" = $1',
    [caseId]
  );
  const txsRes = await db.query(
    'SELECT id, sender, receiver FROM "financialTransaction" WHERE "caseId" = $1',
    [caseId]
  );

  // 2. Collect candidate extractions: { type, value, recordId }
  const rawCandidates = [];

  // A) FIR Records -> LOCATION
  for (const fir of firsRes.rows) {
    if (fir.location && fir.location.trim().length > 0) {
      rawCandidates.push({
        type: 'LOCATION',
        value: fir.location.trim(),
        recordId: fir.id
      });
    }
  }

  // B) Calls -> PHONE (caller & receiver)
  for (const call of callsRes.rows) {
    if (call.callerPhone && call.callerPhone.trim().length > 0) {
      rawCandidates.push({
        type: 'PHONE',
        value: call.callerPhone.trim(),
        recordId: call.id
      });
    }
    if (call.receiverPhone && call.receiverPhone.trim().length > 0) {
      rawCandidates.push({
        type: 'PHONE',
        value: call.receiverPhone.trim(),
        recordId: call.id
      });
    }
  }

  // C) Financial Transactions -> ACCOUNT (sender & receiver)
  for (const tx of txsRes.rows) {
    if (tx.sender && tx.sender.trim().length > 0) {
      rawCandidates.push({
        type: 'ACCOUNT',
        value: tx.sender.trim(),
        recordId: tx.id
      });
    }
    if (tx.receiver && tx.receiver.trim().length > 0) {
      rawCandidates.push({
        type: 'ACCOUNT',
        value: tx.receiver.trim(),
        recordId: tx.id
      });
    }
  }

  let newEntitiesCount = 0;
  let reusedEntitiesCount = 0;

  // Track entities unique to this run: normalizedKey -> entityId
  const processedEntities = new Map();

  for (const item of rawCandidates) {
    const normalized = normalizeEntity(item.type, item.value);
    const entityKey = `${item.type}:${normalized}`;

    let entityId;

    if (processedEntities.has(entityKey)) {
      entityId = processedEntities.get(entityKey);
    } else {
      // Check database if entity already exists
      const existingRes = await db.query(
        'SELECT id FROM "entity" WHERE "entityType" = $1 AND "normalizedValue" = $2',
        [item.type, normalized]
      );

      if (existingRes.rows.length > 0) {
        entityId = existingRes.rows[0].id;
        reusedEntitiesCount++;
      } else {
        entityId = crypto.randomUUID();
        const now = new Date();
        await db.query(
          'INSERT INTO "entity" (id, "entityType", "entityValue", "normalizedValue", "createdAt") VALUES ($1, $2, $3, $4, $5)',
          [entityId, item.type, item.value, normalized, now]
        );
        newEntitiesCount++;
      }
      processedEntities.set(entityKey, entityId);
    }

    // Maintain record -> entity traceability in "recordEntity"
    const existingMapping = await db.query(
      'SELECT id FROM "recordEntity" WHERE "recordId" = $1 AND "entityId" = $2',
      [item.recordId, entityId]
    );

    if (existingMapping.rows.length === 0) {
      const mappingId = crypto.randomUUID();
      await db.query(
        'INSERT INTO "recordEntity" (id, "recordId", "entityId") VALUES ($1, $2, $3)',
        [mappingId, item.recordId, entityId]
      );
    }
  }

  // Count unique entities for this case by type
  let firEntities = 0;
  let phoneEntities = 0;
  let accountEntities = 0;

  for (const key of processedEntities.keys()) {
    if (key.startsWith('LOCATION:')) firEntities++;
    else if (key.startsWith('PHONE:')) phoneEntities++;
    else if (key.startsWith('ACCOUNT:')) accountEntities++;
  }

  const totalEntities = processedEntities.size;

  return {
    firEntities,
    phoneEntities,
    accountEntities,
    totalEntities,
    newEntities: newEntitiesCount,
    existingEntitiesReused: reusedEntitiesCount
  };
}

module.exports = {
  extractEntitiesForCase
};
