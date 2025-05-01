const mongoose = require('mongoose');
const dotenv = require('dotenv');
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

async function listAllUsers() {
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

    // Get all organizations for quick lookup
    const organizations = await Organization.find({});
    const orgMap = {};
    organizations.forEach(org => {
      orgMap[org.kindeOrgId] = org.name;
    });
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users and ${organizations.length} organizations`);
    
    // Sort users by organization first, then by role
    users.sort((a, b) => {
      if (a.organizationId === b.organizationId) {
        // For same org, sort by role (owner first, then manager, then customer)
        const roleOrder = { owner: 1, manager: 2, customer: 3 };
        return roleOrder[a.role] - roleOrder[b.role];
      }
      return a.organizationId.localeCompare(b.organizationId);
    });
    
    // Group users by organization
    const usersByOrg = {};
    users.forEach(user => {
      if (!usersByOrg[user.organizationId]) {
        usersByOrg[user.organizationId] = [];
      }
      usersByOrg[user.organizationId].push(user);
    });
    
    // Print all organizations and their users
    console.log('\n--- Organizations and Users ---');
    for (const orgId of Object.keys(usersByOrg).sort()) {
      const orgUsers = usersByOrg[orgId];
      const orgName = orgMap[orgId] || 'Unknown Organization';
      
      console.log(`\nOrganization: ${orgName} (${orgId})`);
      console.log(`Total users: ${orgUsers.length}`);
      
      // Group by role
      const roleGroups = {};
      orgUsers.forEach(user => {
        if (!roleGroups[user.role]) {
          roleGroups[user.role] = [];
        }
        roleGroups[user.role].push(user);
      });
      
      // Print users by role
      for (const role of ['owner', 'manager', 'customer']) {
        if (roleGroups[role] && roleGroups[role].length > 0) {
          console.log(`\n${role.toUpperCase()} (${roleGroups[role].length}):`);
          roleGroups[role].forEach(user => {
            console.log(`- ${user.email}`);
          });
        }
      }
    }
    
    // Specifically check for hihellomava user since that was recently changed
    const hihellomava = await User.find({ email: 'hihellomava@gmail.com' });
    console.log('\n--- hihellomava@gmail.com Users ---');
    if (hihellomava.length > 0) {
      hihellomava.forEach(user => {
        console.log(`- Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Organization: ${user.organizationId} (${orgMap[user.organizationId] || 'Unknown'})`);
        console.log(`  Active: ${user.isActive}`);
      });
    } else {
      console.log('No users found with email hihellomava@gmail.com');
    }
    
    // Check for duplicate emails
    const emailCounts = {};
    users.forEach(user => {
      if (!emailCounts[user.email]) {
        emailCounts[user.email] = 0;
      }
      emailCounts[user.email]++;
    });
    
    const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('\n--- Duplicate Emails ---');
      duplicates.forEach(([email, count]) => {
        console.log(`${email}: ${count} occurrences`);
      });
    } else {
      console.log('\nNo duplicate emails found');
    }
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
listAllUsers()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 