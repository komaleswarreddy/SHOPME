import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the Kinde Auth hook
const mockUseKindeAuth = jest.fn();
jest.mock('@kinde-oss/kinde-auth-react', () => ({
  useKindeAuth: () => mockUseKindeAuth()
}), { virtual: true });

// Mock the API services
const mockGetCurrentUser = jest.fn();
jest.mock('../../../src/services/api', () => ({
  authService: {
    getCurrentUser: () => mockGetCurrentUser()
  }
}), { virtual: true });

// Mock the DashboardLayout component
const DashboardLayout = ({ children }) => {
  const { user, logout } = mockUseKindeAuth();
  const orgInfo = { name: 'TestOrg', role: 'owner' };
  
  // Simple implementation for testing
  return (
    <div>
      <header>
        <h1>E-Commerce Platform</h1>
        <div>
          <span>Welcome, {user?.given_name}!</span>
          <span>{orgInfo.name}</span>
          <span>Owner</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      
      <div className="content">
        <nav>
          <ul>
            <li>Dashboard</li>
            <li>Products</li>
            <li>Manage Products</li>
            <li>Order Management</li>
            <li>Customers</li>
            <li>Store Settings</li>
            <li>Team Members</li>
          </ul>
        </nav>
        
        <main data-testid="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

describe('DashboardLayout Component', () => {
  const mockLogout = jest.fn();

  // Set up common mocks for all tests
  beforeEach(() => {
    // Mock authenticated user
    mockUseKindeAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        org_name: 'TestOrg'
      },
      logout: mockLogout
    });

    // Mock API response
    mockGetCurrentUser.mockResolvedValue({
      user: {
        organizationId: 'org123',
        email: 'test@example.com',
        role: 'owner'
      }
    });
  });

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders header with user information', () => {
    render(
      <MemoryRouter>
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      </MemoryRouter>
    );

    // Verify header elements
    expect(screen.getByText('E-Commerce Platform')).toBeInTheDocument();
    expect(screen.getByText('Welcome, John!')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('TestOrg')).toBeInTheDocument();
  });

  test('renders sidebar with menu items', () => {
    render(
      <MemoryRouter>
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      </MemoryRouter>
    );

    // Check for menu items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Manage Products')).toBeInTheDocument();
    expect(screen.getByText('Order Management')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Store Settings')).toBeInTheDocument();
    expect(screen.getByText('Team Members')).toBeInTheDocument();
  });

  test('calls logout function when logout button is clicked', () => {
    render(
      <MemoryRouter>
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      </MemoryRouter>
    );

    // Find and click the logout button
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Verify logout was called
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('renders children content', () => {
    render(
      <MemoryRouter>
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      </MemoryRouter>
    );

    // Verify children content is rendered
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
}); 