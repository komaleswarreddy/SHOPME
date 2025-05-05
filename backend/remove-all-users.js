require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

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

// Define Organization model
const organizationSchema = new mongoose.Schema({
  kindeOrgId: String,
  name: String,
  createdAt: Date,
  updatedAt: Date
});

const Organization = mongoose.model('Organization', organizationSchema);

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify the question method
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function removeAllUsers() {
  try {
    console.log('Starting user removal script...');
    
    // Check for MongoDB URI in environment variables
    let mongodbUri = process.env.MONGODB_URI;
    
    // If not found, prompt the user for the MongoDB URI
    if (!mongodbUri) {
      console.log('\n⚠️ MONGODB_URI is not defined in environment variables.');
      mongodbUri = await question('Please enter your MongoDB connection URI: ');
      
      if (!mongodbUri) {
        console.log('No MongoDB URI provided. Exiting...');
        return;
      }
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // First, get statistics about the current state
    const organizations = await Organization.find({});
    const users = await User.find({});
    
    console.log('\n--- Current State ---');
    console.log(`Organizations: ${organizations.length}`);
    console.log(`Users: ${users.length}`);
    
    if (users.length === 0) {
      console.log('\nNo users found in the database. Nothing to remove.');
      return;
    }
    
    // Group users by organization for reporting
    const usersByOrg = {};
    users.forEach(user => {
      if (!usersByOrg[user.organizationId]) {
        usersByOrg[user.organizationId] = [];
      }
      usersByOrg[user.organizationId].push(user);
    });
    
    console.log('\nUsers by Organization:');
    for (const [orgId, orgUsers] of Object.entries(usersByOrg)) {
      const orgName = organizations.find(o => o.kindeOrgId === orgId)?.name || 'Unknown Organization';
      console.log(`- ${orgName} (${orgId}): ${orgUsers.length} users`);
      
      // Count users by role in this organization
      const roleCount = {};
      orgUsers.forEach(user => {
        if (!roleCount[user.role]) {
          roleCount[user.role] = 0;
        }
        roleCount[user.role]++;
      });
      
      // Display role breakdown
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`  - ${role}: ${count}`);
      });
    }

    // Ask for confirmation before proceeding
    console.log('\n⚠️ WARNING: This will delete ALL users from ALL organizations.');
    console.log('Organizations will be preserved, but ALL users will be removed.');
    console.log('This action cannot be undone.');
    
    const answer = await question('\nType "DELETE ALL USERS" to confirm: ');
    
    if (answer === 'DELETE ALL USERS') {
      console.log('\nProceeding with user deletion...');
      
      // Delete all users
      const result = await User.deleteMany({});
      console.log(`Deleted ${result.deletedCount} users.`);
      
      // Verify deletion
      const remainingUsers = await User.countDocuments();
      console.log(`Remaining users: ${remainingUsers}`);
      
      if (remainingUsers === 0) {
        console.log('\n✅ All users have been successfully removed from all organizations.');
        console.log('Organizations remain intact and ready for new users.');
      } else {
        console.log('\n⚠️ Some users may remain. Please check the database manually.');
      }
    } else {
      console.log('\nOperation cancelled. No users were deleted.');
    }

  } catch (error) {
    console.error('Error removing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    rl.close();
  }
}

// Execute the function
removeAllUsers(); 