const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify token and set user in request
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Authorization failed: No token provided');
      return res.status(401).json({ message: 'No authentication token, authorization denied' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verification successful:', { sub: decoded.sub, email: decoded.email });
      
      // Check if user exists with the Kinde ID from token
      const user = await User.findOne({ kindeId: decoded.sub });
      
      if (!user) {
        console.log(`User not found for kindeId: ${decoded.sub}`);
        
        // Try to find by email as a fallback
        const userByEmail = await User.findOne({ email: decoded.email });
        if (userByEmail) {
          console.log(`User found by email (${decoded.email}) but kindeId doesn't match:`);
          console.log(`- Database kindeId: ${userByEmail.kindeId}`);
          console.log(`- Token kindeId: ${decoded.sub}`);
          console.log(`- Database role: ${userByEmail.role}`);
          console.log('Consider updating the kindeId in the database to match the token');
          console.log('Run: node backend/fix-kinde-ids.js ' + decoded.email + ' ' + decoded.sub);
        }
        
        return res.status(401).json({ message: 'User not found, authorization denied' });
      }
      
      console.log(`User authenticated: ${user.email} (${user.role}) in organization ${user.organizationId}`);
      console.log(`Database kindeId: ${user.kindeId}`);
      
      // Add user to request
      req.user = user;
      req.organizationId = user.organizationId;
      
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ message: 'Token is invalid or expired' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server authentication error' });
  }
};

// Middleware to check if user has the required role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const hasRole = roles.includes(req.user.role);
    if (!hasRole) {
      console.log(`Access denied: User ${req.user.email} has role ${req.user.role} but needs one of: ${roles.join(', ')}`);
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    next();
  };
};

module.exports = { auth, checkRole }; 