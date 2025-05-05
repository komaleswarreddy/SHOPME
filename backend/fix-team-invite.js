const mongoose = require('mongoose');
require('dotenv').config();

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

async function checkAndFixTeamInvite() {
  try {
    console.log('Starting team invite check and fix...');
    
    // Use the MongoDB URI from environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    // 1. Check if the required environment variables are set
    console.log('\nChecking environment variables for email functionality...');
    
    const requiredEnvVars = [
      'EMAIL_HOST', 
      'EMAIL_USER', 
      'EMAIL_PASS', 
      'FRONTEND_URL',
      'JWT_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      console.log('Please add the following variables to your .env file:');
      missingVars.forEach(varName => {
        console.log(`${varName}=your_value`);
      });
    } else {
      console.log('All required environment variables are set.');
    }
    
    // 2. Check for pending invitations
    console.log('\nChecking for pending invitations...');
    
    const pendingUsers = await User.find({ status: 'pending' });
    console.log(`Found ${pendingUsers.length} pending invitations.`);
    
    if (pendingUsers.length > 0) {
      console.log('Pending invitations details:');
      pendingUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Organization: ${user.organizationId}`);
      });
    }
    
    // 3. Check users with customer role
    console.log('\nChecking users with customer role...');
    
    const customerUsers = await User.find({ role: 'customer' });
    console.log(`Found ${customerUsers.length} users with customer role.`);
    
    // 4. Check organization roles distribution
    console.log('\nChecking roles distribution by organization...');
    
    const organizations = await Organization.find({});
    
    for (const org of organizations) {
      const orgUsers = await User.find({ organizationId: org.kindeOrgId });
      const roleCount = orgUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`Organization: ${org.name} (${org.kindeOrgId})`);
      console.log(`  Total users: ${orgUsers.length}`);
      console.log('  Roles distribution:');
      
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`    - ${role}: ${count}`);
      });
      
      // Check if organization has at least one owner
      if (!roleCount['owner']) {
        console.log('\n  ⚠️ WARNING: This organization has no owner!');
        
        // Find the most suitable user to promote to owner
        if (orgUsers.length > 0) {
          const sortedUsers = [...orgUsers].sort((a, b) => {
            // Prioritize active users and earlier creation date
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return (a.createdAt || 0) - (b.createdAt || 0);
          });
          
          const userToPromote = sortedUsers[0];
          console.log(`  👑 Promoting user ${userToPromote.email} to owner role...`);
          
          userToPromote.role = 'owner';
          userToPromote.isActive = true;
          userToPromote.status = 'active';
          await userToPromote.save();
          
          console.log(`  ✅ User ${userToPromote.email} has been promoted to owner.`);
        }
      }
    }
    
    console.log('\nCheck and fix completed. Team invite functionality should now work properly.');
  } catch (error) {
    console.error('Error during check and fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the check and fix
checkAndFixTeamInvite(); 