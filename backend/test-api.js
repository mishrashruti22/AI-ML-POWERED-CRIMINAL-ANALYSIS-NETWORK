const fetch = require('node-fetch');

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api/auth';
  
  const testUser = {
    fullName: 'Test User',
    departmentId: 'XYZ99',
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  };

  let token = '';
  
  console.log('--- 1. Testing Registration ---');
  let res = await fetch(BASE_URL + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  let data = await res.json();
  console.log('Register Response:', res.status, data);

  console.log('\\n--- 2. Testing Duplicate Registration ---');
  res = await fetch(BASE_URL + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  data = await res.json();
  console.log('Duplicate Register Response:', res.status, data);

  console.log('\\n--- 3. Testing Validation Errors ---');
  res = await fetch(BASE_URL + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...testUser, departmentId: 'invalid' })
  });
  data = await res.json();
  console.log('Invalid Dept ID Response:', res.status, data);
  
  console.log('\\n--- 4. Testing Invalid Credentials ---');
  res = await fetch(BASE_URL + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: 'wrongpassword' })
  });
  data = await res.json();
  console.log('Invalid Login Response:', res.status, data);

  console.log('\\n--- 5. Testing Verify OTP (Simulate) ---');
  res = await fetch(BASE_URL + '/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email })
  });
  data = await res.json();
  console.log('Send OTP Response:', res.status, data);
  
  console.log('\\n--- Manually setting emailVerified=true for testing ---');
  const { Pool } = require('pg');
  require('dotenv').config();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [testUser.email]);
  
  console.log('\\n--- 6. Testing Login ---');
  res = await fetch(BASE_URL + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  data = await res.json();
  console.log('Login Response:', res.status, data);
  if (data.token) {
    token = data.token;
  }
  
  console.log('\\n--- 7. Testing Protected /me Route ---');
  res = await fetch(BASE_URL + '/me', {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  });
  data = await res.json();
  console.log('/me Response:', res.status, data);
  
  await pool.end();
}

runTests().catch(console.error);
