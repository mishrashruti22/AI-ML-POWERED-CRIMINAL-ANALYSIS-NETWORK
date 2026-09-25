const { spawn } = require('child_process');
const path = require('path');
const db = require('../config/db');
const { resolveCase, getNetworkForCase } = require('./relationship.service');

// In-memory cache for fast sub-second read performance
const analyticsCache = new Map();

/**
 * Executes the Python analytics engine child process with case payload via stdin.
 */
function executePythonEngine(payload) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(__dirname, '../../analytics/analytics_engine.py');
    const pythonProc = spawn('python', [pythonScript], {
      cwd: path.resolve(__dirname, '../../analytics'),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python Analytics Engine failed with exit code ${code}: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python analytics output: ${err.message}\nOutput: ${stdoutData}`));
      }
    });

    pythonProc.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    // Send payload through stdin
    pythonProc.stdin.write(JSON.stringify(payload));
    pythonProc.stdin.end();
  });
}

/**
 * Persists calculated analytics results into PostgreSQL database tables if available.
 */
async function syncAnalyticsToDatabase(caseId, analyticsResult) {
  try {
    // 1. Sync Entity Scores (degree, betweenness, influence, rank)
    if (analyticsResult.keyPlayers && Array.isArray(analyticsResult.keyPlayers)) {
      for (const kp of analyticsResult.keyPlayers) {
        if (kp.entityId) {
          // Check if entityScore exists
          const existing = await db.query('SELECT id FROM "entityScore" WHERE "entityId" = $1', [kp.entityId]);
          if (existing.rows.length > 0) {
            await db.query(
              `UPDATE "entityScore" SET "degreeScore" = $1, "betweennessScore" = $2, "influenceScore" = $3, "rank" = $4
               WHERE "entityId" = $5`,
              [kp.degreeCentrality, kp.betweennessCentrality, kp.influenceScore, kp.rank, kp.entityId]
            );
          } else {
            const scoreId = require('crypto').randomUUID();
            await db.query(
              `INSERT INTO "entityScore" (id, "entityId", "degreeScore", "betweennessScore", "influenceScore", "rank", "createdAt")
               VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
              [scoreId, kp.entityId, kp.degreeCentrality, kp.betweennessCentrality, kp.influenceScore, kp.rank]
            );
          }
        }
      }
    }

    // 2. Sync Communities
    if (analyticsResult.communities && Array.isArray(analyticsResult.communities)) {
      for (const comm of analyticsResult.communities) {
        let commDbId;
        const existingComm = await db.query(
          'SELECT id FROM "community" WHERE "caseId" = $1 AND "communityNumber" = $2',
          [caseId, comm.communityNumber]
        );
        if (existingComm.rows.length > 0) {
          commDbId = existingComm.rows[0].id;
          await db.query(
            'UPDATE "community" SET "communityName" = $1 WHERE id = $2',
            [comm.communityName, commDbId]
          );
        } else {
          commDbId = require('crypto').randomUUID();
          await db.query(
            'INSERT INTO "community" (id, "caseId", "communityNumber", "communityName", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
            [commDbId, caseId, comm.communityNumber, comm.communityName]
          );
        }

        // Sync community members
        if (comm.members && Array.isArray(comm.members)) {
          for (const m of comm.members) {
            const existingMember = await db.query(
              'SELECT id FROM "communityMember" WHERE "communityId" = $1 AND "entityId" = $2',
              [commDbId, m.entityId]
            );
            if (existingMember.rows.length === 0) {
              const memId = require('crypto').randomUUID();
              await db.query(
                'INSERT INTO "communityMember" (id, "communityId", "entityId") VALUES ($1, $2, $3)',
                [memId, commDbId, m.entityId]
              );
            }
          }
        }
      }
    }

    // 3. Sync Suspicious Patterns
    if (analyticsResult.suspiciousPatterns && Array.isArray(analyticsResult.suspiciousPatterns)) {
      for (const pat of analyticsResult.suspiciousPatterns) {
        const patId = require('crypto').randomUUID();
        await db.query(
          `INSERT INTO "suspiciousPattern" (id, "caseId", "entityId", "patternType", severity, description, "detectedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [patId, caseId, pat.entityId || null, pat.patternType, pat.severity, pat.description]
        ).catch(() => {}); // continue if duplicate
      }
    }

    // 4. Sync Predictions
    if (analyticsResult.predictedLinks && Array.isArray(analyticsResult.predictedLinks)) {
      for (const pred of analyticsResult.predictedLinks) {
        const predId = require('crypto').randomUUID();
        await db.query(
          `INSERT INTO "prediction" (id, "caseId", "entityAId", "entityBId", "predictionScore", "predictionMethod", status, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [predId, caseId, pred.entityAId, pred.entityBId, pred.predictionScore, pred.predictionMethod, pred.status || 'PREDICTED']
        ).catch(() => {});
      }
    }
  } catch (dbErr) {
    console.warn('[Analytics Service] Optional DB sync warning (non-fatal):', dbErr.message);
  }
}

/**
 * Collects complete case data, executes Python Analytics pipeline, and caches results.
 */
async function runAnalyticsForCase(caseIdOrNumber) {
  const caseObj = await resolveCase(caseIdOrNumber);
  if (!caseObj) return null;
  const caseId = caseObj.id;

  // 1. Fetch current network nodes & edges
  const network = await getNetworkForCase(caseId);

  // 2. Fetch raw records for baselines and evidence linking
  const [firsRes, callsRes, txsRes] = await Promise.all([
    db.query('SELECT id, "firNumber", "incidentDate", location, description FROM "firRecord" WHERE "caseId" = $1', [caseId]),
    db.query('SELECT id, "callerPhone", "receiverPhone", "callDate", "durationSeconds" FROM "callRecord" WHERE "caseId" = $1', [caseId]),
    db.query('SELECT id, sender, receiver, amount, "transactionDate", "transactionReference" FROM "financialTransaction" WHERE "caseId" = $1', [caseId])
  ]);

  const payload = {
    caseId,
    caseNumber: caseObj.caseNumber,
    network: {
      nodes: network.nodes,
      edges: network.edges
    },
    rawRecords: {
      firs: firsRes.rows,
      calls: callsRes.rows,
      transactions: txsRes.rows
    }
  };

  // 3. Execute Python Graph Analytics Engine
  const result = await executePythonEngine(payload);

  // 4. Cache result
  analyticsCache.set(caseId, result);
  analyticsCache.set(caseObj.caseNumber, result);

  // 5. Persist to DB asynchronously
  syncAnalyticsToDatabase(caseId, result);

  return result;
}

/**
 * Retrieves cached analytics or runs them on-demand if cache is empty.
 */
async function getAnalyticsForCase(caseIdOrNumber) {
  const caseObj = await resolveCase(caseIdOrNumber);
  if (!caseObj) return null;

  if (analyticsCache.has(caseObj.id)) {
    return analyticsCache.get(caseObj.id);
  }

  return await runAnalyticsForCase(caseObj.id);
}

/**
 * Returns ranked key players for a case.
 */
async function getKeyPlayersForCase(caseIdOrNumber) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    keyPlayers: analytics.keyPlayers || []
  };
}

/**
 * Returns detected communities and bridge entities.
 */
async function getCommunitiesForCase(caseIdOrNumber) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    communities: analytics.communities || [],
    bridgeEntities: analytics.bridgeEntities || []
  };
}

/**
 * Returns suspicious activity patterns and statistical baselines.
 */
async function getSuspiciousPatternsForCase(caseIdOrNumber) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    baselines: analytics.baselines || {},
    suspiciousPatterns: analytics.suspiciousPatterns || []
  };
}

/**
 * Returns risk-ranked entities and risk summary.
 */
async function getRiskEntitiesForCase(caseIdOrNumber) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    riskSummary: analytics.riskSummary || {},
    riskEntities: analytics.riskEntities || []
  };
}

/**
 * Runs link predictions on demand.
 */
async function runLinkPredictionsForCase(caseIdOrNumber) {
  const analytics = await runAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    predictedLinks: analytics.predictedLinks || []
  };
}

/**
 * Returns predicted hidden links.
 */
async function getLinkPredictionsForCase(caseIdOrNumber) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    predictedLinks: analytics.predictedLinks || []
  };
}

/**
 * Returns explainability and evidence results.
 */
async function getExplanationsForCase(caseIdOrNumber) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;
  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    explanations: analytics.explanations || []
  };
}

/**
 * Returns complete 360-degree intelligence for a specific entity in a case.
 */
async function getEntityIntelligence(caseIdOrNumber, entityId) {
  const analytics = await getAnalyticsForCase(caseIdOrNumber);
  if (!analytics) return null;

  const intelligenceMap = analytics.entityIntelligenceMap || {};
  let entityIntel = intelligenceMap[entityId];

  // Try matching by normalizedValue or entityValue if entityId did not match UUID directly
  if (!entityIntel) {
    for (const val of Object.values(intelligenceMap)) {
      if (val.entityValue === entityId || val.normalizedValue === entityId) {
        entityIntel = val;
        break;
      }
    }
  }

  if (!entityIntel) {
    return { error: 'Entity not found in investigation network' };
  }

  // Fetch full evidence details for the entity's source record IDs
  const sourceRecordIds = entityIntel.sourceRecordIds || [];
  let evidenceRecords = [];

  if (sourceRecordIds.length > 0) {
    const [firRecs, callRecs, txRecs] = await Promise.all([
      db.query('SELECT id, "firNumber", "incidentDate", location, description FROM "firRecord" WHERE id = ANY($1)', [sourceRecordIds]),
      db.query('SELECT id, "callerPhone", "receiverPhone", "callDate", "durationSeconds" FROM "callRecord" WHERE id = ANY($1)', [sourceRecordIds]),
      db.query('SELECT id, sender, receiver, amount, "transactionDate", "transactionReference" FROM "financialTransaction" WHERE id = ANY($1)', [sourceRecordIds])
    ]);

    evidenceRecords = [
      ...firRecs.rows.map(r => ({ type: 'FIR', ...r })),
      ...callRecs.rows.map(r => ({ type: 'CALL', ...r })),
      ...txRecs.rows.map(r => ({ type: 'TRANSACTION', ...r }))
    ];
  }

  return {
    caseId: analytics.caseId,
    caseNumber: analytics.caseNumber,
    entity: entityIntel,
    evidenceRecords
  };
}

module.exports = {
  runAnalyticsForCase,
  getAnalyticsForCase,
  getKeyPlayersForCase,
  getCommunitiesForCase,
  getSuspiciousPatternsForCase,
  getRiskEntitiesForCase,
  runLinkPredictionsForCase,
  getLinkPredictionsForCase,
  getExplanationsForCase,
  getEntityIntelligence
};
