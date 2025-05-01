import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Get the JWT token from Kinde
 */
export const getKindeToken = async () => {
  try {
    // First try the stored token as it's the most reliable
    const storedToken = localStorage.getItem('b2boost_token');
    if (storedToken) {
      return storedToken;
    }
    
    // If no stored token, return null
    console.log('No stored token available, using null');
    return null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Get the token from localStorage
 */
export const getStoredToken = () => {
  return localStorage.getItem('b2boost_token');
};

/**
 * Register or login a user with the backend after Kinde authentication
 */
export const registerWithBackend = async (kindeUser, retryCount = 0) => {
  try {
    if (!kindeUser) {
      console.error('No user data available from Kinde');
      throw new Error('No user data available from Kinde');
    }

    console.log('Registering user with backend:', {
      email: kindeUser.email,
      id: kindeUser.id
    });
    
    // Log more detailed information to help with debugging
    console.log('Full Kinde user data:', JSON.stringify({
      id: kindeUser.id,
      email: kindeUser.email,
      given_name: kindeUser.given_name,
      family_name: kindeUser.family_name,
      org_code: kindeUser.org_code,
      org_name: kindeUser.org_name,
    }, null, 2));

    // Generate a unique org ID if none exists
    const orgId = kindeUser.org_code || `org-${kindeUser.id.substring(0, 8)}`;

    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kindeId: kindeUser.id,
        email: kindeUser.email,
        firstName: kindeUser.given_name || '',
        lastName: kindeUser.family_name || '',
        organizationId: orgId,
        organizationName: kindeUser.org_name || `${kindeUser.given_name || 'User'}'s Organization`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend registration error:', {
        status: response.status,
        error: errorData,
        kindeId: kindeUser.id,
        email: kindeUser.email
      });
      
      // If we've already retried multiple times, throw the error
      if (retryCount >= 2) {
        throw new Error(errorData.message || 'Failed to register with backend after multiple attempts');
      }
      
      // Retry with a different org id in case of duplicate key error
      if (errorData.error && errorData.error.includes('duplicate key error')) {
        console.log('Retrying with different organization ID');
        const newOrgId = `org-${kindeUser.id.substring(0, 8)}-${Date.now()}`;
        kindeUser.org_code = newOrgId;
        return registerWithBackend(kindeUser, retryCount + 1);
      }
      
      throw new Error(errorData.message || 'Something went wrong during registration');
    }

    const data = await response.json();
    console.log('Backend registration successful', {
      email: kindeUser.email,
      role: data.user?.role,
      kindeId: data.user?.kindeId,
      organizationId: data.user?.organizationId
    });
    
    // Store the token in localStorage
    localStorage.setItem('b2boost_token', data.token);
    
    return data;
  } catch (error) {
    console.error('Error registering with backend:', error);
    throw error;
  }
}; 