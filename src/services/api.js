import { getStoredToken } from './auth';

const API_URL = 'http://localhost:5000/api';

/**
 * Base API request function
 */
const apiRequest = async (endpoint, options = {}) => {
  // Get stored token from localStorage
  const token = getStoredToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No authentication token available for API request to ' + endpoint);
    // Don't throw for /auth/me endpoint since it's used to check auth status
    if (endpoint !== '/auth/me') {
      throw new Error('Authentication required - please log in again');
    }
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!response.ok) {
      // Try to parse error message
      let errorMessage = 'Something went wrong';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        
        // Check for authentication errors
        if (response.status === 401) {
          console.error('Authentication error:', errorMessage);
          // Clear invalid token
          localStorage.removeItem('b2boost_token');
          errorMessage = 'Your session has expired. Please log in again.';
        }
      } catch (e) {
        // If we can't parse JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error(`API request error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Authentication service
 */
export const authService = {
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
  
  createTeamMember: async (memberData) => {
    return apiRequest('/auth/team', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
  },
  
  inviteTeamMember: async (inviteData) => {
    return apiRequest('/auth/invite', {
      method: 'POST',
      body: JSON.stringify(inviteData)
    });
  },
  
  verifyInvitation: async (token) => {
    return apiRequest(`/auth/invite/verify?token=${token}`);
  },
  
  acceptInvitation: async (token) => {
    return apiRequest('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },
  
  getTeamMembers: async () => {
    return apiRequest('/auth/team');
  },
  
  updateTeamMemberRole: async (userId, roleData) => {
    return apiRequest(`/auth/team/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify(roleData)
    });
  },
  
  removeTeamMember: async (userId) => {
    return apiRequest(`/auth/team/${userId}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Products service
 */
export const productsService = {
  getAll: async () => {
    try {
      return await apiRequest('/products');
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    return apiRequest(`/products/${id}`);
  },
  
  getByCategory: async (category) => {
    return apiRequest(`/products/category/${category}`);
  },
  
  create: async (productData) => {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },
  
  update: async (id, productData) => {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE'
    });
  },
  
  updateStock: async (id, stockData) => {
    return apiRequest(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(stockData)
    });
  }
};

/**
 * Cart service
 */
export const cartService = {
  getCart: async () => {
    try {
      return await apiRequest('/cart');
    } catch (error) {
      console.error('Error fetching cart:', error);
      return { items: [], total: 0 };
    }
  },
  
  addItem: async (productId, quantity = 1) => {
    return apiRequest('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
  },
  
  updateItem: async (productId, quantity) => {
    return apiRequest('/cart/items', {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity })
    });
  },
  
  removeItem: async (productId) => {
    return apiRequest(`/cart/items/${productId}`, {
      method: 'DELETE'
    });
  },
  
  clearCart: async () => {
    return apiRequest('/cart', {
      method: 'DELETE'
    });
  }
};

/**
 * Orders service
 */
export const ordersService = {
  getAll: async () => {
    try {
      return await apiRequest('/orders');
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },
  
  getAllForAdmin: async () => {
    try {
      return await apiRequest('/orders/all');
    } catch (error) {
      console.error('Error fetching all orders for admin:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    return apiRequest(`/orders/${id}`);
  },
  
  create: async (orderData) => {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
  
  updateStatus: async (id, status) => {
    return apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status)
    });
  },
  
  updateTracking: async (id, trackingData) => {
    return apiRequest(`/orders/${id}/tracking`, {
      method: 'PATCH',
      body: JSON.stringify(trackingData)
    });
  },
  
  updateNotes: async (id, notesData) => {
    return apiRequest(`/orders/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify(notesData)
    });
  }
};

/**
 * Customers service - for admin use
 */
export const customersService = {
  getAll: async () => {
    try {
      return await apiRequest('/customers');
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    return apiRequest(`/customers/${id}`);
  },
  
  getStats: async () => {
    try {
      return await apiRequest('/customers/stats');
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return { count: 0 };
    }
  }
}; 