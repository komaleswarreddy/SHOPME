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

async function fixTeamInvites() {
  try {
    console.log('========================================');
    console.log('FIXING TEAM INVITATION ISSUES');
    console.log('========================================\n');
    
    // Use the MongoDB URI from environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!\n');

    // 1. AGGRESSIVELY FIX EMAIL DUPLICATES - This is crucial to prevent "already registered" errors
    console.log('\n=== AGGRESSIVELY FIXING EMAIL DUPLICATES ===');
    const allUsers = await User.find({});
    const emailMap = {};
    
    // Group users by email (case insensitive)
    allUsers.forEach(user => {
      if (!user.email) return;
      
      const email = user.email.toLowerCase().trim();
      if (!emailMap[email]) {
        emailMap[email] = [];
      }
      emailMap[email].push(user);
    });
    
    // Find and fix emails with multiple records
    console.log('\nSearching for emails with multiple records...');
    
    const duplicateEmails = Object.entries(emailMap)
      .filter(([email, users]) => users.length > 1)
      .map(([email, users]) => ({ email, users }));
    
    console.log(`Found ${duplicateEmails.length} email(s) with multiple user records`);
    
    for (const { email, users } of duplicateEmails) {
      console.log(`\nProcessing duplicate email: ${email} (${users.length} records)`);
      
      // Find active users (they take priority)
      const activeUsers = users.filter(u => u.isActive && u.status === 'active');
      
      // Sort by priority: active status, then most recent
      const sortedUsers = [...users].sort((a, b) => {
        // Active users first
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        // Then by status (active > pending)
        if (a.status !== b.status) {
          if (a.status === 'active') return -1;
          if (b.status === 'active') return 1;
        }
        // Finally by creation date (newest first)
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      
      // Select primary user (first after sorting)
      const primaryUser = sortedUsers[0];
      console.log(`Selected primary user: ${primaryUser._id} (${primaryUser.status}, ${primaryUser.organizationId})`);
      
      // CRITICAL FIX: For registration issues, make sure we have a kindeId on the primary user
      if (!primaryUser.kindeId || primaryUser.kindeId.startsWith('pending-') || primaryUser.kindeId.startsWith('team-')) {
        console.log(`WARNING: Primary user has a temporary kindeId: ${primaryUser.kindeId}`);
        console.log('This can cause "already registered" errors. Setting a stable kindeId...');
        
        // Create a stable kindeId if needed
        primaryUser.kindeId = `fixed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await primaryUser.save();
        console.log(`Updated primary user with stable kindeId: ${primaryUser.kindeId}`);
      }
      
      // Handle all other records
      for (const user of sortedUsers.slice(1)) {
        if (user.organizationId === primaryUser.organizationId) {
          // Same organization - delete duplicate
          console.log(`Deleting duplicate user in same organization: ${user._id}`);
          await User.deleteOne({ _id: user._id });
        } else {
          // Different organization - make it a consistent multi-org setup
          console.log(`User in different organization: ${user._id} (${user.organizationId})`);
          
          // If the record is active, convert to pending if we had an active primary
          if (user.status === 'active' && activeUsers.length > 1) {
            console.log(`Converting to pending invitation with same kindeId`);
            user.status = 'pending';
            user.isActive = false;
          }
          
          // CRITICAL FIX: Use the SAME kindeId for all user records with the same email!
          // This is key to fixing "already registered" errors
          user.kindeId = primaryUser.kindeId;
          await user.save();
          console.log(`Updated user with primary kindeId: ${primaryUser.kindeId}`);
        }
      }
      
      console.log(`✅ Fixed duplicate records for email: ${email}`);
    }

    // 2. Check for pending invitations
    console.log('\n=== CHECKING PENDING INVITATIONS ===');
    
    const pendingUsers = await User.find({ status: 'pending' });
    console.log(`Found ${pendingUsers.length} pending invitation(s)`);
    
    if (pendingUsers.length > 0) {
      console.log('\nPending invitations:');
      pendingUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Organization: ${user.organizationId}`);
      });
      
      // Check for conflicts between invitations and existing users
      console.log('\nFixing pending invitations to use correct kindeIds...');
      
      for (const pendingUser of pendingUsers) {
        // Find all active users with the same email
        const activeUsers = await User.find({ 
          email: pendingUser.email ? pendingUser.email.toLowerCase() : "",
          status: 'active',
          _id: { $ne: pendingUser._id }
        });
        
        if (activeUsers.length > 0) {
          // Found active users with same email - use their kindeId
          const activeUser = activeUsers[0];
          console.log(`Updating invitation for ${pendingUser.email} to use kindeId from active user: ${activeUser.kindeId}`);
          
          // Update the pending invitation to use the active user's kindeId
          pendingUser.kindeId = activeUser.kindeId;
          await pendingUser.save();
        }
      }
    }
    
    // 3. Find and fix users with multiple active records
    console.log('\n=== CHECKING FOR USERS WITH MULTIPLE ACTIVE RECORDS ===');
    
    const emailCounts = {};
    
    // Group by email again to find active duplicates
    (await User.find({ status: 'active' })).forEach(user => {
      if (!user.email) return;
      
      const email = user.email.toLowerCase().trim();
      if (!emailCounts[email]) {
        emailCounts[email] = [];
      }
      emailCounts[email].push(user);
    });
    
    const multipleActiveEmails = Object.entries(emailCounts)
      .filter(([email, users]) => users.length > 1)
      .map(([email, users]) => ({ email, count: users.length, users }));
    
    console.log(`Found ${multipleActiveEmails.length} email(s) with multiple active user records`);
    
    for (const { email, users } of multipleActiveEmails) {
      console.log(`\nFixing multiple active records for email: ${email}`);
      
      // Get one user per organization (to handle multi-org case)
      const usersByOrg = {};
      
      for (const user of users) {
        if (!usersByOrg[user.organizationId] || user.role === 'owner') {
          usersByOrg[user.organizationId] = user;
        }
      }
      
      // Get all unique users by org
      const uniqueUsers = Object.values(usersByOrg);
      
      // If we still have multiple records, ensure they share the same kindeId
      if (uniqueUsers.length > 1) {
        console.log(`User belongs to ${uniqueUsers.length} different organizations`);
        
        // Pick a primary kindeId (prefer owners)
        const primaryUser = uniqueUsers.find(u => u.role === 'owner') || uniqueUsers[0];
        const primaryKindeId = primaryUser.kindeId;
        
        console.log(`Using kindeId ${primaryKindeId} from ${primaryUser.organizationId} as primary`);
        
        // Update all users to use the same kindeId
        for (const user of uniqueUsers) {
          if (user.kindeId !== primaryKindeId) {
            console.log(`Updating user in org ${user.organizationId} to use primary kindeId`);
            user.kindeId = primaryKindeId;
            await user.save();
          }
        }
        
        console.log(`✅ All user records for ${email} now use the same kindeId`);
      }
      
      // Check for redundant records in the same organization
      for (const orgId of Object.keys(usersByOrg)) {
        const usersInOrg = users.filter(u => u.organizationId === orgId);
        
        if (usersInOrg.length > 1) {
          console.log(`Found ${usersInOrg.length} duplicate users in org ${orgId}`);
          
          // Keep the one we selected earlier and delete the rest
          const keepUser = usersByOrg[orgId];
          
          for (const user of usersInOrg) {
            if (user._id.toString() !== keepUser._id.toString()) {
              console.log(`Deleting redundant user: ${user._id}`);
              await User.deleteOne({ _id: user._id });
            }
          }
        }
      }
    }
    
    // 4. Fix any users with null or undefined email (can cause issues)
    console.log('\n=== CHECKING FOR USERS WITH INVALID EMAILS ===');
    
    const invalidEmailUsers = await User.find({ 
      $or: [
        { email: null },
        { email: '' },
        { email: { $exists: false } }
      ]
    });
    
    console.log(`Found ${invalidEmailUsers.length} users with invalid/missing emails`);
    
    if (invalidEmailUsers.length > 0) {
      for (const user of invalidEmailUsers) {
        console.log(`Removing user with invalid email: ${user._id}`);
        await User.deleteOne({ _id: user._id });
      }
    }

    // 5. Verify indexes to ensure appropriate uniqueness constraints
    console.log('\n=== VERIFYING DATABASE INDEXES ===');
    
    try {
      // Remove and recreate proper indexes to ensure consistent behavior
      console.log('Updating database indexes for proper uniqueness constraints...');
      
      const collection = mongoose.connection.collection('users');
      
      // Check if we have indexes that might cause "duplicate email" errors
      const indexes = await collection.indexes();
      console.log('Current indexes:', indexes.map(idx => idx.name).join(', '));
      
      // Drop problematic indexes if they exist
      for (const index of indexes) {
        // Skip the _id index which cannot be dropped
        if (index.name === '_id_') continue;
        
        if (index.key && index.key.email) {
          console.log(`Dropping potentially problematic index: ${index.name}`);
          await collection.dropIndex(index.name);
        }
      }
      
      // Create the proper composite index for email+organizationId
      // This allows the same email in different organizations but prevents duplicates
      // within the same organization
      console.log('Creating proper composite index for email+organizationId');
      await collection.createIndex(
        { email: 1, organizationId: 1 }, 
        { unique: true, background: true }
      );
      
      console.log('✅ Database indexes updated successfully');
    } catch (indexError) {
      console.error('Error updating indexes:', indexError);
    }
    
    console.log('\n========================================');
    console.log('TEAM INVITATION FIXES COMPLETED');
    console.log('========================================');
    console.log('Team member invitations should now work properly.');
    console.log('Users who were invited should be able to log in successfully.');
    console.log('The "email already registered" error should be resolved.');
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the fix
fixTeamInvites(); 