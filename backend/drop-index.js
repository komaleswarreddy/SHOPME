// Script to drop problematic index
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function dropIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get direct access to the database
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // List all indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Drop the problematic index
    console.log('Attempting to drop id_1 index...');
    try {
      await usersCollection.dropIndex('id_1');
      console.log('Successfully dropped id_1 index');
    } catch (dropError) {
      console.error('Error dropping index:', dropError);
    }
    
    // Verify indexes after drop attempt
    const remainingIndexes = await usersCollection.indexes();
    console.log('Remaining indexes:', JSON.stringify(remainingIndexes, null, 2));
    
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
dropIndex(); 