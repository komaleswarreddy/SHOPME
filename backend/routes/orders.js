const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');

// All routes are protected with authentication
router.use(auth);

// GET /api/orders
// Get all orders for the current user
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({ 
      user: req.user._id,
      organizationId: req.organizationId
    })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name description images');
    
    res.json(orders);
  } catch (error) {
    console.error('Error in GET /orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/orders/all
// Get all orders for the organization (admin only)
router.get('/all', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const orders = await Order.find({ 
      organizationId: req.organizationId
    })
    .sort({ createdAt: -1 })
    .populate('user', 'firstName lastName email')
    .populate('items.product', 'name description images');
    
    res.json(orders);
  } catch (error) {
    console.error('Error in GET /orders/all:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/orders/:id
// Get a single order by ID
router.get('/:id', async (req, res) => {
  try {
    // Users can only see their own orders, while managers/owners can see all orders for the organization
    const query = {
      _id: req.params.id,
      organizationId: req.organizationId
    };
    
    // If not an admin, restrict to user's orders
    if (!['owner', 'manager'].includes(req.user.role)) {
      query.user = req.user._id;
    }
    
    const order = await Order.findOne(query)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name description images');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error(`Error in GET /orders/${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/orders
// Create a new order from the cart
router.post('/', async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, paymentId } = req.body;
    
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: 'Shipping address and payment method are required' });
    }
    
    // Get the user's cart
    const cart = await Cart.findOne({ 
      user: req.user._id,
      organizationId: req.organizationId
    }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }
    
    // Verify all items are still in stock
    for (const item of cart.items) {
      const product = item.product;
      
      if (!product.isActive) {
        return res.status(400).json({ 
          message: `Product "${product.name}" is no longer available` 
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Not enough stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }
    }
    
    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax example
    const shippingCost = subtotal > 50 ? 0 : 10; // Free shipping over $50
    const total = subtotal + tax + shippingCost;
    
    // Create order items from cart items
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Create the order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentId,
      subtotal,
      tax,
      shippingCost,
      total,
      organizationId: req.organizationId
    });
    
    await order.save();
    
    // Update product inventory
    for (const item of cart.items) {
      await Product.updateOne(
        { _id: item.product._id },
        { $inc: { stock: -item.quantity } }
      );
    }
    
    // Clear the cart
    cart.items = [];
    await cart.save();
    
    // Return the order
    res.status(201).json(order);
  } catch (error) {
    console.error('Error in POST /orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/orders/:id/status
// Update the status of an order (admin only)
router.patch('/:id/status', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // If cancelling an order that wasn't cancelled before, restore stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        );
      }
    }
    
    // If un-cancelling an order, reduce stock again
    if (order.status === 'cancelled' && status !== 'cancelled') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: -item.quantity } }
        );
      }
    }
    
    order.status = status;
    order.updatedAt = Date.now();
    
    await order.save();
    
    res.json(order);
  } catch (error) {
    console.error(`Error in PATCH /orders/${req.params.id}/status:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/orders/:id/tracking
// Update tracking information for an order (admin only)
router.patch('/:id/tracking', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const { trackingNumber } = req.body;
    
    if (trackingNumber === undefined) {
      return res.status(400).json({ message: 'Tracking number is required' });
    }
    
    const order = await Order.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.trackingNumber = trackingNumber;
    order.updatedAt = Date.now();
    
    await order.save();
    
    res.json(order);
  } catch (error) {
    console.error(`Error in PATCH /orders/${req.params.id}/tracking:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/orders/:id/notes
// Update admin notes for an order (admin only)
router.patch('/:id/notes', checkRole(['owner', 'manager']), async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    if (adminNotes === undefined) {
      return res.status(400).json({ message: 'Admin notes are required' });
    }
    
    const order = await Order.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.notes = adminNotes; // Update the notes field
    order.updatedAt = Date.now();
    
    await order.save();
    
    res.json(order);
  } catch (error) {
    console.error(`Error in PATCH /orders/${req.params.id}/notes:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 