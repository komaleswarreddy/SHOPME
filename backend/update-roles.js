const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Load User model
const User = mongoose.model('User', new mongoose.Schema({
  kindeId: String,
  email: String,
  role: String,
  organizationId: String,
  isActive: Boolean,
  firstName: String,
  lastName: String,
}));

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
updateSalesRepToCustomer()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 