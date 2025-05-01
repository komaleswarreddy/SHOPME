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

async function setupSpecificUsers() {
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

    // First, check if the organizations exist
    const org1 = await Organization.findOne({ kindeOrgId: 'org-kp_f0488' });
    const org2 = await Organization.findOne({ kindeOrgId: 'org-ma33sqwk' });

    if (!org1) {
      console.error('Organization org-kp_f0488 not found');
      return;
    }

    if (!org2) {
      console.error('Organization org-ma33sqwk not found');
      return;
    }

    console.log(`Found organizations: "${org1.name}" and "${org2.name}"`);

    // Setup for org-kp_f0488
    console.log('\nSetting up users for organization:', org1.name);
    
    // Create or update komaleswarreddy@gmail.com as owner
    await createOrUpdateUser('komaleswarreddy@gmail.com', 'org-kp_f0488', 'owner', 
                            'Komaleswar', 'Reddy');
    
    // Create or update n210038@rguktn.ac.in as manager
    await createOrUpdateUser('n210038@rguktn.ac.in', 'org-kp_f0488', 'manager', 
                            'RGUKTN', 'User');
    
    // Create or update royalrowdy13@gmail.com as customer
    await createOrUpdateUser('royalrowdy13@gmail.com', 'org-kp_f0488', 'customer', 
                            'Royal', 'Rowdy');

    // Setup for org-ma33sqwk
    console.log('\nSetting up users for organization:', org2.name);
    
    // Create or update hihellomawa@gmail.com as owner
    await createOrUpdateUser('hihellomawa@gmail.com', 'org-ma33sqwk', 'owner',
                            'Mawa', 'User');

    // Show final state
    console.log('\nFinal state of users:');
    await showOrganizationUsers('org-kp_f0488');
    await showOrganizationUsers('org-ma33sqwk');

  } catch (error) {
    console.error('Error setting up users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

async function createOrUpdateUser(email, orgId, role, firstName, lastName) {
  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Update existing user
      user.role = role;
      user.organizationId = orgId;
      user.isActive = true;
      user.status = 'active';
      user.updatedAt = Date.now();
      
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      
      await user.save();
      console.log(`Updated user ${email} to ${role} in ${orgId}`);
    } else {
      // Create new user
      user = new User({
        kindeId: `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        email,
        role,
        organizationId: orgId,
        isActive: true,
        firstName: firstName || '',
        lastName: lastName || '',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await user.save();
      console.log(`Created new user ${email} as ${role} in ${orgId}`);
    }
    
    return user;
  } catch (error) {
    console.error(`Error creating/updating user ${email}:`, error.message);
  }
}

async function showOrganizationUsers(orgId) {
  const org = await Organization.findOne({ kindeOrgId: orgId });
  if (!org) {
    console.log(`Organization ${orgId} not found`);
    return;
  }
  
  const users = await User.find({ organizationId: orgId }).select('email role');
  console.log(`\nOrganization: ${org.name} (${orgId})`);
  console.log(`Total users: ${users.length}`);
  
  // Count by role
  const roleCount = {};
  users.forEach(user => {
    if (!roleCount[user.role]) roleCount[user.role] = 0;
    roleCount[user.role]++;
  });
  
  console.log('Users by role:');
  Object.entries(roleCount).forEach(([role, count]) => {
    console.log(`- ${role}: ${count}`);
  });
  
  console.log('User list:');
  users.forEach(user => {
    console.log(`- ${user.email} (${user.role})`);
  });
}

// Run the setup script
setupSpecificUsers()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 