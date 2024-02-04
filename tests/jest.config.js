/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  displayName: 'unit-tests',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  coverageReporters: ['text', 'html'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!*/node_modules/', '!/vendor/**'],
  coverageDirectory: '<rootDir>/coverage',
  reporters: ['default'],
  rootDir: '..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
};
