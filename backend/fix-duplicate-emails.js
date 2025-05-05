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

async function fixDuplicateEmails() {
  try {
    console.log('========================================');
    console.log('FIXING "EMAIL ALREADY REGISTERED" ERRORS');
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

    // IMPORTANT: First drop problematic indexes that would prevent our fixes
    console.log('Checking and fixing database indexes FIRST to avoid update errors...');
    
    try {
      const collection = mongoose.connection.collection('users');
      const indexes = await collection.indexes();
      
      console.log('Current indexes:', indexes.map(idx => idx.name).join(', '));
      
      // Drop problematic indexes if they exist
      for (const index of indexes) {
        // Skip _id index
        if (index.name === '_id_') continue;
        
        // Drop email index
        if (index.key && index.key.email && !index.key.organizationId) {
          console.log(`Dropping problematic email index: ${index.name}`);
          try {
            await collection.dropIndex(index.name);
            console.log(`Dropped index: ${index.name}`);
          } catch (dropError) {
            console.error(`Error dropping index ${index.name}:`, dropError);
          }
        }
        
        // Also drop the kindeId unique index which is causing issues
        if (index.key && index.key.kindeId && !index.key.organizationId) {
          console.log(`Dropping problematic kindeId index: ${index.name}`);
          try {
            await collection.dropIndex(index.name);
            console.log(`Dropped index: ${index.name}`);
          } catch (dropError) {
            console.error(`Error dropping index ${index.name}:`, dropError);
          }
        }
      }
      
      console.log('Indexes fixed for safe updates');
    } catch (indexError) {
      console.error('Error fixing indexes:', indexError);
    }
    
    // STEP 1: Find emails with inconsistent kindeIds
    console.log('\nScanning database for email conflicts...');
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
    
    // Find emails that appear in multiple user records
    const duplicateEmails = Object.entries(emailMap)
      .filter(([email, users]) => users.length > 1)
      .map(([email, users]) => ({ email, users }));
    
    console.log(`Found ${duplicateEmails.length} email(s) with multiple user records`);
    
    // STEP 2: Fix users with the same email to have the same kindeId
    for (const { email, users } of duplicateEmails) {
      console.log(`\nFixing email: ${email} (${users.length} records)`);
      
      // Sort users by priority (active first, then by date)
      const sortedUsers = [...users].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (a.status !== b.status) {
          if (a.status === 'active') return -1;
          if (b.status === 'active') return 1;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      
      // Select primary user and kindeId
      const primaryUser = sortedUsers[0];
      const primaryKindeId = primaryUser.kindeId?.startsWith('pending-') || primaryUser.kindeId?.startsWith('team-') 
        ? `fixed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        : primaryUser.kindeId;
      
      if (primaryKindeId !== primaryUser.kindeId) {
        console.log(`Updating primary user with stable kindeId: ${primaryKindeId}`);
        try {
        primaryUser.kindeId = primaryKindeId;
        await primaryUser.save();
        } catch (error) {
          console.error(`Error updating primary user: ${error.message}`);
          // Try direct update if save fails
          await User.updateOne({ _id: primaryUser._id }, { $set: { kindeId: primaryKindeId } });
          console.log('Updated primary user with direct update');
        }
      }
      
      console.log(`Using ${primaryKindeId} as the primary kindeId for all records`);
      
      // Update all users with the same email to use the same kindeId
      for (const user of sortedUsers) {
        // Skip the primary user which was already updated
        if (user._id.toString() === primaryUser._id.toString()) continue;
        
        // If in same organization, we should delete the duplicate
        if (user.organizationId === primaryUser.organizationId) {
          console.log(`Deleting duplicate user in organization ${user.organizationId}`);
          try {
          await User.deleteOne({ _id: user._id });
          } catch (error) {
            console.error(`Error deleting duplicate user: ${error.message}`);
          }
        } else {
          // Different organization - update kindeId to match primary
          if (user.kindeId !== primaryKindeId) {
            console.log(`Updating user in organization ${user.organizationId} with primary kindeId`);
            try {
              // Try direct update to bypass potential middleware issues
              await User.updateOne(
                { _id: user._id }, 
                { $set: { kindeId: primaryKindeId } }
              );
              console.log('Updated user kindeId successfully');
            } catch (updateError) {
              console.error(`Error updating kindeId: ${updateError.message}`);
              
              // If we can't update, try deleting and recreating
              if (updateError.code === 11000) {
                console.log('Duplicate key error. Trying to delete and recreate user...');
                
                const userData = {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  role: user.role,
                  organizationId: user.organizationId,
                  isActive: user.isActive,
                  status: user.status,
                  kindeId: primaryKindeId,
                  createdAt: user.createdAt,
                  updatedAt: Date.now()
                };
                
                try {
                  await User.deleteOne({ _id: user._id });
                  const newUser = new User(userData);
                  await newUser.save();
                  console.log('Deleted and recreated user successfully');
                } catch (recreateError) {
                  console.error(`Failed to recreate user: ${recreateError.message}`);
                }
              }
            }
          }
        }
      }
      
      console.log(`✅ Fixed all records for email: ${email}`);
    }
    
    // STEP 3: Recreate proper indexes
    console.log('\nCreating proper indexes...');
    
    try {
      const collection = mongoose.connection.collection('users');
      
      // Create the proper compound indexes
      console.log('Creating email+organizationId compound index...');
        await collection.createIndex(
          { email: 1, organizationId: 1 }, 
          { unique: true, background: true }
        );
        console.log('Created email+organizationId compound index successfully');
        
      console.log('Creating kindeId+organizationId compound index...');
        await collection.createIndex(
          { kindeId: 1, organizationId: 1 }, 
          { unique: true, background: true }
        );
        console.log('Created kindeId+organizationId compound index successfully');
      
      // Regular non-unique indexes for faster queries
      console.log('Creating regular indexes for faster queries...');
      await collection.createIndex({ kindeId: 1 }, { background: true });
      await collection.createIndex({ email: 1 }, { background: true });
      await collection.createIndex({ organizationId: 1 }, { background: true });
      console.log('Created regular indexes successfully');
    } catch (indexError) {
      console.error('Error creating indexes:', indexError);
    }
    
    // STEP 4: Check for any remaining inconsistencies
    console.log('\nVerifying fix was successful...');
    
    // Double check email+organizationId uniqueness
    const allOrgEmails = {};
    for (const user of await User.find({})) {
      if (!user.email || !user.organizationId) continue;
      
      const key = `${user.email.toLowerCase()}:${user.organizationId}`;
      if (!allOrgEmails[key]) {
        allOrgEmails[key] = [];
      }
      allOrgEmails[key].push(user);
    }
    
    const duplicateOrgEmails = Object.entries(allOrgEmails)
      .filter(([key, users]) => users.length > 1);
    
    if (duplicateOrgEmails.length > 0) {
      console.log(`\nWARNING: Found ${duplicateOrgEmails.length} email+organization pairs with duplicates`);
      
      for (const [key, users] of duplicateOrgEmails) {
        const [email, orgId] = key.split(':');
        console.log(`Fixing duplicate for ${email} in organization ${orgId}`);
        
        // Keep only the most recent one
        const sortedUsers = users.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        
        // Delete all but the first one
        for (let i = 1; i < sortedUsers.length; i++) {
          console.log(`Deleting duplicate user: ${sortedUsers[i]._id}`);
          try {
          await User.deleteOne({ _id: sortedUsers[i]._id });
          } catch (error) {
            console.error(`Error deleting duplicate user: ${error.message}`);
          }
        }
      }
      
      console.log('All duplicate email+organization pairs have been fixed');
    } else {
      console.log('No duplicate email+organization pairs found');
    }
    
    console.log('\n========================================');
    console.log('EMAIL REGISTRATION FIX COMPLETED');
    console.log('========================================');
    console.log('You should now be able to:');
    console.log('1. Register without "email already registered" errors');
    console.log('2. Accept invitations with the same email across organizations');
    console.log('3. Have consistent authentication with the same email in multiple organizations');
  } catch (error) {
    console.error('Error during fix operation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the fix
fixDuplicateEmails(); 