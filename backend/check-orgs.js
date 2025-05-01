const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function checkOrganizations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    const orgsCollection = db.collection('organizations');
    
    // Count organizations
    const count = await orgsCollection.countDocuments();
    console.log(`\nTotal number of organizations: ${count}`);

    // List all organizations
    if (count > 0) {
      const orgs = await orgsCollection.find({}).toArray();
      console.log('\nOrganizations:');
      orgs.forEach(org => {
        console.log(`- ${org.name} (ID: ${org.kindeOrgId})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
checkOrganizations(); 