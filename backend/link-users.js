/**
 * Script to create additional user records to link a KindeID to another user's organizations
 * 
 * Usage: node backend/link-users.js [sourceEmail] [targetKindeId] [targetEmail]
 * Example: node backend/link-users.js baaab4336@gmail.com kp_c8b378838b774bec8649073c820d77d0 komaleswarreddy@gmail.com
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

async function linkUsers() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.log('Usage: node backend/link-users.js [sourceEmail] [targetKindeId] [targetEmail]');
      console.log('Example: node backend/link-users.js baaab4336@gmail.com kp_c8b378838b774bec8649073c820d77d0 komaleswarreddy@gmail.com');
      return;
    }
    
    const sourceEmail = args[0]; // Email with organizations to link to
    const targetKindeId = args[1]; // KindeID to link to those organizations
    const targetEmail = args[2]; // New email to use with the target KindeID
    
    console.log(`Linking organizations from ${sourceEmail} to KindeID ${targetKindeId} with email ${targetEmail}`);
    
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Find all user records for the source email
    const sourceUsers = await User.find({ 
      email: { $regex: new RegExp('^' + sourceEmail + '$', 'i') },
      status: 'active',
      isActive: true
    });
    
    if (sourceUsers.length === 0) {
      console.log(`\nNo active records found for email: ${sourceEmail}`);
      return;
    }
    
    console.log(`\nFound ${sourceUsers.length} records for email: ${sourceEmail}`);
    
    // Get the organizations for these users
    const organizationIds = sourceUsers.map(user => user.organizationId);
    const organizations = await Organization.find({ kindeOrgId: { $in: organizationIds } });
    
    const orgMap = {};
    organizations.forEach(org => {
      orgMap[org.kindeOrgId] = org.name;
    });
    
    // Check if target user already has records for any of these organizations
    const existingRecords = await User.find({
      kindeId: targetKindeId,
      organizationId: { $in: organizationIds }
    });
    
    const existingOrgIds = existingRecords.map(r => r.organizationId);
    console.log(`Target user already has ${existingRecords.length} organization records`);
    
    // Create new user records for each organization
    const newRecords = [];
    const now = new Date();
    
    for (const sourceUser of sourceUsers) {
      // Skip if target user already has a record for this organization
      if (existingOrgIds.includes(sourceUser.organizationId)) {
        console.log(`Skipping existing organization: ${orgMap[sourceUser.organizationId] || sourceUser.organizationId}`);
        continue;
      }
      
      console.log(`Creating link for organization: ${orgMap[sourceUser.organizationId] || sourceUser.organizationId}`);
      
      const newRecord = new User({
        kindeId: targetKindeId,
        email: targetEmail.toLowerCase().trim(),
        role: sourceUser.role,
        organizationId: sourceUser.organizationId,
        isActive: true,
        status: 'active',
        firstName: sourceUser.firstName || '',
        lastName: sourceUser.lastName || '',
        createdAt: now,
        updatedAt: now
      });
      
      try {
        await newRecord.save();
        newRecords.push(newRecord);
        console.log(`✅ Successfully created record for organization: ${orgMap[sourceUser.organizationId] || sourceUser.organizationId}`);
      } catch (error) {
        console.error(`Error creating record for organization: ${sourceUser.organizationId}`, error);
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Source email: ${sourceEmail}`);
    console.log(`Target KindeID: ${targetKindeId}`);
    console.log(`Target email: ${targetEmail}`);
    console.log(`Source organizations: ${sourceUsers.length}`);
    console.log(`Created new records: ${newRecords.length}`);
    console.log(`Skipped existing records: ${existingOrgIds.length}`);
    console.log(`Total organization access: ${newRecords.length + existingOrgIds.length}`);
    
    if (newRecords.length > 0) {
      console.log(`\n✅ Successfully linked ${newRecords.length} organizations to KindeID ${targetKindeId}`);
      console.log(`\nYou can now refresh the page to see the organization switcher`);
    } else {
      console.log(`\nNo new organizations were linked (all were already linked or errors occurred)`);
    }
    
  } catch (error) {
    console.error('Error linking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
linkUsers().catch(console.error); 