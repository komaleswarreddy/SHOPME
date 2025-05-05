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

async function fixDuplicateEmail() {
  try {
    console.log('Starting duplicate email fix...');
    
    // Use the MongoDB URI from environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Fix specific email gra7399@gmail.com
    const targetEmail = 'gra7399@gmail.com';
    const users = await User.find({ email: targetEmail });
    
    console.log(`Found ${users.length} user(s) with email ${targetEmail}`);
    
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
      
      console.log(`Successfully fixed duplicate entries for ${targetEmail}`);
    } else if (users.length === 1) {
      console.log(`Only one user found with email ${targetEmail}, checking status...`);
      
      const user = users[0];
      if (user.status !== 'active' || !user.isActive || user.role !== 'customer') {
        console.log(`Updating user status for ${targetEmail}`);
        user.status = 'active';
        user.isActive = true;
        user.role = 'customer';
        await user.save();
        console.log(`User ${targetEmail} updated to active customer`);
      } else {
        console.log(`User ${targetEmail} is already an active customer, no changes needed`);
      }
    } else {
      console.log(`No users found with email ${targetEmail}`);
    }

    // Find all other duplicate emails
    console.log('\nChecking for other duplicate emails...');
    
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
      .map(([email, users]) => ({ email, count: users.length }));
    
    if (duplicateEmails.length > 0) {
      console.log(`Found ${duplicateEmails.length} other emails with duplicate entries:`);
      duplicateEmails.forEach(({ email, count }) => {
        console.log(`  - ${email}: ${count} entries`);
      });
      console.log('\nYou may want to run this script again with these emails.');
    } else {
      console.log('No other duplicate emails found in the system.');
    }
    
    console.log('\nFix completed successfully! Try registering again.');
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixDuplicateEmail(); 