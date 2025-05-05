import React, { useState, useEffect } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { authService, productsService, ordersService, customersService } from "../services/api";
import { FaBox, FaShoppingBag, FaUsers, FaChartLine, FaSync } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useKindeAuth();
  const location = useLocation();
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0
  });
  const [orgInfo, setOrgInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Check if user just joined via invitation
  const joinSuccess = location.state?.joinSuccess;
  const organizationName = location.state?.organization;
  
  // Check if user just switched organizations
  const orgSwitchSuccess = location.state?.orgSwitchSuccess;
  const newOrgName = location.state?.orgName;
  const newRole = location.state?.role;

  // Function to fetch all dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user data to get organization info
      let userData;
      try {
        userData = await authService.getCurrentUser();
        if (userData && userData.user) {
          console.log('Fetched current user data:', userData.user.organizationId);
          
          setOrgInfo({
            id: userData.user.organizationId,
            name: userData.user.organizationName || 'Your Organization',
            role: userData.user.role
          });
          
          // Save current organization ID to detect changes
          setCurrentOrgId(userData.user.organizationId);
        }
      } catch (userError) {
        console.warn('Could not fetch organization info:', userError);
      }
      
      // Fetch actual counts from APIs
      const statsData = {
        products: 0,
        orders: 0,
        customers: 0,
        revenue: 0
      };
      
      try {
        console.log('Fetching dashboard statistics for organization:', userData?.user?.organizationId);
        
        // Fetch products
        const products = await productsService.getAll();
        statsData.products = products.length || 0;
        
        // Fetch orders if user has appropriate role
        const orders = await ordersService.getAll();
        statsData.orders = orders.length || 0;
        
        // Calculate revenue from orders
        if (orders && orders.length) {
          statsData.revenue = orders.reduce((total, order) => {
            return total + (order.total || 0);
          }, 0);
        }
        
        // Fetch customers if user has appropriate role
        if (userData?.user?.role === 'owner' || userData?.user?.role === 'manager') {
          const customers = await customersService.getAll();
          statsData.customers = customers.length || 0;
        }
        
        // Update stats state
        setStats(statsData);
        console.log('Dashboard statistics updated successfully');
      } catch (apiError) {
        console.warn('Error fetching some statistics:', apiError);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle manual refresh of dashboard data
  const handleRefresh = () => {
    setRefreshing(true);
    toast.promise(
      fetchData(),
      {
        loading: 'Refreshing dashboard data...',
        success: 'Dashboard data refreshed',
        error: 'Failed to refresh data'
      }
    );
  };

  // Listen for organization change events
  useEffect(() => {
    const handleOrgChanged = (event) => {
      const { organizationId, organizationName } = event.detail;
      console.log(`Organization changed event: ${organizationId} (${organizationName})`);
      
      // Force data refresh
      fetchData();
    };
    
    // Add event listener
    window.addEventListener('organizationChanged', handleOrgChanged);
    
    // Clean up
    return () => {
      window.removeEventListener('organizationChanged', handleOrgChanged);
    };
  }, []);

  // Fetch data when component mounts or when dependencies change
  useEffect(() => {
    // Always refetch data when location or organization changes
    fetchData();
    
    // Clear location state after processing to prevent showing alerts on refresh
    if (location.state && (location.state.joinSuccess || location.state.orgSwitchSuccess)) {
      window.history.replaceState({}, document.title);
    }
  }, [location, currentOrgId]); // Add location and currentOrgId to dependencies
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh dashboard data"
          >
            <FaSync className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
        
        {/* Show welcome message after joining an organization */}
        {joinSuccess && (
          <div className="success-alert">
            <h3>Welcome to {organizationName || 'your new organization'}!</h3>
            <p>You've successfully joined as a {location.state?.role || 'member'}.</p>
          </div>
        )}
        
        {/* Show organization switch success message */}
        {orgSwitchSuccess && (
          <div className="success-alert">
            <h3>Organization Switched</h3>
            <p>You are now viewing {newOrgName || 'the new organization'} as a {newRole || 'member'}.</p>
            <p>Your available features and permissions have been updated accordingly.</p>
          </div>
        )}
        
        {/* Loading and error states */}
        {loading && (
          <div className="loading-container">
            <p>Loading dashboard data...</p>
          </div>
        )}
        
        {error && (
          <div className="error-alert">
            <p>{error}</p>
          </div>
        )}
        
        {/* Stats Cards */}
        {!loading && !error && (
          <div className="stats-container">
            <div className="stat-card">
              <div className="icon-bg products">
                <FaBox />
              </div>
              <div className="stat-info">
                <h3>Products</h3>
                <p>{stats.products}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="icon-bg orders">
                <FaShoppingBag />
              </div>
              <div className="stat-info">
                <h3>Orders</h3>
                <p>{stats.orders}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="icon-bg customers">
                <FaUsers />
              </div>
              <div className="stat-info">
                <h3>Customers</h3>
                <p>{stats.customers}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="icon-bg revenue">
                <FaChartLine />
              </div>
              <div className="stat-info">
                <h3>Revenue</h3>
                <p>{formatCurrency(stats.revenue)}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Organization info card */}
        {orgInfo && (
          <div className="card mt-8 animate-fade-in-up">
            <div className="card-header">
              <h3>Your Store Information</h3>
            </div>
            <div className="card-body">
              <p>Organization name: <span className="font-bold">{orgInfo.name}</span></p>
              <p>Organization ID: <span className="badge badge-primary">{orgInfo.id}</span></p>
              <p className="mt-2">Your role: <span className={`badge badge-${orgInfo.role === 'owner' ? 'danger' : orgInfo.role === 'manager' ? 'primary' : 'success'}`}>{orgInfo.role || 'Member'}</span></p>
              <p className="info-note mt-4">
                <i>Multi-tenancy enabled: Each organization represents a separate store</i>
              </p>
            </div>
          </div>
        )}
        
        {/* Role explanation section styled with new classes */}
        <div className="card mt-8 animate-fade-in-up">
          <div className="card-header">
            <h3>Your Role Permissions</h3>
          </div>
          <div className="card-body">
            <div className="role-explanation">
              <div className="role-card">
                <h4 className="owner">Owner Role</h4>
                <ul>
                  <li>Full control of the store</li>
                  <li>Manage team members</li>
                  <li>Configure store settings</li>
                  <li>Full access to all features</li>
                </ul>
              </div>
              <div className="role-card">
                <h4 className="manager">Manager Role</h4>
                <ul>
                  <li>Manage products and inventory</li>
                  <li>Process customer orders</li>
                  <li>View store analytics</li>
                  <li>Limited settings access</li>
                </ul>
              </div>
              <div className="role-card">
                <h4 className="customer">Customer Role</h4>
                <ul>
                  <li>Browse products</li>
                  <li>Place and track orders</li>
                  <li>View order history</li>
                  <li>Manage shopping cart</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
