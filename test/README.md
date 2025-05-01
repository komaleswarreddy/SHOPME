# B2Boost CRM Test Suite

This directory contains tests for the B2Boost CRM application, including both frontend and backend tests.

## Structure

- `frontend/` - Tests for the React frontend application
  - `components/` - Tests for React components
  - `services/` - Tests for frontend services (API calls, authentication, etc.)
  - `setup.js` - Jest setup file for frontend tests

- `backend/` - Tests for the Express.js backend application
  - `models/` - Tests for MongoDB models
  - `server.test.js` - Tests for API endpoints

## Running the Tests

### Frontend Tests

To run the frontend tests:

```bash
# From the project root
npm test
```

### Backend Tests

To run the backend tests:

```bash
# From the project root
cd backend
npm test
```

## Test Technologies

This test suite uses the following technologies:

- **Jest**: Test runner and assertion library
- **React Testing Library**: For testing React components
- **MSW (Mock Service Worker)**: For mocking API requests in frontend tests
- **SuperTest**: For testing HTTP requests in backend tests
- **MongoDB Memory Server**: For testing MongoDB models without a real database

## Writing New Tests

### Frontend Component Tests

Place new component tests in the `frontend/components/` directory. Follow this structure:

```javascript
import { render, screen } from '@testing-library/react';
import YourComponent from '../../../src/components/YourComponent';

describe('YourComponent', () => {
  test('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

### Backend API Tests

Place new API tests in the `backend/` directory. Follow this structure:

```javascript
const request = require('supertest');
const app = require('../../backend/server');

describe('API Endpoint', () => {
  test('should return expected response', async () => {
    const response = await request(app).get('/api/your-endpoint');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('expectedProperty');
  });
});
```

## Mocking Dependencies

- Use Jest's mocking capabilities to mock external dependencies
- For frontend API calls, use MSW to intercept and mock HTTP requests
- For authentication, mock the Kinde auth provider

## Continuous Integration

These tests are designed to be run in a CI/CD pipeline. Make sure to add the appropriate commands to your CI configuration to run both frontend and backend tests. 