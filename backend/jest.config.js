module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/backend/**/*.test.js',
    '**/backend/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov'],
  // Set a timeout for tests that use MongoMemoryServer
  testTimeout: 30000
}; 