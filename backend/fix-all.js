const mongoose = require('mongoose');
require('dotenv').config();

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

async function fixAll() {
  try {
    console.log('========================================');
    console.log('STARTING COMPREHENSIVE SYSTEM FIX');
    console.log('========================================\n');
    
    // Use the MongoDB URI from environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!\n');

    // PART 1: Fix duplicate emails
    console.log('PART 1: FIXING DUPLICATE EMAILS');
    console.log('----------------------------------------');
    
    // Fix specific email gra7399@gmail.com
    const targetEmail = 'gra7399@gmail.com';
    await fixSpecificEmail(targetEmail);
    
    // Find and fix all duplicate emails
    await fixAllDuplicateEmails();
    
    // PART 2: Fix user roles and organization ownership
    console.log('\nPART 2: FIXING USER ROLES AND ORGANIZATION OWNERSHIP');
    console.log('----------------------------------------');
    
    // Ensure each organization has an owner
    await fixOrganizationOwnership();
    
    // Fix customer roles
    await fixCustomerRoles();
    
    // PART 3: Fix environment variables
    console.log('\nPART 3: CHECKING ENVIRONMENT VARIABLES');
    console.log('----------------------------------------');
    
    checkEnvironmentVariables();
    
    console.log('\n========================================');
    console.log('FIX COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('\nYou should now be able to:');
    console.log('1. Register new users without duplicate email errors');
    console.log('2. Invite team members with appropriate roles');
    console.log('3. Login with the user gra7399@gmail.com with customer role');
    
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Function to fix a specific email
async function fixSpecificEmail(email) {
  console.log(`\nFIXING SPECIFIC EMAIL: ${email}`);
  
  const users = await User.find({ email: email });
  console.log(`Found ${users.length} user(s) with email ${email}`);
  
  if (users.length > 1) {
    console.log('Found duplicate users, fixing...');
    
    // Sort users by creation date (newest first)
    const sortedUsers = users.sort((a, b) => 
      (b.createdAt || 0) - (a.createdAt || 0)
    );
    
    // Keep the most recent active one or the first one if none are active
    const activeUsers = sortedUsers.filter(u => u.isActive && u.status === 'active');
    const userToKeep = activeUsers.length > 0 ? activeUsers[0] : sortedUsers[0];
    
    console.log(`Keeping user with kindeId ${userToKeep.kindeId} and organizationId ${userToKeep.organizationId}`);
    
    // Set to proper role and ensure active
    if (userToKeep.role !== 'customer') {
      userToKeep.role = 'customer';
      userToKeep.isActive = true;
      userToKeep.status = 'active';
      await userToKeep.save();
      console.log(`Updated user role to customer and made active`);
    }
    
    // Remove all other duplicates
    for (const user of users) {
      if (user._id.toString() !== userToKeep._id.toString()) {
        console.log(`Removing duplicate user with kindeId ${user.kindeId} and organizationId ${user.organizationId}`);
        await User.deleteOne({ _id: user._id });
      }
    }
    
    console.log(`Successfully fixed duplicate entries for ${email}`);
  } else if (users.length === 1) {
    console.log(`Only one user found with email ${email}, checking status...`);
    
    const user = users[0];
    if (user.status !== 'active' || !user.isActive || user.role !== 'customer') {
      console.log(`Updating user status for ${email}`);
      user.status = 'active';
      user.isActive = true;
      user.role = 'customer';
      await user.save();
      console.log(`User ${email} updated to active customer`);
    } else {
      console.log(`User ${email} is already an active customer, no changes needed`);
          }
        } else {
    console.log(`No users found with email ${email}`);
  }
}

// Function to fix all duplicate emails
async function fixAllDuplicateEmails() {
  console.log('\nCHECKING FOR ALL DUPLICATE EMAILS');
  
  const allUsers = await User.find({});
  const emailCounts = {};
  
  allUsers.forEach(user => {
    const email = user.email ? user.email.toLowerCase() : null;
    if (!email) return;
    
    if (!emailCounts[email]) {
      emailCounts[email] = [];
    }
    emailCounts[email].push(user);
  });
  
  const duplicateEmails = Object.entries(emailCounts)
    .filter(([email, users]) => users.length > 1)
    .map(([email, users]) => ({ email, count: users.length, users }));
  
  if (duplicateEmails.length > 0) {
    console.log(`Found ${duplicateEmails.length} emails with duplicate entries:`);
    
    for (const { email, count, users } of duplicateEmails) {
      console.log(`\nFixing duplicate email: ${email} (${count} entries)`);
      
      // Sort users by creation date (newest first)
      const sortedUsers = users.sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );
      
      // Keep the most recent active one or the first one if none are active
      const activeUsers = sortedUsers.filter(u => u.isActive && u.status === 'active');
      const userToKeep = activeUsers.length > 0 ? activeUsers[0] : sortedUsers[0];
      
      console.log(`Keeping user with kindeId ${userToKeep.kindeId} and organizationId ${userToKeep.organizationId}`);
      
      // Make sure the user to keep has the right status
      userToKeep.isActive = true;
      userToKeep.status = 'active';
      await userToKeep.save();
      
      // Remove all other duplicates
      for (const user of users) {
        if (user._id.toString() !== userToKeep._id.toString()) {
          console.log(`Removing duplicate user with kindeId ${user.kindeId} and organizationId ${user.organizationId}`);
          await User.deleteOne({ _id: user._id });
        }
      }
    }
    
    console.log('\nAll duplicate emails have been fixed');
  } else {
    console.log('No duplicate emails found in the system');
  }
}

// Function to ensure each organization has an owner
async function fixOrganizationOwnership() {
  console.log('\nENSURING EACH ORGANIZATION HAS AN OWNER');
  
  const organizations = await Organization.find({});
  console.log(`Found ${organizations.length} organizations`);
  
  for (const org of organizations) {
    console.log(`\nChecking organization: ${org.name} (${org.kindeOrgId})`);
    
      const orgUsers = await User.find({ 
      organizationId: org.kindeOrgId 
      });
    const owners = orgUsers.filter(user => user.role === 'owner');
    
    if (owners.length === 0 && orgUsers.length > 0) {
      console.log(`Organization has no owner, promoting a user...`);
      
      // Find the most suitable user to promote to owner
      const sortedUsers = [...orgUsers].sort((a, b) => {
        // Prioritize active users and earlier creation date
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
      
      const userToPromote = sortedUsers[0];
      console.log(`Promoting user ${userToPromote.email} to owner role`);
      
      userToPromote.role = 'owner';
      userToPromote.isActive = true;
      userToPromote.status = 'active';
      await userToPromote.save();
      
      console.log(`User ${userToPromote.email} has been promoted to owner`);
    } else if (owners.length > 0) {
      console.log(`Organization already has ${owners.length} owner(s)`);
    } else {
      console.log(`Organization has no users`);
    }
  }
}

// Function to fix customer roles
async function fixCustomerRoles() {
  console.log('\nFIXING CUSTOMER ROLES');
  
  const customerUsers = await User.find({ role: 'customer' });
  console.log(`Found ${customerUsers.length} users with customer role`);
  
  let inactiveCount = 0;
  
  for (const user of customerUsers) {
    if (!user.isActive || user.status !== 'active') {
      console.log(`Activating customer user: ${user.email}`);
      user.isActive = true;
      user.status = 'active';
      await user.save();
      inactiveCount++;
    }
  }
  
  console.log(`Activated ${inactiveCount} previously inactive customer users`);
}

// Function to check environment variables
function checkEnvironmentVariables() {
  const requiredEnvVars = [
    'EMAIL_HOST', 
    'EMAIL_USER', 
    'EMAIL_PASS', 
    'FRONTEND_URL',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Please add the following variables to your .env file:');
    missingVars.forEach(varName => {
      console.log(`${varName}=your_value`);
    });
  } else {
    console.log('All required environment variables are set');
  }
}

// Run the fix
fixAll(); 