const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { auth } = require('../middleware/auth');

// Helper function to create default team members
async function createDefaultTeamMembers(organizationId) {
  console.log(`Starting creation of default team members for org: ${organizationId}`);
  
  // Create more meaningful default team members
  const defaultTeamMembers = [
    {
      email: 'salesrep1@b2boost.com',
      firstName: 'Default',
      lastName: 'Sales Rep 1',
      role: 'customer',
      isActive: false
    },
    {
      email: 'salesrep2@b2boost.com',
      firstName: 'Default',
      lastName: 'Sales Rep 2',
      role: 'customer',
      isActive: false
    },
    {
      email: 'manager1@b2boost.com',
      firstName: 'Default',
      lastName: 'Manager 1',
      role: 'manager', // Set as manager directly
      isActive: false
    },
    {
      email: 'manager2@b2boost.com',
      firstName: 'Default',
      lastName: 'Manager 2',
      role: 'manager', // Set as manager directly
      isActive: false
    },
    {
      email: 'support@b2boost.com',
      firstName: 'Default',
      lastName: 'Support Team',
      role: 'customer',
      isActive: false
    }
  ];

  try {
    let createdCount = 0;
    console.log(`Attempting to create ${defaultTeamMembers.length} default team members...`);
    
    // Create default team members
    for (const member of defaultTeamMembers) {
      try {
        // Check if this team member already exists in this organization
        const existingUser = await User.findOne({ 
          email: member.email,
          organizationId 
        });

        if (!existingUser) {
          const newUser = new User({
            kindeId: `default-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            organizationId,
            isActive: member.isActive // Always false for default members
          });
          
          const saved = await newUser.save();
          console.log(`✓ Created default team member: ${saved.firstName} ${saved.lastName} (${saved.email}) with role ${saved.role}`);
          createdCount++;
        } else {
          console.log(`→ Default team member already exists: ${member.email} (skipping)`);
        }
      } catch (memberError) {
        console.error(`Error creating default member ${member.email}:`, memberError);
      }
    }
    
    console.log(`Successfully created ${createdCount} default team members out of ${defaultTeamMembers.length}`);
  } catch (error) {
    console.error('Error in createDefaultTeamMembers:', error);
    // Don't throw the error - we want the registration to continue even if this fails
  }
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

    // Check if organization exists and update or create
    try {
      // First check if the organization already exists
      const existingOrg = await Organization.findOne({ kindeOrgId: organizationId });
      const isNewOrganization = !existingOrg;
      
      // Create or update the organization
      let organization = await Organization.findOneAndUpdate(
        { kindeOrgId: organizationId },
        { 
          kindeOrgId: organizationId,
          name: organizationName || 'New Organization',
          $setOnInsert: { createdAt: Date.now() },
          updatedAt: Date.now()
        },
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      // If this is a new organization, create default team members
      if (isNewOrganization) {
        console.log(`New organization created: ${organizationId}. Creating default team members...`);
        await createDefaultTeamMembers(organizationId);
      }
    } catch (orgError) {
      console.error('Error creating/updating organization:', orgError);
      return res.status(500).json({ 
        message: 'Error creating or updating organization', 
        error: orgError.message 
      });
    }

    // Check if user exists
    let user = await User.findOne({ kindeId });
    
    if (user) {
      console.log(`Existing user found with kindeId ${kindeId}:`, {
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      });
      
      // Update user's information
      user.lastLogin = Date.now();
      user.email = email; // Update email in case it changed
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.isActive = true; // Ensure real users are marked as active
      user.updatedAt = Date.now();
      
      try {
        await user.save();
        console.log(`Existing user updated: ${user.email}`);
      } catch (updateError) {
        console.error('Error updating existing user:', updateError);
        return res.status(500).json({ 
          message: 'Error updating user data', 
          error: updateError.message 
        });
      }
    } else {
      // Check for invited user
      const invitedUser = await User.findOne({ 
        email: email.toLowerCase(),
        organizationId,
        status: 'pending'
      });

      if (invitedUser) {
        // Update the invited user with Kinde info
        invitedUser.kindeId = kindeId;
        invitedUser.firstName = firstName || '';
        invitedUser.lastName = lastName || '';
        invitedUser.isActive = true;
        invitedUser.status = 'active';
        invitedUser.lastLogin = Date.now();
        invitedUser.updatedAt = Date.now();
        
        await invitedUser.save();
        user = invitedUser;
      } else {
        // Create new user with default role
        try {
          user = new User({
            kindeId,
            email: email.toLowerCase(),
            firstName: firstName || '',
            lastName: lastName || '',
            role: 'customer', // Default role for direct signups
            organizationId,
            isActive: true,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastLogin: Date.now()
          });
          
          await user.save();
          console.log(`New user created: ${user.email}`, {
            role: user.role,
            kindeId: user.kindeId,
            organizationId: user.organizationId
          });
        } catch (saveError) {
          console.error('Error saving new user:', saveError);
          
          if (saveError.code === 11000) {
            const errorDetails = saveError.keyPattern ? 
              Object.keys(saveError.keyPattern).join(', ') : 
              'unknown field';
              
            return res.status(400).json({ 
              message: `Registration failed due to duplicate ${errorDetails}`,
              error: saveError.message 
            });
          }
          
          return res.status(500).json({ 
            message: 'Error creating new user', 
            error: saveError.message 
          });
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

    res.json({
      token,
      user: {
        id: user._id,
        kindeId: user.kindeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId
      }
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
    
    // Create a temporary user record
    const newUser = new User({
      kindeId: `pending-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email: email.toLowerCase(),
      role: role, // Use the specified role
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
        message: 'Invitation sent successfully',
        user: {
          id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status
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
    const { token } = req.body;
    
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
    
    // Update the invited user with Kinde info
    invitedUser.kindeId = req.user.kindeId;
    invitedUser.firstName = req.user.firstName || '';
    invitedUser.lastName = req.user.lastName || '';
    invitedUser.isActive = true;
    invitedUser.status = 'active';
    invitedUser.lastLogin = Date.now();
    invitedUser.updatedAt = Date.now();
    
    await invitedUser.save();
    
    res.json({ 
      message: 'Invitation accepted successfully',
      user: invitedUser
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
    
    // Create new user
    const newUser = new User({
      kindeId: `team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email: email.toLowerCase(),
      role: role,
      organizationId: req.organizationId,
      isActive: true,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await newUser.save();
    
    res.status(201).json({
      message: 'Team member added successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
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

module.exports = router; 