module.exports = {
  testMatch: ['**/tests/e2e/**/*.test.js'],
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 60000,
  maxWorkers: 1,
  testSequencer: '<rootDir>/tests/e2e/sequencer.js',
  globalSetup: '<rootDir>/tests/e2e/globalSetup.js',
  globalTeardown: '<rootDir>/tests/e2e/globalTeardown.js'
}
