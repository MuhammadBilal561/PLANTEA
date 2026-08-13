import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL. Defaults to the same-origin /api (the backend serves both the
// API and the production web build). For a separate backend or physical
// devices, override via EXPO_PUBLIC_API_BASE_URL (e.g. http://192.168.1.5:3000/api).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '/api';
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
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data?.token) {
      await this.setToken(response.data.token);
    }

    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data?.token) {
      await this.setToken(response.data.token);
    }
    
    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(userData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOtp(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async resetPassword(resetToken, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
    });
  }

  async logout() {
    await this.removeToken();
  }

  /**
   * Convert a relative URL (e.g. "/uploads/x.jpg") into an absolute one
   * that works in <Image> on web + native.
   */
  absoluteUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    if (pathOrUrl.startsWith('data:')) return pathOrUrl;
    const base = this.baseURL.replace(/\/api\/?$/, '');
    return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  // Plants endpoints
  async getPlants(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await this.request(`/plants${queryParams ? `?${queryParams}` : ''}`);

    // Transform backend data to match frontend expectations
    if (response.success && response.data && response.data.plants) {
      response.data.plants = response.data.plants.map(plant => ({
        ...plant,
        plant_id: plant.id,
        image_url: this.absoluteUrl(plant.image_url),
        seller_name: plant.seller_name || plant.seller?.full_name || 'Unknown Seller',
        seller_city: plant.seller?.city || plant.city,
      }));
    }
    
    return response;
  }

  async getPlantById(id) {
    const response = await this.request(`/plants/${id}`);
    
    // Transform single plant data
    if (response.success && response.data?.plant) {
      const p = response.data.plant;
      response.data = {
        ...response.data,
        plant: {
          ...p,
          plant_id: p.id,
          seller_name: p.seller?.full_name || 'Unknown Seller',
          seller_phone: p.seller?.phone,
          seller_city: p.seller?.city || p.city,
          image_url: this.absoluteUrl(p.image_url),
          reviews: (p.reviews || []).map(r => ({
            ...r,
            date: r.created_at,
          })),
        },
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
          total_amount: order.total_pkr,
          price_at_order: order.price_at_order ?? order.plant?.price_pkr ?? order.total_pkr,
          created_at: order.created_at,
          plant_id: order.plant?.id,
          plant_name: order.plant?.name,
          plant_image: this.absoluteUrl(order.plant?.image_url),
          seller_id: order.seller?.id,
          seller_name: order.seller?.full_name,
          buyer_id: order.buyer?.id,
          buyer_name: order.buyer?.full_name,
          buyer_phone: order.buyer?.phone,
          rider_id: order.rider?.id,
          rider_name: order.rider?.full_name,
          rider_phone: order.rider?.phone,
          delivery_address: order.delivery_address,
          delivery_fee_pkr: order.delivery_fee_pkr,
          status: order.status,
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
        plant_image: this.absoluteUrl(order.plant?.image_url),
        seller_city: order.plant?.city,
        delivery_address: order.delivery_address,
        delivery_fee_pkr: order.delivery_fee_pkr,
        buyer_name: order.buyer?.full_name,
        buyer_phone: order.buyer?.phone,
      }));
    }
    return response;
  }

  // Wishlist
  async getWishlist() {
    return this.request('/wishlist');
  }

  async addToWishlist(plantId) {
    return this.request(`/wishlist/${plantId}`, { method: 'POST' });
  }

  async removeFromWishlist(plantId) {
    return this.request(`/wishlist/${plantId}`, { method: 'DELETE' });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', { method: 'PUT' });
  }

  // Payment methods (free platform — COD first)
  async getPaymentMethods() {
    return this.request('/payments/methods');
  }

  // Image upload (self-hosted, no external storage)
  async uploadImage(imageBase64, mimeType) {
    return this.request('/uploads', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType }),
    });
  }

  // Featured / trending / categories (home sections)
  async getFeaturedPlants(limit = 8) {
    const response = await this.request(`/plants/featured?limit=${limit}`);
    if (response.success && response.data?.plants) {
      response.data.plants = response.data.plants.map(plant => ({
        ...plant,
        plant_id: plant.id,
        image_url: this.absoluteUrl(plant.image_url),
      }));
    }
    return response;
  }

  async getTrendingPlants(limit = 8) {
    const response = await this.request(`/plants/trending?limit=${limit}`);
    if (response.success && response.data?.plants) {
      response.data.plants = response.data.plants.map(plant => ({
        ...plant,
        plant_id: plant.id,
        image_url: this.absoluteUrl(plant.image_url),
      }));
    }
    return response;
  }

  async getCategories() {
    return this.request('/plants/categories');
  }

  // Reviews
  async createReview(reviewData) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async replyToReview(reviewId, reply) {
    return this.request(`/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  }

  async getSellerReviews(sellerId) {
    return this.request(`/reviews/seller/${sellerId}`);
  }

  async getPublicProfile(userId) {
    return this.request(`/users/${userId}/public`);
  }

  // Coupons / promotions
  async previewCoupon(code, subtotal) {
    return this.request('/coupons/preview', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  }

  // My Garden
  async getMyGarden() {
    const response = await this.request('/garden');
    if (response.success && response.data?.garden) {
      response.data.garden = response.data.garden.map(item => ({
        ...item,
        garden_id: item.garden_id,
        image_url: this.absoluteUrl(item.image_url),
      }));
    }
    return response;
  }

  async addToGarden(plantId, extra = {}) {
    return this.request('/garden', {
      method: 'POST',
      body: JSON.stringify({ plant_id: plantId, ...extra }),
    });
  }

  async removeFromGarden(gardenId) {
    return this.request(`/garden/${gardenId}`, { method: 'DELETE' });
  }

  // Analytics
  async getSellerAnalytics() {
    return this.request('/analytics/seller');
  }

  // Admin
  async adminListUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/users${qs ? `?${qs}` : ''}`);
  }

  async adminVerifySeller(userId, isVerified) {
    return this.request(`/admin/users/${userId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ is_verified: isVerified }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export default new ApiService();