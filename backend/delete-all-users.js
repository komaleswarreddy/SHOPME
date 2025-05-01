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

// Define Organization model
const organizationSchema = new mongoose.Schema({
  kindeOrgId: String,
  name: String,
  createdAt: Date,
  updatedAt: Date
});

const Organization = mongoose.model('Organization', organizationSchema);

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllUsers() {
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

    // Get current user count
    const userCount = await User.countDocuments({});
    const orgCount = await Organization.countDocuments({});
    console.log(`Found ${userCount} users across ${orgCount} organizations`);

    // Confirm deletion
    if (process.argv.includes('--force')) {
      await performDeletion();
    } else {
      rl.question('WARNING: This will delete ALL users from ALL organizations. Are you sure? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          await performDeletion();
        } else {
          console.log('Operation cancelled. No users were deleted.');
        }
        rl.close();
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
      });
    }
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function performDeletion() {
  // Print all organizations before deletion
  const allOrganizations = await Organization.find({});
  console.log('\nOrganizations before deletion:');
  for (const org of allOrganizations) {
    const usersInOrg = await User.find({ organizationId: org.kindeOrgId });
    console.log(`- ${org.name} (${org.kindeOrgId}): ${usersInOrg.length} users`);
  }

  // Delete all users
  const result = await User.deleteMany({});
  console.log(`\nDeletion complete. Deleted ${result.deletedCount} users.`);
  
  // Print all organizations after deletion
  console.log('\nOrganizations after deletion:');
  for (const org of allOrganizations) {
    const usersInOrg = await User.find({ organizationId: org.kindeOrgId });
    console.log(`- ${org.name} (${org.kindeOrgId}): ${usersInOrg.length} users`);
  }
  
  console.log('\nAll users have been removed from the database.');
  console.log('The system is now ready for new users to be added.');
}

// Show help message if requested
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.log(`
Usage: node delete-all-users.js [--force]

Delete all users from all organizations in the database.
Organizations will remain intact but will have no users.

Options:
  --force    Skip confirmation prompt
  --help     Show this help message
  `);
  process.exit(0);
}

// Run the deletion script
deleteAllUsers().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 