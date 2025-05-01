const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const path = require('path');

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
  lastName: String
});

const User = mongoose.model('User', userSchema);

async function checkAuthenticationStatus() {
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

    // Check if JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      console.error('WARNING: JWT_SECRET is not defined in .env file');
    } else {
      console.log('JWT_SECRET is defined in .env file');
    }

    // Get all users
    const allUsers = await User.find({}).select('email kindeId role organizationId isActive');
    console.log(`Total users in database: ${allUsers.length}`);

    // Show users by role
    const roles = {};
    allUsers.forEach(user => {
      if (!roles[user.role]) {
        roles[user.role] = 0;
      }
      roles[user.role]++;
    });
    
    console.log('Users by role:');
    Object.entries(roles).forEach(([role, count]) => {
      console.log(`- ${role}: ${count} users`);
    });

    // Check for any remaining sales_rep users
    const salesRepUsers = await User.find({ role: 'sales_rep' });
    if (salesRepUsers.length > 0) {
      console.log(`WARNING: Found ${salesRepUsers.length} users still with 'sales_rep' role`);
      console.log('Sample sales_rep users:');
      salesRepUsers.slice(0, 3).forEach(user => {
        console.log(`- Email: ${user.email}, KindeId: ${user.kindeId}`);
      });
    } else {
      console.log('No users with sales_rep role found (good!)');
    }

    // Check for users without kindeId
    const usersWithoutKindeId = await User.find({ $or: [
      { kindeId: { $exists: false } },
      { kindeId: null },
      { kindeId: '' }
    ]});
    
    if (usersWithoutKindeId.length > 0) {
      console.log(`Found ${usersWithoutKindeId.length} users without a valid kindeId`);
      console.log('Sample users without kindeId:');
      usersWithoutKindeId.slice(0, 3).forEach(user => {
        console.log(`- Email: ${user.email}, Role: ${user.role}`);
      });
    } else {
      console.log('All users have valid kindeId (good!)');
    }

    // Show some sample user info
    console.log('\nSample user information:');
    allUsers.slice(0, 3).forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  KindeId: ${user.kindeId}`);
      console.log(`  OrganizationId: ${user.organizationId}`);
      console.log(`  Active: ${user.isActive}`);
      console.log('---');
    });

    // List organizations and count users in each
    console.log('\nOrganizations:');
    // First, get all unique organization IDs
    const orgIds = [...new Set(allUsers.map(user => user.organizationId))];
    
    for (const orgId of orgIds) {
      const usersInOrg = allUsers.filter(user => user.organizationId === orgId);
      const owners = usersInOrg.filter(user => user.role === 'owner');
      console.log(`- ${orgId}: ${usersInOrg.length} users, ${owners.length} owners`);
      if (owners.length > 0) {
        console.log(`  Owners: ${owners.map(o => o.email).join(', ')}`);
      }
    }

    console.log('\nAuthentication check completed.');
  } catch (error) {
    console.error('Error checking authentication status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the check
checkAuthenticationStatus()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 