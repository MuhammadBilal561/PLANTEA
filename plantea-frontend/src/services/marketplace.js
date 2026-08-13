import ApiService from './api';

// REST-first marketplace adapter.
// Contract:
// - getPlants(filters) returns { success, data: { plants } }
// - getMyOrders({ userId }) returns { success, data: { orders } }
// - getPlantById(id) returns { success, data: { plant } }
// All data comes from the single Express + SQLite backend (no Supabase).

const MarketplaceService = {
  async getPlants(filters = {}) {
    return ApiService.getPlants(filters);
  },

  async getPlantById(plantId) {
    return ApiService.getPlantById(plantId);
  },

  async getMyOrders({ userId }) {
    // The REST API resolves orders from the JWT token (role-aware),
    // so the userId is not strictly required — kept for signature parity.
    return ApiService.getOrders();
  },
};

export default MarketplaceService;
