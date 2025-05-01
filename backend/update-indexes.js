const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function updateIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // List current indexes
    console.log('\nCurrent indexes:');
    const currentIndexes = await usersCollection.indexes();
    console.log(JSON.stringify(currentIndexes, null, 2));
    
    // Drop existing unique indexes on email and kindeId
    console.log('\nDropping existing unique indexes...');
    try {
      await usersCollection.dropIndex('email_1');
      console.log('Dropped email_1 index');
    } catch (e) {
      console.log('email_1 index not found or already dropped');
    }
    
    try {
      await usersCollection.dropIndex('kindeId_1');
      console.log('Dropped kindeId_1 index');
    } catch (e) {
      console.log('kindeId_1 index not found or already dropped');
    }
    
    // Create new compound indexes
    console.log('\nCreating new compound indexes...');
    await User.init(); // This will create the new indexes defined in the schema
    
    // Verify new indexes
    console.log('\nNew indexes:');
    const newIndexes = await usersCollection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));
    
    console.log('\nIndex update complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
updateIndexes(); 