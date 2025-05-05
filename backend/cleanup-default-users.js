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

async function cleanupDefaultUsers() {
  try {
    console.log('Starting cleanup of default users...');
    
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

    // Get statistics before cleanup
    const organizations = await Organization.find({});
    const allUsers = await User.find({});
    
    console.log('\n--- Current State Before Cleanup ---');
    console.log(`Organizations: ${organizations.length}`);
    console.log(`Total Users: ${allUsers.length}`);
    
    // Find all default users (created by the system)
    const defaultUsersQuery = {
      $or: [
        { email: { $in: [
          'salesrep1@b2boost.com',
          'salesrep2@b2boost.com',
          'manager1@b2boost.com',
          'manager2@b2boost.com',
          'support@b2boost.com'
        ]}},
        { kindeId: { $regex: /^default-/ }},
        { kindeId: { $regex: /^team-/ }},
        { firstName: 'Default' }
      ]
    };
    
    const defaultUsers = await User.find(defaultUsersQuery);
    console.log(`Found ${defaultUsers.length} default users to remove.`);
    
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
    
    console.log(`Found ${duplicateEmails.length} emails with duplicate entries.`);
    
    // Ask for confirmation
    console.log('\n⚠️ WARNING: This will remove:');
    console.log(`- ${defaultUsers.length} default/system-created users`);
    console.log(`- Duplicate entries for ${duplicateEmails.length} email addresses`);
    console.log('\nOrganizations will be preserved.');
    
    const answer = await question('\nType "CLEANUP" to confirm: ');
    
    if (answer === 'CLEANUP') {
      console.log('\nProceeding with cleanup...');
      
      // Delete default users
      const defaultDeleteResult = await User.deleteMany(defaultUsersQuery);
      console.log(`Deleted ${defaultDeleteResult.deletedCount} default users.`);
      
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
      
      console.log(`Removed ${duplicateDeleteCount} duplicate user entries.`);
      
      // Verify results
      const remainingUsers = await User.find({});
      const remainingDefaultUsers = await User.find(defaultUsersQuery);
      
      console.log('\n--- Final State After Cleanup ---');
      console.log(`Organizations: ${organizations.length} (unchanged)`);
      console.log(`Total Users: ${remainingUsers.length}`);
      console.log(`Remaining Default Users: ${remainingDefaultUsers.length}`);
      
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
        console.log('\nYou may need to run this script again or address these manually.');
      } else {
        console.log('\n✅ Success! No duplicate emails remain in the system.');
      }
      
      console.log('\nCleanup completed. You should now be able to register without duplicate email errors.');
    } else {
      console.log('\nOperation cancelled. No changes were made.');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    rl.close();
  }
}

// Execute the function
cleanupDefaultUsers(); 