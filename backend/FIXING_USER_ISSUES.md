# Fixing User Registration and Team Member Issues

This document provides instructions on how to fix common issues with user registration and team member invitations in the B2Boost CRM system.

## Common Issues

1. **Registration failed due to duplicate email**
   - This occurs when there are multiple user records with the same email in the same organization.
   - Typically happens during testing or when users try to register multiple times.

2. **Cannot invite team members**
   - This can be due to missing environment variables or incorrect user roles.

3. **Customer role not working properly**
   - Users with customer role may be inactive or in a pending state.

## Fix Scripts

We've created several scripts to help fix these issues:

### 1. Comprehensive Fix (Recommended)

The `fix-all.js` script performs a comprehensive check and fix of the entire system:

- Fixes duplicate email records (including specifically for gra7399@gmail.com)
- Ensures each organization has an owner
- Activates customer users
- Checks required environment variables

To run this script:

```bash
cd backend
node fix-all.js
```

### 2. Fix Specific Issues

If you prefer to tackle issues individually:

#### Fix Duplicate Emails

```bash
cd backend
node fix-email-duplicates.js
```

This script:
- Finds and fixes duplicate user records with the same email
- Specifically handles gra7399@gmail.com email
- Reports any other duplicate emails found

#### Fix Team Invite Functionality

```bash
cd backend
node fix-team-invite.js
```

This script:
- Checks if required environment variables are set
- Looks for pending invitations
- Ensures proper role distribution within organizations

## Environment Variables

For team member invitations to work, ensure these variables are set in your `.env` file:

```
EMAIL_HOST=your_smtp_host
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
FRONTEND_URL=your_frontend_url
JWT_SECRET=your_jwt_secret
```

## After Running Fixes

After running the fixes:

1. Restart your application
2. Try logging in with the affected user (e.g., gra7399@gmail.com)
3. Try inviting a new team member

If issues persist, check the console output from the fix scripts for any errors or warnings that need manual attention.

## Manual Database Fixes

If the automatic scripts don't solve your problem, you might need to manually fix your database:

1. Use MongoDB Compass or another MongoDB client to connect to your database
2. Look for duplicate entries in the "users" collection
3. Keep only one user record per unique email per organization
4. Ensure at least one user in each organization has the "owner" role

## Support

If you continue experiencing issues after running these fixes, please provide:

1. The complete output from the fix scripts
2. Your MongoDB connection string (with passwords redacted)
3. The specific error messages you're seeing 