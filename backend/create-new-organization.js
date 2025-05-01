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

// Show help message if -h or --help is provided
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.log(`
Usage: node create-new-organization.js [organization_name] [admin_email]

Create a new organization with an owner and default team members.

Arguments:
  organization_name    Name of the new organization (default: "New B2Boost Organization")
  admin_email          Email of the organization owner (default: "admin@example.com")

Examples:
  node create-new-organization.js "Marketing Department" "marketing@example.com"
  node create-new-organization.js "Sales Team" "sales.admin@example.com"
  `);
  process.exit(0);
}

async function createNewOrganization() {
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

    // Organization details
    const orgName = process.argv[2] || 'New B2Boost Organization';
    const adminEmail = process.argv[3] || 'admin@example.com';
    
    console.log(`Creating new organization: ${orgName}`);
    console.log(`Admin email: ${adminEmail}`);
    
    // Create a unique organization ID
    const orgId = `org-${Date.now().toString(36)}`;
    
    // Create the new organization
    const newOrg = new Organization({
      kindeOrgId: orgId,
      name: orgName,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await newOrg.save();
    console.log(`Created new organization: ${newOrg.name} (${newOrg.kindeOrgId})`);
    
    // Check if the admin user already exists
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      // Create admin user
      adminUser = new User({
        kindeId: `manual-${Date.now()}`,
        email: adminEmail,
        role: 'owner',
        organizationId: orgId,
        isActive: true,
        firstName: 'Admin',
        lastName: 'User',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await adminUser.save();
      console.log(`Created new admin user: ${adminUser.email} with role: owner`);
    } else {
      // Create a copy of the user for the new organization
      const newUser = new User({
        kindeId: `manual-${Date.now()}`,
        email: adminUser.email,
        role: 'owner',
        organizationId: orgId,
        isActive: true,
        firstName: adminUser.firstName || 'Admin',
        lastName: adminUser.lastName || 'User',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await newUser.save();
      console.log(`Created copy of existing user ${adminUser.email} for new organization`);
    }
    
    // Create additional default team members
    const defaultTeamMembers = [
      {
        email: 'salesrep1@b2boost.com',
        firstName: 'Sales',
        lastName: 'Rep 1',
        role: 'customer'
      },
      {
        email: 'salesrep2@b2boost.com',
        firstName: 'Sales',
        lastName: 'Rep 2',
        role: 'customer'
      },
      {
        email: 'manager1@b2boost.com',
        firstName: 'Team',
        lastName: 'Manager 1',
        role: 'manager'
      },
      {
        email: 'support@b2boost.com',
        firstName: 'Support',
        lastName: 'Team',
        role: 'customer'
      }
    ];
    
    let createdCount = 0;
    for (const member of defaultTeamMembers) {
      try {
        // Create a new user for each default team member
        const newMember = new User({
          kindeId: `team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          organizationId: orgId,
          isActive: true,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        await newMember.save();
        console.log(`Created team member: ${newMember.email} with role: ${newMember.role}`);
        createdCount++;
      } catch (error) {
        console.error(`Error creating team member ${member.email}:`, error.message);
      }
    }
    
    console.log(`Created ${createdCount} default team members`);
    
    // Get a list of all organizations now
    const allOrgs = await Organization.find({});
    console.log(`\nAll Organizations (${allOrgs.length}):`);
    for (const org of allOrgs) {
      const usersInOrg = await User.find({ organizationId: org.kindeOrgId });
      console.log(`- ${org.name} (${org.kindeOrgId}) - ${usersInOrg.length} users`);
    }
    
    console.log('\nNew organization setup complete!');
    
  } catch (error) {
    console.error('Error creating new organization:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Check if additional arguments were provided
if (process.argv.length > 2) {
  console.log('Using provided organization name:', process.argv[2]);
}

if (process.argv.length > 3) {
  console.log('Using provided admin email:', process.argv[3]);
}

// Run the script
createNewOrganization()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 