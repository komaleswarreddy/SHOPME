/**
 * Script to create a test user with multiple organizations for testing the organization switcher
 * 
 * Usage: node backend/create-test-multi-org-user.js [email]
 * Example: node backend/create-test-multi-org-user.js test@example.com
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

// Define Product model
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  imageUrl: String,
  category: String,
  organizationId: String,
  inStock: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const Product = mongoose.model('Product', productSchema);

// Define Customer model
const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  company: String,
  organizationId: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
});

const Customer = mongoose.model('Customer', customerSchema);

// Define Order model
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  customerEmail: String,
  customerName: String,
  items: Array,
  total: Number,
  status: String,
  organizationId: String,
  createdAt: Date,
  updatedAt: Date
});

const Order = mongoose.model('Order', orderSchema);

// Helper function to create random products for an organization
async function createProductsForOrg(orgId, count) {
  const products = [];
  const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Software', 'Services'];
  
  for (let i = 0; i < count; i++) {
    const price = Math.floor(Math.random() * 10000) / 100;
    const product = new Product({
      name: `Product ${i+1} - Org ${orgId.slice(-5)}`,
      description: `This is a test product for organization ${orgId}`,
      price: price,
      imageUrl: `https://picsum.photos/id/${i+1}/300/200`,
      category: categories[Math.floor(Math.random() * categories.length)],
      organizationId: orgId,
      inStock: Math.random() > 0.2, // 80% chance of being in stock
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000)),
      updatedAt: Date.now()
    });
    
    await product.save();
    products.push(product);
  }
  
  return products;
}

// Helper function to create random customers for an organization
async function createCustomersForOrg(orgId, count) {
  const customers = [];
  const companies = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Corp', 'Stark Industries'];
  
  for (let i = 0; i < count; i++) {
    const customer = new Customer({
      name: `Customer ${i+1} - Org ${orgId.slice(-5)}`,
      email: `customer${i+1}_${orgId.slice(-5)}@example.com`,
      phone: `+1-555-${Math.floor(1000 + Math.random() * 9000)}`,
      company: companies[Math.floor(Math.random() * companies.length)],
      organizationId: orgId,
      notes: `Test customer for organization ${orgId}`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000)),
      updatedAt: Date.now()
    });
    
    await customer.save();
    customers.push(customer);
  }
  
  return customers;
}

// Helper function to create random orders for an organization
async function createOrdersForOrg(orgId, products, customers, count) {
  const orders = [];
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  for (let i = 0; i < count; i++) {
    // Select a random customer
    const customer = customers[Math.floor(Math.random() * customers.length)];
    
    // Create 1-5 random items for the order
    const itemCount = Math.floor(1 + Math.random() * 5);
    const items = [];
    let total = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(1 + Math.random() * 5);
      const itemTotal = product.price * quantity;
      
      items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        total: itemTotal
      });
      
      total += itemTotal;
    }
    
    const order = new Order({
      orderNumber: `ORD-${orgId.slice(-5)}-${i+1}`,
      customerEmail: customer.email,
      customerName: customer.name,
      items: items,
      total: total,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      organizationId: orgId,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000)),
      updatedAt: Date.now()
    });
    
    await order.save();
    orders.push(order);
  }
  
  return orders;
}

async function createTestMultiOrgUser() {
  try {
    // Check if email was provided
    const email = process.argv[2];
    if (!email) {
      console.error('Please provide an email address');
      console.log('Usage: node backend/create-test-multi-org-user.js [email]');
      console.log('Example: node backend/create-test-multi-org-user.js test@example.com');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Create a fake kindeId that will be common across all organizations
    const kindeId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create 3 test organizations
    const org1 = new Organization({
      kindeOrgId: `test-org-1-${Date.now()}`,
      name: 'Test Marketing Department',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    const org2 = new Organization({
      kindeOrgId: `test-org-2-${Date.now()}`,
      name: 'Test Sales Organization',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    const org3 = new Organization({
      kindeOrgId: `test-org-3-${Date.now()}`,
      name: 'Test Development Team',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await org1.save();
    await org2.save();
    await org3.save();
    
    console.log('\nCreated test organizations:');
    console.log(`1. ${org1.name} (${org1.kindeOrgId})`);
    console.log(`2. ${org2.name} (${org2.kindeOrgId})`);
    console.log(`3. ${org3.name} (${org3.kindeOrgId})`);
    
    // Create the test user with different roles in each organization
    const user1 = new User({
      kindeId,
      email,
      role: 'owner',
      organizationId: org1.kindeOrgId,
      isActive: true,
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    const user2 = new User({
      kindeId,
      email,
      role: 'manager',
      organizationId: org2.kindeOrgId,
      isActive: true,
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    const user3 = new User({
      kindeId,
      email,
      role: 'customer',
      organizationId: org3.kindeOrgId,
      isActive: true,
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await user1.save();
    await user2.save();
    await user3.save();
    
    console.log('\nCreated test user accounts:');
    console.log(`Email: ${email}`);
    console.log(`Kinde ID: ${kindeId}`);
    console.log('\nUser roles in organizations:');
    console.log(`- ${org1.name}: owner`);
    console.log(`- ${org2.name}: manager`);
    console.log(`- ${org3.name}: customer`);
    
    // Create test data (products, customers, orders) for each organization
    console.log('\nCreating test data for each organization...');
    
    // Organization 1 (Marketing) - More customers, fewer products
    console.log(`\nCreating test data for ${org1.name}...`);
    const products1 = await createProductsForOrg(org1.kindeOrgId, 5);
    const customers1 = await createCustomersForOrg(org1.kindeOrgId, 20);
    const orders1 = await createOrdersForOrg(org1.kindeOrgId, products1, customers1, 15);
    console.log(`Created ${products1.length} products, ${customers1.length} customers, and ${orders1.length} orders`);
    
    // Organization 2 (Sales) - More products, balanced
    console.log(`\nCreating test data for ${org2.name}...`);
    const products2 = await createProductsForOrg(org2.kindeOrgId, 30);
    const customers2 = await createCustomersForOrg(org2.kindeOrgId, 10);
    const orders2 = await createOrdersForOrg(org2.kindeOrgId, products2, customers2, 25);
    console.log(`Created ${products2.length} products, ${customers2.length} customers, and ${orders2.length} orders`);
    
    // Organization 3 (Development) - Few customers, more orders per customer
    console.log(`\nCreating test data for ${org3.name}...`);
    const products3 = await createProductsForOrg(org3.kindeOrgId, 10);
    const customers3 = await createCustomersForOrg(org3.kindeOrgId, 5);
    const orders3 = await createOrdersForOrg(org3.kindeOrgId, products3, customers3, 40);
    console.log(`Created ${products3.length} products, ${customers3.length} customers, and ${orders3.length} orders`);
    
    // Summary
    console.log('\nTest data creation complete!');
    console.log('\nEach organization has different test data:');
    console.log(`- ${org1.name}: ${products1.length} products, ${customers1.length} customers, ${orders1.length} orders`);
    console.log(`- ${org2.name}: ${products2.length} products, ${customers2.length} customers, ${orders2.length} orders`);
    console.log(`- ${org3.name}: ${products3.length} products, ${customers3.length} customers, ${orders3.length} orders`);
    
    console.log('\nYou can now log in with this user and test the organization switcher.');
    console.log('Note: You need to set the kindeId in your authentication provider to match the generated ID above.');
    
  } catch (error) {
    console.error('Error creating test multi-org user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createTestMultiOrgUser()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 