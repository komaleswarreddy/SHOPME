const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    get: function() {
      if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
      }
      return this.firstName || this.lastName || '';
    }
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  kindeId: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['customer', 'manager', 'owner', 'user', 'admin'],
    default: 'customer'
  },
  organizationId: {
    type: String,
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'inactive'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.id;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.id;
      return ret;
    }
  },
  id: false
});

// Create compound indexes for email and kindeId uniqueness within an organization
UserSchema.index({ email: 1, organizationId: 1 }, { unique: true });
UserSchema.index({ kindeId: 1, organizationId: 1 }, { unique: true });

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (!this.kindeId) {
    return next(new Error('kindeId is required and cannot be null'));
  }
  
  if (this.id !== undefined) {
    delete this.id;
  }
  
  next();
});

module.exports = mongoose.model('User', UserSchema); 