// =============================================================
// test-new-modules.js
// Quick test script for new modules
// =============================================================
// Usage: node test-new-modules.js
// Note: Requires a valid JWT token from login
// =============================================================

require('dotenv').config();
const http = require('http');

const API_URL = 'http://localhost:3000';
const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Get this from login endpoint

console.log('🧪 Testing New Modules\n');
console.log('═══════════════════════════════════════\n');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
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

// Test 1: User Profile
async function testUserProfile() {
  console.log('1️⃣  Testing User Profile Module');
  
  try {
    // Get profile
    const result = await makeRequest('GET', '/api/users/profile', null, TEST_TOKEN);
    
    if (result.status === 200 && result.data.success) {
      console.log('   ✅ GET /api/users/profile - Success');
      console.log('   👤 User:', result.data.data.full_name);
      console.log('   📧 Email:', result.data.data.email);
      console.log('   🎭 Role:', result.data.data.role, '\n');
      return true;
    } else if (result.status === 401) {
      console.log('   ⚠️  Authentication required');
      console.log('   💡 Update TEST_TOKEN with a valid JWT token\n');
      return false;
    } else {
      console.log('   ❌ Failed:', result.data.message || 'Unknown error', '\n');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 2: Wishlist
async function testWishlist() {
  console.log('2️⃣  Testing Wishlist Module');
  
  try {
    const result = await makeRequest('GET', '/api/wishlist', null, TEST_TOKEN);
    
    if (result.status === 200 && result.data.success) {
      console.log('   ✅ GET /api/wishlist - Success');
      console.log('   📋 Wishlist items:', result.data.data.length, '\n');
      return true;
    } else if (result.status === 403) {
      console.log('   ⚠️  Only buyers can access wishlist');
      console.log('   💡 Login as a buyer to test this endpoint\n');
      return false;
    } else if (result.status === 401) {
      console.log('   ⚠️  Authentication required\n');
      return false;
    } else {
      console.log('   ❌ Failed:', result.data.message || 'Unknown error', '\n');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 3: Notifications
async function testNotifications() {
  console.log('3️⃣  Testing Notifications Module');
  
  try {
    const result = await makeRequest('GET', '/api/notifications', null, TEST_TOKEN);
    
    if (result.status === 200 && result.data.success) {
      console.log('   ✅ GET /api/notifications - Success');
      console.log('   📬 Notifications:', result.data.data.notifications.length);
      console.log('   🔔 Unread:', result.data.data.unreadCount, '\n');
      return true;
    } else if (result.status === 401) {
      console.log('   ⚠️  Authentication required\n');
      return false;
    } else {
      console.log('   ❌ Failed:', result.data.message || 'Unknown error', '\n');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 4: Health Check
async function testHealthCheck() {
  console.log('0️⃣  Testing Backend Health');
  
  try {
    const result = await makeRequest('GET', '/health');
    
    if (result.status === 200) {
      console.log('   ✅ Backend is running');
      console.log('   📊 Service:', result.data.data?.service, '\n');
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
    return;
  }

  // Check if token is set
  if (TEST_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('═══════════════════════════════════════');
    console.log('⚠️  JWT Token Not Set');
    console.log('═══════════════════════════════════════\n');
    console.log('To test the new modules:');
    console.log('1. Login to get a JWT token:');
    console.log('   curl -X POST http://localhost:3000/api/auth/login \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"email":"test@example.com","password":"password123"}\'');
    console.log('\n2. Copy the token from the response');
    console.log('3. Update TEST_TOKEN in this file');
    console.log('4. Run this script again\n');
    return;
  }

  // Test all modules
  const profileOk = await testUserProfile();
  const wishlistOk = await testWishlist();
  const notificationsOk = await testNotifications();

  console.log('═══════════════════════════════════════');
  console.log('Test Results:');
  console.log('═══════════════════════════════════════');
  console.log(`User Profile:    ${profileOk ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Wishlist:        ${wishlistOk ? '✅ Pass' : '⚠️  Buyer only'}`);
  console.log(`Notifications:   ${notificationsOk ? '✅ Pass' : '❌ Fail'}`);
  console.log('═══════════════════════════════════════\n');

  if (profileOk || notificationsOk) {
    console.log('✅ New modules are working!\n');
    console.log('Full test commands:\n');
    console.log('# User Profile');
    console.log(`curl -X GET ${API_URL}/api/users/profile \\`);
    console.log(`  -H "Authorization: Bearer ${TEST_TOKEN}"`);
    console.log('\n# Wishlist (buyer only)');
    console.log(`curl -X GET ${API_URL}/api/wishlist \\`);
    console.log(`  -H "Authorization: Bearer ${TEST_TOKEN}"`);
    console.log('\n# Notifications');
    console.log(`curl -X GET ${API_URL}/api/notifications \\`);
    console.log(`  -H "Authorization: Bearer ${TEST_TOKEN}"\n`);
  }
}

// Run the tests
runTests();
