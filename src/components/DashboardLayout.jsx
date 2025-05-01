import React, { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { authService } from '../services/api';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBox, FaShoppingCart, FaShoppingBag, FaUsers, FaCog, FaUserFriends } from 'react-icons/fa';
import AuthDebugHelper from './AuthDebugHelper';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useKindeAuth();
  const [orgInfo, setOrgInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Fetch organization info when component mounts
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        // Get current user info from backend
        const userData = await authService.getCurrentUser();
        if (userData && userData.user) {
          setOrgInfo({
            id: userData.user.organizationId,
            // The actual name would ideally come from an API call to get organization details
            name: user?.org_name || userData.user.email?.split('@')[0] || 'Your Store',
            role: userData.user.role || 'customer' // Store user role
          });
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
  }, [user]);

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

  // Determine which menu items to show based on user role
  const getMenuItems = (role) => {
    // Common menu items for all users
    const commonItems = [
      { path: '/dashboard', label: 'Dashboard', icon: <FaHome /> },
      { path: '/products', label: 'Products', icon: <FaBox /> },
    ];
    
    // Items only visible to customers
    const customerItems = [
      { path: '/cart', label: 'Shopping Cart', icon: <FaShoppingCart /> },
      { path: '/orders', label: 'My Orders', icon: <FaShoppingBag /> },
    ];
    
    // Items only visible to store managers and owners
    const adminItems = [
      { path: '/admin/products', label: 'Manage Products', icon: <FaBox /> },
      { path: '/admin/orders', label: 'Order Management', icon: <FaShoppingBag /> },
      { path: '/admin/customers', label: 'Customers', icon: <FaUsers /> },
    ];
    
    // Items only visible to store owners
    const ownerItems = [
      { path: '/admin/settings', label: 'Store Settings', icon: <FaCog /> },
      { path: '/admin/team', label: 'Team Members', icon: <FaUserFriends /> },
    ];
    
    let menuItems = [...commonItems];
    
    if (role === 'customer') {
      menuItems = [...menuItems, ...customerItems];
    } else if (role === 'manager') {
      menuItems = [...menuItems, ...adminItems];
    } else if (role === 'owner') {
      menuItems = [...menuItems, ...adminItems, ...ownerItems];
    }
    
    return menuItems;
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
          {!loading && orgInfo && (
            <div className="org-badge">
              <span className="org-name" title={`Store ID: ${orgInfo.id}`}>
                {orgInfo.name}
              </span>
            </div>
          )}
          
          <div className="user-avatar" title={user?.email}>
            {getUserInitials()}
          </div>
          
          <span>Welcome, {user?.given_name || 
                    (orgInfo && orgInfo.name !== 'Your Store' ? orgInfo.name : 
                    user?.email || "User")}!</span>
          
          {/* Display role badge if orgInfo is available */}
          {!loading && orgInfo && orgInfo.role && (
            <div 
              className={`role-badge ${orgInfo.role}`}
              title={`Your role: ${orgInfo.role}`}
            >
              {orgInfo.role.charAt(0).toUpperCase() + orgInfo.role.slice(1)}
            </div>
          )}
          
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
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