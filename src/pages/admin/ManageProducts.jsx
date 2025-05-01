import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { productsService } from '../../services/api';
import '../../styles/admin.css';

const ManageProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Others',
    images: [''],
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});

  const categories = [
    'Clothing',
    'Electronics',
    'Home',
    'Beauty',
    'Sports',
    'Books',
    'Others'
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) : value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageField = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      errors.price = 'Valid price is required';
    } else if (parseFloat(formData.price) < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    if (formData.stock === '' || isNaN(parseInt(formData.stock))) {
      errors.stock = 'Valid stock quantity is required';
    } else if (parseInt(formData.stock) < 0) {
      errors.stock = 'Stock cannot be negative';
    }
    
    // Filter out empty image URLs
    const validImages = formData.images.filter(url => url.trim() !== '');
    if (validImages.length === 0) {
      errors.images = 'At least one image URL is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Filter out empty image URLs
    const productData = {
      ...formData,
      images: formData.images.filter(url => url.trim() !== '')
    };
    
    try {
      if (editMode) {
        await productsService.update(currentProduct._id, productData);
        alert('Product updated successfully!');
      } else {
        await productsService.create(productData);
        alert('Product created successfully!');
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: 'Others',
        images: [''],
        isActive: true
      });
      
      // Refresh product list
      fetchProducts();
      
      // Close form
      setShowForm(false);
      setEditMode(false);
      setCurrentProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Error: ${error.message || 'Failed to save product'}`);
    }
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      images: product.images.length > 0 ? product.images : [''],
      isActive: product.isActive
    });
    setEditMode(true);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsService.delete(productId);
        alert('Product deleted successfully!');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(`Error: ${error.message || 'Failed to delete product'}`);
      }
    }
  };

  const handleUpdateStock = async (productId, currentStock) => {
    const newStock = window.prompt('Enter new stock quantity:', currentStock);
    if (newStock === null) return; // User cancelled
    
    const parsedStock = parseInt(newStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      alert('Please enter a valid non-negative number');
      return;
    }
    
    try {
      await productsService.updateStock(productId, { stock: parsedStock });
      alert('Stock updated successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(`Error: ${error.message || 'Failed to update stock'}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="manage-products-page">
        <div className="page-header">
          <h1>Manage Products</h1>
          <button 
            className="add-product-btn"
            onClick={() => {
              setShowForm(!showForm);
              setEditMode(false);
              setCurrentProduct(null);
              setFormData({
                name: '',
                description: '',
                price: '',
                stock: '',
                category: 'Others',
                images: [''],
                isActive: true
              });
              setFormErrors({});
            }}
          >
            {showForm ? 'Cancel' : 'Add New Product'}
          </button>
        </div>

        {showForm && (
          <div className="product-form-container">
            <h2>{editMode ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label htmlFor="name">Product Name*</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={formErrors.name ? 'error' : ''}
                />
                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description*</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className={formErrors.description ? 'error' : ''}
                ></textarea>
                {formErrors.description && <span className="error-message">{formErrors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price*</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={formErrors.price ? 'error' : ''}
                  />
                  {formErrors.price && <span className="error-message">{formErrors.price}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="stock">Stock*</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    min="0"
                    step="1"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className={formErrors.stock ? 'error' : ''}
                  />
                  {formErrors.stock && <span className="error-message">{formErrors.stock}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category*</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Images*</label>
                {formErrors.images && <span className="error-message">{formErrors.images}</span>}
                {formData.images.map((image, index) => (
                  <div key={index} className="image-input-row">
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      className="image-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeImageField(index)}
                      className="remove-image-btn"
                      disabled={formData.images.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageField}
                  className="add-image-btn"
                >
                  Add Another Image
                </button>
                <p className="hint">Provide URLs to product images. At least one image is required.</p>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Product Active (visible to customers)
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditMode(false);
                    setCurrentProduct(null);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                >
                  {editMode ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => fetchProducts()} className="retry-button">
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="no-products">
            <p>No products found. Add your first product to get started.</p>
          </div>
        ) : (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product._id} className={product.isActive ? '' : 'inactive-product'}>
                    <td className="product-image-cell">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} className="product-thumbnail" />
                      ) : (
                        <div className="no-image-placeholder">No Image</div>
                      )}
                    </td>
                    <td>{product.name}</td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>
                      <span className={product.stock <= 5 ? 'low-stock' : ''}>{product.stock}</span>
                      <button
                        className="update-stock-btn"
                        onClick={() => handleUpdateStock(product._id, product.stock)}
                        title="Update Stock"
                      >
                        ↻
                      </button>
                    </td>
                    <td>{product.category}</td>
                    <td>
                      <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="view-btn"
                        onClick={() => navigate(`/product/${product._id}`)}
                        title="View Product"
                      >
                        View
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(product)}
                        title="Edit Product"
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(product._id)}
                        title="Delete Product"
                      >
                        Delete
                      </button>
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

export default ManageProducts; 