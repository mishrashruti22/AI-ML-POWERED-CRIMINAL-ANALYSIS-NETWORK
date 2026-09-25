const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  
  const deptNum = Math.floor(10 + Math.random() * 89);
  const testUser = {
    fullName: 'Investigator Bob',
    departmentId: 'BOB' + deptNum,
    email: 'bob' + Date.now() + '@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  };

  let token = '';
  
  console.log('--- Setup: Creating Test User and Logging In ---');
  await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  
  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [testUser.email]);
  
  const loginRes = await fetch(BASE_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  const loginData = await loginRes.json();
  token = loginData.token;
  const userId = loginData.user.id;
  
  if (!token) {
    console.error('Failed to get token', loginData);
    process.exit(1);
  }

  const caseNumber = 'PNX-' + Date.now();
  let caseId = '';

  console.log('\\n--- 1. Create Case ---');
  let res = await fetch(BASE_URL + '/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      caseNumber: caseNumber,
      title: 'Test Financial Fraud',
      description: 'Fraud investigation 1',
      status: 'OPEN',
      priority: 'HIGH'
    })
  });
  let data = await res.json();
  console.log('Create Response:', res.status, data);
  caseId = data.case.id;

  console.log('\\n--- 2. Create Duplicate Case Number ---');
  res = await fetch(BASE_URL + '/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      caseNumber: caseNumber,
      title: 'Another Fraud',
    })
  });
  data = await res.json();
  console.log('Duplicate Response:', res.status, data);

  console.log('\\n--- 3. Get All Cases (with filter) ---');
  res = await fetch(BASE_URL + '/cases?status=OPEN&priority=HIGH', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  data = await res.json();
  console.log('Get All Response:', res.status, 'Count:', data.cases?.length);

  console.log('\\n--- 4. Get Single Case ---');
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  data = await res.json();
  console.log('Get Single Response:', res.status, 'Title:', data.case?.title);

  console.log('\\n--- 5. Update Case ---');
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      status: 'UNDER_INVESTIGATION'
    })
  });
  data = await res.json();
  console.log('Update Response:', res.status, data);

  console.log('\\n--- 6. Invalid Status ---');
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ status: 'INVALID_STATUS' })
  });
  data = await res.json();
  console.log('Invalid Status Response:', res.status, data);

  console.log('\\n--- 7. Invalid Priority ---');
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ priority: 'SUPER_HIGH' })
  });
  data = await res.json();
  console.log('Invalid Priority Response:', res.status, data);

  console.log('\\n--- 8. Unauthorized Request ---');
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'GET',
  });
  data = await res.json();
  console.log('Unauthorized Response:', res.status, data);

  console.log('\\n--- 9. Case Statistics ---');
  res = await fetch(BASE_URL + '/cases/' + caseId + '/stats', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  data = await res.json();
  console.log('Stats Response:', res.status, data);

  console.log('\\n--- 10. Safe Deletion Behavior ---');
  const firId = crypto.randomUUID();
  await pool.query('INSERT INTO "firRecord" (id, "caseId", "firNumber", "incidentDate", "createdAt") VALUES ($1, $2, $3, $4, $5)', [firId, caseId, 'FIR-123', new Date(), new Date()]);
  
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  data = await res.json();
  console.log('Deletion with related records:', res.status, data);
  
  await pool.query('DELETE FROM "firRecord" WHERE id = $1', [firId]);
  
  res = await fetch(BASE_URL + '/cases/' + caseId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  data = await res.json();
  console.log('Deletion without related records:', res.status, data);

  await pool.end();
}

runTests().catch(console.error);
