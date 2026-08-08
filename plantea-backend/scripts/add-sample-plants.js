// Quick script to add sample plants for testing
require('dotenv').config();
const supabase = require('./src/config/supabase');

const samplePlants = [
  {
    name: 'Monstera Deliciosa',
    scientific_name: 'Monstera deliciosa',
    description: 'Beautiful indoor plant with large, glossy leaves. Perfect for home decoration.',
    price_pkr: 1500,
    stock_quantity: 10,
    category: 'Indoor',
    city: 'Lahore',
    is_available: true,
  },
  {
    name: 'Snake Plant',
    scientific_name: 'Sansevieria trifasciata',
    description: 'Low maintenance plant that purifies air. Great for beginners.',
    price_pkr: 800,
    stock_quantity: 15,
    category: 'Indoor',
    city: 'Karachi',
    is_available: true,
  },
  {
    name: 'Aloe Vera',
    scientific_name: 'Aloe barbadensis',
    description: 'Medicinal plant with healing properties. Easy to care for.',
    price_pkr: 500,
    stock_quantity: 20,
    category: 'Medicinal',
    city: 'Islamabad',
    is_available: true,
  },
  {
    name: 'Rose Plant',
    scientific_name: 'Rosa',
    description: 'Beautiful flowering plant with fragrant blooms.',
    price_pkr: 600,
    stock_quantity: 12,
    category: 'Flowering',
    city: 'Lahore',
    is_available: true,
  },
  {
    name: 'Money Plant',
    scientific_name: 'Epipremnum aureum',
    description: 'Popular indoor plant believed to bring good luck and prosperity.',
    price_pkr: 400,
    stock_quantity: 25,
    category: 'Indoor',
    city: 'Faisalabad',
    is_available: true,
  },
];

async function addSamplePlants() {
  try {
    // First, get a seller user ID
    const { data: sellers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'seller')
      .limit(1);

    if (!sellers || sellers.length === 0) {
      console.log('❌ No seller found. Please register a seller first.');
      return;
    }

    const sellerId = sellers[0].id;
    console.log(`✅ Found seller: ${sellerId}`);

    // Add plants
    for (const plant of samplePlants) {
      const { data, error } = await supabase
        .from('plants')
        .insert({
          ...plant,
          seller_id: sellerId,
        })
        .select()
        .single();

      if (error) {
        console.log(`❌ Failed to add ${plant.name}:`, error.message);
      } else {
        console.log(`✅ Added: ${plant.name} (Rs. ${plant.price_pkr})`);
      }
    }

    console.log('\n🎉 Sample plants added successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addSamplePlants();
