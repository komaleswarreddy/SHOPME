const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Define User model
const userSchema = new mongoose.Schema({
  kindeId: String,
  email: String,
  role: String,
  organizationId: String,
  isActive: Boolean,
  firstName: String,
  lastName: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);

async function fixHihellomava() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Find the user
    const targetEmail = 'hihellomava@gmail.com';
    const targetOrgId = 'org-kp_ea561';
    
    console.log(`Looking for user ${targetEmail} in organization ${targetOrgId}...`);
    
    // Get the current user state
    const user = await User.findOne({ email: targetEmail, organizationId: targetOrgId });
    
    if (!user) {
      console.log(`User ${targetEmail} not found in organization ${targetOrgId}`);
      return;
    }
    
    console.log(`Found user: ${user.email}`);
    console.log(`Current role: ${user.role}`);
    console.log(`Current organization: ${user.organizationId}`);
    
    // Update user to owner role
    user.role = 'owner';
    user.isActive = true;
    user.status = 'active';
    user.updatedAt = Date.now();
    
    await user.save();
    console.log(`Updated user ${user.email} to role: ${user.role}`);
    
    // Generate a JWT token for direct login
    if (process.env.JWT_SECRET) {
      const payload = {
        sub: user.kindeId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      console.log('\nJWT Token for Direct Login:');
      console.log('==========================');
      console.log(`User: ${user.email} (${user.role}):`);
      console.log('To use this token in localStorage, run this in browser console:');
      console.log(`localStorage.setItem('b2boost_token', '${token}');`);
    }

    // Show all users in the organization
    const orgUsers = await User.find({ organizationId: targetOrgId });
    console.log(`\nAll users in organization ${targetOrgId}:`);
    
    orgUsers.forEach(u => {
      console.log(`- ${u.email} (${u.role})`);
    });

  } catch (error) {
    console.error('Error fixing user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
fixHihellomava()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 