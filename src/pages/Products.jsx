import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { productsService } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'All',
    'Clothing',
    'Electronics',
    'Home',
    'Beauty',
    'Sports',
    'Books',
    'Others'
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await productsService.getAll();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setError('Failed to load products. Please try again later.');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products by category and search term
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <DashboardLayout>
      <div className="products-page">
        <div className="products-header">
          <h1>Products</h1>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
        </div>

        <div className="categories-container">
          <h3>Categories</h3>
          <div className="categories-list">
            {categories.map(category => (
              <button
                key={category}
                className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Try Again
            </button>
          </div>
        ) : (
          <div className="products-container">
            {filteredProducts.length === 0 ? (
              <div className="no-products">
                <p>No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <div key={product._id} className="product-card">
                    <div className="product-image">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <div className="product-details">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-price">${product.price.toFixed(2)}</p>
                      <p className="product-category">{product.category}</p>
                      <div className="product-actions">
                        <Link 
                          to={`/product/${product._id}`} 
                          className="view-button"
                        >
                          View Details
                        </Link>
                        <button 
                          className="add-to-cart-button"
                          disabled={product.stock <= 0}
                          onClick={() => {
                            // We'll implement this in the Product Detail page
                            alert(`Added ${product.name} to cart!`);
                          }}
                        >
                          {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products; 