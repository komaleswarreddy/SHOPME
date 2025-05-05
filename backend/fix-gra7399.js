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

async function fixGra7399() {
  try {
    console.log('========================================');
    console.log('FIXING SPECIFIC USER: gra7399@gmail.com');
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

    const targetEmail = 'gra7399@gmail.com';
    const kindeId = 'kp_38cb4325cc684a678e15a3a2609baff5';
    const orgId = 'org-kp_38cb4-1746371973164';
    
    // Step 1: Find all users with this email
    const usersWithEmail = await User.find({ email: targetEmail });
    console.log(`Found ${usersWithEmail.length} user(s) with email ${targetEmail}`);
    
    // Step 2: Find user with this specific kindeId
    const usersWithKindeId = await User.find({ kindeId });
    console.log(`Found ${usersWithKindeId.length} user(s) with kindeId ${kindeId}`);
    
    // Step 3: Check if this specific organization exists
    const usersInOrg = await User.find({ organizationId: orgId });
    console.log(`Found ${usersInOrg.length} user(s) in organization ${orgId}`);
    
    // If we have exactly one user with this email but not with this kindeId,
    // update the user to have the new kindeId and organizationId
    if (usersWithEmail.length === 1 && usersWithKindeId.length === 0) {
      const user = usersWithEmail[0];
      console.log(`Updating existing user to use new kindeId and organizationId:`);
      console.log(`- Current kindeId: ${user.kindeId}`);
      console.log(`- Current organizationId: ${user.organizationId}`);
      console.log(`- New kindeId: ${kindeId}`);
      console.log(`- New organizationId: ${orgId}`);
      
      user.kindeId = kindeId;
      user.organizationId = orgId;
      user.isActive = true;
      user.status = 'active';
      
      if (user.role !== 'customer' && user.role !== 'owner') {
        user.role = 'customer';
      }
      
      await user.save();
      console.log('User updated successfully!');
    }
    // If we have no users with this email, we should create a new one
    else if (usersWithEmail.length === 0) {
      console.log('No user found with this email. Creating new user...');
      
      const newUser = new User({
        email: targetEmail,
        kindeId,
        organizationId: orgId,
        role: 'customer',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await newUser.save();
      console.log('New user created successfully!');
    }
    // If we have multiple users with this email, clean up duplicates
    else if (usersWithEmail.length > 1) {
      console.log('Multiple users found with this email. Cleaning up duplicates...');
      
      // Choose the most recently created active user to keep
      const sortedUsers = usersWithEmail.sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );
      
      const activeUsers = sortedUsers.filter(u => u.isActive && u.status === 'active');
      const userToKeep = activeUsers.length > 0 ? activeUsers[0] : sortedUsers[0];
      
      console.log(`Keeping user with kindeId: ${userToKeep.kindeId}, organizationId: ${userToKeep.organizationId}`);
      
      // Update the user we're keeping with the new kindeId and orgId
      userToKeep.kindeId = kindeId;
      userToKeep.organizationId = orgId;
      userToKeep.isActive = true;
      userToKeep.status = 'active';
      
      if (userToKeep.role !== 'customer' && userToKeep.role !== 'owner') {
        userToKeep.role = 'customer';
      }
      
      await userToKeep.save();
      console.log('User updated with new kindeId and organizationId');
      
      // Delete all the other duplicates
      for (const user of usersWithEmail) {
        if (user._id.toString() !== userToKeep._id.toString()) {
          await User.deleteOne({ _id: user._id });
          console.log(`Deleted duplicate user with kindeId: ${user.kindeId}`);
        }
      }
    }
    
    // Final check to make sure the user can register
    const finalCheck = await User.find({ email: targetEmail });
    console.log(`\nFinal check: Found ${finalCheck.length} user(s) with email ${targetEmail}`);
    
    if (finalCheck.length === 1) {
      const user = finalCheck[0];
      console.log('User details:');
      console.log(`- Email: ${user.email}`);
      console.log(`- KindeId: ${user.kindeId}`);
      console.log(`- Organization: ${user.organizationId}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Status: ${user.status}`);
      console.log(`- Active: ${user.isActive ? 'Yes' : 'No'}`);
      
      // Also check the uniqueness constraints
      const emailOrgPairs = await User.find({ 
        email: targetEmail,
        organizationId: user.organizationId
      });
      
      console.log(`Found ${emailOrgPairs.length} users with the same email+organization pair`);
      
      const kindeOrgPairs = await User.find({
        kindeId: user.kindeId,
        organizationId: user.organizationId
      });
      
      console.log(`Found ${kindeOrgPairs.length} users with the same kindeId+organization pair`);
      
      if (emailOrgPairs.length > 1 || kindeOrgPairs.length > 1) {
        console.log('\n⚠️ WARNING: There are still duplicate entries in the database.');
        console.log('Manual cleanup needed in MongoDB using the following commands:');
        console.log(`db.users.find({email: "${targetEmail}"})`);
        console.log(`db.users.find({kindeId: "${kindeId}"})`);
      } else {
        console.log('\n✅ User is properly set up and should be able to register now!');
      }
    } else {
      console.log('\n⚠️ Problem detected: There should be exactly one user with this email.');
    }
    
    console.log('\n========================================');
    console.log('FIX COMPLETED');
    console.log('========================================');
    console.log('You should now be able to register with:');
    console.log(`Email: ${targetEmail}`);
    console.log(`KindeId: ${kindeId}`);
    console.log(`Organization: ${orgId}`);
    
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the fix
fixGra7399(); 