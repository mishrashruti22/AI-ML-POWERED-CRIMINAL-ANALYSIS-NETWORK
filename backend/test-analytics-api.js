/**
 * Automated Test Suite for ProbNexus AI/ML Network Analytics REST APIs
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('PROBNEXUS AI/ML ANALYTICS API VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate to get JWT token
  console.log('1. Setting up verified test investigator...');
  const testEmail = 'investigator_analytics@probnexus.gov.in';
  const testDept = 'ANL88';
  const testPassword = 'password123';

  // Check or register user
  const userCheck = await pool.query('SELECT id FROM "user" WHERE email = $1', [testEmail]);
  if (userCheck.rows.length === 0) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(testPassword, 10);
    const uid = require('crypto').randomUUID();
    await pool.query(
      `INSERT INTO "user" (id, "fullName", "departmentId", email, "passwordHash", role, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, 'Analytics Investigator', $2, $3, $4, 'INVESTIGATOR', true, NOW(), NOW())`,
      [uid, testDept, testEmail, hash]
    );
  } else {
    await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [testEmail]);
  }

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(loginRes.status === 200 && Boolean(token), 'JWT token received successfully');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const caseId = 'PNX-2026-001';

  // 2. Run Analytics Pipeline
  console.log('\n2. Testing POST /api/cases/:caseId/analytics/run ...');
  const runRes = await fetch(`${API_BASE}/cases/${caseId}/analytics/run`, {
    method: 'POST',
    headers
  });
  const runData = await runRes.json();
  assert(runRes.status === 200, `Analytics run returned status 200 (message: ${runData.message})`);
  assert(runData.network?.nodes === 8, `Analyzed 8 nodes (received ${runData.network?.nodes})`);
  assert(runData.network?.relationships === 6, `Analyzed 6 relationships (received ${runData.network?.relationships})`);

  // 3. Get Overall Analytics
  console.log('\n3. Testing GET /api/cases/:caseId/analytics ...');
  const getRes = await fetch(`${API_BASE}/cases/${caseId}/analytics`, { headers });
  const getData = await getRes.json();
  assert(getRes.status === 200, 'GET /analytics returned 200');
  assert(Array.isArray(getData.keyPlayers) && getData.keyPlayers.length > 0, 'Key players array is present');
  assert(Array.isArray(getData.communities) && getData.communities.length > 0, 'Communities array is present');
  assert(Array.isArray(getData.riskEntities) && getData.riskEntities.length === 8, '8 risk-ranked entities returned');

  // 4. Get Key Players
  console.log('\n4. Testing GET /api/cases/:caseId/analytics/key-players ...');
  const kpRes = await fetch(`${API_BASE}/cases/${caseId}/analytics/key-players`, { headers });
  const kpData = await kpRes.json();
  assert(kpRes.status === 200, 'GET /analytics/key-players returned 200');
  assert(kpData.keyPlayers.length > 0, `Returned ${kpData.keyPlayers.length} key players`);
  console.log('     Top Player:', kpData.keyPlayers[0]?.entityValue, 'Influence:', kpData.keyPlayers[0]?.influenceScore);

  // 5. Get Communities & Bridges
  console.log('\n5. Testing GET /api/cases/:caseId/analytics/communities ...');
  const commRes = await fetch(`${API_BASE}/cases/${caseId}/analytics/communities`, { headers });
  const commData = await commRes.json();
  assert(commRes.status === 200, 'GET /analytics/communities returned 200');
  assert(commData.communities.length >= 1, `Detected ${commData.communities.length} Louvain communities`);
  console.log('     Communities count:', commData.communities.length, 'Bridge entities:', commData.bridgeEntities?.length);

  // 6. Get Suspicious Patterns
  console.log('\n6. Testing GET /api/cases/:caseId/analytics/suspicious-patterns ...');
  const patRes = await fetch(`${API_BASE}/cases/${caseId}/analytics/suspicious-patterns`, { headers });
  const patData = await patRes.json();
  assert(patRes.status === 200, 'GET /analytics/suspicious-patterns returned 200');
  assert(Array.isArray(patData.suspiciousPatterns), 'Suspicious patterns array returned');
  assert(patData.baselines?.meanDegree !== undefined, 'Statistical baselines calculated');
  console.log('     Patterns detected:', patData.suspiciousPatterns.length, 'Mean degree baseline:', patData.baselines.meanDegree);

  // 7. Get Risk Entities
  console.log('\n7. Testing GET /api/cases/:caseId/analytics/risk ...');
  const riskRes = await fetch(`${API_BASE}/cases/${caseId}/analytics/risk`, { headers });
  const riskData = await riskRes.json();
  assert(riskRes.status === 200, 'GET /analytics/risk returned 200');
  assert(riskData.riskEntities.length === 8, '8 risk entity records returned');
  console.log('     Highest Risk Entity:', riskData.riskEntities[0]?.entityValue, 'Score:', riskData.riskEntities[0]?.riskScore, 'Level:', riskData.riskEntities[0]?.riskLevel);

  // 8. Link Predictions
  console.log('\n8. Testing GET /api/cases/:caseId/link-predictions ...');
  const predRes = await fetch(`${API_BASE}/cases/${caseId}/link-predictions`, { headers });
  const predData = await predRes.json();
  assert(predRes.status === 200, 'GET /link-predictions returned 200');
  assert(Array.isArray(predData.predictedLinks), 'Predicted links array returned');
  if (predData.predictedLinks.length > 0) {
    console.log('     Predicted connection:', `${predData.predictedLinks[0].entityAValue} <--> ${predData.predictedLinks[0].entityBValue}`, 'Score:', predData.predictedLinks[0].predictionScore);
  }

  // 9. Explanations
  console.log('\n9. Testing GET /api/cases/:caseId/explanations ...');
  const expRes = await fetch(`${API_BASE}/cases/${caseId}/explanations`, { headers });
  const expData = await expRes.json();
  assert(expRes.status === 200, 'GET /explanations returned 200');
  assert(expData.explanations.length > 0, `Generated ${expData.explanations.length} explainability records`);
  console.log('     Sample Explanation:', expData.explanations[0]?.explanationText);

  // 10. Entity Intelligence
  const testNodeId = getData.keyPlayers[0]?.entityId;
  console.log(`\n10. Testing GET /api/cases/:caseId/entities/${testNodeId}/intelligence ...`);
  const intelRes = await fetch(`${API_BASE}/cases/${caseId}/entities/${testNodeId}/intelligence`, { headers });
  const intelData = await intelRes.json();
  assert(intelRes.status === 200, 'GET entity intelligence returned 200');
  assert(intelData.entity?.entityId === testNodeId, 'Correct entity record returned');
  assert(intelData.entity?.riskScore !== undefined, 'Entity risk score present');
  assert(Array.isArray(intelData.evidenceRecords), 'Evidence records array present');
  console.log('     Entity Evidence Records count:', intelData.evidenceRecords.length);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  await pool.end();
  if (failed > 0) process.exit(1);
}

runTests().catch(async (err) => {
  console.error('Test Suite Exception:', err);
  await pool.end();
  process.exit(1);
});
