const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../backend/server');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/.env' });

let mongoServer;

// Setup in-memory MongoDB server
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);

  // Add any test data or setup needed
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();

  // If your app has a server that needs to be closed
  if (app.server && app.server.close) {
    await new Promise(resolve => app.server.close(resolve));
  }
});

describe('API Server', () => {
  // Example test for a GET endpoint - adjust according to your actual API
  test('GET /api/status returns 200 OK', async () => {
    const response = await request(app).get('/api/status');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  
  // Example test for a protected route
  test('Protected routes require authentication', async () => {
    const response = await request(app).get('/api/users');
    // Assuming your API returns 401 for unauthorized requests
    expect(response.statusCode).toBe(401);
  });
  
  // Example test with authenticated request - adjust the auth header based on your implementation
  test('Authenticated requests can access protected routes', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer test-token');
      
    // Assuming your auth middleware is mocked in a test environment
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });
  
  // Example test for a POST request
  test('POST /api/users creates a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    };
    
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer test-token')
      .send(userData);
      
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(userData.name);
    expect(response.body.email).toBe(userData.email);
  });
  
  // Example test for error handling
  test('Invalid requests return appropriate error responses', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer test-token')
      .send({ /* Missing required fields */ });
      
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
}); 