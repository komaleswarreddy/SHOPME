// Script to fix users collection issues
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = mongoose.model('User', new mongoose.Schema({
  kindeId: String,
  email: String,
  role: String,
  organizationId: String,
  isActive: Boolean,
  firstName: String,
  lastName: String,
}));

async function fixUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get direct access to the database
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check for users with id field
    const usersWithIdField = await usersCollection.find({ id: { $exists: true } }).toArray();
    console.log(`Found ${usersWithIdField.length} users with 'id' field`);
    
    if (usersWithIdField.length > 0) {
      console.log('Sample users with id field:');
      console.log(JSON.stringify(usersWithIdField.slice(0, 3), null, 2));
      
      // Find users with id: null
      const usersWithNullId = await usersCollection.find({ id: null }).toArray();
      console.log(`Found ${usersWithNullId.length} users with id: null`);
      
      // Option 1: Delete all users with id: null except one
      if (usersWithNullId.length > 1) {
        console.log('Deleting duplicate null id users...');
        // Keep the first one, delete the rest
        const docsToDelete = usersWithNullId.slice(1).map(doc => doc._id);
        const deleteResult = await usersCollection.deleteMany({ _id: { $in: docsToDelete } });
        console.log(`Deleted ${deleteResult.deletedCount} duplicate users`);
      }
      
      // Option 2: Remove the id field from all users
      console.log('Removing id field from all users...');
      const updateResult = await usersCollection.updateMany(
        {}, // match all documents
        { $unset: { id: "" } } // remove id field
      );
      console.log(`Updated ${updateResult.modifiedCount} users to remove id field`);
      
      // Verify the fix
      const remainingUsersWithId = await usersCollection.find({ id: { $exists: true } }).toArray();
      console.log(`After fix: ${remainingUsersWithId.length} users still have 'id' field`);
    }
    
    // Check if there are any Kinde users (proper users with kindeId)
    const kindeUsers = await usersCollection.find({ kindeId: { $exists: true } }).toArray();
    console.log(`Found ${kindeUsers.length} users with kindeId field`);
    
    if (kindeUsers.length > 0) {
      console.log('Sample Kinde user:');
      console.log(JSON.stringify(kindeUsers[0], null, 2));
    }
    
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

async function updateSalesRepToCustomer() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Find users with 'sales_rep' role
    const salesRepUsers = await User.find({ role: 'sales_rep' });
    console.log(`Found ${salesRepUsers.length} users with 'sales_rep' role`);

    // Update all sales_rep users to customer role
    if (salesRepUsers.length > 0) {
      const updateResult = await User.updateMany(
        { role: 'sales_rep' }, 
        { $set: { role: 'customer' } }
      );

      console.log(`Updated ${updateResult.modifiedCount} users from 'sales_rep' to 'customer'`);
    }

    console.log('User role update completed successfully');
  } catch (error) {
    console.error('Error updating user roles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fixUsers();

// Run the function if this file is run directly
if (require.main === module) {
  updateSalesRepToCustomer()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
} 