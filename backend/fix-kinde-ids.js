const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

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

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function fixKindeIds() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // Get all users
    const allUsers = await User.find({});
    console.log(`Found ${allUsers.length} users in the database`);

    if (allUsers.length === 0) {
      console.log('No users found in the database');
      return;
    }

    // Show the users with kindeIds that start with "manual-"
    const manualUsers = allUsers.filter(user => user.kindeId && user.kindeId.startsWith('manual-'));
    console.log(`\nFound ${manualUsers.length} users with manual kindeIds:`);
    manualUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) in org ${user.organizationId} - kindeId: ${user.kindeId}`);
    });

    if (process.argv[2] === '--fix-all') {
      // Ask for each user's real kindeId
      console.log('\nPlease run the authentication debug panel in your app to get the real kindeIds');
      console.log('You can press Enter to skip a user if you don\'t have their kindeId yet\n');

      for (const user of manualUsers) {
        const kindeId = await askForInput(`Enter the real kindeId for ${user.email} (or press Enter to skip): `);
        
        if (kindeId && kindeId.trim() !== '') {
          await User.updateOne({ _id: user._id }, { kindeId: kindeId.trim() });
          console.log(`Updated kindeId for ${user.email}`);
        } else {
          console.log(`Skipped ${user.email}`);
        }
      }
    } else if (process.argv.length >= 4) {
      // Update a specific user's kindeId from command line arguments
      const email = process.argv[2];
      const kindeId = process.argv[3];
      
      await updateUserKindeId(email, kindeId);
    } else {
      // Interactive mode for a single user
      console.log('\nPlease provide the email and kindeId for the user you want to update:');
      const email = await askForInput('Email: ');
      const kindeId = await askForInput('Kinde ID: ');
      
      if (email && kindeId) {
        await updateUserKindeId(email, kindeId);
      }
    }

    // Update the login function in middleware/auth.js to log the Kinde ID and email matching
    console.log('\nNext steps:');
    console.log('1. Add logging to the auth middleware to print Kinde IDs during login attempts');
    console.log('2. Compare the IDs to ensure they match what you updated');
    console.log('3. You may need to update the following files:');
    console.log('   - backend/middleware/auth.js: Add more logging');
    console.log('   - src/services/auth.js: Ensure the Kinde ID is being passed correctly');

    // Show final state
    await showUpdatedUsers();
    
  } catch (error) {
    console.error('Error updating kindeIds:', error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

async function updateUserKindeId(email, kindeId) {
  // Find the user by email
  const user = await User.findOne({ email: email.trim() });
  
  if (!user) {
    console.log(`User ${email} not found`);
    return;
  }
  
  // Update the kindeId
  const oldKindeId = user.kindeId;
  user.kindeId = kindeId.trim();
  await user.save();
  
  console.log(`Updated kindeId for ${email}:`);
  console.log(`  From: ${oldKindeId}`);
  console.log(`  To:   ${kindeId}`);
}

async function showUpdatedUsers() {
  // Get all users
  const allUsers = await User.find({});
  
  console.log('\nCurrent Users:');
  console.log('Email                      | Role     | Organization      | KindeId');
  console.log('---------------------------|----------|-------------------|------------------------');
  
  allUsers.forEach(user => {
    const kindeIdPreview = user.kindeId ? (user.kindeId.length > 20 ? 
      user.kindeId.substring(0, 17) + '...' : user.kindeId) : 'null';
    
    console.log(
      `${padEnd(user.email, 27)} | ${padEnd(user.role, 8)} | ${padEnd(user.organizationId, 17)} | ${kindeIdPreview}`
    );
  });
}

function padEnd(str, length) {
  if (!str) return ' '.repeat(length);
  return str.length >= length ? str : str + ' '.repeat(length - str.length);
}

function askForInput(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Show help if requested
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.log(`
Usage: node fix-kinde-ids.js [email] [kindeId]  - Update a specific user's kindeId
       node fix-kinde-ids.js --fix-all          - Fix all users with manual kindeIds
       node fix-kinde-ids.js                     - Interactive mode

Examples:
  node fix-kinde-ids.js hihellomawa@gmail.com kp_12345abcdef  - Update the kindeId for a specific user
  `);
  process.exit(0);
}

// Run the function
fixKindeIds()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 