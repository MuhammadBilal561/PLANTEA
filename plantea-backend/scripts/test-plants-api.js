// Test script to verify plants API is working
require('dotenv').config();
const supabase = require('./src/config/supabase');

async function testPlantsAPI() {
  console.log('🔍 Testing Plants API...\n');

  // Test 1: Check if plants exist in database
  console.log('1. Checking database for plants...');
  const { data: plants, error, count } = await supabase
    .from('plants')
    .select(`
      id, name, scientific_name, description,
      price_pkr, stock_quantity, category, city,
      ai_verified, health_score, image_url,
      seller:users!seller_id (id, full_name, city)
    `, { count: 'exact' })
    .eq('is_available', true)
    .gt('stock_quantity', 0);

  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }

  console.log(`✅ Found ${count} plants in database\n`);

  if (plants && plants.length > 0) {
    console.log('📋 Sample plant data:');
    const sample = plants[0];
    console.log(JSON.stringify({
      id: sample.id,
      name: sample.name,
      price_pkr: sample.price_pkr,
      category: sample.category,
      city: sample.city,
      seller: sample.seller,
      stock_quantity: sample.stock_quantity,
    }, null, 2));
    console.log('\n');
  } else {
    console.log('⚠️  No plants found! Run: node add-sample-plants.js\n');
    return;
  }

  // Test 2: Check what the API would return
  console.log('2. Simulating API response format...');
  const apiResponse = {
    success: true,
    message: 'Plants retrieved successfully.',
    data: {
      plants: plants.map(plant => ({
        ...plant,
        price: plant.price_pkr,
        seller_name: plant.seller?.full_name || 'Unknown Seller'
      })),
      total: count,
      page: 1,
      totalPages: Math.ceil(count / 20)
    },
    timestamp: new Date().toISOString()
  };

  console.log('✅ API Response structure:');
  console.log(JSON.stringify({
    success: apiResponse.success,
    data: {
      plants: `[${apiResponse.data.plants.length} plants]`,
      total: apiResponse.data.total,
    }
  }, null, 2));
  console.log('\n');

  // Test 3: Check if backend is running
  console.log('3. Checking if backend server is running...');
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Backend is running on http://localhost:3000');
    } else {
      console.log('⚠️  Backend responded but with error');
    }
  } catch (error) {
    console.log('❌ Backend is NOT running!');
    console.log('   Start it with: npm start');
  }
  console.log('\n');

  // Test 4: Try to fetch plants from API
  console.log('4. Testing actual API endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/plants');
    const data = await response.json();
    
    if (data.success && data.data.plants) {
      console.log(`✅ API returned ${data.data.plants.length} plants`);
      console.log('   Sample plant:', data.data.plants[0]?.name);
    } else {
      console.log('⚠️  API response format unexpected:', data);
    }
  } catch (error) {
    console.log('❌ Could not fetch from API:', error.message);
  }
  console.log('\n');

  console.log('🎯 Summary:');
  console.log(`   - Plants in DB: ${count}`);
  console.log(`   - Backend status: Check above`);
  console.log(`   - API endpoint: http://localhost:3000/api/plants`);
  console.log('\n');
}

testPlantsAPI();
