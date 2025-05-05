/**
 * Script to check and fix user records for a specific email
 * 
 * Usage: node backend/check-user.js [email]
 * Example: node backend/check-user.js test@example.com
 * 
 * Use --fix to automatically fix inconsistent KindeIDs
 * Use --force to force update all records to use a specific KindeID
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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

async function checkAndFixUser() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const email = args[0] || 'baaab4336@gmail.com';
    const shouldFix = args.includes('--fix');
    const forceUpdate = args.includes('--force');
    
    // Get force KindeID if provided
    let forceKindeId = null;
    if (forceUpdate) {
      const forceIdIndex = args.indexOf('--force-id');
      if (forceIdIndex !== -1 && args.length > forceIdIndex + 1) {
        forceKindeId = args[forceIdIndex + 1];
        console.log(`Will force update all records to use KindeID: ${forceKindeId}`);
      } else {
        console.log('--force-id parameter missing. Will use the most recent KindeID instead.');
      }
    }
    
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Find all user records for this email
    const users = await User.find({ email });
    
    if (users.length === 0) {
      console.log(`\nNo records found for email: ${email}`);
      console.log('Checking with case-insensitive search...');
      
      // Try case-insensitive search
      const regex = new RegExp(`^${email}$`, 'i');
      const usersInsensitive = await User.find({ email: regex });
      
      if (usersInsensitive.length === 0) {
        console.log('Still no records found with case-insensitive search.');
        return;
      } else {
        console.log(`Found ${usersInsensitive.length} records with case-insensitive search!`);
        // Continue with these records
        users.push(...usersInsensitive);
      }
    }
    
    console.log(`\nFound ${users.length} records for email: ${email}`);
    
    // Get the organizations
    const organizationIds = users.map(user => user.organizationId);
    const organizations = await Organization.find({ kindeOrgId: { $in: organizationIds } });
    
    const orgMap = {};
    organizations.forEach(org => {
      orgMap[org.kindeOrgId] = org.name;
    });
    
    // Display user records
    console.log('\n=== USER RECORDS ===');
    users.forEach((user, index) => {
      console.log(`\nRecord #${index + 1}:`);
      console.log(`- Organization: ${orgMap[user.organizationId] || user.organizationId}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Status: ${user.status}`);
      console.log(`- Active: ${user.isActive}`);
      console.log(`- KindeID: ${user.kindeId}`);
      console.log(`- CreatedAt: ${user.createdAt}`);
      console.log(`- UpdatedAt: ${user.updatedAt}`);
    });
    
    // Check for different KindeIDs
    const kindeIds = [...new Set(users.map(user => user.kindeId))];
    
    console.log('\n=== KINDE ID ANALYSIS ===');
    if (kindeIds.length > 1) {
      console.log(`\nWARNING: Found ${kindeIds.length} different KindeIDs:`);
      
      // Get counts for each KindeID
      const kindeIdCounts = {};
      users.forEach(user => {
        kindeIdCounts[user.kindeId] = (kindeIdCounts[user.kindeId] || 0) + 1;
      });
      
      // Display counts and find the most used KindeID
      let mostUsedKindeId = null;
      let maxCount = 0;
      let mostRecentKindeId = null;
      let mostRecentDate = new Date(0);
      
      Object.entries(kindeIdCounts).forEach(([kindeId, count]) => {
        console.log(`- ${kindeId}: used in ${count} records`);
        
        // Find the most used KindeID
        if (count > maxCount) {
          maxCount = count;
          mostUsedKindeId = kindeId;
        }
        
        // Find the most recent KindeID based on updatedAt
        const mostRecentUserWithThisKindeId = [...users]
          .filter(user => user.kindeId === kindeId)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
        
        if (mostRecentUserWithThisKindeId && new Date(mostRecentUserWithThisKindeId.updatedAt) > mostRecentDate) {
          mostRecentDate = new Date(mostRecentUserWithThisKindeId.updatedAt);
          mostRecentKindeId = kindeId;
        }
      });
      
      console.log(`\nMost used KindeID: ${mostUsedKindeId} (${maxCount} records)`);
      console.log(`Most recent KindeID: ${mostRecentKindeId} (last updated: ${mostRecentDate.toISOString()})`);
      
      // Determine which KindeID to use for updates
      let targetKindeId = forceKindeId || mostRecentKindeId;
      console.log(`\nTarget KindeID for updates: ${targetKindeId}`);
      
      // Fix inconsistent KindeIDs if requested
      if (shouldFix || forceUpdate) {
        console.log(`\nUpdating all records to use KindeID: ${targetKindeId}`);
        
        let updateCount = 0;
        for (const user of users) {
          if (user.kindeId !== targetKindeId) {
            console.log(`Updating record for org: ${orgMap[user.organizationId] || user.organizationId}`);
            
            user.kindeId = targetKindeId;
            user.updatedAt = new Date();
            await user.save();
            updateCount++;
          }
        }
        
        console.log(`\n✅ Updated ${updateCount} records to use KindeID: ${targetKindeId}`);
      } else {
        console.log('\nRun with --fix to update all records to use the most recent KindeID');
        console.log('Run with --force --force-id <kinde_id> to force a specific KindeID');
      }
    } else if (kindeIds.length === 1) {
      console.log(`\nAll records use the same KindeID: ${kindeIds[0]}`);
      } else {
      console.log('\nNo valid KindeIDs found in the records!');
    }
    
    // Check for inactive or pending records
    const inactiveRecords = users.filter(user => !user.isActive || user.status !== 'active');
    
    console.log('\n=== ACTIVATION STATUS ===');
    if (inactiveRecords.length > 0) {
      console.log(`\nFound ${inactiveRecords.length} inactive or pending records.`);
      
      inactiveRecords.forEach((record, index) => {
        console.log(`\nInactive Record #${index + 1}:`);
        console.log(`- Organization: ${orgMap[record.organizationId] || record.organizationId}`);
        console.log(`- Status: ${record.status}`);
        console.log(`- Active: ${record.isActive}`);
      });
      
      if (shouldFix) {
        console.log('\nFixing inactive/pending records...');
        
        for (const record of inactiveRecords) {
          console.log(`Activating record for org: ${orgMap[record.organizationId] || record.organizationId}`);
        
        record.status = 'active';
        record.isActive = true;
        record.updatedAt = new Date();
        
        await record.save();
      }
      
        console.log(`\n✅ Activated ${inactiveRecords.length} records successfully!`);
    } else {
        console.log('\nRun with --fix to activate these records');
      }
    } else {
      console.log('\nAll records are active. No activation issues found.');
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`- Total records for ${email}: ${users.length}`);
    console.log(`- Unique KindeIDs: ${kindeIds.length}`);
    console.log(`- Inactive/pending records: ${inactiveRecords.length}`);
    
    // Provide JWT payload for testing
    if (kindeIds.length > 0) {
      const validKindeId = forceKindeId || (kindeIds.length > 1 ? (mostRecentKindeId || mostUsedKindeId) : kindeIds[0]);
      console.log('\n=== JWT PAYLOAD FOR TESTING ===');
      console.log(`{`);
      console.log(`  "sub": "${validKindeId}",`);
      console.log(`  "email": "${email}",`);
      console.log(`  "exp": ${Math.floor(Date.now() / 1000) + 86400}`);
      console.log(`}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
checkAndFixUser().catch(console.error); 