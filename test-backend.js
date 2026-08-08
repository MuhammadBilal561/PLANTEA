// Quick Backend Health Check Script
// Run this to verify the backend is working before starting the frontend

const http = require('http');

const API_URL = 'http://localhost:3000';

console.log('🔍 Testing Plantea Backend...\n');

// Test 1: Health Check
function testHealthCheck() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣ Testing health endpoint...');
    
    http.get(`${API_URL}/health`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('   ✅ Health check passed');
          console.log(`   📊 Status: ${response.data.status}`);
          console.log(`   🌿 Service: ${response.data.service}`);
          console.log(`   ⏱️  Uptime: ${response.data.uptime_seconds}s\n`);
          resolve(true);
        } else {
          console.log(`   ❌ Health check failed (Status: ${res.statusCode})\n`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('   ❌ Cannot connect to backend');
      console.log(`   💡 Make sure backend is running: cd plantea-backend && node server.js\n`);
      reject(err);
    });
  });
}

// Test 2: Auth Endpoint
function testAuthEndpoint() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣ Testing auth endpoint...');
    
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'test123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // We expect 401 or 400 since we're using fake credentials
        // But the endpoint should respond
        if (res.statusCode === 401 || res.statusCode === 400) {
          console.log('   ✅ Auth endpoint responding correctly');
          console.log('   📝 Login endpoint is working\n');
          resolve(true);
        } else if (res.statusCode === 200) {
          console.log('   ✅ Auth endpoint working (test user exists)\n');
          resolve(true);
        } else {
          console.log(`   ⚠️  Unexpected status: ${res.statusCode}\n`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('   ❌ Auth endpoint error\n');
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 3: Plants Endpoint
function testPlantsEndpoint() {
  return new Promise((resolve, reject) => {
    console.log('3️⃣ Testing plants endpoint...');
    
    http.get(`${API_URL}/api/plants`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('   ✅ Plants endpoint working');
          console.log(`   🌱 Found ${response.data?.plants?.length || 0} plants\n`);
          resolve(true);
        } else {
          console.log(`   ⚠️  Plants endpoint status: ${res.statusCode}\n`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('   ❌ Plants endpoint error\n');
      reject(err);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    await testHealthCheck();
    await testAuthEndpoint();
    await testPlantsEndpoint();
    
    console.log('═══════════════════════════════════════');
    console.log('✅ Backend is ready!');
    console.log('═══════════════════════════════════════');
    console.log('\n📱 You can now start the frontend:');
    console.log('   cd plantea-frontend');
    console.log('   npx expo start\n');
    
  } catch (error) {
    console.log('═══════════════════════════════════════');
    console.log('❌ Backend tests failed');
    console.log('═══════════════════════════════════════');
    console.log('\n💡 To start the backend:');
    console.log('   cd plantea-backend');
    console.log('   node server.js\n');
  }
}

runTests();
