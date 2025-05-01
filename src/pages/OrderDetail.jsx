import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ordersService } from '../services/api';

const statusColors = {
  pending: '#f39c12',    // Orange
  processing: '#3498db', // Blue
  shipped: '#2ecc71',    // Green
  delivered: '#27ae60',  // Darker Green
  cancelled: '#e74c3c'   // Red
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if this is a newly placed order (coming from checkout)
  const orderJustPlaced = location.state?.orderPlaced;

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await ordersService.getById(id);
        setOrder(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setError('Failed to load order details. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id]);

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
      <div className="order-detail-page">
        {orderJustPlaced && (
          <div className="order-success-message">
            <h2>🎉 Order Placed Successfully!</h2>
            <p>Thank you for your purchase. Your order has been received and is being processed.</p>
          </div>
        )}

        <div className="back-link">
          <button onClick={() => navigate('/orders')} className="back-button">
            &larr; Back to Orders
          </button>
        </div>

        <h1>Order Details</h1>

        {loading ? (
          <div className="loading-container">
            <p>Loading order details...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => navigate('/orders')} className="back-button">
              Return to Orders
            </button>
          </div>
        ) : order ? (
          <div className="order-detail">
            <div className="order-header">
              <div className="order-id">
                <h2>Order #{order._id.substring(order._id.length - 8)}</h2>
                <p>Placed on {formatDate(order.createdAt)}</p>
              </div>
              <div 
                className="order-status" 
                style={{ backgroundColor: statusColors[order.status] || '#7f8c8d' }}
              >
                {formatStatus(order.status)}
              </div>
            </div>

            <div className="order-sections">
              <div className="order-section">
                <h3>Items</h3>
                <div className="order-items">
                  <div className="order-item header">
                    <div className="item-name">Product</div>
                    <div className="item-price">Price</div>
                    <div className="item-quantity">Quantity</div>
                    <div className="item-total">Total</div>
                  </div>
                  {order.items.map(item => (
                    <div key={item._id} className="order-item">
                      <div className="item-name">{item.name}</div>
                      <div className="item-price">${item.price.toFixed(2)}</div>
                      <div className="item-quantity">{item.quantity}</div>
                      <div className="item-total">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-section">
                <h3>Payment & Shipping</h3>
                <div className="order-info-columns">
                  <div className="order-payment-info">
                    <h4>Payment Information</h4>
                    <p><strong>Method:</strong> {formatStatus(order.paymentMethod)}</p>
                    <p><strong>Payment ID:</strong> {order.paymentId}</p>
                  </div>
                  
                  <div className="order-shipping-info">
                    <h4>Shipping Address</h4>
                    <p>{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    <p><strong>Phone:</strong> {order.shippingAddress.phoneNumber}</p>
                  </div>
                </div>
              </div>

              <div className="order-section">
                <h3>Order Summary</h3>
                <div className="order-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax:</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Shipping:</span>
                    <span>
                      {order.shippingCost === 0 
                        ? 'Free' 
                        : `$${order.shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="summary-row total">
                    <span>Total:</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional: Add a button to track shipment, reorder, etc. */}
            {order.status === 'shipped' && order.trackingNumber && (
              <div className="tracking-info">
                <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
                <button className="track-shipment-button">
                  Track Shipment
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="not-found">
            <p>Order not found</p>
            <button onClick={() => navigate('/orders')} className="back-button">
              Return to Orders
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrderDetail; 