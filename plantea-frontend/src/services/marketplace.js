import { supabase } from '../lib/supabaseClient';

// Supabase-first marketplace queries used for web testing.
// Contract:
// - getPlants(filters) returns { success, data: { plants } }
// - getOrders(userId) returns { success, data: { orders } }
// Shapes are aligned to what current screens expect.

const normalizePlant = (row) => ({
  ...row,
  plant_id: row.id,
  image_url: row.cover_image_url || row.image_url || null,
  seller_name: row.seller?.full_name || (row.seller_id ? `Seller ${String(row.seller_id).slice(0, 6)}` : 'Unknown Seller'),
  seller_city: row.seller?.city || row.city,
});

const normalizeOrder = (row) => ({
  ...row,
  order_id: row.id,
  total_amount: row.total_pkr,
  created_at: row.placed_at || row.created_at,
  plant_id: row.items?.[0]?.plant?.id,
  plant_name: row.items?.[0]?.plant_name_snapshot || row.items?.[0]?.plant?.name,
  plant_image: row.items?.[0]?.plant?.cover_image_url || row.items?.[0]?.plant?.image_url,
  seller_name: row.seller?.full_name,
  rider_name: row.rider?.full_name,
});

const MarketplaceService = {
  async getPlants(filters = {}) {
    const { category, search, city } = filters;

    let query = supabase
      .from('plants')
      .select(
        `
        id, seller_id, name, scientific_name, description, category,
        price_pkr, stock_quantity, city, is_available, cover_image_url, created_at,
        seller:profiles!seller_id (id, full_name, city)
      `
      )
      .eq('is_available', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (city) query = query.ilike('city', `%${city}%`);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: {
        plants: (data || []).map(normalizePlant),
      },
    };
  },

  async getMyOrders({ userId }) {
    if (!userId) {
      return { success: true, data: { orders: [] } };
    }

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id, status, total_pkr, delivery_fee_pkr, items_subtotal_pkr,
        placed_at, created_at,
        seller:profiles!seller_id (id, full_name, phone),
        rider:profiles!rider_id (id, full_name, phone),
        items:order_items (
          id, plant_id, plant_name_snapshot, unit_price_pkr, quantity, line_total_pkr,
          plant:plants!plant_id (id, name, cover_image_url, city, price_pkr)
        )
      `
      )
      .eq('buyer_id', userId)
      .order('placed_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: {
        orders: (data || []).map(normalizeOrder),
      },
    };
  },
};

export default MarketplaceService;
