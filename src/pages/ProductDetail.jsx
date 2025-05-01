import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { productsService, cartService } from '../services/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await productsService.getById(id);
        setProduct(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        setError('Failed to load product details. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      setQuantity(1);
    } else if (product && value > product.stock) {
      setQuantity(product.stock);
    } else {
      setQuantity(value);
    }
  };

  // Handle increment quantity
  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  // Handle decrement quantity
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      await cartService.addItem(id, quantity);
      setAddingToCart(false);
      
      // Show success message and navigate to cart
      alert(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to your cart!`);
      navigate('/cart');
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      setAddingToCart(false);
      alert(`Failed to add item to cart: ${error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="product-detail-page">
        {loading ? (
          <div className="loading-container">
            <p>Loading product details...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => navigate('/products')} className="back-button">
              Go Back to Products
            </button>
          </div>
        ) : product ? (
          <div className="product-detail">
            <div className="back-link">
              <button onClick={() => navigate('/products')} className="back-button">
                &larr; Back to Products
              </button>
            </div>
            
            <div className="product-detail-content">
              <div className="product-images">
                <div className="product-main-image">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[selectedImage]} 
                      alt={product.name} 
                      className="main-image" 
                    />
                  ) : (
                    <div className="no-image">No Image Available</div>
                  )}
                </div>
                
                {product.images && product.images.length > 1 && (
                  <div className="product-thumbnails">
                    {product.images.map((image, index) => (
                      <div 
                        key={index}
                        className={`thumbnail ${selectedImage === index ? 'selected' : ''}`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img src={image} alt={`${product.name} thumbnail ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="product-info">
                <h1 className="product-name">{product.name}</h1>
                <p className="product-price">${product.price.toFixed(2)}</p>
                <span className="product-category">{product.category}</span>
                
                <div className="product-description">
                  <h3>Description</h3>
                  <p>{product.description}</p>
                </div>
                
                <div className="product-stock">
                  <p className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {product.stock > 0 
                      ? `In Stock (${product.stock} available)` 
                      : 'Out of Stock'}
                  </p>
                </div>
                
                {product.stock > 0 && (
                  <div className="product-actions">
                    <div className="quantity-selector">
                      <button 
                        onClick={decrementQuantity} 
                        className="quantity-button"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        max={product.stock}
                        className="quantity-input"
                      />
                      <button 
                        onClick={incrementQuantity} 
                        className="quantity-button"
                        disabled={quantity >= product.stock}
                      >
                        +
                      </button>
                    </div>
                    
                    <button 
                      className="add-to-cart-button"
                      disabled={addingToCart || product.stock <= 0}
                      onClick={handleAddToCart}
                    >
                      {addingToCart ? 'Adding...' : 'Add to Cart'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="not-found">
            <p>Product not found</p>
            <button onClick={() => navigate('/products')} className="back-button">
              Go Back to Products
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProductDetail; 