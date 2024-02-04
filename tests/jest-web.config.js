const baseConfig = require('./jest.config');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  reporters: ['default'],
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
};