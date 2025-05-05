const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: './backend/.env.test' });

// Import your models
let User, Product;
try {
  User = require('../../../backend/models/User');
  Product = require('../../../backend/models/Product');
} catch (error) {
  console.error('Error importing models:', error);
  process.exit(1);
}

// Import Express app
let app;
try {
  app = require('../../../backend/server');
} catch (error) {
  console.error('Could not import server app:', error);
  process.exit(1);
}

let mongoServer;
let testUser;
let authToken;
let testOrgId;

// Helper to create a valid JWT token
const generateValidToken = (user) => {
  return jwt.sign(
    { 
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
};

// Setup in-memory MongoDB server and seed test data
beforeAll(async () => {
  // Start MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri);
  
  // Create a test organization ID
  testOrgId = mongoose.Types.ObjectId().toString();
  
  // Create a test user
  testUser = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'test-products@example.com',
    kindeId: 'kinde-products-test',
    role: 'owner', // Setting role as owner to test owner-level access
    organizationId: testOrgId
  });
  
  // Generate auth token for the test user
  authToken = generateValidToken(testUser);
  
  // Seed some test products
  await Product.create([
    {
      name: 'Test Product 1',
      description: 'First test product',
      price: 10.99,
      category: 'Electronics',
      inventory: 100,
      organizationId: testOrgId
    },
    {
      name: 'Test Product 2',
      description: 'Second test product',
      price: 20.50,
      category: 'Clothing',
      inventory: 50,
      organizationId: testOrgId
    }
  ]);
});

// Clear test data between tests
afterEach(async () => {
  // Reset mocks if you're using any
  jest.clearAllMocks();
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Products API Routes', () => {
  describe('GET /api/products', () => {
    it('should return all products for the organization', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBe('Test Product 1');
      expect(response.body[1].name).toBe('Test Product 2');
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/products');
        
      expect(response.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/products/:id', () => {
    it('should return a specific product by ID', async () => {
      // First get all products to get an ID
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      const productId = productsResponse.body[0]._id;
      
      // Then get a specific product
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(productId);
      expect(response.body.name).toBe('Test Product 1');
    });
    
    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/api/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(404);
    });
  });
  
  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        name: 'New Test Product',
        description: 'Created during route test',
        price: 15.75,
        category: 'Testing',
        inventory: 25
      };
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProduct);
        
      expect(response.statusCode).toBe(201);
      expect(response.body._id).toBeDefined();
      expect(response.body.name).toBe(newProduct.name);
      expect(response.body.price).toBe(newProduct.price);
      expect(response.body.organizationId).toBe(testOrgId);
      
      // Verify the product was actually created
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(productsResponse.body.length).toBe(3); // Now 3 products
    });
    
    it('should return 400 for invalid product data', async () => {
      // Missing required fields
      const invalidProduct = {
        description: 'Invalid product without name or price'
      };
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProduct);
        
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('PUT /api/products/:id', () => {
    it('should update an existing product', async () => {
      // First get all products to get an ID
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      const productId = productsResponse.body[0]._id;
      const updateData = {
        name: 'Updated Product Name',
        price: 12.99
      };
      
      // Update the product
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
        
      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(productId);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.price).toBe(updateData.price);
      expect(response.body.description).toBe('First test product'); // unchanged
    });
    
    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = mongoose.Types.ObjectId().toString();
      const updateData = { name: 'Updated Name' };
      
      const response = await request(app)
        .put(`/api/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
        
      expect(response.statusCode).toBe(404);
    });
  });
  
  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      // First get all products to get an ID
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      const productId = productsResponse.body[0]._id;
      
      // Delete the product
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBeTruthy();
      
      // Verify the product was deleted
      const verifyResponse = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(verifyResponse.statusCode).toBe(404);
    });
    
    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .delete(`/api/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(404);
    });
  });
}); 