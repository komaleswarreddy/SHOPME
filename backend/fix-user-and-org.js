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

async function fixUserAndOrganization() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Target email to fix
    const targetEmail = 'hihellomawa@gmail.com';

    // Find all users and organizations first
    const allUsers = await User.find({});
    const allOrgs = await Organization.find({});

    console.log(`Found ${allUsers.length} users and ${allOrgs.length} organizations`);

    // Find the target user
    const user = allUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    
    if (!user) {
      console.log(`Target user ${targetEmail} not found. Creating a new user...`);
      
      // Find or create the primary organization
      let primaryOrg;
      if (allOrgs.length > 0) {
        primaryOrg = allOrgs[0];
        console.log(`Using existing organization: ${primaryOrg.name} (${primaryOrg.kindeOrgId})`);
      } else {
        // Create a new organization
        primaryOrg = new Organization({
          kindeOrgId: `org-${Date.now()}`,
          name: 'B2Boost Organization',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        await primaryOrg.save();
        console.log(`Created new organization: ${primaryOrg.name} (${primaryOrg.kindeOrgId})`);
      }
      
      // Create the user with owner role
      const newUser = new User({
        kindeId: `manual-${Date.now()}`,
        email: targetEmail,
        role: 'owner',
        organizationId: primaryOrg.kindeOrgId,
        isActive: true,
        firstName: 'Owner',
        lastName: 'Account',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await newUser.save();
      console.log(`Created new user: ${newUser.email} with role: owner in organization: ${primaryOrg.name}`);
    } else {
      console.log(`Found user: ${user.email} with role: ${user.role} in organization: ${user.organizationId}`);
      
      // Check current org
      const currentOrg = allOrgs.find(o => o.kindeOrgId === user.organizationId);
      
      if (currentOrg) {
        console.log(`Current organization: ${currentOrg.name} (${currentOrg.kindeOrgId})`);
      } else {
        console.log(`Current organization not found. User may be in an orphaned organization.`);
      }
      
      // Find or set the primary org (the first one as default)
      let primaryOrg;
      if (allOrgs.length > 0) {
        primaryOrg = allOrgs[0];
      } else {
        // Create a new organization since none exist
        primaryOrg = new Organization({
          kindeOrgId: `org-${Date.now()}`,
          name: 'B2Boost Organization',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        await primaryOrg.save();
        console.log(`Created new primary organization: ${primaryOrg.name} (${primaryOrg.kindeOrgId})`);
      }
      
      // Update user to be owner of primary organization
      const beforeOrgId = user.organizationId;
      const beforeRole = user.role;
      
      user.role = 'owner';
      user.organizationId = primaryOrg.kindeOrgId;
      user.isActive = true;
      user.status = 'active';
      user.updatedAt = Date.now();
      
      await user.save();
      
      console.log(`Updated user ${user.email}:`);
      console.log(`  - Role changed from ${beforeRole} to owner`);
      console.log(`  - Organization changed from ${beforeOrgId} to ${primaryOrg.kindeOrgId}`);
      
      // Check if there are other owners in this organization 
      const otherOwners = allUsers.filter(u => 
        u.email !== targetEmail && 
        u.organizationId === primaryOrg.kindeOrgId && 
        u.role === 'owner'
      );
      
      if (otherOwners.length > 0) {
        console.log(`There are ${otherOwners.length} other owners in the same organization:`);
        otherOwners.forEach(o => console.log(`  - ${o.email}`));
      } else {
        console.log(`User ${targetEmail} is now the only owner of organization ${primaryOrg.name}`);
      }
    }

    // Display all organizations
    console.log('\n--- All Organizations ---');
    const organizations = await Organization.find({});
    for (const org of organizations) {
      console.log(`- ${org.name} (${org.kindeOrgId})`);
      
      // Count users in this org
      const orgUsers = await User.find({ organizationId: org.kindeOrgId });
      console.log(`  Users: ${orgUsers.length}`);
      
      // Show owners
      const owners = orgUsers.filter(u => u.role === 'owner');
      if (owners.length > 0) {
        console.log(`  Owners: ${owners.map(o => o.email).join(', ')}`);
      }
    }

    console.log('\n--- Target User Information ---');
    const updatedUser = await User.findOne({ email: targetEmail });
    if (updatedUser) {
      console.log(`- Email: ${updatedUser.email}`);
      console.log(`- Role: ${updatedUser.role}`);
      console.log(`- Organization: ${updatedUser.organizationId}`);
      console.log(`- Active: ${updatedUser.isActive}`);
      console.log(`- Status: ${updatedUser.status || 'active'}`);
    } else {
      console.log(`User ${targetEmail} not found after updates!`);
    }

    console.log('\nUser and organization fix completed!');
  } catch (error) {
    console.error('Error fixing user and organization:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixUserAndOrganization()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 