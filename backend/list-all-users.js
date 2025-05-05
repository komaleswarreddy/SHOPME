require('dotenv').config();
const mongoose = require('mongoose');

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

async function listAllUsers() {
  try {
    console.log('Starting user listing...');
    
    // Use the MongoDB URI directly from the .env file
    const mongodbUri = "mongodb+srv://n210038:asdf@cluster0.ah6vp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Get all users
    const users = await User.find({});
    
    console.log(`\nFound ${users.length} total users in the database.`);
    
    // Group users by email to check for duplicates
    const emailGroups = {};
    users.forEach(user => {
      const email = user.email?.toLowerCase();
      if (email) {
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(user);
      }
    });
    
    // Find duplicate emails
    const duplicateEmails = Object.entries(emailGroups)
      .filter(([email, users]) => users.length > 1)
      .map(([email, users]) => ({ email, count: users.length }));
    
    console.log(`\nFound ${duplicateEmails.length} emails with duplicate entries:`);
    duplicateEmails.forEach(({ email, count }) => {
      console.log(`  - ${email}: ${count} entries`);
    });
    
    // List first 10 users for investigation
    console.log('\nShowing first 10 users for investigation:');
    users.slice(0, 10).forEach((user, i) => {
      console.log(`\nUser ${i+1}:`);
      console.log(`  - ID: ${user._id}`);
      console.log(`  - Email: ${user.email || 'N/A'}`);
      console.log(`  - KindeId: ${user.kindeId || 'N/A'}`);
      console.log(`  - Role: ${user.role || 'N/A'}`);
      console.log(`  - Organization: ${user.organizationId || 'N/A'}`);
      console.log(`  - Status: ${user.status || 'N/A'}`);
      console.log(`  - Active: ${user.isActive ? 'Yes' : 'No'}`);
    });
    
    // Check for problematic emails specifically
    const targetEmails = ['n210038@rguktn.ac.in', 'royalrowdy13@gmail.com'];
    
    console.log('\nChecking for specific problem emails (case-insensitive):');
    
    for (const targetEmail of targetEmails) {
      // Case-insensitive search
      const matchingUsers = users.filter(user => 
        user.email && user.email.toLowerCase() === targetEmail.toLowerCase()
      );
      
      console.log(`\nUsers with email like "${targetEmail}": ${matchingUsers.length}`);
      
      if (matchingUsers.length > 0) {
        matchingUsers.forEach((user, i) => {
          console.log(`  User ${i+1}:`);
          console.log(`    - ID: ${user._id}`);
          console.log(`    - Email: ${user.email} (exact case)`); 
          console.log(`    - KindeId: ${user.kindeId}`);
          console.log(`    - Role: ${user.role}`);
          console.log(`    - Organization: ${user.organizationId}`);
          console.log(`    - Status: ${user.status || 'N/A'}`);
          console.log(`    - Active: ${user.isActive ? 'Yes' : 'No'}`);
        });
      }
    }
    
    console.log('\nUser listing completed.');
  } catch (error) {
    console.error('Error during operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Execute the function
listAllUsers(); 