import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import DashboardLayout from '../components/DashboardLayout';
import { cartService, ordersService } from '../services/api';

const Checkout = () => {
  const { user } = useKindeAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.given_name && user?.family_name ? `${user.given_name} ${user.family_name}` : '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await cartService.getCart();
        
        // If cart is empty, redirect to cart page
        if (!data.items || data.items.length === 0) {
          navigate('/cart');
          return;
        }
        
        setCart(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cart:', error);
        setError('Failed to load your shopping cart. Please try again later.');
        setLoading(false);
      }
    };

    fetchCart();
  }, [navigate]);

  // Handle shipping address change
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Calculate tax
  const calculateTax = (subtotal) => {
    return subtotal * 0.1; // 10% tax
  };

  // Calculate shipping cost
  const calculateShipping = (subtotal) => {
    return subtotal > 50 ? 0 : 10; // Free shipping over $50
  };

  // Calculate total
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const shipping = calculateShipping(subtotal);
    return subtotal + tax + shipping;
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const requiredFields = [
      'fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phoneNumber'
    ];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!shippingAddress[field]) {
        errors[field] = 'This field is required';
      }
    });
    
    // Validate phone format
    const phonePattern = /^\d{10,15}$/;
    if (shippingAddress.phoneNumber && !phonePattern.test(shippingAddress.phoneNumber.replace(/[^0-9]/g, ''))) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    // Validate postal code format
    const postalPattern = /^[a-zA-Z0-9 -]{3,10}$/;
    if (shippingAddress.postalCode && !postalPattern.test(shippingAddress.postalCode)) {
      errors.postalCode = 'Please enter a valid postal code';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Place order
  const placeOrder = async () => {
    // Validate form
    if (!validateForm()) {
      window.scrollTo(0, 0); // Scroll to top to show errors
      return;
    }
    
    try {
      setProcessingOrder(true);
      
      // Create a mock payment ID for demo purposes
      // In a real application, this would come from a payment gateway
      const mockPaymentId = `mock_payment_${Date.now()}`;
      
      // Place the order
      const orderData = {
        shippingAddress,
        paymentMethod,
        paymentId: mockPaymentId
      };
      
      const order = await ordersService.create(orderData);
      
      // Order successfully placed
      setProcessingOrder(false);
      
      // Navigate to order confirmation page
      navigate(`/orders/${order._id}`, { 
        state: { 
          orderPlaced: true,
          orderId: order._id
        } 
      });
      
    } catch (error) {
      console.error('Failed to place order:', error);
      setProcessingOrder(false);
      alert(`Failed to place order: ${error.message}. Please try again.`);
    }
  };

  return (
    <DashboardLayout>
      <div className="checkout-page">
        <h1>Checkout</h1>

        {loading ? (
          <div className="loading-container">
            <p>Loading checkout information...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => navigate('/cart')} className="back-button">
              Return to Cart
            </button>
          </div>
        ) : (
          <div className="checkout-content">
            <div className="checkout-form">
              <h2>Shipping Address</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={shippingAddress.fullName}
                    onChange={handleAddressChange}
                    className={formErrors.fullName ? 'error' : ''}
                    required
                  />
                  {formErrors.fullName && <span className="error-message">{formErrors.fullName}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="addressLine1">Address Line 1 *</label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    value={shippingAddress.addressLine1}
                    onChange={handleAddressChange}
                    className={formErrors.addressLine1 ? 'error' : ''}
                    required
                  />
                  {formErrors.addressLine1 && <span className="error-message">{formErrors.addressLine1}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="addressLine2">Address Line 2</label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={shippingAddress.addressLine2}
                    onChange={handleAddressChange}
                  />
                </div>
              </div>

              <div className="form-row two-columns">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={shippingAddress.city}
                    onChange={handleAddressChange}
                    className={formErrors.city ? 'error' : ''}
                    required
                  />
                  {formErrors.city && <span className="error-message">{formErrors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="state">State/Province *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={shippingAddress.state}
                    onChange={handleAddressChange}
                    className={formErrors.state ? 'error' : ''}
                    required
                  />
                  {formErrors.state && <span className="error-message">{formErrors.state}</span>}
                </div>
              </div>

              <div className="form-row two-columns">
                <div className="form-group">
                  <label htmlFor="postalCode">Postal Code *</label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={shippingAddress.postalCode}
                    onChange={handleAddressChange}
                    className={formErrors.postalCode ? 'error' : ''}
                    required
                  />
                  {formErrors.postalCode && <span className="error-message">{formErrors.postalCode}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="country">Country *</label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={shippingAddress.country}
                    onChange={handleAddressChange}
                    className={formErrors.country ? 'error' : ''}
                    required
                  />
                  {formErrors.country && <span className="error-message">{formErrors.country}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number *</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={shippingAddress.phoneNumber}
                    onChange={handleAddressChange}
                    className={formErrors.phoneNumber ? 'error' : ''}
                    required
                  />
                  {formErrors.phoneNumber && <span className="error-message">{formErrors.phoneNumber}</span>}
                </div>
              </div>

              <h2>Payment Method</h2>
              <div className="payment-methods">
                <div className="payment-method">
                  <input
                    type="radio"
                    id="creditCard"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={handlePaymentMethodChange}
                  />
                  <label htmlFor="creditCard">Credit Card</label>
                </div>
                <div className="payment-method">
                  <input
                    type="radio"
                    id="paypal"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={handlePaymentMethodChange}
                  />
                  <label htmlFor="paypal">PayPal</label>
                </div>
                <div className="payment-method">
                  <input
                    type="radio"
                    id="stripe"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={handlePaymentMethodChange}
                  />
                  <label htmlFor="stripe">Stripe</label>
                </div>
              </div>
              
              <div className="payment-note">
                <p><strong>Note:</strong> This is a demo application. No actual payment will be processed.</p>
              </div>
            </div>

            <div className="order-summary">
              <h2>Order Summary</h2>
              <div className="summary-items">
                {cart.items.map(item => (
                  <div key={item.product._id} className="summary-item">
                    <div className="item-name">
                      <span>{item.product.name}</span>
                      <span className="item-quantity">x{item.quantity}</span>
                    </div>
                    <div className="item-price">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="summary-totals">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (10%):</span>
                  <span>${calculateTax(calculateSubtotal()).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>
                    {calculateShipping(calculateSubtotal()) === 0 
                      ? 'Free' 
                      : `$${calculateShipping(calculateSubtotal()).toFixed(2)}`}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              
              <div className="checkout-actions">
                <button
                  className="back-to-cart"
                  onClick={() => navigate('/cart')}
                  disabled={processingOrder}
                >
                  Back to Cart
                </button>
                <button
                  className="place-order-button"
                  onClick={placeOrder}
                  disabled={processingOrder}
                >
                  {processingOrder ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Checkout; 