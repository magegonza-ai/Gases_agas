// Test setup - runs before each test file
require('dotenv').config({ path: '.env.test' });

// Mock database for tests
jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: {
    on: jest.fn(),
  },
}));

// Global test utilities
global.createMockClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

// Set test timeout
jest.setTimeout(10000);