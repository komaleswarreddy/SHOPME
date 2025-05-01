// Script to check all collections and their indexes
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkAllCollections() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get direct access to the database
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    for (const collection of collections) {
      console.log(`- ${collection.name}`);
    }
    
    // Check indexes for each collection
    for (const collection of collections) {
      const collectionObj = db.collection(collection.name);
      const indexes = await collectionObj.indexes();
      console.log(`\nIndexes for ${collection.name}:`);
      console.log(JSON.stringify(indexes, null, 2));
      
      // Check documents in this collection
      const count = await collectionObj.countDocuments();
      console.log(`Document count: ${count}`);
      
      if (count > 0) {
        // Show a sample document
        const sampleDoc = await collectionObj.findOne();
        console.log('Sample document:');
        console.log(JSON.stringify(sampleDoc, null, 2));
      }
    }
    
    // Check if any collection has an 'id' field index
    console.log('\nSearching for collections with id field or id_1 index...');
    for (const collection of collections) {
      const collectionObj = db.collection(collection.name);
      const indexes = await collectionObj.indexes();
      
      // Check if any index has 'id' as a key
      const hasIdIndex = indexes.some(idx => idx.key && idx.key.id);
      if (hasIdIndex) {
        console.log(`Collection ${collection.name} has an index on 'id' field`);
      }
    }
    
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
checkAllCollections(); 