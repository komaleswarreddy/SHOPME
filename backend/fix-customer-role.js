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

async function fixUserRoles() {
  try {
    console.log('Starting user role fix operation...');
    
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

    // Step 1: Get all duplicate users and find royalrowdy13@gmail.com user
    const allUsers = await User.find({});
    const targetEmails = ['royalrowdy13@gmail.com', 'n210038@rguktn.ac.in'];
    
    // Group by email to check for duplicates
    const emailCounts = {};
    allUsers.forEach(user => {
      const email = user.email.toLowerCase();
      if (!emailCounts[email]) {
        emailCounts[email] = [];
      }
      emailCounts[email].push(user);
    });
    
    // Find duplicate emails
    const duplicateEmails = Object.entries(emailCounts)
      .filter(([email, users]) => users.length > 1)
      .map(([email, users]) => ({ email, count: users.length, users }));
    
    console.log(`\n--- Current State ---`);
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`Emails with duplicate entries: ${duplicateEmails.length}`);
    
    // Check for target users
    for (const email of targetEmails) {
      const users = emailCounts[email.toLowerCase()] || [];
      console.log(`\nUsers with email ${email}: ${users.length}`);
      
      if (users.length > 0) {
        users.forEach((user, index) => {
          console.log(`  User ${index + 1}:`);
          console.log(`    - ID: ${user._id}`);
          console.log(`    - Role: ${user.role}`);
          console.log(`    - Organization: ${user.organizationId}`);
          console.log(`    - Status: ${user.status}`);
          console.log(`    - Active: ${user.isActive}`);
          console.log(`    - KindeID: ${user.kindeId}`);
        });
      } else {
        console.log(`  No users found with this email.`);
      }
    }
    
    console.log('\n⚠️ WARNING: This script will:');
    console.log('1. Delete duplicate user entries');
    console.log('2. Set royalrowdy13@gmail.com as owner');
    console.log('3. Set n210038@rguktn.ac.in as manager');
    
    const answer = await question('\nType "FIX ROLES" to confirm: ');
    
    if (answer === 'FIX ROLES') {
      console.log('\nProceeding with fixes...');
      
      // Handle duplicate emails - keep the most recent active user for each
      let duplicateDeleteCount = 0;
      
      for (const { email, users } of duplicateEmails) {
        console.log(`Processing duplicates for email: ${email} (${users.length} entries)`);
        
        // Sort by priority: active status first, then by most recent creation date
        users.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        
        // Keep the first one (highest priority), delete the rest
        const toKeep = users[0];
        const toDelete = users.slice(1);
        
        if (toDelete.length > 0) {
          const ids = toDelete.map(u => u._id);
          const result = await User.deleteMany({ _id: { $in: ids } });
          duplicateDeleteCount += result.deletedCount;
          console.log(`  - Kept user: ${toKeep.email} (${toKeep.role}, ${toKeep.status})`);
          console.log(`  - Deleted ${result.deletedCount} duplicate entries`);
        }
      }
      
      console.log(`\nRemoved ${duplicateDeleteCount} duplicate user entries.`);
      
      // Fix specific users' roles
      for (const [email, role] of [
        ['royalrowdy13@gmail.com', 'owner'],
        ['n210038@rguktn.ac.in', 'manager']
      ]) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          const oldRole = user.role;
          user.role = role;
          user.isActive = true;
          user.status = 'active';
          await user.save();
          console.log(`\nUpdated ${email}:`);
          console.log(`  - Role changed from ${oldRole} to ${role}`);
        } else {
          console.log(`\nCould not find user with email ${email}`);
        }
      }
      
      // Verify results after changes
      const remainingUsers = await User.find({});
      console.log('\n--- Final State After Fixes ---');
      console.log(`Total Users: ${remainingUsers.length}`);
      
      // Check for target users
      for (const email of targetEmails) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          console.log(`\nUser ${email}:`);
          console.log(`  - Role: ${user.role}`);
          console.log(`  - Status: ${user.status}`);
          console.log(`  - Active: ${user.isActive}`);
        } else {
          console.log(`\nNo user found with email ${email}`);
        }
      }
      
      // Check if there are still any duplicate emails
      const emailCountsAfter = {};
      remainingUsers.forEach(user => {
        const email = user.email.toLowerCase();
        if (!emailCountsAfter[email]) {
          emailCountsAfter[email] = [];
        }
        emailCountsAfter[email].push(user);
      });
      
      const duplicateEmailsAfter = Object.entries(emailCountsAfter)
        .filter(([email, users]) => users.length > 1)
        .map(([email, users]) => ({ email, count: users.length }));
      
      if (duplicateEmailsAfter.length > 0) {
        console.log(`\n⚠️ There are still ${duplicateEmailsAfter.length} emails with duplicate entries.`);
        duplicateEmailsAfter.forEach(({ email, count }) => {
          console.log(`  - ${email}: ${count} entries`);
        });
      } else {
        console.log('\n✅ Success! No duplicate emails remain in the system.');
      }
      
      console.log('\nFixes completed. Try logging in again - the role issues should be resolved.');
    } else {
      console.log('\nOperation cancelled. No changes were made.');
    }
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    rl.close();
  }
}

// Execute the function
fixUserRoles(); 