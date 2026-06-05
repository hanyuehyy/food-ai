module.exports = {
  testMatch: ['**/cloudfunctions/**/*.test.js'],
  testEnvironment: 'node',
  verbose: true,
  moduleNameMapper: {
    '^wx-server-sdk$': '<rootDir>/cloudfunctions/__mocks__/wx-server-sdk.js'
  }
}
