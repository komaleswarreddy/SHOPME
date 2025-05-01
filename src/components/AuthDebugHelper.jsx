import React, { useEffect, useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { getStoredToken } from '../services/auth';

/**
 * A component to help debug authentication issues.
 * Can be included in protected routes temporarily to diagnose problems.
 * 
 * @returns Debug information about auth state
 */
const AuthDebugHelper = ({ show = true }) => {
  const { isAuthenticated, isLoading, user } = useKindeAuth();
  const [backendToken, setBackendToken] = useState(null);
  const [showDebug, setShowDebug] = useState(show);

  useEffect(() => {
    // Check for backend token
    const token = getStoredToken();
    if (token) {
      try {
        // Parse JWT token parts
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const expDate = new Date(payload.exp * 1000);
          const isExpired = expDate < new Date();
          
          setBackendToken({
            preview: token.substring(0, 15) + '...',
            exp: expDate.toLocaleString(),
            isExpired,
            sub: payload.sub
          });
        } else {
          setBackendToken({ preview: 'Invalid token format' });
        }
      } catch (e) {
        setBackendToken({ preview: 'Error parsing token' });
      }
    } else {
      setBackendToken({ preview: 'No token' });
    }
  }, []);

  // Log user info to console for easy copy-paste
  useEffect(() => {
    if (user) {
      console.log('============ KINDE USER INFO FOR DEBUGGING ============');
      console.log('Kinde User ID (Copy this for fix-kinde-ids.js script):', user.id);
      console.log('Kinde User Email:', user.email);
      console.log('Full Kinde User Object:', user);
      console.log('Command to fix this user:');
      console.log(`node backend/fix-kinde-ids.js ${user.email} ${user.id}`);
      console.log('====================================================');
    }
  }, [user]);

  if (!showDebug) {
    return (
      <div style={{ position: 'fixed', bottom: '5px', right: '5px', zIndex: 9999 }}>
        <button 
          onClick={() => setShowDebug(true)}
          style={{ 
            background: '#333', 
            color: '#fff', 
            border: 'none', 
            padding: '5px 10px', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Debug Auth
        </button>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px', 
        background: '#f5f5f5', 
        border: '1px solid #ddd', 
        padding: '10px', 
        borderRadius: '5px',
        zIndex: 9999,
        maxWidth: '400px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Authentication Debug</h3>
        <button 
          onClick={() => setShowDebug(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        >
          ×
        </button>
      </div>
      
      <div style={{ margin: '5px 0', backgroundColor: '#e9f7fe', padding: '8px', borderRadius: '4px' }}>
        <strong>Kinde User ID:</strong> <span style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{user?.id || 'N/A'}</span>
        <button 
          onClick={() => {
            if (user?.id) {
              navigator.clipboard.writeText(user.id);
              alert('Copied Kinde ID to clipboard!');
            }
          }}
          style={{ 
            marginLeft: '5px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            padding: '1px 5px', 
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Copy
        </button>
      </div>
      
      <div style={{ margin: '5px 0' }}>
        <strong>Kinde Auth State:</strong> {isLoading ? 'Loading...' : (isAuthenticated ? 'Authenticated' : 'Not Authenticated')}
      </div>
      
      <div style={{ margin: '5px 0' }}>
        <strong>Backend Token:</strong> {backendToken?.preview || 'N/A'}
      </div>
      
      <div style={{ margin: '5px 0' }}>
        <strong>Token Expiration:</strong> {backendToken?.exp || 'N/A'}
      </div>
      
      <div style={{ margin: '5px 0' }}>
        <strong>Token Expired:</strong> {backendToken?.isExpired !== undefined ? (backendToken.isExpired ? 'Yes' : 'No') : 'N/A'}
      </div>
      
      <div style={{ margin: '5px 0' }}>
        <strong>User Email:</strong> {user?.email || 'N/A'}
      </div>

      <div style={{ margin: '8px 0', padding: '8px', backgroundColor: '#e6fff2', borderRadius: '4px' }}>
        <strong>Run this command to fix authentication:</strong>
        <div style={{ fontFamily: 'monospace', marginTop: '4px', wordBreak: 'break-all', backgroundColor: '#f8f9fa', padding: '4px' }}>
          node backend/fix-kinde-ids.js {user?.email} {user?.id}
        </div>
        <button 
          onClick={() => {
            if (user?.email && user?.id) {
              navigator.clipboard.writeText(`node backend/fix-kinde-ids.js ${user.email} ${user.id}`);
              alert('Copied command to clipboard!');
            }
          }}
          style={{ 
            marginTop: '4px',
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            padding: '3px 6px', 
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Copy Command
        </button>
      </div>

      <div style={{ margin: '5px 0' }}>
        <strong>Actions:</strong>
        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
          <button 
            onClick={() => localStorage.removeItem('b2boost_token')}
            style={{ 
              background: '#dc3545', 
              color: 'white', 
              border: 'none', 
              padding: '3px 6px', 
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Clear Token
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ 
              background: '#007bff', 
              color: 'white', 
              border: 'none', 
              padding: '3px 6px', 
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugHelper; 