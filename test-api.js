#!/usr/bin/env node

/**
 * Plantea API Testing Script
 * Tests all backend endpoints to ensure they're working correctly
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
let authToken = null;

// Test data
const testUser = {
  full_name: 'Test User',
  email: `test${Date.now()}@example.com`,
  phone: `0300${Math.floor(Math.random() * 10000000)}`,
  password: 'Test123456',
  role: 'buyer',
  city: 'Lahore'
};

const testPlant = {
  name: 'Test Peace Lily',
  scientific_name: 'Spathiphyllum wallisii',
  description: 'Beautiful indoor plant for testing',
  price_pkr: 500,
  stock_quantity: 5,
  category: 'Indoor',
  city: 'Lahore'
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, useAuth = false) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(useAuth && authToken && { Authorization: `Bearer ${authToken}` })
    },
    ...(data && { data })
  };

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  const result = await apiRequest('GET', '/health');
  
  if (result.success) {
    console.log('✅ Health check passed');
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Environment: ${result.data.environment}`);
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  
  return result.success;
}

async function testUserRegistration() {
  console.log('\n🔍 Testing User Registration...');
  const result = await apiRequest('POST', '/api/auth/register', testUser);
  
  if (result.success) {
    console.log('✅ User registration passed');
    authToken = result.data.data.token;
    console.log('   Token received and stored');
  } else {
    console.log('❌ User registration failed:', result.error);
  }
  
  return result.success;
}

async function testUserLogin() {
  console.log('\n🔍 Testing User Login...');
  const result = await apiRequest('POST', '/api/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  if (result.success) {
    console.log('✅ User login passed');
    authToken = result.data.data.token;
  } else {
    console.log('❌ User login failed:', result.error);
  }
  
  return result.success;
}

async function testGetCurrentUser() {
  console.log('\n🔍 Testing Get Current User...');
  const result = await apiRequest('GET', '/api/auth/me', null, true);
  
  if (result.success) {
    console.log('✅ Get current user passed');
    console.log(`   User: ${result.data.data.full_name}`);
    console.log(`   Role: ${result.data.data.role}`);
  } else {
    console.log('❌ Get current user failed:', result.error);
  }
  
  return result.success;
}

async function testBrowsePlants() {
  console.log('\n🔍 Testing Browse Plants...');
  const result = await apiRequest('GET', '/api/plants');
  
  if (result.success) {
    console.log('✅ Browse plants passed');
    console.log(`   Found ${result.data.data.length} plants`);
  } else {
    console.log('❌ Browse plants failed:', result.error);
  }
  
  return result.success;
}

async function testCreatePlant() {
  console.log('\n🔍 Testing Create Plant (requires seller role)...');
  
  // First, register a seller
  const sellerData = {
    ...testUser,
    email: `seller${Date.now()}@example.com`,
    phone: `0301${Math.floor(Math.random() * 10000000)}`,
    role: 'seller'
  };
  
  const registerResult = await apiRequest('POST', '/api/auth/register', sellerData);
  if (!registerResult.success) {
    console.log('❌ Failed to register seller for plant creation test');
    return false;
  }
  
  const sellerToken = registerResult.data.data.token;
  
  // Now create a plant
  const result = await apiRequest('POST', '/api/plants', testPlant, true);
  
  if (result.success) {
    console.log('✅ Create plant passed');
    console.log(`   Plant ID: ${result.data.data.id}`);
  } else {
    console.log('❌ Create plant failed:', result.error);
  }
  
  // Restore original token
  authToken = registerResult.data.data.token;
  
  return result.success;
}

async function testPlantScanner() {
  console.log('\n🔍 Testing Plant Scanner...');
  
  // Use a simple base64 encoded test image (1x1 pixel)
  const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
  
  const result = await apiRequest('POST', '/api/scanner/identify', {
    image: testImage
  }, true);
  
  if (result.success) {
    console.log('✅ Plant scanner passed');
    console.log(`   Identified: ${result.data.data.identified_name || 'Unknown'}`);
  } else {
    console.log('❌ Plant scanner failed:', result.error);
    console.log('   Note: This might fail if PlantNet API key is not configured');
  }
  
  return result.success;
}

// Main test runner
async function runAllTests() {
  console.log('🌿 Starting Plantea API Tests...');
  console.log(`📡 Testing API at: ${API_BASE_URL}`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Get Current User', fn: testGetCurrentUser },
    { name: 'Browse Plants', fn: testBrowsePlants },
    { name: 'Create Plant', fn: testCreatePlant },
    { name: 'Plant Scanner', fn: testPlantScanner }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} crashed:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your API is ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };