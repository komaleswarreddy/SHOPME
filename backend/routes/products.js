const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');

// All routes are protected with authentication
router.use(auth);

// GET /api/products
// Get all products for the organization
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ 
      organizationId: req.organizationId,
      isActive: true
    })
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error('Error in GET /products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/products/category/:category
// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ 
      organizationId: req.organizationId,
      category: req.params.category,
      isActive: true
    })
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error(`Error in GET /products/category/${req.params.category}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/products/:id
// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(`Error in GET /products/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/products
// Create a new product (restricted to managers and owners)
router.post('/', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const { name, description, price, stock, category, images } = req.body;
    
    if (!name || !description || price === undefined) {
      return res.status(400).json({ message: 'name, description, and price are required fields' });
    }
    
    const product = new Product({
      name,
      description,
      price,
      stock: stock || 0,
      category: category || 'Others',
      images: images || [],
      organizationId: req.organizationId,
      createdBy: req.user._id
    });
    
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error in POST /products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/products/:id
// Update a product (restricted to managers and owners)
router.put('/:id', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const { name, description, price, stock, category, images, isActive } = req.body;
    
    // Find product and ensure it belongs to the user's organization
    let product = await Product.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update product fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category) product.category = category;
    if (images) product.images = images;
    if (isActive !== undefined) product.isActive = isActive;
    
    product.updatedAt = Date.now();
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error(`Error in PUT /products/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/products/:id/stock
// Update product stock only (restricted to managers and owners)
router.patch('/:id/stock', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const { stock } = req.body;
    
    if (stock === undefined) {
      return res.status(400).json({ message: 'stock is required' });
    }
    
    // Find product and ensure it belongs to the user's organization
    let product = await Product.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update stock
    product.stock = stock;
    product.updatedAt = Date.now();
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error(`Error in PATCH /products/${req.params.id}/stock:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/products/:id
// Delete a product (restricted to managers and owners)
router.delete('/:id', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(`Error in DELETE /products/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 