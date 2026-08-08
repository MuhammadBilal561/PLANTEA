// =============================================================
// test-password-reset.js
// Quick test script for password reset functionality
// =============================================================
// Usage: node test-password-reset.js
// =============================================================

require('dotenv').config();
const http = require('http');

const API_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com'; // Change this to a real email you have access to

console.log('🧪 Testing Password Reset Functionality\n');
console.log('═══════════════════════════════════════\n');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test 1: Forgot Password
async function testForgotPassword() {
  console.log('1️⃣  Testing POST /api/auth/forgot-password');
  console.log(`   Email: ${TEST_EMAIL}`);
  
  try {
    const result = await makeRequest('POST', '/api/auth/forgot-password', {
      email: TEST_EMAIL
    });
    
    if (result.status === 200 && result.data.success) {
      console.log('   ✅ Success:', result.data.message);
      console.log('   📧 Check your email for the OTP code\n');
      return true;
    } else if (result.status === 404) {
      console.log('   ⚠️  User not found. Make sure the email exists in your database.');
      console.log('   💡 Register this email first or use an existing user email.\n');
      return false;
    } else if (result.status === 429) {
      console.log('   ⚠️  Rate limit exceeded. Wait 15 minutes or clear old OTPs.\n');
      return false;
    } else {
      console.log('   ❌ Failed:', result.data.message || 'Unknown error');
      console.log('   Response:', JSON.stringify(result.data, null, 2), '\n');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    console.log('   💡 Make sure the backend is running: node server.js\n');
    return false;
  }
}

// Test 2: Verify OTP (requires manual input)
async function testVerifyOtp() {
  console.log('2️⃣  Testing POST /api/auth/verify-otp');
  console.log('   ⏸️  This test requires manual input');
  console.log('   📧 Check your email and enter the 6-digit OTP code');
  console.log('   💡 Then run: curl -X POST http://localhost:3000/api/auth/verify-otp \\');
  console.log('                     -H "Content-Type: application/json" \\');
  console.log(`                     -d '{"email":"${TEST_EMAIL}","otp":"YOUR_OTP_HERE"}'\n`);
}

// Test 3: Health Check
async function testHealthCheck() {
  console.log('0️⃣  Testing Backend Health');
  
  try {
    const result = await makeRequest('GET', '/health');
    
    if (result.status === 200) {
      console.log('   ✅ Backend is running');
      console.log('   📊 Service:', result.data.data?.service);
      console.log('   🌍 Environment:', result.data.data?.environment, '\n');
      return true;
    } else {
      console.log('   ❌ Backend health check failed\n');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Cannot connect to backend');
    console.log('   💡 Start the backend: cd plantea-backend && node server.js\n');
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting tests...\n');
  
  // Test 0: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('═══════════════════════════════════════');
    console.log('❌ Backend is not running');
    console.log('═══════════════════════════════════════\n');
    console.log('To start the backend:');
    console.log('  cd plantea-backend');
    console.log('  node server.js\n');
    return;
  }

  // Test 1: Forgot password
  const forgotOk = await testForgotPassword();
  
  if (forgotOk) {
    // Test 2: Verify OTP (manual)
    testVerifyOtp();
    
    console.log('═══════════════════════════════════════');
    console.log('✅ Forgot Password endpoint working!');
    console.log('═══════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('1. Check your email for the OTP code');
    console.log('2. Test verify-otp endpoint with the OTP');
    console.log('3. Test reset-password endpoint with the reset token\n');
    console.log('Full test commands:');
    console.log('\n# Step 1: Forgot Password (already done)');
    console.log(`curl -X POST ${API_URL}/api/auth/forgot-password \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log(`  -d '{"email":"${TEST_EMAIL}"}'`);
    console.log('\n# Step 2: Verify OTP (use OTP from email)');
    console.log(`curl -X POST ${API_URL}/api/auth/verify-otp \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log(`  -d '{"email":"${TEST_EMAIL}","otp":"123456"}'`);
    console.log('\n# Step 3: Reset Password (use reset_token from step 2)');
    console.log(`curl -X POST ${API_URL}/api/auth/reset-password \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"reset_token":"YOUR_TOKEN","new_password":"NewSecure123"}\'\n');
  } else {
    console.log('═══════════════════════════════════════');
    console.log('⚠️  Test incomplete');
    console.log('═══════════════════════════════════════\n');
    console.log('Troubleshooting:');
    console.log('1. Make sure the user email exists in the database');
    console.log('2. Check SMTP configuration in .env');
    console.log('3. Verify otp_verifications table exists in Supabase');
    console.log('4. Check backend logs for errors\n');
  }
}

// Run the tests
runTests();
