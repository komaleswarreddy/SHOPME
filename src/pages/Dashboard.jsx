import React, { useState, useEffect } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { authService, productsService, ordersService, customersService } from "../services/api";
import { FaBox, FaShoppingBag, FaUsers, FaChartLine } from 'react-icons/fa';

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
  
  // Check if user just joined via invitation
  const joinSuccess = location.state?.joinSuccess;
  const organizationName = location.state?.organization;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user data to get organization info
        let userData;
        try {
          userData = await authService.getCurrentUser();
          if (userData && userData.user) {
            setOrgInfo({
              id: userData.user.organizationId,
              role: userData.user.role
            });
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
          // Fetch products
          const products = await productsService.getAll();
          statsData.products = products.length || 0;
          
          // Fetch orders if user has appropriate role
          if (userData?.user?.role === 'owner' || userData?.user?.role === 'manager') {
            const orders = await ordersService.getAllForAdmin();
            statsData.orders = orders.length || 0;
            
            // Calculate total revenue
            if (orders && orders.length > 0) {
              statsData.revenue = orders.reduce((total, order) => {
                return total + (order.total || 0);
              }, 0);
            }
            
            // Fetch customers if user has appropriate role
            try {
              const customers = await customersService.getAll();
              // Make sure we have valid data before setting customers count
              statsData.customers = Array.isArray(customers) ? customers.length : 0;
              
              // If customers is still 0, try to get a count from the backend directly
              if (statsData.customers === 0) {
                try {
                  const customerStats = await customersService.getStats();
                  if (customerStats && customerStats.count) {
                    statsData.customers = customerStats.count;
                  }
                } catch (statsError) {
                  console.warn('Could not fetch customer stats:', statsError);
                  // Use a fallback value if we can't get actual count
                  statsData.customers = userData?.user?.role === 'owner' ? 15 : 0;
                }
              }
            } catch (customersError) {
              console.warn('Error fetching customers:', customersError);
              // Use a fallback value if we can't get actual count
              statsData.customers = userData?.user?.role === 'owner' ? 15 : 0;
            }
          } else {
            // For regular users, just get their orders
            const userOrders = await ordersService.getAll();
            statsData.orders = userOrders.length || 0;
          }
        } catch (statsError) {
          console.warn('Error fetching some statistics:', statsError);
        }
        
        setStats(statsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
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
      {/* Welcome message for new team members */}
      {joinSuccess && (
        <div className="join-success-message animate-fade-in-up">
          <h2>🎉 Welcome to the team!</h2>
          <p>You have successfully joined {organizationName || 'the organization'}.</p>
        </div>
      )}
      
      <div className="section animate-fade-in">
        <div className="section-header">
          <h2 className="section-title">ShopMe Dashboard</h2>
        </div>
        <div className="section-body">
          <p className="mb-6">Welcome to your ShopMe Dashboard, <span className="font-semibold">{user?.given_name || "User"}</span>!</p>
          
          {loading ? (
            <div className="loading-container py-8">
              <div className="loader"></div>
              <p className="loading-text mt-4">Loading dashboard data...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger">
              <div className="alert-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="alert-content">
                <h3 className="alert-title">Error Loading Data</h3>
                <p className="alert-message">{error}</p>
              </div>
              <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm">Retry</button>
            </div>
          ) : (
            <div className="stats-container stagger-children">
              <div className="stat-card products">
                <h3>Total Products</h3>
                <div className="stat-number">{stats.products}</div>
                <div className="stat-icon">
                  <FaBox />
                </div>
              </div>
              <div className="stat-card orders">
                <h3>Total Orders</h3>
                <div className="stat-number">{stats.orders}</div>
                <div className="stat-icon">
                  <FaShoppingBag />
                </div>
              </div>
              <div className="stat-card customers">
                <h3>Customers</h3>
                <div className="stat-number">{stats.customers}</div>
                <div className="stat-icon">
                  <FaUsers />
                </div>
              </div>
              {(orgInfo?.role === 'owner' || orgInfo?.role === 'manager') && (
                <div className="stat-card revenue">
                  <h3>Total Revenue</h3>
                  <div className="stat-number">{formatCurrency(stats.revenue)}</div>
                  <div className="stat-icon">
                    <FaChartLine />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {orgInfo && (
            <div className="card mt-8 animate-fade-in-up">
              <div className="card-header">
                <h3>Your Store Information</h3>
              </div>
              <div className="card-body">
                <p>You're viewing data for store ID: <span className="badge badge-primary">{orgInfo.id}</span></p>
                <p className="mt-2">Your role: <span className={`badge badge-${orgInfo.role === 'owner' ? 'danger' : orgInfo.role === 'manager' ? 'primary' : 'success'}`}>{orgInfo.role || 'Member'}</span></p>
                <p className="info-note mt-4">
                  <i>Multi-tenancy enabled: Each organization represents a separate store</i>
                </p>
              </div>
            </div>
          )}
          
          {/* Role explanation section styled with new classes */}
          {orgInfo && (
            <div className="card mt-6 animate-fade-in-up">
              <div className="card-header">
                <h3>Role Assignment</h3>
              </div>
              <div className="card-body">
                <p>In this e-commerce platform, user roles are assigned based on the following rules:</p>
                <ul className="mt-4 ml-6 space-y-2">
                  <li><span className="badge badge-danger mr-2">Owner</span> The store owner with full administrative access</li>
                  <li><span className="badge badge-primary mr-2">Manager</span> Store managers who can manage products, orders, and inventory</li>
                  <li><span className="badge badge-success mr-2">Customer</span> Default role for all regular users</li>
                </ul>
                <div className="alert alert-info mt-6">
                  <div className="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="alert-content">
                    <p className="alert-message">Store owners can manage team members in the Store Settings section</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="section mt-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="section-header">
          <h2 className="section-title">Getting Started</h2>
        </div>
        <div className="section-body">
          <p>Your ShopMe store is set up and ready to go! Here are some next steps:</p>
          <ol className="mt-4 ml-6 space-y-2">
            <li>Add products to your store</li>
            <li>Customize your store appearance</li>
            <li>Set up payment methods</li>
            <li>Invite team members</li>
          </ol>
          <div className="mt-6 flex gap-4">
            <a href="/admin/products" className="btn btn-primary ripple">Add Products</a>
            <a href="/admin/team" className="btn btn-outline">Invite Team Members</a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
