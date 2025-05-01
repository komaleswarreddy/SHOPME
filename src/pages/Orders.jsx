import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ordersService } from '../services/api';

const statusColors = {
  pending: '#f39c12',    // Orange
  processing: '#3498db', // Blue
  shipped: '#2ecc71',    // Green
  delivered: '#27ae60',  // Darker Green
  cancelled: '#e74c3c'   // Red
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await ordersService.getAll();
        // Sort orders by date (newest first)
        const sortedOrders = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sortedOrders);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setError('Failed to load your orders. Please try again later.');
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Format date to a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Capitalize first letter and replace underscores with spaces
  const formatStatus = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <DashboardLayout>
      <div className="orders-page">
        <h1>Your Orders</h1>

        {loading ? (
          <div className="loading-container">
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="no-orders">
            <p>You haven't placed any orders yet.</p>
            <Link to="/products" className="shop-now-button">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order._id.substring(order._id.length - 8)}</h3>
                    <p className="order-date">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <div 
                    className="order-status" 
                    style={{ backgroundColor: statusColors[order.status] || '#7f8c8d' }}
                  >
                    {formatStatus(order.status)}
                  </div>
                </div>
                
                <div className="order-items">
                  {order.items.slice(0, 3).map(item => (
                    <div key={item._id} className="order-item">
                      <div className="item-quantity">{item.quantity}x</div>
                      <div className="item-name">{item.name}</div>
                      <div className="item-price">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="more-items">
                      + {order.items.length - 3} more item(s)
                    </div>
                  )}
                </div>
                
                <div className="order-footer">
                  <div className="order-total">
                    <span>Total:</span>
                    <span className="total-amount">${order.total.toFixed(2)}</span>
                  </div>
                  <Link 
                    to={`/orders/${order._id}`} 
                    className="view-order-button"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders; 