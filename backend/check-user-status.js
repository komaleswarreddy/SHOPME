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

async function checkUserStatus() {
  try {
    // Get email from command line arguments
    const args = process.argv.slice(2);
    const email = args[0];
    
    if (!email) {
      console.error('Please provide an email address as an argument.');
      console.error('Example: node check-user-status.js gra7399@gmail.com');
      process.exit(1);
    }
    
    console.log(`Checking status for user: ${email}`);
    
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

    // Get all users with this email
    const users = await User.find({ email });
    
    console.log(`Found ${users.length} user(s) with email ${email}\n`);
    
    if (users.length === 0) {
      console.log('No users found with this email. The user can register as new.');
      console.log('If you get duplicate email errors, it may be due to:');
      console.log('1. The email is registered with a different case (e.g., Email vs email)');
      console.log('2. The email exists in your database but is in another collection');
      console.log('3. There may be unique index constraints on the email field');
      
      console.log('\nYou can check these conditions with:');
      console.log(`db.users.find({email: /${email}/i}) // Case-insensitive search`);
      console.log(`db.users.getIndexes() // Check for unique indexes`);
    } else {
      // Display information for each user
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`- ID: ${user._id}`);
        console.log(`- Email: ${user.email}`);
        console.log(`- KindeId: ${user.kindeId}`);
        console.log(`- Organization: ${user.organizationId}`);
        console.log(`- Role: ${user.role}`);
        console.log(`- Status: ${user.status}`);
        console.log(`- Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`- Created: ${user.createdAt}`);
        console.log(`- Updated: ${user.updatedAt}`);
        console.log('-------------------');
      });
      
      // Check if there might be a uniqueness constraint issue
      if (users.length > 1) {
        console.log('\n⚠️ WARNING: Multiple users found with the same email!');
        console.log('This could cause registration problems due to uniqueness constraints.');
        console.log('You may need to run the fix script: node fix-email-duplicates.js');
      }
      
      // Check if the user can log in
      const activeUsers = users.filter(user => user.isActive && user.status === 'active');
      if (activeUsers.length === 0) {
        console.log('\n⚠️ No active users found with this email.');
        console.log('User may need to be activated with: node fix-customer-role.js');
      } else {
        console.log('\n✅ User has at least one active account and should be able to log in.');
      }
    }
  } catch (error) {
    console.error('Error checking user status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the check
checkUserStatus(); 