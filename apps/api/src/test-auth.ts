import 'dotenv/config';

const BASE_URL = 'http://localhost:3001/api/v1';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testAuth() {
  console.log('Starting authentication integration tests...');
  await wait(2000); // Wait for NestJS server boot

  const testEmail = `candidate-${Date.now()}@platform.com`;
  const testPassword = 'testpassword123';

  try {
    // 1. Test registration
    console.log('\n--- 1. Testing Registration Endpoint ---');
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'Candidate',
      }),
    });

    const registerData = await registerResponse.json();
    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
    }
    console.log('Registration successful! User registered:', registerData);

    // 2. Test candidate login
    console.log('\n--- 2. Testing Candidate Login Endpoint ---');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      throw new Error(`Candidate login failed: ${JSON.stringify(loginData)}`);
    }
    console.log('Candidate login successful! Token issued:', loginData.accessToken ? 'YES' : 'NO');
    console.log('User payload:', loginData.user);

    // 3. Test active session profile
    console.log('\n--- 3. Testing Active User Profile (/auth/me) ---');
    const meResponse = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${loginData.accessToken}`,
      },
    });

    const meData = await meResponse.json();
    if (!meResponse.ok) {
      throw new Error(`Profile retrieval failed: ${JSON.stringify(meData)}`);
    }
    console.log('Profile retrieved successfully:', meData);
    console.log('User Role:', meData.role);
    console.log('User Permissions:', meData.permissions);

    // 4. Test admin login using seeded credentials
    console.log('\n--- 4. Testing Admin Login (Seeded Credentials) ---');
    const adminLoginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@platform.com',
        password: 'adminpassword123',
      }),
    });

    const adminLoginData = await adminLoginResponse.json();
    if (!adminLoginResponse.ok) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
    }
    console.log('Admin login successful! Role:', adminLoginData.user.role);

    // 5. Test admin profile retrieval
    console.log('\n--- 5. Testing Admin Profile (/auth/me) ---');
    const adminMeResponse = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminLoginData.accessToken}`,
      },
    });

    const adminMeData = await adminMeResponse.json();
    if (!adminMeResponse.ok) {
      throw new Error(`Admin profile retrieval failed: ${JSON.stringify(adminMeData)}`);
    }
    console.log('Admin Profile loaded:', adminMeData);

    console.log('\n=============================================');
    console.log('ALL AUTH INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================');
    process.exit(0);
  } catch (error) {
    console.error('\nAuthentication test failed:');
    console.error(error);
    process.exit(1);
  }
}

testAuth();
