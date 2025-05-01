const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import your models
const User = require('../../backend/models/User');
const Product = require('../../backend/models/Product');

// Import Express app (assuming server.js exports the app)
let app;
try {
  app = require('../../backend/server');
} catch (error) {
  console.error('Could not import server app. Make sure it\'s properly exported.');
  console.error(error);
  // Use a mock Express app as fallback
  const express = require('express');
  app = express();
  app.get('/api/status', (req, res) => res.json({ status: 'ok' }));
}

let mongoServer;
let testUser;
let authToken;

// Helper to create a valid JWT token
const generateValidToken = (user) => {
  return jwt.sign(
    { 
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organization ? user.organization.toString() : null
    },
    process.env.JWT_SECRET || 'b2boost-crm-secret-key',
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
  
  // Create a test user
  testUser = await User.create({
    name: 'Integration Test User',
    email: 'integration@example.com',
    kindeId: 'kinde-integration-test',
    role: 'admin'
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
      organization: testUser.organization
    },
    {
      name: 'Test Product 2',
      description: 'Second test product',
      price: 20.50,
      category: 'Clothing',
      inventory: 50,
      organization: testUser.organization
    }
  ]);
});

// Clear test data between tests
afterEach(async () => {
  // Clear all collections except users and products which we use across tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    if (!['users', 'products'].includes(collection.collectionName)) {
      await collection.deleteMany({});
    }
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  
  // Close the server if it's running
  if (app.server && typeof app.server.close === 'function') {
    await new Promise(resolve => app.server.close(resolve));
  }
});

describe('API Integration Tests', () => {
  // Test auth endpoints
  describe('Auth API', () => {
    it('GET /api/auth/me should return current user details', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe(testUser.role);
    });
    
    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
        
      expect(response.statusCode).toBe(401);
    });
  });
  
  // Test products endpoints
  describe('Products API', () => {
    it('GET /api/products should return all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBe('Test Product 1');
      expect(response.body[1].name).toBe('Test Product 2');
    });
    
    it('GET /api/products/:id should return a specific product', async () => {
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
    
    it('POST /api/products should create a new product', async () => {
      const newProduct = {
        name: 'New Test Product',
        description: 'Created during integration test',
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
      
      // Verify the product was actually created in the database
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(productsResponse.body.length).toBe(3); // Now 3 products
    });
    
    it('PUT /api/products/:id should update a product', async () => {
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
    
    it('DELETE /api/products/:id should delete a product', async () => {
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
  });
  
  // Test cart and orders (full workflow)
  describe('Cart and Order Workflow', () => {
    it('should support full cart and order creation flow', async () => {
      // Step 1: Get products to add to cart
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      const productId = productsResponse.body[0]._id;
      
      // Step 2: Add item to cart
      const addToCartResponse = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId, quantity: 2 });
        
      expect(addToCartResponse.statusCode).toBe(200);
      expect(addToCartResponse.body.items).toBeDefined();
      expect(addToCartResponse.body.items.length).toBe(1);
      expect(addToCartResponse.body.items[0].productId).toBe(productId);
      expect(addToCartResponse.body.items[0].quantity).toBe(2);
      
      // Step 3: Get cart
      const getCartResponse = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(getCartResponse.statusCode).toBe(200);
      expect(getCartResponse.body.items.length).toBe(1);
      
      // Step 4: Create order from cart
      const orderData = {
        shippingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        },
        paymentMethod: 'credit_card'
      };
      
      const createOrderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);
        
      expect(createOrderResponse.statusCode).toBe(201);
      expect(createOrderResponse.body._id).toBeDefined();
      expect(createOrderResponse.body.items.length).toBe(1);
      expect(createOrderResponse.body.status).toBe('pending');
      
      const orderId = createOrderResponse.body._id;
      
      // Step 5: Verify cart is now empty (after order creation)
      const emptyCartResponse = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(emptyCartResponse.statusCode).toBe(200);
      expect(emptyCartResponse.body.items.length).toBe(0);
      
      // Step 6: Get order details
      const getOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(getOrderResponse.statusCode).toBe(200);
      expect(getOrderResponse.body._id).toBe(orderId);
      expect(getOrderResponse.body.items.length).toBe(1);
      
      // Step 7: Update order status (admin only)
      const updateStatusResponse = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' });
        
      expect(updateStatusResponse.statusCode).toBe(200);
      expect(updateStatusResponse.body.status).toBe('shipped');
    });
  });
}); 