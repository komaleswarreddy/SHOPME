import { getStoredToken } from './auth';

// Function to update token in localStorage
const updateStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('b2boost_token', token);
      console.log('Updated auth token in localStorage');
      
      // Dispatch an event so other components can react to token changes
      const tokenUpdateEvent = new CustomEvent('tokenUpdated', {
        detail: { timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(tokenUpdateEvent);
      
      return true;
    }
    console.warn('Attempted to update token with empty value');
    return false;
  } catch (error) {
    console.error('Error updating token in localStorage:', error);
    return false;
  }
};

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
  },
  
  /**
   * Get all organizations for the current user
   * @returns {Promise<Array>} Promise resolving to an array of organizations
   */
  getUserOrganizations: async () => {
    try {
      const token = getStoredToken();
      console.log('Getting organizations with token available:', !!token);
      
      // Use apiRequest instead of fetch to ensure consistent error handling
      const data = await apiRequest('/auth/organizations');
      console.log('getUserOrganizations raw API response:', data);
      
      // Handle various response formats
      let organizations = [];
      
      if (data && Array.isArray(data)) {
        // Direct array format (old API)
        console.log('API returned direct array format');
        organizations = data;
      } else if (data && data.organizations && Array.isArray(data.organizations)) {
        // Nested in organizations field (new API)
        console.log('API returned nested organizations format with', data.organizations.length, 'organizations');
        organizations = data.organizations;
      } else if (data && data.success === false) {
        // API error with success=false
        console.warn('API returned success=false:', data.message);
        return [];
      } else {
        // Unexpected format - try to extract any relevant data
        console.warn('Unexpected organizations API response format:', data);
        
        // Try to extract any array we can find as a last resort
        for (const key in data) {
          if (Array.isArray(data[key])) {
            console.log(`Found array in response at key "${key}" with ${data[key].length} items, using this as fallback`);
            organizations = data[key];
            break;
          }
        }
      }
      
      if (!organizations || organizations.length === 0) {
        console.warn('No organizations found in API response');
        return [];
      }
      
      console.log(`Found ${organizations.length} organizations for user:`, 
        organizations.map(org => `${org.name || 'Unnamed'} (${org.id})`).join(', '));
      
      // Ensure each organization has the required fields
      organizations = organizations.map(org => ({
        id: org.id,
        name: org.name || 'Unnamed Organization',
        role: org.role || 'customer',
        isCurrent: !!org.isCurrent,
        // Add any missing fields with defaults
        ...org
      }));
      
      // If no current organization is marked, mark the first one
      const hasCurrent = organizations.some(org => org.isCurrent);
      if (!hasCurrent && organizations.length > 0) {
        console.log('No organization marked as current, marking the first one:', organizations[0].name);
        organizations[0].isCurrent = true;
      }
      
      return organizations;
    } catch (error) {
      console.error('Error in getUserOrganizations:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },
  
  /**
   * Switch the current user to a different organization
   * @param {string} organizationId - The ID of the organization to switch to
   * @returns {Promise<Object>} Promise resolving to the result of the switch
   */
  switchOrganization: async (organizationId) => {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      console.log(`Requesting switch to organization: ${organizationId}`);
      
      // Use apiRequest instead of direct fetch to ensure path consistency
      const result = await apiRequest('/auth/switch-organization', {
        method: 'POST',
        body: JSON.stringify({ organizationId })
      });
      
      // Validate the response
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      // Check for success flag
      if (result.success === false) {
        throw new Error(result.message || 'Failed to switch organization');
      }
      
      // Update token if provided in the response
      if (result.token) {
        const tokenUpdated = updateStoredToken(result.token);
        console.log('Token update result:', tokenUpdated ? 'Success' : 'Failed');
        
        // Also update local storage with organization context
        if (result.user && result.user.organizationId) {
          localStorage.setItem('currentOrganizationId', result.user.organizationId);
          localStorage.setItem('currentOrganizationName', result.organization?.name || result.user.organizationName || '');
          localStorage.setItem('currentUserRole', result.user.role || '');
          console.log('Updated organization context in localStorage with:', {
            id: result.user.organizationId,
            name: result.organization?.name || result.user.organizationName,
            role: result.user.role
          });
        }
      } else {
        console.warn('No token provided in switch organization response');
      }
      
      return result;
    } catch (error) {
      console.error('Error in switchOrganization:', error);
      throw new Error(`Failed to switch organization: ${error.message || 'Unknown error'}`);
    }
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