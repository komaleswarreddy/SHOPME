import React, { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { authService } from '../services/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBox, FaShoppingCart, FaShoppingBag, FaUsers, FaCog, FaUserFriends, FaBug, FaKey } from 'react-icons/fa';
import AuthDebugHelper from './AuthDebugHelper';
import OrganizationSwitcher from './OrganizationSwitcher';
import { toast } from 'react-hot-toast';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useKindeAuth();
  const [orgInfo, setOrgInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [token, setToken] = useState('');
  const [tokenPayload, setTokenPayload] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Load token for debugging
  useEffect(() => {
    const storedToken = localStorage.getItem('b2boost_token');
    if (storedToken) {
      setToken(storedToken);
      // Parse JWT payload
      try {
        const base64Url = storedToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        setTokenPayload(JSON.parse(jsonPayload));
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  // Toggle debug panel
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  // Force refresh user organizations
  const forceRefreshOrgs = async () => {
    try {
      const orgs = await authService.getUserOrganizations();
      toast.success(`Found ${orgs.length} organizations`);
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Fetch organization info when component mounts or when currentOrgId changes
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        console.log('Fetching user info for dashboard layout...');
        
        // Get current user info from backend
        const userData = await authService.getCurrentUser();
        console.log('User data received:', userData);
        
        if (userData && userData.user) {
          // Check if organization has changed
          if (currentOrgId !== userData.user.organizationId) {
            console.log('Organization changed from', currentOrgId, 'to', userData.user.organizationId);
          }
          
          // Get organization name from various sources in priority order
          const orgName = userData.user.organizationName || // From backend
                        localStorage.getItem('currentOrganizationName') || // From local storage
                        user?.org_name || // From Kinde auth
                        userData.user.email?.split('@')[0] || // Fallback to email username
                        'Your Store'; // Default fallback
                        
          console.log('Setting organization name:', orgName);
          
          setCurrentOrgId(userData.user.organizationId);
          setOrgInfo({
            id: userData.user.organizationId,
            name: orgName,
            role: userData.user.role || 'customer' // Store user role
          });
          
          // Update localStorage with latest organization info
          if (userData.user.organizationId) {
            localStorage.setItem('currentOrganizationId', userData.user.organizationId);
          }
          if (orgName && orgName !== 'Your Store') {
            localStorage.setItem('currentOrganizationName', orgName);
          }
          if (userData.user.role) {
            localStorage.setItem('currentUserRole', userData.user.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Set default values if we can't get user info
        setOrgInfo({
          id: 'unknown',
          name: 'Your Store',
          role: 'customer'
        });
      } finally {
        setLoading(false);
      }
    };

    // Always try to fetch user info, even if Kinde user object isn't available
    fetchUserInfo();
  }, [user, location, currentOrgId]);

  // Function to get role badge color
  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'owner':
        return '#e74c3c'; // Red for owners
      case 'manager':
        return '#3498db'; // Blue for managers
      default:
        return '#2ecc71'; // Green for customers
    }
  };

  // Function to determine menu items based on user role
  const getMenuItems = (role) => {
    const baseItems = [
      { label: 'Dashboard', path: '/dashboard', icon: <FaHome /> },
      { label: 'Products', path: '/products', icon: <FaBox /> },
      { label: 'Shopping Cart', path: '/cart', icon: <FaShoppingCart /> },
      { label: 'Orders', path: '/orders', icon: <FaShoppingBag /> },
    ];
    
    // Add admin items for owners and managers
    if (role === 'owner' || role === 'manager') {
      baseItems.push(
        { label: 'Manage Products', path: '/admin/products', icon: <FaBox /> },
        { label: 'Manage Orders', path: '/admin/orders', icon: <FaShoppingBag /> },
        { label: 'Customers', path: '/admin/customers', icon: <FaUsers /> },
        { label: 'Team Members', path: '/admin/team', icon: <FaUserFriends /> }
      );
      
      // Add organization settings only for owners
      if (role === 'owner') {
        baseItems.push({ label: 'Store Settings', path: '/admin/settings', icon: <FaCog /> });
      }
    }
    
    return baseItems;
  };

  // Handle organization switch
  const handleOrganizationSwitch = async (result) => {
    if (result && result.user) {
      // Log organization switch details
      console.log('Organization switch successful:', result);
      
      // Show loading state
      setLoading(true);
      
      try {
        // Update our local state with the new organization info
        setOrgInfo({
          id: result.user.organizationId,
          name: result.organization.name,
          role: result.user.role
        });
        
        // Update current org ID
        setCurrentOrgId(result.user.organizationId);
        
        // Update localStorage with organization context to ensure consistency
        localStorage.setItem('currentOrganizationId', result.user.organizationId);
        localStorage.setItem('currentOrganizationName', result.organization.name || '');
        localStorage.setItem('currentUserRole', result.user.role || '');
        
        // JWT token has already been updated in localStorage by the API service
        
        // Dispatch a custom event for organization change that child components can listen for
        const orgChangeEvent = new CustomEvent('organizationChanged', { 
          detail: { 
            organizationId: result.user.organizationId,
            organizationName: result.organization.name,
            userRole: result.user.role,
            timestamp: result.timestamp || new Date().toISOString()
          } 
        });
        window.dispatchEvent(orgChangeEvent);
        
        // Show success notification
        toast.success(`Successfully switched to ${result.organization.name}`);
        
        // Redirect to dashboard after a short delay to allow for state updates
        setTimeout(() => {
          navigate('/dashboard', { 
            state: { 
              orgSwitchSuccess: true,
              orgName: result.organization.name,
              role: result.user.role,
              timestamp: new Date().toISOString()
            } 
          });
        }, 200);
      } catch (error) {
        console.error('Error updating local state after organization switch:', error);
        toast.error('Organization switched, but there was an error updating the UI. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    // Try to get from Kinde user first
    if (user?.given_name && user?.family_name) {
      return `${user.given_name.charAt(0)}${user.family_name.charAt(0)}`;
    } else if (user?.given_name) {
      return user.given_name.charAt(0);
    } else if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    // Fallback to organization info if available
    if (orgInfo?.name && orgInfo.name !== 'Your Store') {
      return orgInfo.name.charAt(0).toUpperCase();
    }
    
    // Default fallback
    return 'U';
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>E-Commerce Platform</h1>
        <div className="user-info">
          {!loading && (
            <OrganizationSwitcher onSwitch={handleOrganizationSwitch} />
          )}
          
          <div className="user-avatar" title={user?.email}>
            {getUserInitials()}
          </div>
          
          <span className="user-welcome">
            Welcome, 
            <strong className="user-name">
              {user?.given_name || user?.email?.split('@')[0] || "User"}
            </strong>
            {orgInfo && orgInfo.name && orgInfo.name !== 'Your Store' && (
              <span className="org-context">
                @<span className="org-name">{orgInfo.name}</span>
              </span>
            )}
          </span>
          
          {/* Display role badge if orgInfo is available */}
          {!loading && orgInfo && orgInfo.role && (
            <div 
              className={`role-badge ${orgInfo.role}`}
              title={`Your role: ${orgInfo.role}`}
            >
              {orgInfo.role.charAt(0).toUpperCase() + orgInfo.role.slice(1)}
            </div>
          )}
          
          {/* Debug button (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={toggleDebug} 
              className="btn btn-sm"
              style={{ marginRight: '8px', background: '#f8f9fa', color: '#6c757d' }}
              title="Toggle debug panel"
            >
              <FaBug />
            </button>
          )}
          
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Debug Panel */}
        {showDebug && (
          <div className="debug-panel" style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            width: '400px',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '15px',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            fontSize: '12px'
          }}>
            <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Debug Information
              <button 
                onClick={toggleDebug}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >×</button>
            </h4>
            
            <h5>User Info</h5>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(user, null, 2)}
            </pre>
            
            <h5>Organization Info</h5>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(orgInfo, null, 2)}
            </pre>
            
            <h5>Token Payload</h5>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(tokenPayload, null, 2)}
            </pre>
            
            <div style={{ marginTop: '15px' }}>
              <button 
                onClick={forceRefreshOrgs}
                style={{ 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 15px', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <FaKey style={{ marginRight: '5px' }} />
                Force Refresh Organizations
              </button>
            </div>
          </div>
        )}

        <div className="sidebar">
          <ul>
            {!loading && orgInfo && 
              getMenuItems(orgInfo.role).map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path} 
                    className={location.pathname === item.path ? 'active' : ''}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))
            }
          </ul>
        </div>
        
        <div className="main-content">
          {children}
        </div>
      </div>
      
      {/* Add Auth Debug Helper */}
      <AuthDebugHelper show={false} />
    </div>
  );
};

export default DashboardLayout; 