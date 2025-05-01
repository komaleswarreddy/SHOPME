import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { getStoredToken } from '../services/auth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useKindeAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check for stored JWT token
    const storedToken = getStoredToken();
    
    // Set hasToken based on token presence
    if (storedToken) {
      // Check if token is a valid JWT format (not checking signature)
      try {
        const [header, payload, signature] = storedToken.split('.');
        if (header && payload && signature) {
          console.log('Valid JWT token format found');
          setHasToken(true);
        } else {
          console.warn('Invalid JWT token format');
          setHasToken(false);
        }
      } catch (e) {
        console.warn('Error parsing JWT token', e);
        setHasToken(false);
      }
    } else {
      setHasToken(false);
    }
    
    setIsChecking(false);
  }, []);

  useEffect(() => {
    // Only redirect if we're not loading, not authenticated with Kinde,
    // and don't have a stored token
    if (!isLoading && !isChecking && !isAuthenticated && !hasToken) {
      console.log('Not authenticated, redirecting to login page');
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate, isChecking, hasToken]);

  if (isLoading || isChecking) {
    return <div>Loading...</div>;
  }

  // Allow access if either Kinde is authenticated OR we have a valid backend token
  return (isAuthenticated || hasToken) ? children : null;
};

export default ProtectedRoute; 