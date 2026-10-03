/**
 * NestJS 12 se publica solo como ESM, por lo que Jest corre en modo ESM
 * (ver script "test": node --experimental-vm-modules ...).
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json', useESM: true, diagnostics: false }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@nestjs/config$': '<rootDir>/test/stubs/nestjs-config.stub.ts',
    '^@nestjs/swagger$': '<rootDir>/test/stubs/nestjs-swagger.stub.ts',
    '^firebase-admin/(app|auth)$': '<rootDir>/test/stubs/firebase-admin.stub.ts',
  },
};
