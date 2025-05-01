const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Check users collection
    if (collections.some(c => c.name === 'users')) {
      const usersCollection = db.collection('users');
      
      // Get indexes
      const indexes = await usersCollection.indexes();
      console.log('\nIndexes on users collection:');
      console.log(JSON.stringify(indexes, null, 2));
      
      // Check for documents with null id
      const nullIdUsers = await usersCollection.find({ id: null }).toArray();
      console.log(`\nUsers with null id: ${nullIdUsers.length}`);
      if (nullIdUsers.length > 0) {
        console.log('First user with null id:');
        console.log(JSON.stringify(nullIdUsers[0], null, 2));
      }
      
      // Check for all users
      const allUsers = await usersCollection.find({}).toArray();
      console.log(`\nTotal users: ${allUsers.length}`);
      if (allUsers.length > 0) {
        console.log('First user:');
        console.log(JSON.stringify(allUsers[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
checkDatabase(); 