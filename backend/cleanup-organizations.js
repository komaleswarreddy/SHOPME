const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

async function cleanupOrganizations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Find all users and organizations
    const allUsers = await User.find({});
    const allOrgs = await Organization.find({});

    console.log(`Found ${allUsers.length} users and ${allOrgs.length} organizations`);

    // Identify primary organization (we'll use the one with most users)
    let orgUserCounts = {};
    
    // Count users in each organization
    allUsers.forEach(user => {
      if (user.organizationId) {
        if (!orgUserCounts[user.organizationId]) {
          orgUserCounts[user.organizationId] = 0;
        }
        orgUserCounts[user.organizationId]++;
      }
    });
    
    console.log(`Organization user counts:`, orgUserCounts);
    
    // Find the organization with the most users
    let primaryOrgId = null;
    let maxUsers = 0;
    
    Object.entries(orgUserCounts).forEach(([orgId, count]) => {
      if (count > maxUsers) {
        maxUsers = count;
        primaryOrgId = orgId;
      }
    });
    
    if (!primaryOrgId && allOrgs.length > 0) {
      // If no org has users, use the first one
      primaryOrgId = allOrgs[0].kindeOrgId;
      console.log(`No organization has users. Using the first one as primary: ${primaryOrgId}`);
    } else if (!primaryOrgId) {
      // Create a new primary organization if none exist
      const newOrg = new Organization({
        kindeOrgId: 'default-org',
        name: 'Default Organization',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await newOrg.save();
      primaryOrgId = newOrg.kindeOrgId;
      console.log(`Created new primary organization: ${newOrg.name} (${primaryOrgId})`);
    } else {
      console.log(`Primary organization identified: ${primaryOrgId} with ${maxUsers} users`);
    }
    
    // Get the primary organization
    const primaryOrg = await Organization.findOne({ kindeOrgId: primaryOrgId });
    console.log(`Primary organization: ${primaryOrg.name} (${primaryOrg.kindeOrgId})`);
    
    // Move all users to the primary organization
    let movedCount = 0;
    for (const user of allUsers) {
      if (user.organizationId !== primaryOrgId) {
        console.log(`Moving user ${user.email} from ${user.organizationId} to ${primaryOrgId}`);
        user.organizationId = primaryOrgId;
        user.updatedAt = Date.now();
        await user.save();
        movedCount++;
      }
    }
    console.log(`Moved ${movedCount} users to the primary organization`);
    
    // Delete empty organizations (except the primary)
    let deleteCount = 0;
    for (const org of allOrgs) {
      if (org.kindeOrgId !== primaryOrgId) {
        await Organization.deleteOne({ kindeOrgId: org.kindeOrgId });
        deleteCount++;
      }
    }
    console.log(`Deleted ${deleteCount} empty organizations`);
    
    // Fix our target user to make sure they're an owner
    const targetEmail = 'hihellomawa@gmail.com';
    const targetUser = await User.findOne({ email: targetEmail });
    
    if (targetUser) {
      if (targetUser.role !== 'owner') {
        console.log(`Updating ${targetEmail} to owner role`);
        targetUser.role = 'owner';
        targetUser.isActive = true;
        targetUser.status = 'active';
        targetUser.updatedAt = Date.now();
        await targetUser.save();
      } else {
        console.log(`${targetEmail} already has owner role`);
      }
    } else {
      console.log(`User ${targetEmail} not found`);
    }
    
    // Verify final state
    console.log('\n--- Final State ---');
    
    // Check remaining organizations
    const remainingOrgs = await Organization.find({});
    console.log(`Organizations: ${remainingOrgs.length}`);
    for (const org of remainingOrgs) {
      console.log(`- ${org.name} (${org.kindeOrgId})`);
    }
    
    // Count users by role
    const updatedUsers = await User.find({});
    const roleCount = {};
    updatedUsers.forEach(user => {
      if (!roleCount[user.role]) {
        roleCount[user.role] = 0;
      }
      roleCount[user.role]++;
    });
    
    console.log('\nUser roles:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`- ${role}: ${count} users`);
    });
    
    // Check target user
    const finalTargetUser = await User.findOne({ email: targetEmail });
    if (finalTargetUser) {
      console.log(`\nTarget user (${targetEmail}):`);
      console.log(`- Role: ${finalTargetUser.role}`);
      console.log(`- Organization: ${finalTargetUser.organizationId}`);
      console.log(`- Status: ${finalTargetUser.status || 'active'}`);
      console.log(`- Active: ${finalTargetUser.isActive}`);
    }
    
    console.log('\nOrganization cleanup completed!');
  } catch (error) {
    console.error('Error cleaning up organizations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupOrganizations()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 