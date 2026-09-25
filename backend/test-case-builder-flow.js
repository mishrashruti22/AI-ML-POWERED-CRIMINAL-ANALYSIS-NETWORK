/**
 * ============================================================
 * PROBNEXUS — LIVE INVESTIGATION CASE BUILDER INTEGRATION TEST
 * ============================================================
 * Tests the complete end-to-end case creation, data ingestion,
 * entity extraction, relationship building, Python NetworkX
 * analytics execution, and link prediction pipeline.
 * ============================================================
 */

const BASE_URL = 'http://localhost:5000/api';

let PASS = 0;
let FAIL = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    PASS++;
  } else {
    console.log(`  ❌ FAIL: ${name}`);
    FAIL++;
  }
}

async function runTest() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  PROBNEXUS — CASE BUILDER & AI PIPELINE TEST SUITE         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Authenticate as Admin
  console.log('Step 1: Authenticating as Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shrutimi042006@gmail.com', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(loginRes.status === 200 && Boolean(token), 'Admin authentication successful');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Create New Live Case
  const testCaseNumber = 'PNX-2026-BUILDER-' + Math.floor(100 + Math.random() * 900);
  console.log(`\nStep 2: Creating Live Investigation Case: ${testCaseNumber}...`);
  const createCaseRes = await fetch(`${BASE_URL}/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      caseNumber: testCaseNumber,
      title: 'Syndicate Cyber Fraud & Funnel Laundering',
      description: 'Live test investigation created via Case Builder workflow',
      status: 'OPEN',
      priority: 'HIGH'
    })
  });
  const caseData = await createCaseRes.json();
  assert(createCaseRes.status === 201 && caseData.case?.id, 'Case created in PostgreSQL');
  const caseId = caseData.case.id;

  // 3. Ingest FIRs
  console.log('\nStep 3: Ingesting FIR Evidence...');
  const firRes = await fetch(`${BASE_URL}/cases/${caseId}/firs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      firNumber: 'FIR-LIVE-001',
      incidentDate: '2026-09-10T10:00:00.000Z',
      location: 'Noida Sector 62',
      description: 'Complaint regarding syndicate accounts and burner phones +919876543210'
    })
  });
  const firData = await firRes.json();
  assert(firRes.status === 201 && firData.firRecord?.id, 'FIR record saved to PostgreSQL');

  // 4. Ingest 5 CDR Calls
  console.log('\nStep 4: Ingesting CDR / Call Records...');
  const calls = [
    { callerPhone: '+919876543210', receiverPhone: '+919812345678', callDate: '2026-09-10T14:30:00.000Z', durationSeconds: 420 },
    { callerPhone: '+919812345678', receiverPhone: '+919899990001', callDate: '2026-09-10T15:45:00.000Z', durationSeconds: 180 },
    { callerPhone: '+919899990001', receiverPhone: '+919899990002', callDate: '2026-09-11T10:15:00.000Z', durationSeconds: 600 },
    { callerPhone: '+919899990002', receiverPhone: '+919833334444', callDate: '2026-09-11T11:30:00.000Z', durationSeconds: 320 },
    { callerPhone: '+919876543210', receiverPhone: '+919833334444', callDate: '2026-09-12T09:00:00.000Z', durationSeconds: 510 }
  ];
  for (const c of calls) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/calls`, {
      method: 'POST',
      headers,
      body: JSON.stringify(c)
    });
    assert(res.status === 201, `Call record saved: ${c.callerPhone} -> ${c.receiverPhone}`);
  }

  // 5. Ingest 5 Financial Transactions
  console.log('\nStep 5: Ingesting Financial Transactions...');
  const txs = [
    { sender: 'ACC_SRC1', receiver: 'ACC_MID1', amount: 150000, transactionDate: '2026-09-10T09:00:00.000Z', transactionReference: 'TXN-B1' },
    { sender: 'ACC_MID1', receiver: 'ACC_BRIDGE', amount: 120000, transactionDate: '2026-09-10T11:30:00.000Z', transactionReference: 'TXN-B2' },
    { sender: 'ACC_BRIDGE', receiver: 'ACC_DEST1', amount: 85000, transactionDate: '2026-09-11T14:00:00.000Z', transactionReference: 'TXN-B3' },
    { sender: 'ACC_BRIDGE', receiver: 'ACC_DEST2', amount: 35000, transactionDate: '2026-09-11T16:45:00.000Z', transactionReference: 'TXN-B4' },
    { sender: 'ACC_DEST1', receiver: 'ACC_FINAL', amount: 80000, transactionDate: '2026-09-12T10:10:00.000Z', transactionReference: 'TXN-B5' }
  ];
  for (const t of txs) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(t)
    });
    assert(res.status === 201, `Transaction saved: ${t.sender} -> ${t.receiver} (₹${t.amount})`);
  }

  // 6. Entity Extraction
  console.log('\nStep 6: Executing Entity Extraction...');
  const extractRes = await fetch(`${BASE_URL}/cases/${caseId}/entities/extract`, {
    method: 'POST',
    headers
  });
  const extractData = await extractRes.json();
  assert(extractRes.status === 200, 'Entity extraction completed');
  assert(extractData.summary?.totalEntities > 0, `Extracted ${extractData.summary?.totalEntities} unique entities`);

  // 7. Relationship Building
  console.log('\nStep 7: Building Multi-Modal Relationships...');
  const relRes = await fetch(`${BASE_URL}/cases/${caseId}/relationships/build`, {
    method: 'POST',
    headers
  });
  const relData = await relRes.json();
  assert(relRes.status === 200, 'Relationships built successfully');
  assert(relData.totalRelationships === 10, `Built exactly 10 directional relationships (5 calls + 5 txs)`);

  // 8. Python NetworkX Analytics Engine Execution
  console.log('\nStep 8: Executing Python NetworkX Analytics Engine...');
  const aiRes = await fetch(`${BASE_URL}/cases/${caseId}/analytics/run`, {
    method: 'POST',
    headers
  });
  const aiData = await aiRes.json();
  assert(aiRes.status === 200, 'Python NetworkX engine executed successfully');
  assert(Array.isArray(aiData.keyPlayers) && aiData.keyPlayers.length > 0, `Detected ${aiData.keyPlayers?.length} Key Players`);
  assert(Array.isArray(aiData.communities) && aiData.communities.length > 0, `Detected ${aiData.communities?.length} Louvain Communities`);
  assert(aiData.network?.nodes > 0, `Graph contains ${aiData.network?.nodes} nodes and ${aiData.network?.relationships} relationships`);

  // 9. Hidden Link Prediction (Jaccard + Adamic-Adar)
  console.log('\nStep 9: Running Hidden Link Predictions...');
  const linkRes = await fetch(`${BASE_URL}/cases/${caseId}/link-predictions/run`, {
    method: 'POST',
    headers
  });
  const linkData = await linkRes.json();
  assert(linkRes.status === 200, 'Link prediction calculation completed');

  // 10. Fetch Network Graph
  console.log('\nStep 10: Fetching Generated Network Graph...');
  const netRes = await fetch(`${BASE_URL}/cases/${caseId}/network`, {
    method: 'GET',
    headers
  });
  const netData = await netRes.json();
  assert(netRes.status === 200, 'Network graph retrieved');
  assert(netData.nodes?.length > 0 && netData.edges?.length === 10, 'Graph matches exact source records entered');

  // 11. Verify Case Isolation (PNX-2026-001 is unaffected)
  console.log('\nStep 11: Verifying Case Isolation...');
  const pnx1Res = await fetch(`${BASE_URL}/cases/PNX-2026-001/network`, {
    method: 'GET',
    headers
  });
  const pnx1Data = await pnx1Res.json();
  assert(pnx1Res.status === 200, 'PNX-2026-001 remains accessible');
  assert(pnx1Data.nodes?.length > 0, `PNX-2026-001 has isolated nodes (${pnx1Data.nodes?.length})`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(` RESULTS:  ${PASS} PASSED,  ${FAIL} FAILED`);
  console.log('════════════════════════════════════════════════════════════\n');
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
