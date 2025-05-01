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
  lastName: String
});

const User = mongoose.model('User', userSchema);

async function fixInvalidUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Find invalid users with missing required fields
    const invalidUsers = await User.find({
      $or: [
        { kindeId: { $exists: false } },
        { kindeId: null },
        { kindeId: '' },
        { email: { $exists: false } },
        { email: null },
        { email: '' },
        { role: { $exists: false } },
        { role: null },
        { role: '' },
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: '' }
      ]
    });

    console.log(`Found ${invalidUsers.length} invalid users`);

    if (invalidUsers.length > 0) {
      // Option 1: Delete all invalid users
      console.log('Deleting invalid users...');
      const deleteResult = await User.deleteMany({
        $or: [
          { kindeId: { $exists: false } },
          { kindeId: null },
          { kindeId: '' },
          { email: { $exists: false } },
          { email: null },
          { email: '' },
          { role: { $exists: false } },
          { role: null },
          { role: '' },
          { organizationId: { $exists: false } },
          { organizationId: null },
          { organizationId: '' }
        ]
      });
      
      console.log(`Deleted ${deleteResult.deletedCount} invalid users`);
    }

    // Update any remaining users with sales_rep role to customer
    const salesRepUsers = await User.find({ role: 'sales_rep' });
    if (salesRepUsers.length > 0) {
      console.log(`Found ${salesRepUsers.length} users with 'sales_rep' role`);
      const updateResult = await User.updateMany(
        { role: 'sales_rep' },
        { $set: { role: 'customer' } }
      );
      console.log(`Updated ${updateResult.modifiedCount} users from 'sales_rep' to 'customer'`);
    } else {
      console.log('No users with sales_rep role found');
    }

    // Find users after cleanup
    const remainingUsers = await User.find({}).select('email kindeId role organizationId isActive');
    console.log(`Total users after cleanup: ${remainingUsers.length}`);

    // Show users by role
    const roles = {};
    remainingUsers.forEach(user => {
      if (!roles[user.role]) {
        roles[user.role] = 0;
      }
      roles[user.role]++;
    });
    
    console.log('Users by role after cleanup:');
    Object.entries(roles).forEach(([role, count]) => {
      console.log(`- ${role}: ${count} users`);
    });

    console.log('\nUser database cleanup completed.');
  } catch (error) {
    console.error('Error fixing invalid users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixInvalidUsers()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 