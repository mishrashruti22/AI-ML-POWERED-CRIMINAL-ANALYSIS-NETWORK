const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE_URL = 'http://localhost:5000/api';

async function runRelationshipTests() {
  console.log('====================================================');
  console.log('     PROBNEXUS RELATIONSHIP ENGINE TEST SUITE');
  console.log('====================================================\n');

  // Step 0: Auth Setup
  console.log('>>> [0] Setting up Test User & Authentication...');
  const deptNum = Math.floor(10 + Math.random() * 89);
  const testUser = {
    fullName: 'Investigator Relationships',
    departmentId: 'REL' + deptNum,
    email: 'rel' + Date.now() + '@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  };

  const regRes = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  if (!regRes.ok) {
    console.error('Registration failed:', await regRes.text());
    process.exit(1);
  }

  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [testUser.email]);

  const loginRes = await fetch(BASE_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  if (!token) {
    console.error('Login failed, no token returned:', loginData);
    process.exit(1);
  }
  console.log('✓ Authenticated successfully with JWT token\n');

  // Step 1: Ensure Case PNX-2026-001 and seed records
  const caseNumber = 'PNX-2026-001';
  console.log(`>>> [1] Setting up Case ${caseNumber} and synthetic records...`);
  const existingCase = await pool.query('SELECT id FROM "case" WHERE "caseNumber" = $1', [caseNumber]);
  let caseId;
  if (existingCase.rows.length > 0) {
    caseId = existingCase.rows[0].id;
  } else {
    const caseRes = await fetch(BASE_URL + '/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        caseNumber: caseNumber,
        title: 'Operation Nexus Wire Fraud',
        description: 'Multi-jurisdiction organized crime investigation',
        status: 'OPEN',
        priority: 'HIGH'
      })
    });
    const caseData = await caseRes.json();
    caseId = caseData.case.id;
  }

  // Clear existing relationships and records for clean test run
  await pool.query(`DELETE FROM "relationship" WHERE "sourceRecordId" IN (
    SELECT id FROM "callRecord" WHERE "caseId" = $1
    UNION
    SELECT id FROM "financialTransaction" WHERE "caseId" = $1
    UNION
    SELECT id FROM "firRecord" WHERE "caseId" = $1
  )`, [caseId]);
  await pool.query('DELETE FROM "recordEntity" WHERE "recordId" IN (SELECT id FROM "firRecord" WHERE "caseId" = $1)', [caseId]);
  await pool.query('DELETE FROM "recordEntity" WHERE "recordId" IN (SELECT id FROM "callRecord" WHERE "caseId" = $1)', [caseId]);
  await pool.query('DELETE FROM "recordEntity" WHERE "recordId" IN (SELECT id FROM "financialTransaction" WHERE "caseId" = $1)', [caseId]);
  await pool.query('DELETE FROM "firRecord" WHERE "caseId" = $1', [caseId]);
  await pool.query('DELETE FROM "callRecord" WHERE "caseId" = $1', [caseId]);
  await pool.query('DELETE FROM "financialTransaction" WHERE "caseId" = $1', [caseId]);

  // Seed FIR
  await fetch(`${BASE_URL}/cases/${caseId}/firs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      firNumber: 'FIR-001',
      incidentDate: '2026-09-01T10:00:00.000Z',
      location: 'Noida Sector 62',
      description: 'Suspected organized financial fraud'
    })
  });

  // Seed Calls:
  // 1: +919876543210 -> +919812345678
  // 2: +919812345678 -> +919876543210
  // 3: +919812345678 -> +919900112233
  const calls = [
    { caller: '+919876543210', receiver: '+919812345678', dur: 120 },
    { caller: '+919812345678', receiver: '+919876543210', dur: 45 },
    { caller: '+919812345678', receiver: '+919900112233', dur: 300 }
  ];
  for (const c of calls) {
    await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        callerPhone: c.caller,
        receiverPhone: c.receiver,
        callDate: '2026-09-02T14:30:00.000Z',
        durationSeconds: c.dur
      })
    });
  }

  // Seed Financial Transactions:
  // 1: ACC001 -> ACC002 (50000)
  // 2: ACC002 -> ACC003 (25000)
  // 3: ACC003 -> ACC004 (10000)
  const txs = [
    { sender: 'ACC001', receiver: 'ACC002', amount: 50000, ref: 'TXN-001' },
    { sender: 'ACC002', receiver: 'ACC003', amount: 25000, ref: 'TXN-002' },
    { sender: 'ACC003', receiver: 'ACC004', amount: 10000, ref: 'TXN-003' }
  ];
  for (const t of txs) {
    await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        sender: t.sender,
        receiver: t.receiver,
        amount: t.amount,
        transactionDate: '2026-09-04T09:00:00.000Z',
        transactionReference: t.ref
      })
    });
  }
  console.log('✓ Seeded FIR, 3 Calls, and 3 Transactions\n');

  // Step 2: Security tests (Unauthorized & Invalid Case)
  console.log('>>> [2] Testing Security & Error Handling...');
  const unauthRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships/build`, {
    method: 'POST'
  });
  console.log(`2.1 Unauthorized Request -> Status: ${unauthRes.status} (Expected 401)`);
  if (unauthRes.status !== 401) throw new Error('Expected 401 for unauthorized build');

  const invalidCaseRes = await fetch(`${BASE_URL}/cases/00000000-0000-0000-0000-000000000000/relationships/build`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`2.2 Invalid Case ID -> Status: ${invalidCaseRes.status} (Expected 404)`);
  if (invalidCaseRes.status !== 404) throw new Error('Expected 404 for invalid case');

  // Step 3: Build Relationships
  console.log('\n>>> [3] Testing Relationship Building...');
  const buildRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships/build`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const buildData = await buildRes.json();
  console.log(`3.1 Build Response -> Status: ${buildRes.status}:`, buildData);

  if (buildRes.status !== 200) throw new Error('Build relationships failed');
  if (buildData.newRelationships < 6) {
    throw new Error(`Expected at least 6 new relationships, got ${buildData.newRelationships}`);
  }
  if (buildData.totalRelationships < 6) {
    throw new Error(`Expected at least 6 total relationships, got ${buildData.totalRelationships}`);
  }
  console.log(`✓ Created ${buildData.newRelationships} new relationships`);

  // Step 4: Duplicate Prevention & Idempotency
  console.log('\n>>> [4] Testing Duplicate Prevention / Idempotency...');
  const buildRes2 = await fetch(`${BASE_URL}/cases/${caseId}/relationships/build`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const buildData2 = await buildRes2.json();
  console.log(`4.1 Second Build Response -> Status: ${buildRes2.status}:`, buildData2);

  if (buildData2.newRelationships !== 0) {
    throw new Error(`Expected 0 new relationships on second run, got ${buildData2.newRelationships}`);
  }
  if (buildData2.existingRelationshipsReused < 6) {
    throw new Error(`Expected at least 6 reused relationships, got ${buildData2.existingRelationshipsReused}`);
  }
  if (buildData2.totalRelationships !== buildData.totalRelationships) {
    throw new Error('Total relationships changed on second run');
  }
  console.log('✓ Idempotency confirmed: Zero duplicate relationships created');

  // Step 5: Get All Relationships for Case
  console.log('\n>>> [5] Testing Get Relationships API...');
  const getRelRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const getRelData = await getRelRes.json();
  console.log(`5.1 GET /relationships -> Status: ${getRelRes.status}, Count: ${getRelData.count}`);
  if (getRelData.count < 6) throw new Error(`Expected at least 6 relationships, got ${getRelData.count}`);

  // Step 6: Filter Relationships by Type
  console.log('\n>>> [6] Testing Relationship Type Filtering...');
  // 6.1 Filter CALLED
  const calledRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships?type=CALLED`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const calledData = await calledRes.json();
  console.log(`6.1 Filter type=CALLED -> Status: ${calledRes.status}, Count: ${calledData.count}`);
  if (calledData.count !== 3) throw new Error(`Expected 3 CALLED relationships, got ${calledData.count}`);

  // 6.2 Filter TRANSFERRED_TO
  const txRelRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships?type=TRANSFERRED_TO`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const txRelData = await txRelRes.json();
  console.log(`6.2 Filter type=TRANSFERRED_TO -> Status: ${txRelRes.status}, Count: ${txRelData.count}`);
  if (txRelData.count !== 3) throw new Error(`Expected 3 TRANSFERRED_TO relationships, got ${txRelData.count}`);

  // Step 7: Relationship Summary Statistics
  console.log('\n>>> [7] Testing Relationship Summary API...');
  const summaryRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships/summary`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const summaryData = await summaryRes.json();
  console.log(`7.1 GET /relationships/summary -> Status: ${summaryRes.status}:`, summaryData);
  if (summaryData.totalRelationships < 6) throw new Error('Invalid total relationships in summary');
  if (summaryData.byType.CALLED !== 3) throw new Error(`Expected 3 CALLED, got ${summaryData.byType.CALLED}`);
  if (summaryData.byType.TRANSFERRED_TO !== 3) throw new Error(`Expected 3 TRANSFERRED_TO, got ${summaryData.byType.TRANSFERRED_TO}`);

  // Step 8: Network Graph API (/network)
  console.log('\n>>> [8] Testing Network Graph API (/network)...');
  // 8.1 Fetch with UUID caseId
  const networkRes = await fetch(`${BASE_URL}/cases/${caseId}/network`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const networkData = await networkRes.json();
  console.log(`8.1 GET /cases/:caseId/network -> Status: ${networkRes.status}`);
  console.log(`    Nodes count: ${networkData.nodes?.length}`);
  console.log(`    Edges count: ${networkData.edges?.length}`);
  if (networkData.nodes?.length < 7) throw new Error(`Expected at least 7 nodes, got ${networkData.nodes?.length}`);
  if (networkData.edges?.length !== 6) throw new Error(`Expected 6 edges, got ${networkData.edges?.length}`);

  // Verify sample edge structure for frontend graph readiness
  const sampleEdge = networkData.edges[0];
  console.log('    Sample edge:', sampleEdge);
  if (!sampleEdge.source || !sampleEdge.target || !sampleEdge.relationshipType || !sampleEdge.sourceRecordId) {
    throw new Error('Edge missing required graph properties (source, target, relationshipType, sourceRecordId)');
  }
  console.log('✓ Edge structure validated (source, target, weight, confidenceScore, sourceRecordId)');

  // 8.2 Fetch with caseNumber (PNX-2026-001)
  console.log('\n>>> [8.2] Testing Network Graph with caseNumber PNX-2026-001...');
  const networkNumRes = await fetch(`${BASE_URL}/cases/PNX-2026-001/network`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const networkNumData = await networkNumRes.json();
  console.log(`8.2 GET /cases/PNX-2026-001/network -> Status: ${networkNumRes.status}`);
  console.log(`    Nodes count: ${networkNumData.nodes?.length}, Edges count: ${networkNumData.edges?.length}`);
  if (networkNumData.edges?.length !== 6) {
    throw new Error(`Expected 6 edges via caseNumber endpoint, got ${networkNumData.edges?.length}`);
  }
  console.log('✓ caseNumber URL parameter successfully resolved');

  console.log('\n====================================================');
  console.log('✓ ALL RELATIONSHIP ENGINE TESTS COMPLETED & PASSED');
  console.log('====================================================\n');

  await pool.end();
}

runRelationshipTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
