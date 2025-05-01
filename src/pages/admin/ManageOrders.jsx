import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { ordersService } from '../../services/api';
import '../../styles/admin.css';

const ManageOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // date, total, status
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ordersService.getAllForAdmin();
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to load orders. Please try again later.');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await ordersService.updateStatus(orderId, { status: newStatus });
      // Update local state to reflect the change
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Error: ${error.message || 'Failed to update order status'}`);
    }
  };

  const handleAddTracking = async (orderId, currentTracking = '') => {
    const trackingNumber = window.prompt('Enter tracking number:', currentTracking);
    if (trackingNumber === null) return; // User cancelled
    
    try {
      await ordersService.updateTracking(orderId, { trackingNumber });
      
      // Update local state
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, trackingNumber } : order
      ));
      
      alert('Tracking number updated successfully');
    } catch (error) {
      console.error('Error updating tracking number:', error);
      alert(`Error: ${error.message || 'Failed to update tracking number'}`);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'date') {
      return sortOrder === 'asc' 
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'total') {
      return sortOrder === 'asc' 
        ? a.total - b.total
        : b.total - a.total;
    } else if (sortBy === 'status') {
      // Arbitrary status order: cancelled < pending < processing < shipped < delivered
      const statusOrder = {
        cancelled: 1,
        pending: 2,
        processing: 3,
        shipped: 4,
        delivered: 5
      };
      
      return sortOrder === 'asc'
        ? statusOrder[a.status] - statusOrder[b.status]
        : statusOrder[b.status] - statusOrder[a.status];
    }
    return 0;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      // If already sorting by this field, toggle direction
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Start with descending order for new field
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <DashboardLayout>
      <div className="manage-orders-page">
        <div className="page-header">
          <h1>Manage Orders</h1>
          <div className="filters-container">
            <div className="filter-group">
              <label htmlFor="statusFilter">Filter by Status:</label>
              <select
                id="statusFilter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button 
              onClick={fetchOrders}
              className="refresh-btn"
              title="Refresh Orders"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <p>Loading orders...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => fetchOrders()} className="retry-button">
              Try Again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-orders">
            <p>No orders found matching your criteria.</p>
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th 
                    className="sortable-header"
                    onClick={() => toggleSort('date')}
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Customer</th>
                  <th 
                    className="sortable-header"
                    onClick={() => toggleSort('total')}
                  >
                    Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Items</th>
                  <th 
                    className="sortable-header"
                    onClick={() => toggleSort('status')}
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map(order => (
                  <tr key={order._id}>
                    <td>
                      <span className="order-id">{order._id.slice(-8)}</span>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <div className="customer-info">
                        <span>{order.shippingAddress?.name}</span>
                        <span className="customer-email">{order.email}</span>
                      </div>
                    </td>
                    <td>${order.total.toFixed(2)}</td>
                    <td>{order.items?.length || 0} items</td>
                    <td>
                      <span className={`status-badge ${statusColors[order.status]}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="view-btn"
                        onClick={() => navigate(`/admin/orders/${order._id}`)}
                        title="View Order Details"
                      >
                        View
                      </button>
                      
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      {(order.status === 'shipped' || order.status === 'delivered') && (
                        <button
                          className="tracking-btn"
                          onClick={() => handleAddTracking(order._id, order.trackingNumber)}
                          title={order.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
                        >
                          {order.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageOrders; 