import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE: Expo web commonly runs on http://localhost:3000, so using 3000 for the API
// causes the browser to hit the frontend dev server instead of the backend.
// Default the API to 3001, and allow overriding via EXPO_PUBLIC_API_BASE_URL.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT) || 10000;

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  // Get stored JWT token
  async getToken() {
    try {
      return await AsyncStorage.getItem('jwt_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Store JWT token
  async setToken(token) {
    try {
      await AsyncStorage.setItem('jwt_token', token);
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  // Remove JWT token
  async removeToken() {
    try {
      await AsyncStorage.removeItem('jwt_token');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getToken();

    const config = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Try to parse JSON, but handle cases where response is not JSON
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timeout:', url);
        throw new Error('Request timeout - check your network connection');
      }
      // Browser fetch failures often come through as "Failed to fetch".
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        console.error('Network error:', url);
        throw new Error(
          `Cannot connect to server (${this.baseURL}). Check if the backend is running and EXPO_PUBLIC_API_BASE_URL is set correctly.`
        );
      }
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data.token) {
      await this.setToken(response.data.token);
    }
    
    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    await this.removeToken();
  }

  // Plants endpoints
  async getPlants(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await this.request(`/plants${queryParams ? `?${queryParams}` : ''}`);
    
    console.log('API Response:', JSON.stringify(response, null, 2));
    
    // Transform backend data to match frontend expectations
    if (response.success && response.data && response.data.plants) {
      response.data.plants = response.data.plants.map(plant => ({
        ...plant,
        plant_id: plant.id,
        seller_name: plant.seller_name || plant.seller?.full_name || 'Unknown Seller',
        seller_city: plant.seller?.city || plant.city,
      }));
    }
    
    return response;
  }

  async getPlantById(id) {
    const response = await this.request(`/plants/${id}`);
    
    // Transform single plant data
    if (response.success && response.data) {
      response.data = {
        ...response.data,
        plant_id: response.data.id,
        seller_name: response.data.seller?.full_name || 'Unknown Seller',
        seller_phone: response.data.seller?.phone,
        seller_city: response.data.seller?.city || response.data.city,
      };
    }
    
    return response;
  }

  async getMyListings() {
    const response = await this.request('/plants/my/listings');
    
    // Transform listings data
    if (response.success && response.data.plants) {
      response.data.plants = response.data.plants.map(plant => ({
        ...plant,
        plant_id: plant.id,
      }));
    }
    
    return response;
  }

  async createPlant(plantData) {
    return this.request('/plants', {
      method: 'POST',
      body: JSON.stringify(plantData),
    });
  }

  async updatePlant(id, plantData) {
    return this.request(`/plants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(plantData),
    });
  }

  async deletePlant(id) {
    return this.request(`/plants/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders endpoints
  async placeOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders() {
    const response = await this.request('/orders');
    
    // Transform orders data to match frontend expectations
    if (response.success && response.data) {
      const orders = Array.isArray(response.data) ? response.data : (response.data.orders || []);
      response.data = {
        orders: orders.map(order => ({
          ...order,
          order_id: order.id,
          plant_id: order.plant?.id,
          plant_name: order.plant?.name,
          plant_image: order.plant?.image_url,
          price_at_order: order.plant?.price_pkr || order.total_pkr,
          buyer_id: order.buyer?.id,
          buyer_name: order.buyer?.full_name,
          buyer_phone: order.buyer?.phone,
          rider_id: order.rider?.id,
          rider_name: order.rider?.full_name,
          rider_phone: order.rider?.phone,
        }))
      };
    }
    
    return response;
  }

  async updateOrderStatus(orderId, status) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async assignRider(orderId) {
    return this.request(`/orders/${orderId}/assign-rider`, {
      method: 'PATCH',
    });
  }

  // Scanner endpoint
  async identifyPlant(base64Image) {
    return this.request('/scanner/identify', {
      method: 'POST',
      body: JSON.stringify({ image_base64: base64Image }),
    });
  }

  // Get all unassigned confirmed orders (for riders only)
  async getAvailableOrders() {
    const response = await this.request('/orders/available');
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map(order => ({
        ...order,
        order_id: order.id,
        plant_name: order.plant?.name,
        plant_image: order.plant?.image_url,
        seller_city: order.plant?.city,
        buyer_name: order.buyer?.full_name,
        buyer_phone: order.buyer?.phone,
      }));
    }
    return response;
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export default new ApiService();