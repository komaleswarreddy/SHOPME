const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Adjust this import based on your actual model location
// This is an example assuming you have a User model
const User = require('../../../backend/models/User');

let mongoServer;

// Setup in-memory MongoDB server
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

// Clear test data between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Model', () => {
  it('should create a new user successfully', async () => {
    const userData = {
      firstName: 'Test',
      lastName: 'User', 
      email: 'test@example.com',
      kindeId: 'kinde-123456',
      role: 'customer',
      organizationId: 'org-123456'
    };
    
    const user = new User(userData);
    const savedUser = await user.save();
    
    // Check that the saved user has an _id
    expect(savedUser._id).toBeDefined();
    expect(savedUser.firstName).toBe(userData.firstName);
    expect(savedUser.lastName).toBe(userData.lastName);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.kindeId).toBe(userData.kindeId);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.organizationId).toBe(userData.organizationId);
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('should require email field', async () => {
    const userWithoutEmail = new User({
      firstName: 'Test',
      lastName: 'User',
      kindeId: 'kinde-123456',
      role: 'customer',
      organizationId: 'org-123456'
    });
    
    let error;
    try {
      await userWithoutEmail.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.email.message).toBe('Please provide an email');
  });

  it('should require organizationId field', async () => {
    const userWithoutOrg = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      kindeId: 'kinde-123456',
      role: 'customer'
    });
    
    let error;
    try {
      await userWithoutOrg.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.organizationId).toBeDefined();
  });

  it('should require kindeId field', async () => {
    const userWithoutKindeId = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'customer',
      organizationId: 'org-123456'
    });
    
    let error;
    try {
      await userWithoutKindeId.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.kindeId).toBeDefined();
  });

  it('should validate email format', async () => {
    const userWithInvalidEmail = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'invalid-email',
      kindeId: 'kinde-123456',
      role: 'customer',
      organizationId: 'org-123456'
    });
    
    let error;
    try {
      await userWithInvalidEmail.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.email.message).toBe('Please provide a valid email');
  });

  it('should validate user role', async () => {
    const userWithInvalidRole = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      kindeId: 'kinde-123456',
      role: 'invalid-role', // Not in enum
      organizationId: 'org-123456'
    });
    
    let error;
    try {
      await userWithInvalidRole.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
    expect(error.errors.role.message).toContain('is not a valid enum value');
  });

  it('should not allow duplicate kindeId values', async () => {
    // Create first user
    await new User({
      firstName: 'User',
      lastName: 'One',
      email: 'one@example.com',
      kindeId: 'kinde-123',
      role: 'customer',
      organizationId: 'org-123456'
    }).save();
    
    // Try to create second user with same kindeId
    const user2 = new User({
      firstName: 'User',
      lastName: 'Two',
      email: 'two@example.com',
      kindeId: 'kinde-123',
      role: 'customer',
      organizationId: 'org-123456'
    });
    
    let error;
    try {
      await user2.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('should allow same kindeId in different organizations', async () => {
    // Create first user
    await new User({
      firstName: 'User',
      lastName: 'One',
      email: 'one@example.com',
      kindeId: 'kinde-123',
      role: 'customer',
      organizationId: 'org-123456'
    }).save();
    
    // Create second user with same kindeId but different organization
    const user2 = new User({
      firstName: 'User',
      lastName: 'Two',
      email: 'two@example.com',
      kindeId: 'kinde-123',
      role: 'customer',
      organizationId: 'org-789012'
    });
    
    const savedUser2 = await user2.save();
    expect(savedUser2._id).toBeDefined();
    expect(savedUser2.kindeId).toBe('kinde-123');
    expect(savedUser2.organizationId).toBe('org-789012');
  });

  it('should not allow duplicate email addresses in the same organization', async () => {
    // Create first user
    await new User({
      firstName: 'User',
      lastName: 'One',
      email: 'same@example.com',
      kindeId: 'kinde-123',
      role: 'customer',
      organizationId: 'org-123456'
    }).save();
    
    // Try to create second user with same email in same organization
    const user2 = new User({
      firstName: 'User',
      lastName: 'Two',
      email: 'same@example.com',
      kindeId: 'kinde-456',
      role: 'customer',
      organizationId: 'org-123456'
    });
    
    let error;
    try {
      await user2.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('should allow same email in different organizations', async () => {
    // Create first user
    await new User({
      firstName: 'User',
      lastName: 'One',
      email: 'same@example.com',
      kindeId: 'kinde-123',
      role: 'customer',
      organizationId: 'org-123456'
    }).save();
    
    // Create second user with same email but different organization
    const user2 = new User({
      firstName: 'User',
      lastName: 'Two',
      email: 'same@example.com',
      kindeId: 'kinde-456',
      role: 'customer',
      organizationId: 'org-789012'
    });
    
    const savedUser2 = await user2.save();
    expect(savedUser2._id).toBeDefined();
    expect(savedUser2.email).toBe('same@example.com');
    expect(savedUser2.organizationId).toBe('org-789012');
  });

  it('should update updatedAt timestamp before saving', async () => {
    // Create a user
    const user = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      kindeId: 'kinde-123456',
      role: 'customer',
      organizationId: 'org-123456'
    });
    
    // Save user and capture the initial timestamps
    const savedUser = await user.save();
    const initialUpdatedAt = savedUser.updatedAt;
    
    // Wait a brief moment to ensure timestamp will be different
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update the user
    savedUser.firstName = 'Updated';
    const updatedUser = await savedUser.save();
    
    // Check that updatedAt has changed
    expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should allow setting default role to customer', async () => {
    const userWithoutRole = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      kindeId: 'kinde-123456',
      organizationId: 'org-123456'
      // Role intentionally omitted
    });
    
    const savedUser = await userWithoutRole.save();
    
    expect(savedUser.role).toBe('customer'); // Default value
  });

  it('should allow manager role', async () => {
    const managerUser = new User({
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@example.com',
      kindeId: 'kinde-manager',
      role: 'manager',
      organizationId: 'org-123456'
    });
    
    const savedUser = await managerUser.save();
    
    expect(savedUser.role).toBe('manager');
  });

  it('should allow owner role', async () => {
    const ownerUser = new User({
      firstName: 'Owner',
      lastName: 'User',
      email: 'owner@example.com',
      kindeId: 'kinde-owner',
      role: 'owner',
      organizationId: 'org-123456'
    });
    
    const savedUser = await ownerUser.save();
    
    expect(savedUser.role).toBe('owner');
  });
}); 