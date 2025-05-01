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
  status: String
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

async function fixSpecificUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Target email to fix
    const targetEmail = 'hihellomawa@gmail.com';

    // Find the user
    const user = await User.findOne({ email: targetEmail });
    
    if (!user) {
      console.log(`User with email ${targetEmail} not found. Let's create one.`);
      
      // Find the first organization (or create one if none exists)
      let organization = await Organization.findOne({});
      
      if (!organization) {
        console.log('No organization found. Creating a default one...');
        organization = new Organization({
          kindeOrgId: `org-${Date.now()}`,
          name: 'Default Organization',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        await organization.save();
        console.log(`Created new organization: ${organization.name} (${organization.kindeOrgId})`);
      }

      // Create the user with owner role
      const newUser = new User({
        kindeId: `manual-${Date.now()}`,
        email: targetEmail,
        role: 'owner',
        organizationId: organization.kindeOrgId,
        isActive: true,
        firstName: 'Owner',
        lastName: 'Account',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await newUser.save();
      console.log(`Created new user: ${newUser.email} with role: ${newUser.role}`);
    } else {
      console.log(`Found user: ${user.email}`);
      console.log(`Current role: ${user.role}`);
      console.log(`Current organization: ${user.organizationId}`);
      
      // Update user to owner role
      user.role = 'owner';
      user.status = 'active';
      user.isActive = true;
      
      await user.save();
      console.log(`Updated user ${user.email} to role: ${user.role}`);
      
      // Check if there are other users in the same organization
      const orgUsers = await User.find({ organizationId: user.organizationId });
      console.log(`Found ${orgUsers.length} users in the same organization`);
    }

    // List all the organizations in the system
    const organizations = await Organization.find({});
    console.log(`\nAll Organizations (${organizations.length}):`);
    for (const org of organizations) {
      console.log(`- ${org.name} (${org.kindeOrgId})`);
    }

    // List all users with their roles and organizations
    const allUsers = await User.find({});
    console.log(`\nAll Users (${allUsers.length}):`);
    for (const u of allUsers) {
      console.log(`- ${u.email}, Role: ${u.role}, Organization: ${u.organizationId}`);
    }

    console.log('\nUser fix completed!');
  } catch (error) {
    console.error('Error fixing user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixSpecificUser()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 