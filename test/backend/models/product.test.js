const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import the Product model
let Product;
try {
  Product = require('../../../backend/models/Product');
} catch (error) {
  console.error('Error importing Product model:', error);
  process.exit(1);
}

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

describe('Product Model', () => {
  it('should create a new product successfully', async () => {
    const productData = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 19.99,
      category: 'Electronics',
      inventory: 100,
      organizationId: mongoose.Types.ObjectId().toString()
    };
    
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    // Check that the saved product has an _id
    expect(savedProduct._id).toBeDefined();
    expect(savedProduct.name).toBe(productData.name);
    expect(savedProduct.description).toBe(productData.description);
    expect(savedProduct.price).toBe(productData.price);
    expect(savedProduct.category).toBe(productData.category);
    expect(savedProduct.inventory).toBe(productData.inventory);
    expect(savedProduct.createdAt).toBeDefined();
    expect(savedProduct.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    const productWithoutName = new Product({
      description: 'This is a test product',
      price: 19.99,
      category: 'Electronics',
      inventory: 100,
      organizationId: mongoose.Types.ObjectId().toString()
    });
    
    let error;
    try {
      await productWithoutName.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  it('should require price field', async () => {
    const productWithoutPrice = new Product({
      name: 'Test Product',
      description: 'This is a test product',
      category: 'Electronics',
      inventory: 100,
      organizationId: mongoose.Types.ObjectId().toString()
    });
    
    let error;
    try {
      await productWithoutPrice.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.price).toBeDefined();
  });

  it('should not allow negative prices', async () => {
    const productWithNegativePrice = new Product({
      name: 'Test Product',
      description: 'This is a test product',
      price: -10.99,
      category: 'Electronics',
      inventory: 100,
      organizationId: mongoose.Types.ObjectId().toString()
    });
    
    let error;
    try {
      await productWithNegativePrice.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.price).toBeDefined();
  });

  it('should set default inventory to 0 if not provided', async () => {
    const productWithoutInventory = new Product({
      name: 'Test Product',
      description: 'This is a test product',
      price: 19.99,
      category: 'Electronics',
      organizationId: mongoose.Types.ObjectId().toString()
    });
    
    const savedProduct = await productWithoutInventory.save();
    expect(savedProduct.inventory).toBe(0);
  });

  it('should not allow duplicate product names within the same organization', async () => {
    const orgId = mongoose.Types.ObjectId().toString();
    
    // Create first product
    await new Product({
      name: 'Duplicate Product',
      description: 'First product',
      price: 19.99,
      category: 'Electronics',
      inventory: 100,
      organizationId: orgId
    }).save();
    
    // Try to create second product with same name in same organization
    const duplicateProduct = new Product({
      name: 'Duplicate Product',
      description: 'Second product',
      price: 29.99,
      category: 'Electronics',
      inventory: 50,
      organizationId: orgId
    });
    
    let error;
    try {
      await duplicateProduct.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('should allow same product name in different organizations', async () => {
    // Create first product
    await new Product({
      name: 'Same Product',
      description: 'First org product',
      price: 19.99,
      category: 'Electronics',
      inventory: 100,
      organizationId: mongoose.Types.ObjectId().toString()
    }).save();
    
    // Create second product with same name but different organization
    const product2 = new Product({
      name: 'Same Product',
      description: 'Second org product',
      price: 29.99,
      category: 'Electronics',
      inventory: 50,
      organizationId: mongoose.Types.ObjectId().toString()
    });
    
    const savedProduct2 = await product2.save();
    expect(savedProduct2._id).toBeDefined();
    expect(savedProduct2.name).toBe('Same Product');
  });
}); 