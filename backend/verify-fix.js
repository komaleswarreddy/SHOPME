// Script to verify the fix was successful
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Import our models to check their current setup
const User = require('./models/User');

async function verifyFix() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get direct access to the database
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Verify users collection
    console.log('\nVerifying users collection...');
    
    // Check if there are any users with id field
    const usersWithIdField = await usersCollection.find({ id: { $exists: true } }).toArray();
    console.log(`Users with 'id' field: ${usersWithIdField.length}`);
    
    // Check users with kindeId
    const kindeUsers = await usersCollection.find({ kindeId: { $exists: true } }).toArray();
    console.log(`Users with 'kindeId' field: ${kindeUsers.length}`);
    
    // Check indexes on the users collection
    const userIndexes = await usersCollection.indexes();
    console.log('Indexes on users collection:');
    console.log(JSON.stringify(userIndexes, null, 2));
    
    // Attempt to create a test user using our Mongoose model
    console.log('\nAttempting to create a test user using Mongoose model...');
    try {
      const testUser = new User({
        kindeId: `test-${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        organizationId: 'test-org'
      });
      
      // Check if the model has an id field before saving
      console.log('Test user document fields before save:');
      console.log(Object.keys(testUser._doc));
      
      // Save to database
      const savedUser = await testUser.save();
      console.log('Successfully created test user!');
      console.log('Saved user fields:');
      console.log(Object.keys(savedUser._doc));
      
      // Check if saved user has an id field
      const hasIdField = 'id' in savedUser._doc;
      console.log(`Saved user has 'id' field: ${hasIdField}`);
      
      // Cleanup - delete the test user
      await User.deleteOne({ _id: savedUser._id });
      console.log('Test user deleted');
    } catch (error) {
      console.error('Error creating test user:', error);
    }
    
    console.log('\nFix verification complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
verifyFix(); 