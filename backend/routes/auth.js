const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { auth } = require('../middleware/auth');

// Helper function to create default team members
async function createDefaultTeamMembers(organizationId) {
  console.log(`Creation of default team members is now disabled to prevent duplicate email issues.`);
  // Disabled to prevent duplicate email issues
  return;
}

// POST /api/auth/register
// Register or login a user coming from Kinde
router.post('/register', async (req, res) => {
  try {
    const { kindeId, email, firstName, lastName, organizationId, organizationName } = req.body;

    console.log('Register request received:', { 
      kindeId, 
      email, 
      organizationId,
      organizationName 
    });

    // Validate required fields
    if (!kindeId || !email || !organizationId) {
      console.log('Registration validation failed - missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields', 
        details: {
          kindeId: kindeId ? 'valid' : 'missing',
          email: email ? 'valid' : 'missing',
          organizationId: organizationId ? 'valid' : 'missing'
        } 
      });
    }

    // Normalize email to prevent case sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // IMPORTANT - Check if we already have a user with this email in ANY organization first
    const existingUserWithSameEmail = await User.findOne({ 
      email: normalizedEmail,
      status: 'active'
    });
    
    if (existingUserWithSameEmail) {
      console.log('Found existing user with same email in a different organization');
      
      // If the kindeIds are different, update all instances to use the new kindeId
      // This ensures consistent authentication across organizations
      if (existingUserWithSameEmail.kindeId !== kindeId) {
        console.log('Updating all user records to use the same kindeId for consistent auth');
        await User.updateMany(
          { email: normalizedEmail },
          { $set: { kindeId: kindeId }}
        );
      }
    }

    // Check if organization exists and update or create
    let organization = await Organization.findOne({ kindeOrgId: organizationId });
    
    if (!organization) {
      console.log('Organization not found, creating new organization');
      
      organization = new Organization({
          kindeOrgId: organizationId,
        name: organizationName || `${firstName || lastName || 'User'}'s Organization`,
        createdAt: Date.now(),
          updatedAt: Date.now()
      });
      
      try {
      await organization.save();
        console.log('New organization created successfully');
      } catch (saveError) {
        console.error('Error creating organization:', saveError);
        return res.status(500).json({ 
          message: 'Error creating organization', 
          error: saveError.message 
        });
      }
    } else {
      console.log('Organization found:', organization.name);
    }
    
    // Check if user already exists with this kindeId (in any organization)
    let user = await User.findOne({ kindeId });
    
    if (user) {
      console.log('User found with kindeId:', user.email);
      
      // Check if user already exists in this specific organization
      const userInOrg = await User.findOne({ kindeId, organizationId });
      
      if (userInOrg) {
        console.log('User already exists in this organization, updating');
        
        // User exists in this organization, update login time and return token
        userInOrg.lastLogin = Date.now();
        userInOrg.updatedAt = Date.now();
        userInOrg.isActive = true;
        userInOrg.status = 'active';
        
        if (firstName) userInOrg.firstName = firstName;
        if (lastName) userInOrg.lastName = lastName;
        
        try {
          await userInOrg.save();
          console.log('User updated successfully');
        } catch (saveError) {
          console.error('Error updating user:', saveError);
          return res.status(500).json({ 
            message: 'Error updating user', 
            error: saveError.message 
          });
        }
        
        user = userInOrg;
      } else {
        // User exists but in different organization
        console.log('User exists in different organization, checking for invitations in this org');
        
        // Check if user was invited to this organization
        const invitation = await User.findOne({ 
          email: normalizedEmail,
          organizationId,
          status: 'pending'
        });
        
        if (invitation) {
          // User was invited, convert invitation to active user
          console.log('Found pending invitation, converting to active user');
          
          invitation.kindeId = kindeId;
          invitation.firstName = firstName || '';
          invitation.lastName = lastName || '';
          invitation.isActive = true;
          invitation.status = 'active';
          invitation.lastLogin = Date.now();
          invitation.updatedAt = Date.now();
          
          try {
            await invitation.save();
            console.log('Invitation converted to active user successfully');
            user = invitation;
          } catch (saveError) {
            console.error('Error converting invitation:', saveError);
            return res.status(500).json({ 
              message: 'Error converting invitation', 
              error: saveError.message 
            });
          }
        } else {
          // No invitation, create a new user record for this organization
          console.log('No invitation found, creating new user record for this organization');
          
          const newOrgUser = new User({
            firstName: firstName || '',
            lastName: lastName || '',
            email: normalizedEmail, // Use normalized email
            kindeId,
            role: 'customer', // Default role for additional organizations
            organizationId,
            isActive: true,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          
          try {
            await newOrgUser.save();
            console.log('New user record created for additional organization');
            user = newOrgUser;
          } catch (saveError) {
            console.error('Error creating user for additional organization:', saveError);
            
            if (saveError.code === 11000) {
              const errorDetails = saveError.keyPattern ? 
                Object.keys(saveError.keyPattern).join(', ') : 
                'unknown field';
                
              // Check if it's a race condition and get the user that was just created
              const existingUser = await User.findOne({ 
                email: normalizedEmail,
                organizationId
              });
              
              if (existingUser) {
                console.log('Found existing user in race condition, using that instead');
                user = existingUser;
              } else {
              return res.status(400).json({ 
                  message: `Registration failed due to duplicate ${errorDetails}`,
                error: saveError.message 
              });
            }
            } else {
            return res.status(500).json({ 
                message: 'Error creating user for additional organization', 
              error: saveError.message 
            });
            }
          }
        }
      }
    } else {
      console.log('No user found with this kindeId, checking for existing email');
      
      // Check if user exists with this email (in any organization)
      const existingUserWithEmail = await User.findOne({ 
        email: normalizedEmail
      });
      
      if (existingUserWithEmail) {
        console.log('Found user with same email but different kindeId');
        
        // Check if user was invited to this organization
        const invitation = await User.findOne({ 
        email: normalizedEmail,
          organizationId,
          status: 'pending'
        });
        
        if (invitation) {
          // User was invited, convert invitation to active user
          console.log('Found pending invitation, converting to active user');
          
          invitation.kindeId = kindeId;
          invitation.firstName = firstName || '';
          invitation.lastName = lastName || '';
          invitation.isActive = true;
          invitation.status = 'active';
          invitation.lastLogin = Date.now();
          invitation.updatedAt = Date.now();
          
          try {
            await invitation.save();
            console.log('Invitation converted to active user successfully');
            user = invitation;
          } catch (saveError) {
            console.error('Error converting invitation:', saveError);
            
            if (saveError.code === 11000) {
              // Check for race condition
              const existingUser = await User.findOne({ 
                email: normalizedEmail,
                organizationId
              });
              
              if (existingUser) {
                console.log('Found existing user in race condition, using that instead');
                user = existingUser;
              } else {
              return res.status(400).json({ 
                  message: `Registration failed due to duplicate email`,
                error: saveError.message 
              });
            }
            } else {
            return res.status(500).json({ 
              message: 'Error converting invitation', 
              error: saveError.message 
            });
            }
          }
        } else {
          console.log('Creating new user');
        
        // Count active users in the organization to determine if this should be the owner
        const userCount = await User.countDocuments({ 
          organizationId,
          status: 'active'
        });
        
        const shouldBeOwner = userCount === 0;
        const role = shouldBeOwner ? 'owner' : 'customer';
        
        console.log(`User will be assigned role: ${role} (first user in org: ${shouldBeOwner})`);
        
        user = new User({
          firstName: firstName || '',
          lastName: lastName || '',
            email: normalizedEmail, // Use normalized email
            kindeId,
            role,
            organizationId,
            isActive: true,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        
          try {
            await user.save();
            console.log('New user created successfully');
          } catch (saveError) {
            console.error('Error saving new user:', saveError);
            
            if (saveError.code === 11000) {
              // Check for race condition
              const existingUser = await User.findOne({ 
          email: normalizedEmail,
                organizationId
              });
              
              if (existingUser) {
                console.log('Found existing user in race condition, using that instead');
                user = existingUser;
              } else {
                const errorDetails = saveError.keyPattern ? 
                  Object.keys(saveError.keyPattern).join(', ') : 
                  'unknown field';
                
                return res.status(400).json({ 
                  message: `Registration failed due to duplicate ${errorDetails}`,
                  error: saveError.message 
                });
              }
            } else {
              return res.status(500).json({ 
                message: 'Error creating new user', 
                error: saveError.message 
              });
            }
          }
        }
      } else {
        console.log('Creating new user');
        
        // Count active users in the organization to determine if this should be the owner
        const userCount = await User.countDocuments({ 
          organizationId,
          status: 'active'
        });
        
        const shouldBeOwner = userCount === 0;
        const role = shouldBeOwner ? 'owner' : 'customer';
        
        console.log(`User will be assigned role: ${role} (first user in org: ${shouldBeOwner})`);
          
        user = new User({
          firstName: firstName || '',
          lastName: lastName || '',
          email: normalizedEmail, // Use normalized email
          kindeId,
          role,
          organizationId,
          isActive: true,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      
      try {
        await user.save();
            console.log('New user created successfully');
        } catch (saveError) {
          console.error('Error saving new user:', saveError);
          
          if (saveError.code === 11000) {
            // Check for race condition
            const existingUser = await User.findOne({ 
              email: normalizedEmail,
              organizationId
            });
            
            if (existingUser) {
              console.log('Found existing user in race condition, using that instead');
              user = existingUser;
      } else {
            const errorDetails = saveError.keyPattern ? 
              Object.keys(saveError.keyPattern).join(', ') : 
              'unknown field';
              
            return res.status(400).json({ 
                message: `Registration failed due to duplicate ${errorDetails}`,
              error: saveError.message 
            });
          }
          } else {
          return res.status(500).json({ 
            message: 'Error creating new user', 
            error: saveError.message 
          });
          }
        }
      }
    }

    // Generate JWT token
    console.log(`Generating token for user: ${user.email} with kindeId: ${user.kindeId}`);
    
    if (!user.kindeId) {
      console.error('Error: attempting to generate token for user without kindeId:', user.email);
      return res.status(500).json({ message: 'Cannot generate token: user has no kindeId' });
    }
    
    const token = jwt.sign(
      { 
        sub: user.kindeId,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Token generated successfully');

    // Return user info and token
    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kindeId: user.kindeId,
        organizationId: user.organizationId
      },
      token
    });
  } catch (error) {
    console.error('Error in /auth/register:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/auth/me
// Get current user info
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        kindeId: req.user.kindeId,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        organizationId: req.user.organizationId
      }
    });
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/auth/organizations
// Get all organizations a user belongs to
router.get('/organizations', auth, async (req, res) => {
  try {
    const { kindeId, email } = req.user;
    console.log(`Fetching organizations for user ${kindeId} (${email})`);
    
    // Find all user records with this kindeId (across all organizations)
    let userRecords = await User.find({ 
      kindeId,
      status: 'active',
      isActive: true
    });
    
    if (!userRecords || userRecords.length === 0) {
      console.log(`No organizations found with kindeId: ${kindeId}`);
      
      // Try again with normalized email as fallback
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`Trying fallback with normalized email: ${normalizedEmail}`);
        
        const emailRecords = await User.find({ 
          email: { $regex: new RegExp('^' + normalizedEmail + '$', 'i') },
          status: 'active',
          isActive: true
        });
        
        if (emailRecords && emailRecords.length > 0) {
          console.log(`Found ${emailRecords.length} organizations by email instead of kindeId`);
          
          // Update all these records to use the same kindeId for consistency
          await User.updateMany(
            { email: { $regex: new RegExp('^' + normalizedEmail + '$', 'i') } },
            { $set: { kindeId: kindeId }}
          );
          
          // Continue with these records
          userRecords = emailRecords;
        } else {
          console.log('No organizations found by email either');
          return res.json({ 
            message: 'No organizations found for this user',
            success: true, // Changed to true to prevent UI error
            organizations: [],
            debug: {
              kindeId,
              email,
              normalizedEmail,
              searchMethod: 'email-fallback'
            }
          });
        }
      } else {
        console.log('No email available for fallback search');
        return res.json({ 
          message: 'No organizations found for this user',
          success: true, // Changed to true to prevent UI error
          organizations: [],
          debug: {
            kindeId,
            email,
            searchMethod: 'kindeId-only'
          }
        });
      }
    }
    
    console.log(`Found ${userRecords.length} organization records for user ${kindeId}`);
    
    // Get all organizations the user belongs to
    const organizationIds = userRecords.map(record => record.organizationId);
    const organizations = await Organization.find({ 
      kindeOrgId: { $in: organizationIds } 
    });
    
    if (!organizations || organizations.length === 0) {
      console.log('No organizations found for the user records');
      return res.json({
        success: true,
        organizations: [],
        message: 'User records found but no matching organizations',
        debug: {
          userRecordsCount: userRecords.length,
          organizationIds
        }
      });
    }
    
    console.log(`Found ${organizations.length} organizations`);
    
    // Get current organization ID from the request
    const currentOrgId = req.organizationId;
    console.log(`Current organization ID: ${currentOrgId}`);
    
    if (!currentOrgId && organizations.length > 0) {
      console.log(`No current organization set, using first organization: ${organizations[0].kindeOrgId}`);
    }
    
    // Combine organization data with user role for each organization
    const userOrganizations = organizations.map(org => {
      const userRecord = userRecords.find(record => record.organizationId === org.kindeOrgId);
      const isCurrent = currentOrgId ? (org.kindeOrgId === currentOrgId) : false;
      
      return {
        id: org.kindeOrgId,
        name: org.name || 'Unnamed Organization',
        role: userRecord ? userRecord.role : 'customer',
        isActive: userRecord ? userRecord.isActive : true,
        isCurrent: isCurrent,
        userId: userRecord ? userRecord._id : null,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        userJoinedAt: userRecord ? userRecord.createdAt : null
      };
    });
    
    // If no current organization, mark the first one as current
    if (!currentOrgId && userOrganizations.length > 0) {
      userOrganizations[0].isCurrent = true;
    }
    
    // Sort organizations to put current organization first, then by name
    userOrganizations.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return a.name.localeCompare(b.name);
    });
    
    console.log(`Returning ${userOrganizations.length} organizations for user ${kindeId}`);
    console.log('Organizations:', userOrganizations.map(org => `${org.name} (${org.id}, isCurrent: ${org.isCurrent})`));
    
    res.json({ 
      success: true,
      organizations: userOrganizations,
      currentOrganizationId: currentOrgId || (userOrganizations.length > 0 ? userOrganizations[0].id : null)
    });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      success: false,
      organizations: []
    });
  }
});

// GET /api/auth/team
// Get all team members for the current organization
router.get('/team', auth, async (req, res) => {
  try {
    const teamMembers = await User.find({ 
      organizationId: req.organizationId 
    }).select('-password -__v');
    
    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/invite
// Invite a new team member (owners and managers only)
router.post('/invite', auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Validate role
    const validRoles = ['customer', 'manager', 'owner'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Valid roles are: customer, manager, owner',
        validRoles
      });
    }
    
    // Check if user is authorized to send invites
    const currentUser = await User.findById(req.user._id);
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
      return res.status(403).json({ message: 'Not authorized to send invitations' });
    }
    
    // Only owners can invite owners
    if (role === 'owner' && currentUser.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can invite other owners' });
    }
    
    // Check if user already exists in the organization
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      organizationId: req.organizationId,
      status: { $ne: 'pending' } // Allow re-inviting pending users
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists in this organization' });
    }
    
    // Get organization info
    const organization = await Organization.findOne({ kindeOrgId: req.organizationId });
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Delete any existing pending invitations for this email
    await User.deleteMany({ 
      email: email.toLowerCase(),
      organizationId: req.organizationId,
      status: 'pending'
    });
    
    // Check if this will be the first user in the organization
    // We count both active and pending users when determining if this is the first user
    const existingUsersInOrg = await User.countDocuments({ 
      organizationId: req.organizationId,
      status: { $ne: 'pending' } // Only count active users
    });
    const isFirstUserInOrg = existingUsersInOrg === 0;
    
    // If this is the first user in the organization, automatically make them an owner
    const finalRole = isFirstUserInOrg ? 'owner' : role;
    
    // Create a temporary user record
    const newUser = new User({
      kindeId: `pending-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email: email.toLowerCase(),
      role: finalRole, // Use the adjusted role based on first user check
      organizationId: req.organizationId,
      isActive: false,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await newUser.save();
    
    // Generate invitation token
    const inviteToken = jwt.sign(
      { 
        userId: newUser._id, 
        email: email.toLowerCase(),
        organizationId: req.organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create invite link
    const inviteLink = `${process.env.FRONTEND_URL}/join?token=${inviteToken}`;
    
    // Validate email configuration
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      await User.deleteOne({ _id: newUser._id });
      return res.status(500).json({ 
        message: 'Email configuration is incomplete. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.' 
      });
    }
    
    // Send email with nodemailer
    try {
      // Create transporter with proper error handling
      const transportConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Add additional security and timeout settings
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 15000
      };

      const transporter = nodemailer.createTransport(transportConfig);

      // Verify transporter configuration
      await transporter.verify();

      // Prepare email content
      const emailContent = {
        from: process.env.EMAIL_FROM || `"${organization.name}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Invitation to join ${organization.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">You've Been Invited!</h1>
            <p>${currentUser.firstName || 'Someone'} has invited you to join <strong>${organization.name}</strong> as a team member with the role: <strong>${role || 'customer'}</strong>.</p>
            <p>Click the button below to accept the invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">${inviteLink}</p>
            <p>This invitation will expire in 7 days.</p>
            <p style="color: #7f8c8d; font-size: 0.9rem; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 20px;">
              If you didn't expect this invitation or think it was sent by mistake, you can ignore this email.
            </p>
          </div>
        `,
        text: `
          You've Been Invited!
          
          ${currentUser.firstName || 'Someone'} has invited you to join ${organization.name} as a team member with the role: ${role || 'customer'}.
          
          Click the following link to accept the invitation:
          ${inviteLink}
          
          This invitation will expire in 7 days.
          
          If you didn't expect this invitation or think it was sent by mistake, you can ignore this email.
        `
      };

      // Send the email
      const info = await transporter.sendMail(emailContent);

      console.log('Invitation email sent successfully:', {
        messageId: info.messageId,
        recipient: email,
        organization: organization.name,
        role: role
      });

      // Return success response
      res.status(201).json({ 
        message: isFirstUserInOrg && role !== 'owner' 
          ? 'Invitation sent successfully. User was automatically assigned owner role as the first user in the organization.'
          : 'Invitation sent successfully',
        user: {
          id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          isFirstUser: isFirstUserInOrg
        }
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      
      // Delete the temporary user since email failed
      await User.deleteOne({ _id: newUser._id });
      
      // Return specific error message based on the error type
      if (emailError.code === 'EAUTH') {
        return res.status(500).json({
          message: 'Failed to authenticate with email server. Please check email credentials.',
          error: emailError.message
        });
      } else if (emailError.code === 'ESOCKET') {
        return res.status(500).json({
          message: 'Failed to connect to email server. Please check email server configuration.',
          error: emailError.message
        });
      } else {
        return res.status(500).json({
          message: 'Failed to send invitation email',
          error: emailError.message
        });
      }
    }
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ 
      message: 'Error sending invitation', 
      error: error.message 
    });
  }
});

// PATCH /api/auth/team/:id/role
// Update a team member's role (owners and managers only)
router.patch('/team/:id/role', auth, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    
    // Validate role
    const validRoles = ['customer', 'manager', 'owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Check if user is authorized
    const currentUser = await User.findById(req.user._id);
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
      return res.status(403).json({ message: 'Not authorized to update roles' });
    }
    
    // Only owners can assign owner role
    if (role === 'owner' && currentUser.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can assign owner role' });
    }
    
    // Find the user to update
    const userToUpdate = await User.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Managers can't modify owners
    if (currentUser.role === 'manager' && userToUpdate.role === 'owner') {
      return res.status(403).json({ message: 'Managers cannot modify owners' });
    }
    
    // Update the role
    userToUpdate.role = role;
    userToUpdate.updatedAt = Date.now();
    
    await userToUpdate.save();
    
    res.json(userToUpdate);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/auth/team/:id
// Remove a team member (owners and managers only)
router.delete('/team/:id', auth, async (req, res) => {
  try {
    // Check if user is authorized
    const currentUser = await User.findById(req.user._id);
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
      return res.status(403).json({ message: 'Not authorized to remove team members' });
    }
    
    // Find the user to remove
    const userToRemove = await User.findOne({ 
      _id: req.params.id,
      organizationId: req.organizationId
    });
    
    if (!userToRemove) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent removing yourself
    if (userToRemove._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }
    
    // Managers can't remove owners
    if (currentUser.role === 'manager' && userToRemove.role === 'owner') {
      return res.status(403).json({ message: 'Managers cannot remove owners' });
    }
    
    // Make sure at least one owner remains
    if (userToRemove.role === 'owner') {
      const ownerCount = await User.countDocuments({ 
        organizationId: req.organizationId,
        role: 'owner'
      });
      
      if (ownerCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot remove the last owner of the organization'
        });
      }
    }
    
    // Remove the user
    await User.deleteOne({ _id: userToRemove._id });
    
    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/auth/invite/verify
// Verify an invitation token
router.get('/invite/verify', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Extract user and organization IDs from token
    const { userId, email, organizationId } = decoded;
    
    // Find the user
    const user = await User.findOne({ _id: userId, email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the organization
    const organization = await Organization.findOne({ kindeOrgId: organizationId });
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Return invitation details
    res.json({
      email: user.email,
      role: user.role,
      organization: {
        id: organization.kindeOrgId,
        name: organization.name
      }
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/invite/accept
// Accept an invitation
router.post('/invite/accept', auth, async (req, res) => {
  try {
    const { token: inviteToken } = req.body;
    
    if (!inviteToken) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Extract user and organization IDs from token
    const { userId, email, organizationId } = decoded;
    
    // Find the temporary user
    const invitedUser = await User.findOne({ 
      _id: userId, 
      email,
      organizationId
    });
    
    if (!invitedUser) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    // Check if the authenticated user's email matches the invited email
    if (req.user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ 
        message: 'You can only accept invitations sent to your email address'
      });
    }
    
    // NEW: Check if there's already an active user with this email (in any organization)
    const activeUserWithSameEmail = await User.findOne({
      email: email.toLowerCase(),
      kindeId: req.user.kindeId,
      status: 'active',
      _id: { $ne: invitedUser._id } // Exclude the invited user
    });
    
    // If there's an active user with the same email, we need to handle the conflict
    if (activeUserWithSameEmail) {
      console.log('Found existing active user with same email during invitation acceptance:', {
        invitedUserId: invitedUser._id,
        existingUserId: activeUserWithSameEmail._id,
        email: email.toLowerCase(),
        kindeId: req.user.kindeId
      });
      
      // Important: Update the invited user to use the SAME kindeId as the existing active user
      // This ensures that the same authentication can work across organizations
      invitedUser.kindeId = activeUserWithSameEmail.kindeId || req.user.kindeId;
    } else {
      // No conflict, just update with the authenticated user's kindeId
      invitedUser.kindeId = req.user.kindeId;
    }
    
    // Get the original role before updating (for messaging purposes)
    const originalRole = invitedUser.role;
    const isOwnerRole = originalRole === 'owner';
    
    // Update the invited user with Kinde info
    invitedUser.firstName = req.user.firstName || '';
    invitedUser.lastName = req.user.lastName || '';
    invitedUser.isActive = true;
    invitedUser.status = 'active';
    invitedUser.lastLogin = Date.now();
    invitedUser.updatedAt = Date.now();
    
    await invitedUser.save();
    
    // Check if this is the first active user in the organization (excluding pending)
    const activeUsersCount = await User.countDocuments({ 
      organizationId, 
      status: 'active',
      _id: { $ne: invitedUser._id } // Exclude the current user
    });
    const isFirstActiveUser = activeUsersCount === 0;
    
    // Prepare appropriate message based on role and first user status
    let message = 'Invitation accepted successfully';
    if (isOwnerRole && isFirstActiveUser) {
      message = 'Invitation accepted successfully. You have been assigned as the owner of this organization.';
    }
    
    // Generate JWT token with the updated user info
    const authToken = jwt.sign(
      { 
        sub: invitedUser.kindeId,
        email: invitedUser.email,
        role: invitedUser.role,
        organizationId: invitedUser.organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      message: message,
      user: invitedUser,
      isFirstActiveUser: isFirstActiveUser,
      token: authToken // Return token for authentication
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/team
// Create a new team member directly (owners and managers only)
router.post('/team', auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Validate role
    const validRoles = ['customer', 'manager', 'owner'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Valid roles are: customer, manager, owner',
        validRoles
      });
    }
    
    // Check if user is authorized to add team members
    const currentUser = await User.findById(req.user._id);
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
      return res.status(403).json({ message: 'Not authorized to add team members' });
    }
    
    // Only owners can add owners
    if (role === 'owner' && currentUser.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can add other owners' });
    }
    
    // Check if user already exists in the organization
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      organizationId: req.organizationId
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists in this organization' });
    }
    
    // Check if this will be the first user in the organization
    const existingUsersInOrg = await User.countDocuments({ organizationId: req.organizationId });
    const isFirstUserInOrg = existingUsersInOrg === 0;
    
    // If this is the first user, automatically make them an owner regardless of requested role
    const finalRole = isFirstUserInOrg ? 'owner' : role;
    
    // Create new user
    const newUser = new User({
      kindeId: `team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email: email.toLowerCase(),
      role: finalRole,
      organizationId: req.organizationId,
      isActive: true,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await newUser.save();
    
    // If the role was upgraded to owner automatically, notify in the response
    const message = isFirstUserInOrg && role !== 'owner' 
      ? `Team member added successfully and automatically assigned owner role as first user in organization`
      : 'Team member added successfully';
    
    res.status(201).json({
      message: message,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        isFirstUser: isFirstUserInOrg
      }
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ 
      message: 'Error adding team member', 
      error: error.message 
    });
  }
});

// POST /api/auth/switch-organization
// Switch to a different organization for the current user
router.post('/switch-organization', auth, async (req, res) => {
  try {
    const { organizationId } = req.body;
    const { kindeId, email } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({ 
        message: 'Organization ID is required',
        success: false
      });
    }
    
    console.log(`Switching user ${kindeId} to organization ${organizationId}`);
    
    // Verify the organization exists
    const organization = await Organization.findOne({ kindeOrgId: organizationId });
    if (!organization) {
      console.log(`Organization not found: ${organizationId}`);
      return res.status(404).json({ 
        message: 'Organization not found',
        success: false
      });
    }
    
    // Find the user record for this organization
    let userRecord = await User.findOne({ 
      kindeId,
      organizationId,
      status: 'active',
      isActive: true
    });
    
    // If no record found with kindeId, try with email as fallback
    if (!userRecord && email) {
      console.log(`No record found with kindeId ${kindeId}, trying with email fallback`);
      
      const normalizedEmail = email.toLowerCase().trim();
      // Use exact match with case insensitivity instead of regex for better security
      userRecord = await User.findOne({
        email: normalizedEmail,
        organizationId,
        status: 'active',
        isActive: true
      });
      
      // If found by email, update the record to use the correct kindeId
      if (userRecord && userRecord.kindeId !== kindeId) {
        console.log(`Found record by email, updating kindeId from ${userRecord.kindeId} to ${kindeId}`);
        userRecord.kindeId = kindeId;
        try {
          await userRecord.save();
          console.log(`Successfully updated kindeId for user ${normalizedEmail}`);
        } catch (saveError) {
          console.error(`Error updating kindeId for user ${normalizedEmail}:`, saveError);
          // Continue anyway since we found the user
        }
      }
    }
    
    if (!userRecord) {
      console.log(`User ${kindeId} does not have access to organization ${organizationId}`);
      return res.status(403).json({ 
        message: 'You do not have access to this organization',
        success: false
      });
    }
    
    console.log(`User found in organization with role: ${userRecord.role}`);
    
    // Generate a new JWT token with the new organization
    const token = jwt.sign(
      { 
        sub: kindeId,
        email: email,
        role: userRecord.role,
        organizationId: organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login time
    userRecord.lastLogin = Date.now();
    await userRecord.save();
    
    // Return user info for the new organization and the new token
    res.json({
      user: {
        id: userRecord._id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        role: userRecord.role,
        kindeId: userRecord.kindeId,
        organizationId: userRecord.organizationId,
        organizationName: organization.name
      },
      organization: {
        id: organization.kindeOrgId,
        name: organization.name,
        createdAt: organization.createdAt
      },
      token,
      success: true,
      message: `Successfully switched to ${organization.name}`,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Successfully switched user ${kindeId} to organization ${organizationId}`);
  } catch (error) {
    console.error('Error switching organization:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      success: false 
    });
  }
});

module.exports = router; 