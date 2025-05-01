const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

// All routes are protected with authentication
router.use(auth);

// GET /api/cart
// Get the current user's cart
router.get('/', async (req, res) => {
  try {
    // Find or create cart for the user
    let cart = await Cart.findOne({ 
      user: req.user._id,
      organizationId: req.organizationId
    });
    
    // If no cart exists, create a new empty one
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        organizationId: req.organizationId,
        items: []
      });
      await cart.save();
    }
    
    // Populate product details
    await cart.populate('items.product', 'name description price images');
    
    res.json(cart);
  } catch (error) {
    console.error('Error in GET /cart:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/cart/items
// Add an item to the cart
router.post('/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }
    
    // Check if product exists and belongs to the same organization
    const product = await Product.findOne({ 
      _id: productId,
      organizationId: req.organizationId,
      isActive: true
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }
    
    // Check if product is in stock
    if (product.stock < 1) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }
    
    // Find or create cart for the user
    let cart = await Cart.findOne({ 
      user: req.user._id,
      organizationId: req.organizationId
    });
    
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        organizationId: req.organizationId,
        items: []
      });
    }
    
    // Check if item already exists in cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    
    if (itemIndex > -1) {
      // Update quantity if item exists
      cart.items[itemIndex].quantity += quantity || 1;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity: quantity || 1,
        price: product.price
      });
    }
    
    // Update cart
    await cart.save();
    
    // Populate product details
    await cart.populate('items.product', 'name description price images');
    
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error in POST /cart/items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/cart/items
// Update item quantity in cart
router.put('/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || quantity === undefined) {
      return res.status(400).json({ message: 'productId and quantity are required' });
    }
    
    if (quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be greater than or equal to 0' });
    }
    
    // Find cart
    const cart = await Cart.findOne({ 
      user: req.user._id,
      organizationId: req.organizationId
    });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Find item index
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    
    if (quantity === 0) {
      // Remove item if quantity is 0
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }
    
    // Update cart
    await cart.save();
    
    // Populate product details
    await cart.populate('items.product', 'name description price images');
    
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error in PUT /cart/items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/cart/items/:productId
// Remove an item from the cart
router.delete('/items/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Find cart
    const cart = await Cart.findOne({ 
      user: req.user._id,
      organizationId: req.organizationId
    });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Find item index
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    
    // Remove item
    cart.items.splice(itemIndex, 1);
    
    // Update cart
    await cart.save();
    
    // Populate product details
    await cart.populate('items.product', 'name description price images');
    
    res.status(200).json(cart);
  } catch (error) {
    console.error(`Error in DELETE /cart/items/${req.params.productId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/cart
// Clear the cart
router.delete('/', async (req, res) => {
  try {
    // Find cart
    const cart = await Cart.findOne({ 
      user: req.user._id,
      organizationId: req.organizationId
    });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Clear items
    cart.items = [];
    
    // Update cart
    await cart.save();
    
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error in DELETE /cart:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 