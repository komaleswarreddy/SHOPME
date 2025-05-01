import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { cartService } from '../services/api';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await cartService.getCart();
        setCart(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cart:', error);
        setError('Failed to load your shopping cart. Please try again later.');
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  // Update item quantity
  const updateItemQuantity = async (productId, quantity) => {
    try {
      setUpdating(true);
      await cartService.updateItem(productId, quantity);
      
      // Refresh cart
      const updatedCart = await cartService.getCart();
      setCart(updatedCart);
      setUpdating(false);
    } catch (error) {
      console.error('Failed to update cart:', error);
      alert('Failed to update cart. Please try again.');
      setUpdating(false);
    }
  };

  // Remove item from cart
  const removeItem = async (productId) => {
    try {
      setUpdating(true);
      await cartService.removeItem(productId);
      
      // Refresh cart
      const updatedCart = await cartService.getCart();
      setCart(updatedCart);
      setUpdating(false);
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      alert('Failed to remove item from cart. Please try again.');
      setUpdating(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        setUpdating(true);
        await cartService.clearCart();
        
        // Refresh cart
        const updatedCart = await cartService.getCart();
        setCart(updatedCart);
        setUpdating(false);
      } catch (error) {
        console.error('Failed to clear cart:', error);
        alert('Failed to clear cart. Please try again.');
        setUpdating(false);
      }
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  return (
    <DashboardLayout>
      <div className="cart-page">
        <div className="cart-header">
          <h1>Your Shopping Cart</h1>
          {cart.items.length > 0 && (
            <button 
              onClick={clearCart} 
              className="clear-cart-button"
              disabled={updating}
            >
              Clear Cart
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-container">
            <p>Loading your cart...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Try Again
            </button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/products" className="continue-shopping">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cart.items.map(item => (
                <div key={item.product._id} className="cart-item">
                  <div className="item-image">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img src={item.product.images[0]} alt={item.product.name} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>
                  
                  <div className="item-details">
                    <h3 className="item-name">{item.product.name}</h3>
                    <p className="item-price">${item.price.toFixed(2)}</p>
                    <p className="item-description">
                      {item.product.description.substring(0, 100)}
                      {item.product.description.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  
                  <div className="item-quantity">
                    <button 
                      onClick={() => updateItemQuantity(item.product._id, item.quantity - 1)}
                      disabled={updating || item.quantity <= 1}
                      className="quantity-button"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      onClick={() => updateItemQuantity(item.product._id, item.quantity + 1)}
                      disabled={updating || item.quantity >= item.product.stock}
                      className="quantity-button"
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="item-subtotal">
                    <p>${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <div className="item-actions">
                    <button 
                      onClick={() => removeItem(item.product._id)}
                      disabled={updating}
                      className="remove-button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (10%):</span>
                <span>${(calculateTotal() * 0.1).toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>
                  {calculateTotal() > 50 
                    ? 'Free' 
                    : `$${(10).toFixed(2)}`}
                </span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>
                  ${(
                    calculateTotal() + 
                    calculateTotal() * 0.1 + 
                    (calculateTotal() > 50 ? 0 : 10)
                  ).toFixed(2)}
                </span>
              </div>
              <button 
                onClick={() => navigate('/checkout')}
                className="checkout-button"
                disabled={updating}
              >
                Proceed to Checkout
              </button>
              <Link to="/products" className="continue-shopping">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Cart; 