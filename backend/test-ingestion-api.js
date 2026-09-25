const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('   PROBNEXUS INVESTIGATION DATA INGESTION TEST SUITE');
  console.log('====================================================\n');

  // Step 0: Auth Setup
  console.log('>>> [0] Setting up Test User & Authentication...');
  const deptNum = Math.floor(10 + Math.random() * 89);
  const testUser = {
    fullName: 'Investigator Ingestion',
    departmentId: 'ING' + deptNum,
    email: 'ingestion' + Date.now() + '@example.com',
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

  // Step 1: Create Case PNX-2026-001
  const caseNumber = 'PNX-2026-001';
  console.log(`>>> [1] Setting up Case ${caseNumber}...`);
  // Clean up if case already exists from previous runs to ensure clean state
  const existingCase = await pool.query('SELECT id FROM "case" WHERE "caseNumber" = $1', [caseNumber]);
  let caseId;
  if (existingCase.rows.length > 0) {
    caseId = existingCase.rows[0].id;
    // Clean up any test records for this case
    await pool.query('DELETE FROM "firRecord" WHERE "caseId" = $1', [caseId]);
    await pool.query('DELETE FROM "callRecord" WHERE "caseId" = $1', [caseId]);
    await pool.query('DELETE FROM "financialTransaction" WHERE "caseId" = $1', [caseId]);
    console.log(`✓ Reusing and cleaned existing case ${caseNumber} (${caseId})`);
  } else {
    const caseRes = await fetch(BASE_URL + '/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        caseNumber: caseNumber,
        title: 'Operation Nexus Wire Fraud',
        description: 'Multi-jurisdiction financial fraud and shell accounts ring',
        status: 'OPEN',
        priority: 'HIGH'
      })
    });
    const caseData = await caseRes.json();
    caseId = caseData.case.id;
    console.log(`✓ Case created successfully with ID: ${caseId}\n`);
  }

  // Step 2: FIR CRUD Operations
  console.log('>>> [2] Testing FIR Record APIs...');
  
  // 2.1 Create FIR
  const firCreateRes = await fetch(`${BASE_URL}/cases/${caseId}/firs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      firNumber: 'FIR-001',
      incidentDate: '2026-09-01T10:00:00.000Z',
      location: 'Noida',
      description: 'Suspected organized financial fraud',
      sourceFile: 'FIR_Noida_Sec62_2026.pdf'
    })
  });
  const firCreateData = await firCreateRes.json();
  console.log(`2.1 POST /firs -> Status: ${firCreateRes.status}`, firCreateData.firRecord?.firNumber);
  const firId = firCreateData.firRecord.id;

  // 2.2 Get FIRs list
  const firListRes = await fetch(`${BASE_URL}/cases/${caseId}/firs`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const firListData = await firListRes.json();
  console.log(`2.2 GET /firs -> Status: ${firListRes.status}, Count: ${firListData.firRecords.length}`);

  // 2.3 Get Single FIR
  const firSingleRes = await fetch(`${BASE_URL}/cases/${caseId}/firs/${firId}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const firSingleData = await firSingleRes.json();
  console.log(`2.3 GET /firs/:firId -> Status: ${firSingleRes.status}, Location: ${firSingleData.firRecord?.location}`);

  // 2.4 Update FIR
  const firUpdateRes = await fetch(`${BASE_URL}/cases/${caseId}/firs/${firId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      location: 'Noida Sector 62',
      description: 'Suspected organized financial fraud with multiple mule accounts'
    })
  });
  const firUpdateData = await firUpdateRes.json();
  console.log(`2.4 PUT /firs/:firId -> Status: ${firUpdateRes.status}, Updated Location: ${firUpdateData.firRecord?.location}`);

  // 2.5 Delete temporary FIR
  const tempFirRes = await fetch(`${BASE_URL}/cases/${caseId}/firs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      firNumber: 'FIR-TEMP-TO-DELETE',
      incidentDate: '2026-09-02T08:00:00.000Z',
      location: 'Delhi'
    })
  });
  const tempFirData = await tempFirRes.json();
  const tempFirId = tempFirData.firRecord.id;

  const firDelRes = await fetch(`${BASE_URL}/cases/${caseId}/firs/${tempFirId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`2.5 DELETE /firs/:firId -> Status: ${firDelRes.status} (Temporary record removed)\n`);

  // Step 3: Call Record / CDR APIs
  console.log('>>> [3] Testing Call Record / CDR APIs...');
  
  // 3.1 Create Call 1
  const call1Res = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      callerPhone: '+919876543210',
      receiverPhone: '+919812345678',
      callDate: '2026-09-02T14:30:00.000Z',
      durationSeconds: 180
    })
  });
  const call1Data = await call1Res.json();
  console.log(`3.1 POST /calls (1) -> Status: ${call1Res.status}, Caller: ${call1Data.callRecord?.callerPhone} -> Receiver: ${call1Data.callRecord?.receiverPhone}`);
  const callId = call1Data.callRecord.id;

  // 3.2 Create Call 2
  await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      callerPhone: '+919812345678',
      receiverPhone: '+919876543210',
      callDate: '2026-09-02T15:00:00.000Z',
      durationSeconds: 45
    })
  });

  // 3.3 Create Call 3
  await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      callerPhone: '+919812345678',
      receiverPhone: '+919900112233',
      callDate: '2026-09-03T11:15:00.000Z',
      durationSeconds: 320
    })
  });

  // 3.4 Get Calls list
  const callListRes = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const callListData = await callListRes.json();
  console.log(`3.4 GET /calls -> Status: ${callListRes.status}, Count: ${callListData.callRecords.length}`);

  // 3.5 Get Single Call
  const callSingleRes = await fetch(`${BASE_URL}/cases/${caseId}/calls/${callId}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const callSingleData = await callSingleRes.json();
  console.log(`3.5 GET /calls/:callId -> Status: ${callSingleRes.status}, Duration: ${callSingleData.callRecord?.durationSeconds}s`);

  // 3.6 Update Call
  const callUpdateRes = await fetch(`${BASE_URL}/cases/${caseId}/calls/${callId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      durationSeconds: 210
    })
  });
  const callUpdateData = await callUpdateRes.json();
  console.log(`3.6 PUT /calls/:callId -> Status: ${callUpdateRes.status}, Updated Duration: ${callUpdateData.callRecord?.durationSeconds}s`);

  // 3.7 Delete temporary Call
  const tempCallRes = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      callerPhone: '+919800000000',
      receiverPhone: '+919800000001',
      callDate: '2026-09-03T12:00:00.000Z',
      durationSeconds: 10
    })
  });
  const tempCallData = await tempCallRes.json();
  const tempCallId = tempCallData.callRecord.id;

  const callDelRes = await fetch(`${BASE_URL}/cases/${caseId}/calls/${tempCallId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`3.7 DELETE /calls/:callId -> Status: ${callDelRes.status} (Temporary record removed)\n`);

  // Step 4: Financial Transaction APIs
  console.log('>>> [4] Testing Financial Transaction APIs...');
  
  // 4.1 Create Transaction 1
  const tx1Res = await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      sender: 'ACC001',
      receiver: 'ACC002',
      amount: 50000,
      transactionDate: '2026-09-04T09:00:00.000Z',
      transactionReference: 'TXN-001'
    })
  });
  const tx1Data = await tx1Res.json();
  console.log(`4.1 POST /transactions (1) -> Status: ${tx1Res.status}, Amount: ${tx1Data.transaction?.amount}, Ref: ${tx1Data.transaction?.transactionReference}`);
  const txId = tx1Data.transaction.id;

  // 4.2 Create Transaction 2
  await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      sender: 'ACC002',
      receiver: 'ACC003',
      amount: 25000,
      transactionDate: '2026-09-04T12:00:00.000Z',
      transactionReference: 'TXN-002'
    })
  });

  // 4.3 Create Transaction 3
  await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      sender: 'ACC003',
      receiver: 'ACC004',
      amount: 10000,
      transactionDate: '2026-09-05T16:45:00.000Z',
      transactionReference: 'TXN-003'
    })
  });

  // 4.4 Get Transactions list
  const txListRes = await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const txListData = await txListRes.json();
  console.log(`4.4 GET /transactions -> Status: ${txListRes.status}, Count: ${txListData.transactions.length}`);

  // 4.5 Get Single Transaction
  const txSingleRes = await fetch(`${BASE_URL}/cases/${caseId}/transactions/${txId}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const txSingleData = await txSingleRes.json();
  console.log(`4.5 GET /transactions/:transactionId -> Status: ${txSingleRes.status}, Sender: ${txSingleData.transaction?.sender} -> Receiver: ${txSingleData.transaction?.receiver}`);

  // 4.6 Update Transaction
  const txUpdateRes = await fetch(`${BASE_URL}/cases/${caseId}/transactions/${txId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      transactionReference: 'TXN-001-VERIFIED'
    })
  });
  const txUpdateData = await txUpdateRes.json();
  console.log(`4.6 PUT /transactions/:transactionId -> Status: ${txUpdateRes.status}, Ref: ${txUpdateData.transaction?.transactionReference}`);

  // 4.7 Delete temporary Transaction
  const tempTxRes = await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      sender: 'ACC-TEMP',
      receiver: 'ACC-TEMP2',
      amount: 100,
      transactionDate: '2026-09-05T18:00:00.000Z'
    })
  });
  const tempTxData = await tempTxRes.json();
  const tempTxId = tempTxData.transaction.id;

  const txDelRes = await fetch(`${BASE_URL}/cases/${caseId}/transactions/${tempTxId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`4.7 DELETE /transactions/:transactionId -> Status: ${txDelRes.status} (Temporary record removed)\n`);

  // Step 5: Data Summary
  console.log('>>> [5] Testing Data Ingestion Summary API...');
  const summaryRes = await fetch(`${BASE_URL}/cases/${caseId}/data-summary`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const summaryData = await summaryRes.json();
  console.log(`5.1 GET /cases/:caseId/data-summary -> Status: ${summaryRes.status}:`, summaryData);

  // Step 6: Security & Validation Edge Cases
  console.log('\n>>> [6] Testing Security & Validation Edge Cases...');

  // 6.1 Invalid Case ID
  const invalidCaseRes = await fetch(`${BASE_URL}/cases/00000000-0000-0000-0000-000000000000/firs`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log(`6.1 Invalid Case ID -> Status: ${invalidCaseRes.status} (Expected 404)`);

  // 6.2 Unauthorized Request (No Token)
  const unauthRes = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'GET'
  });
  console.log(`6.2 Unauthorized Request -> Status: ${unauthRes.status} (Expected 401)`);

  // 6.3 Invalid Amount (Negative or Zero)
  const invalidAmtRes = await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      sender: 'ACC1',
      receiver: 'ACC2',
      amount: -500,
      transactionDate: '2026-09-04T09:00:00.000Z'
    })
  });
  console.log(`6.3 Invalid Amount (-500) -> Status: ${invalidAmtRes.status} (Expected 400)`);

  // 6.4 Invalid Duration (Negative)
  const invalidDurRes = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      callerPhone: '+919876543210',
      receiverPhone: '+919812345678',
      callDate: '2026-09-02T14:30:00.000Z',
      durationSeconds: -60
    })
  });
  console.log(`6.4 Invalid Duration (-60) -> Status: ${invalidDurRes.status} (Expected 400)`);

  // 6.5 Invalid Phone Format
  const invalidPhoneRes = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      callerPhone: 'abc-not-a-phone',
      receiverPhone: '+919812345678',
      callDate: '2026-09-02T14:30:00.000Z',
      durationSeconds: 60
    })
  });
  console.log(`6.5 Invalid Phone ('abc-not-a-phone') -> Status: ${invalidPhoneRes.status} (Expected 400)`);

  console.log('\n====================================================');
  console.log('✓ ALL INVESTIGATION DATA INGESTION TESTS COMPLETED');
  console.log('====================================================\n');

  await pool.end();
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
