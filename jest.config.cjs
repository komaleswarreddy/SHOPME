module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  moduleFileExtensions: ['js', 'jsx'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/test/frontend/mocks/styleMock.cjs',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/test/frontend/mocks/fileMock.cjs'
  },
  setupFilesAfterEnv: [
    '<rootDir>/test/frontend/setup.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@kinde-oss|react-icons|msw|@testing-library)/)'
  ],
  testMatch: [
    '<rootDir>/test/frontend/**/*.test.{js,jsx}'
  ]
}; 