const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  kindeOrgId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' field before saving
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Organization', organizationSchema); 