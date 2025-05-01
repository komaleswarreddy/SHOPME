// Import Jest DOM extensions for additional matchers
import '@testing-library/jest-dom';

// Polyfill for TextEncoder and TextDecoder which are not available in JSDOM
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock window.matchMedia which is not implemented in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the Kinde Auth provider - using a try/catch to handle if the module doesn't exist
try {
  jest.mock('@kinde-oss/kinde-auth-react', () => ({
    useKindeAuth: jest.fn().mockReturnValue({
      login: jest.fn(),
      logout: jest.fn(),
      getToken: jest.fn().mockResolvedValue('mock-token'),
      isAuthenticated: false,
      user: null,
    }),
    KindeProvider: ({ children }) => children,
    getKindeServerContext: jest.fn(),
  }));
} catch (error) {
  console.warn('Could not mock Kinde Auth - this is OK for tests that don\'t use it');
}

// Global cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
}); 