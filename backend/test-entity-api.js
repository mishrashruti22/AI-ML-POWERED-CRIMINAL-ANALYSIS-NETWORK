const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE_URL = 'http://localhost:5000/api';

async function runEntityTests() {
  console.log('====================================================');
  console.log(' PROBNEXUS ENTITY EXTRACTION & NORMALIZATION TESTS');
  console.log('====================================================\n');

  // Step 0: Auth Setup
  console.log('>>> [0] Setting up Test User & Authentication...');
  const deptNum = Math.floor(10 + Math.random() * 89);
  const testUser = {
    fullName: 'Investigator Entities',
    departmentId: 'ENT' + deptNum,
    email: 'entity' + Date.now() + '@example.com',
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

  // Step 1: Prepare Case PNX-2026-001 and seed synthetic records
  const caseNumber = 'PNX-2026-001';
  console.log(`>>> [1] Ensuring Case ${caseNumber} with exact synthetic records...`);
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
        title: 'Operation Nexus Fraud',
        description: 'Organized financial fraud investigation',
        status: 'OPEN',
        priority: 'HIGH'
      })
    });
    const caseData = await caseRes.json();
    caseId = caseData.case.id;
  }

  // Clear existing records and extracted entity mappings for clean test execution
  await pool.query('DELETE FROM "recordEntity" WHERE "recordId" IN (SELECT id FROM "firRecord" WHERE "caseId" = $1)', [caseId]);
  await pool.query('DELETE FROM "recordEntity" WHERE "recordId" IN (SELECT id FROM "callRecord" WHERE "caseId" = $1)', [caseId]);
  await pool.query('DELETE FROM "recordEntity" WHERE "recordId" IN (SELECT id FROM "financialTransaction" WHERE "caseId" = $1)', [caseId]);
  await pool.query('DELETE FROM "firRecord" WHERE "caseId" = $1', [caseId]);
  await pool.query('DELETE FROM "callRecord" WHERE "caseId" = $1', [caseId]);
  await pool.query('DELETE FROM "financialTransaction" WHERE "caseId" = $1', [caseId]);

  // Seed FIR: Location = Noida Sector 62
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

  // Seed CDR Calls:
  // Call 1: +919876543210 -> +919812345678
  // Call 2: +919812345678 -> +919876543210
  // Call 3: +919812345678 -> +919900112233
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

  // Seed Transactions:
  // ACC001 -> ACC002 (50000)
  // ACC002 -> ACC003 (25000)
  // ACC003 -> ACC004 (10000)
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
  console.log('✓ Seeded FIR, CDR calls, and Transactions successfully\n');

  // Step 2: Security tests (Unauthorized & Invalid Case)
  console.log('>>> [2] Testing Security & Error Responses...');
  
  // 2.1 Unauthorized Extraction
  const unauthRes = await fetch(`${BASE_URL}/cases/${caseId}/entities/extract`, {
    method: 'POST'
  });
  console.log(`2.1 Unauthorized Extraction -> Status: ${unauthRes.status} (Expected 401)`);
  if (unauthRes.status !== 401) throw new Error('Expected 401 for unauthorized request');

  // 2.2 Invalid Case ID
  const invalidCaseRes = await fetch(`${BASE_URL}/cases/00000000-0000-0000-0000-000000000000/entities/extract`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`2.2 Invalid Case ID -> Status: ${invalidCaseRes.status} (Expected 404)`);
  if (invalidCaseRes.status !== 404) throw new Error('Expected 404 for invalid case ID');

  // Step 3: Entity Extraction
  console.log('\n>>> [3] Testing Entity Extraction...');
  const extractRes = await fetch(`${BASE_URL}/cases/${caseId}/entities/extract`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const extractData = await extractRes.json();
  console.log(`3.1 Extraction Response -> Status: ${extractRes.status}:`, extractData.summary);

  if (extractRes.status !== 200) throw new Error('Extraction failed');
  if (extractData.summary.totalEntities !== 8) {
    throw new Error(`Expected totalEntities 8, got ${extractData.summary.totalEntities}`);
  }
  if (extractData.summary.phoneEntities !== 3) {
    throw new Error(`Expected phoneEntities 3, got ${extractData.summary.phoneEntities}`);
  }
  if (extractData.summary.accountEntities !== 4) {
    throw new Error(`Expected accountEntities 4, got ${extractData.summary.accountEntities}`);
  }
  if (extractData.summary.firEntities !== 1) {
    throw new Error(`Expected firEntities 1, got ${extractData.summary.firEntities}`);
  }

  // Step 4: Test Deduplication & Idempotency
  console.log('\n>>> [4] Testing Idempotent Extraction (Deduplication)...');
  const extractRes2 = await fetch(`${BASE_URL}/cases/${caseId}/entities/extract`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const extractData2 = await extractRes2.json();
  console.log(`4.1 Second Extraction -> Status: ${extractRes2.status}:`, extractData2.summary);
  if (extractData2.summary.newEntities !== 0) {
    throw new Error(`Expected newEntities 0 on second run, got ${extractData2.summary.newEntities}`);
  }
  if (extractData2.summary.totalEntities !== 8) {
    throw new Error(`Expected totalEntities 8 on second run, got ${extractData2.summary.totalEntities}`);
  }
  console.log('✓ Deduplication confirmed: zero duplicate entities created on repeated extraction');

  // Step 5: Entity List API
  console.log('\n>>> [5] Testing Entity List API...');
  const listRes = await fetch(`${BASE_URL}/cases/${caseId}/entities`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const listData = await listRes.json();
  console.log(`5.1 GET /entities -> Status: ${listRes.status}, Count: ${listData.count}`);
  if (listData.count !== 8) throw new Error(`Expected 8 entities in list, got ${listData.count}`);

  // Step 6: Entity Filtering by Type
  console.log('\n>>> [6] Testing Entity Filtering by Type...');
  
  // 6.1 PHONE filter
  const phoneRes = await fetch(`${BASE_URL}/cases/${caseId}/entities?type=PHONE`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const phoneData = await phoneRes.json();
  console.log(`6.1 GET /entities?type=PHONE -> Status: ${phoneRes.status}, Count: ${phoneData.count}`);
  if (phoneData.count !== 3) throw new Error(`Expected 3 PHONE entities, got ${phoneData.count}`);
  const samplePhoneId = phoneData.entities[0].id;

  // 6.2 ACCOUNT filter
  const accRes = await fetch(`${BASE_URL}/cases/${caseId}/entities?type=ACCOUNT`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const accData = await accRes.json();
  console.log(`6.2 GET /entities?type=ACCOUNT -> Status: ${accRes.status}, Count: ${accData.count}`);
  if (accData.count !== 4) throw new Error(`Expected 4 ACCOUNT entities, got ${accData.count}`);

  // 6.3 LOCATION filter
  const locRes = await fetch(`${BASE_URL}/cases/${caseId}/entities?type=LOCATION`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const locData = await locRes.json();
  console.log(`6.3 GET /entities?type=LOCATION -> Status: ${locRes.status}, Count: ${locData.count}`);
  if (locData.count !== 1) throw new Error(`Expected 1 LOCATION entity, got ${locData.count}`);

  // 6.4 Invalid Type Filter -> 400
  const invalidTypeRes = await fetch(`${BASE_URL}/cases/${caseId}/entities?type=UNKNOWN_TYPE`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`6.4 GET /entities?type=UNKNOWN_TYPE -> Status: ${invalidTypeRes.status} (Expected 400)`);
  if (invalidTypeRes.status !== 400) throw new Error('Expected 400 for invalid entity type');

  // Step 7: Entity Detail & Traceability API
  console.log('\n>>> [7] Testing Entity Detail & Traceability API...');
  const detailRes = await fetch(`${BASE_URL}/cases/${caseId}/entities/${samplePhoneId}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const detailData = await detailRes.json();
  console.log(`7.1 GET /entities/:entityId -> Status: ${detailRes.status}`);
  console.log('    Entity:', detailData.entity);
  console.log('    Source Records Count:', detailData.sourceRecords?.length);
  if (detailRes.status !== 200) throw new Error('Failed to get entity detail');
  if (!detailData.sourceRecords || detailData.sourceRecords.length === 0) {
    throw new Error('Expected source records for entity traceability, found none');
  }
  console.log('✓ Entity traceability verified (linked to source record)');

  // Step 8: Entity Summary API
  console.log('\n>>> [8] Testing Entity Summary Statistics API...');
  const summaryRes = await fetch(`${BASE_URL}/cases/${caseId}/entities/summary`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const summaryData = await summaryRes.json();
  console.log(`8.1 GET /entities/summary -> Status: ${summaryRes.status}:`, summaryData);
  if (summaryData.totalEntities !== 8) throw new Error(`Expected totalEntities 8, got ${summaryData.totalEntities}`);
  if (summaryData.byType.PHONE !== 3) throw new Error(`Expected PHONE 3, got ${summaryData.byType.PHONE}`);
  if (summaryData.byType.ACCOUNT !== 4) throw new Error(`Expected ACCOUNT 4, got ${summaryData.byType.ACCOUNT}`);
  if (summaryData.byType.LOCATION !== 1) throw new Error(`Expected LOCATION 1, got ${summaryData.byType.LOCATION}`);
  if (summaryData.byType.PERSON !== 0) throw new Error(`Expected PERSON 0, got ${summaryData.byType.PERSON}`);

  console.log('\n====================================================');
  console.log('✓ ALL ENTITY EXTRACTION & NORMALIZATION TESTS PASSED');
  console.log('====================================================\n');

  await pool.end();
}

runEntityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
