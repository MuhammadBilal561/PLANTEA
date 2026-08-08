// Populate Plantea database with sample data
require('dotenv').config({ path: './plantea-backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function populateSampleData() {
  console.log('🌱 Populating Plantea database with sample data...');

  try {
    // Clear existing data
    await supabase.from('plants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert sample users
    const { data: users, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: '11111111-0000-0000-0000-000000000001',
          full_name: 'Shehroz Ahmed',
          email: 'shehroz@test.com',
          phone: '03001111111',
          password_hash: '$2a$12$dummy.hash.for.testing.purposes.only',
          role: 'buyer',
          city: 'Lahore'
        },
        {
          id: '22222222-0000-0000-0000-000000000002',
          full_name: 'Zainab Nursery',
          email: 'zainab@test.com',
          phone: '03002222222',
          password_hash: '$2a$12$dummy.hash.for.testing.purposes.only',
          role: 'seller',
          city: 'Lahore'
        },
        {
          id: '33333333-0000-0000-0000-000000000003',
          full_name: 'Bilal Rider',
          email: 'bilal@test.com',
          phone: '03003333333',
          password_hash: '$2a$12$dummy.hash.for.testing.purposes.only',
          role: 'rider',
          city: 'Lahore'
        }
      ])
      .select();

    if (userError) {
      console.error('Error inserting users:', userError);
      return;
    }
    console.log('✅ Users inserted:', users.length);

    // Insert subscription for seller
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        seller_id: '22222222-0000-0000-0000-000000000002',
        tier: 'free',
        commission_rate: 10.00
      });

    if (subError) {
      console.error('Error inserting subscription:', subError);
    } else {
      console.log('✅ Subscription created for seller');
    }

    // Insert sample plants
    const { data: plants, error: plantError } = await supabase
      .from('plants')
      .insert([
        {
          seller_id: '22222222-0000-0000-0000-000000000002',
          name: 'Peace Lily',
          scientific_name: 'Spathiphyllum wallisii',
          description: 'Low-maintenance indoor plant. Purifies air and thrives in low light. Perfect for beginners!',
          price_pkr: 850.00,
          stock_quantity: 5,
          category: 'Indoor',
          city: 'Lahore',
          ai_verified: true,
          health_score: 92,
          image_url: 'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400'
        },
        {
          seller_id: '22222222-0000-0000-0000-000000000002',
          name: 'Snake Plant',
          scientific_name: 'Sansevieria trifasciata',
          description: 'Extremely hardy indoor plant. Tolerates neglect and low light. Great air purifier.',
          price_pkr: 650.00,
          stock_quantity: 8,
          category: 'Indoor',
          city: 'Lahore',
          ai_verified: true,
          health_score: 88,
          image_url: 'https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=400'
        },
        {
          seller_id: '22222222-0000-0000-0000-000000000002',
          name: 'Monstera Deliciosa',
          scientific_name: 'Monstera deliciosa',
          description: 'Trendy indoor plant with beautiful split leaves. Grows quickly and makes a statement.',
          price_pkr: 1200.00,
          stock_quantity: 3,
          category: 'Indoor',
          city: 'Lahore',
          ai_verified: true,
          health_score: 95,
          image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'
        },
        {
          seller_id: '22222222-0000-0000-0000-000000000002',
          name: 'Rose Bush',
          scientific_name: 'Rosa damascena',
          description: 'Beautiful fragrant roses. Perfect for outdoor gardens. Blooms throughout the season.',
          price_pkr: 450.00,
          stock_quantity: 12,
          category: 'Outdoor',
          city: 'Lahore',
          ai_verified: false,
          health_score: 78,
          image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400'
        },
        {
          seller_id: '22222222-0000-0000-0000-000000000002',
          name: 'Aloe Vera',
          scientific_name: 'Aloe barbadensis',
          description: 'Medicinal succulent plant. Easy to care for and has healing properties for skin.',
          price_pkr: 300.00,
          stock_quantity: 15,
          category: 'Medicinal',
          city: 'Lahore',
          ai_verified: true,
          health_score: 90,
          image_url: 'https://images.unsplash.com/photo-1509423350716-97f2360af2e4?w=400'
        }
      ])
      .select();

    if (plantError) {
      console.error('Error inserting plants:', plantError);
      return;
    }
    console.log('✅ Plants inserted:', plants.length);

    console.log('🎉 Sample data populated successfully!');
    console.log('Test the API: http://localhost:3000/api/plants');

  } catch (error) {
    console.error('❌ Error populating data:', error);
  }
}

populateSampleData();