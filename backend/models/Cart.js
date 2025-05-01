const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Will be used for abandoned cart features
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Calculate total cart value
cartSchema.virtual('total').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// Update the updatedAt and lastActive fields before saving
cartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastActive = Date.now();
  next();
});

// Create a compound index for user and organizationId to ensure one cart per user per organization
cartSchema.index({ user: 1, organizationId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema); 