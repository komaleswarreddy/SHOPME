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

// Define Organization model
const organizationSchema = new mongoose.Schema({
  kindeOrgId: String,
  name: String,
  createdAt: Date,
  updatedAt: Date
});

const Organization = mongoose.model('Organization', organizationSchema);

async function fixAuthentication() {
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

    // Fix 1: Ensure all organizations exist and are valid
    await ensureOrganizationsExist();

    // Fix 2: Update our target users with special hardcoded values
    await setupSpecificUsers();

    // Fix 3: Generate proper JWT tokens for direct login
    await generateTokensForUsers();

    // Show final state of users
    await showAllUsers();

  } catch (error) {
    console.error('Error fixing authentication:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function ensureOrganizationsExist() {
  console.log('\n--- Checking Organizations ---');
  
  // Get all organizations
  const orgs = await Organization.find({});
  console.log(`Found ${orgs.length} organizations`);
  
  // Make sure our target organizations exist
  const mainOrgId = 'org-kp_f0488';
  const marketingOrgId = 'org-ma33sqwk';
  
  // Check if main org exists
  let mainOrg = orgs.find(org => org.kindeOrgId === mainOrgId);
  if (!mainOrg) {
    mainOrg = new Organization({
      kindeOrgId: mainOrgId,
      name: "User's Organization",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await mainOrg.save();
    console.log(`Created main organization: ${mainOrg.name} (${mainOrg.kindeOrgId})`);
  } else {
    console.log(`Main organization exists: ${mainOrg.name} (${mainOrg.kindeOrgId})`);
  }
  
  // Check if marketing org exists
  let marketingOrg = orgs.find(org => org.kindeOrgId === marketingOrgId);
  if (!marketingOrg) {
    marketingOrg = new Organization({
      kindeOrgId: marketingOrgId,
      name: "Marketing Department",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await marketingOrg.save();
    console.log(`Created marketing organization: ${marketingOrg.name} (${marketingOrg.kindeOrgId})`);
  } else {
    console.log(`Marketing organization exists: ${marketingOrg.name} (${marketingOrg.kindeOrgId})`);
  }
}

async function setupSpecificUsers() {
  console.log('\n--- Setting Up Specific Users ---');
  
  // Define our target users
  const users = [
    {
      email: 'komaleswarreddy@gmail.com',
      role: 'owner',
      organizationId: 'org-kp_f0488',
      firstName: 'Komaleswar',
      lastName: 'Reddy',
      kindeId: 'kp_c8b378838b774bec8649073c820d77d0' // Known Kinde ID - replace if needed
    },
    {
      email: 'n210038@rguktn.ac.in',
      role: 'manager',
      organizationId: 'org-kp_f0488',
      firstName: 'RGUKTN',
      lastName: 'User',
      kindeId: 'kp_8f471a1ff78947579e5ad2ce71a341b1' // Known Kinde ID - replace if needed
    },
    {
      email: 'royalrowdy13@gmail.com',
      role: 'customer',
      organizationId: 'org-kp_f0488',
      firstName: 'Royal',
      lastName: 'Rowdy',
      kindeId: 'kp_ca3c6dd97d0140a8bb84e9e0cfe97241' // Known Kinde ID - replace if needed
    },
    {
      email: 'hihellomawa@gmail.com',
      role: 'owner',
      organizationId: 'org-ma33sqwk',
      firstName: 'Mawa',
      lastName: 'User',
      kindeId: 'kp_d47a0d22f5a740d38c4a5690d44a8b3c' // Known Kinde ID - replace if needed
    }
  ];
  
  // Create or update each user
  for (const userData of users) {
    // Clean up any duplicate users first
    await User.deleteMany({ email: userData.email });
    
    // Create new user
    const user = new User({
      kindeId: userData.kindeId,
      email: userData.email,
      role: userData.role,
      organizationId: userData.organizationId,
      isActive: true,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await user.save();
    console.log(`Created/updated user ${user.email} as ${user.role} in ${user.organizationId}`);
  }
  
  console.log('Specific users setup complete');
}

async function generateTokensForUsers() {
  console.log('\n--- Generating JWT Tokens for Direct Login ---');
  
  // Make sure we have JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in .env file');
    return;
  }
  
  // Get all users
  const users = await User.find({});
  
  console.log('\nJWT Tokens for Direct Login:');
  console.log('============================');
  
  for (const user of users) {
    // Generate JWT payload
    const payload = {
      sub: user.kindeId,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };
    
    // Generate JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    
    console.log(`User: ${user.email} (${user.role}):`);
    console.log(`Token: ${token.substring(0, 20)}...`);
    console.log('To use this token in localStorage:');
    console.log(`localStorage.setItem('b2boost_token', '${token}');`);
    console.log('---');
  }
}

async function showAllUsers() {
  // Get all users
  const allUsers = await User.find({});
  
  console.log('\n--- Current Users ---');
  console.log('Email                      | Role     | Organization      | KindeId');
  console.log('---------------------------|----------|-------------------|------------------------');
  
  allUsers.forEach(user => {
    const kindeIdPreview = user.kindeId ? (user.kindeId.length > 20 ? 
      user.kindeId.substring(0, 17) + '...' : user.kindeId) : 'null';
    
    console.log(
      `${padEnd(user.email, 27)} | ${padEnd(user.role, 8)} | ${padEnd(user.organizationId, 17)} | ${kindeIdPreview}`
    );
  });
  
  console.log('\n--- Organization Users ---');
  
  // Get all organizations
  const orgs = await Organization.find({});
  
  for (const org of orgs) {
    const usersInOrg = await User.find({ organizationId: org.kindeOrgId });
    console.log(`\nOrganization: ${org.name} (${org.kindeOrgId})`);
    console.log(`Total users: ${usersInOrg.length}`);
    
    // Count by role
    const roleCount = {};
    usersInOrg.forEach(user => {
      if (!roleCount[user.role]) roleCount[user.role] = 0;
      roleCount[user.role]++;
    });
    
    console.log('Users by role:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`- ${role}: ${count}`);
    });
    
    console.log('User list:');
    usersInOrg.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
  }
}

function padEnd(str, length) {
  if (!str) return ' '.repeat(length);
  return str.length >= length ? str : str + ' '.repeat(length - str.length);
}

// Run the function
fixAuthentication()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 