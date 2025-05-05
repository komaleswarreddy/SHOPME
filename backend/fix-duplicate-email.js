require('dotenv').config();
const mongoose = require('mongoose');

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
    
    // Use the MongoDB URI directly from the .env file
    const mongodbUri = "mongodb+srv://n210038:asdf@cluster0.ah6vp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Find all users with the email n210038@rguktn.ac.in
    const targetEmail = 'n210038@rguktn.ac.in';
    const users = await User.find({ email: targetEmail });
    
    console.log(`Found ${users.length} user(s) with email ${targetEmail}`);
    
    if (users.length > 0) {
      console.log('User details:');
      users.forEach((user, i) => {
        console.log(`User ${i+1}:`);
        console.log(`  - ID: ${user._id}`);
        console.log(`  - KindeId: ${user.kindeId}`);
        console.log(`  - Role: ${user.role}`);
        console.log(`  - Organization: ${user.organizationId}`);
        console.log(`  - Status: ${user.status || 'undefined'}`);
      });
      
      // If more than one user exists, delete all but the most recent active one
      if (users.length > 1) {
        // Sort by priority: active status first, then by most recent creation date
        users.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        
        const userToKeep = users[0];
        const usersToDelete = users.slice(1);
        
        console.log(`\nKeeping user: ${userToKeep._id} (${userToKeep.role}, ${userToKeep.status || 'no status'})`);
        
        // Delete other users
        for (const user of usersToDelete) {
          console.log(`Deleting duplicate user: ${user._id} (${user.role}, ${user.status || 'no status'})`);
          await User.deleteOne({ _id: user._id });
        }
        
        console.log(`\nDeleted ${usersToDelete.length} duplicate user(s)`);
        
        // Ensure the remaining user has the owner role
        const remainingUser = await User.findById(userToKeep._id);
        if (remainingUser) {
          const oldRole = remainingUser.role;
          remainingUser.role = 'manager';  // Set to manager role
          remainingUser.isActive = true;
          remainingUser.status = 'active';
          await remainingUser.save();
          
          console.log(`Updated user ${targetEmail}:`);
          console.log(`  - Role changed from ${oldRole} to manager`);
          console.log(`  - Status set to active`);
        }
      } else if (users.length === 1) {
        // Just update the single user
        const user = users[0];
        const oldRole = user.role;
        user.role = 'manager';  // Set to manager role
        user.isActive = true;
        user.status = 'active';
        await user.save();
        
        console.log(`\nUpdated user ${targetEmail}:`);
        console.log(`  - Role changed from ${oldRole} to manager`);
        console.log(`  - Status set to active`);
      }
    } else {
      console.log(`No users found with email ${targetEmail}`);
    }
    
    // Do the same for royalrowdy13@gmail.com
    const targetEmail2 = 'royalrowdy13@gmail.com';
    const users2 = await User.find({ email: targetEmail2 });
    
    console.log(`\nFound ${users2.length} user(s) with email ${targetEmail2}`);
    
    if (users2.length > 0) {
      console.log('User details:');
      users2.forEach((user, i) => {
        console.log(`User ${i+1}:`);
        console.log(`  - ID: ${user._id}`);
        console.log(`  - KindeId: ${user.kindeId}`);
        console.log(`  - Role: ${user.role}`);
        console.log(`  - Organization: ${user.organizationId}`);
        console.log(`  - Status: ${user.status || 'undefined'}`);
      });
      
      // If more than one user exists, delete all but the most recent active one
      if (users2.length > 1) {
        // Sort by priority: active status first, then by most recent creation date
        users2.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        
        const userToKeep = users2[0];
        const usersToDelete = users2.slice(1);
        
        console.log(`\nKeeping user: ${userToKeep._id} (${userToKeep.role}, ${userToKeep.status || 'no status'})`);
        
        // Delete other users
        for (const user of usersToDelete) {
          console.log(`Deleting duplicate user: ${user._id} (${user.role}, ${user.status || 'no status'})`);
          await User.deleteOne({ _id: user._id });
        }
        
        console.log(`\nDeleted ${usersToDelete.length} duplicate user(s)`);
        
        // Ensure the remaining user has the owner role
        const remainingUser = await User.findById(userToKeep._id);
        if (remainingUser) {
          const oldRole = remainingUser.role;
          remainingUser.role = 'owner';  // Set to owner role
          remainingUser.isActive = true;
          remainingUser.status = 'active';
          await remainingUser.save();
          
          console.log(`Updated user ${targetEmail2}:`);
          console.log(`  - Role changed from ${oldRole} to owner`);
          console.log(`  - Status set to active`);
        }
      } else if (users2.length === 1) {
        // Just update the single user
        const user = users2[0];
        const oldRole = user.role;
        user.role = 'owner';  // Set to owner role
        user.isActive = true;
        user.status = 'active';
        await user.save();
        
        console.log(`\nUpdated user ${targetEmail2}:`);
        console.log(`  - Role changed from ${oldRole} to owner`);
        console.log(`  - Status set to active`);
      }
    } else {
      console.log(`No users found with email ${targetEmail2}`);
    }
    
    console.log('\nFix completed successfully! Try registering again.');
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Execute the function
fixDuplicateEmail(); 