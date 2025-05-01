import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { ordersService } from '../../services/api';
import '../../styles/OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ordersService.getById(id);
      setOrder(data);
      setTrackingNumber(data.trackingNumber || '');
      setNotes(data.adminNotes || '');
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      setError('Failed to load order details. Please try again later.');
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await ordersService.updateStatus(id, { status: newStatus });
      setOrder(prev => ({ ...prev, status: newStatus }));
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Error: ${error.message || 'Failed to update order status'}`);
    }
  };

  const handleUpdateTracking = async () => {
    try {
      await ordersService.updateTracking(id, { trackingNumber });
      setOrder(prev => ({ ...prev, trackingNumber }));
      alert('Tracking number updated successfully');
    } catch (error) {
      console.error('Error updating tracking number:', error);
      alert(`Error: ${error.message || 'Failed to update tracking number'}`);
    }
  };

  const handleUpdateNotes = async () => {
    try {
      await ordersService.updateNotes(id, { adminNotes: notes });
      setOrder(prev => ({ ...prev, adminNotes: notes }));
      alert('Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      alert(`Error: ${error.message || 'Failed to update notes'}`);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const printOrder = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-container">
          <p>Loading order details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="error-container">
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchOrderDetails} className="retry-button">
              Try Again
            </button>
            <button onClick={() => navigate('/admin/orders')} className="back-button">
              Back to Orders
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="not-found-container">
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <button onClick={() => navigate('/admin/orders')} className="back-button">
            Back to Orders
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="order-detail-container">
        <div className="order-header">
          <div className="order-header-left">
            <h1>Order #{order._id.slice(-8)}</h1>
            <div className="order-dates">
              <p>Ordered: {formatDate(order.createdAt)}</p>
              {order.updatedAt !== order.createdAt && (
                <p>Last Updated: {formatDate(order.updatedAt)}</p>
              )}
            </div>
            <div className="order-status">
              <span className={`status-badge ${statusColors[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="order-header-right">
            <button onClick={() => navigate('/admin/orders')} className="btn-back">
              Back to Orders
            </button>
            <button onClick={printOrder} className="btn-print">
              Print Order
            </button>
          </div>
        </div>

        <div className="order-content">
          <div className="order-details-section">
            <div className="customer-info">
              <h2>Customer Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{order.shippingAddress?.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{order.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{order.shippingAddress?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="address-section">
              <div className="shipping-address">
                <h2>Shipping Address</h2>
                <p>{order.shippingAddress?.name}</p>
                <p>{order.shippingAddress?.street}</p>
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                </p>
                <p>{order.shippingAddress?.country}</p>
              </div>
              <div className="billing-address">
                <h2>Billing Address</h2>
                <p>{order.billingAddress?.name}</p>
                <p>{order.billingAddress?.street}</p>
                <p>
                  {order.billingAddress?.city}, {order.billingAddress?.state} {order.billingAddress?.zipCode}
                </p>
                <p>{order.billingAddress?.country}</p>
              </div>
            </div>

            <div className="order-items">
              <h2>Order Items</h2>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.sku || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>${item.price.toFixed(2)}</td>
                      <td>${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="text-right">Subtotal:</td>
                    <td>${order.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="4" className="text-right">Shipping:</td>
                    <td>${order.shippingCost.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="4" className="text-right">Tax:</td>
                    <td>${order.tax.toFixed(2)}</td>
                  </tr>
                  <tr className="total-row">
                    <td colSpan="4" className="text-right">Total:</td>
                    <td>${order.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="order-management">
            <div className="order-actions">
              <h2>Order Actions</h2>
              <div className="status-update">
                <label htmlFor="status-select">Update Status:</label>
                <select
                  id="status-select"
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="tracking-info">
              <h2>Tracking Information</h2>
              <div className="input-group">
                <label htmlFor="tracking-carrier">Carrier:</label>
                <input
                  id="tracking-carrier"
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. FedEx, UPS"
                />
              </div>
              <button
                onClick={handleUpdateTracking}
                className="btn-update"
                disabled={trackingNumber === order.trackingNumber}
              >
                Update Tracking
              </button>
            </div>

            <div className="admin-notes">
              <h2>Admin Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this order"
                rows="5"
              ></textarea>
              <button
                onClick={handleUpdateNotes}
                className="btn-update"
                disabled={notes === order.adminNotes}
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderDetail; 