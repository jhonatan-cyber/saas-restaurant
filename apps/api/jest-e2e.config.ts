import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^@saas/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@saas/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@saas/api/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: false,
  verbose: true,
  maxWorkers: 1, // Sequential: all tests share the same DB
  testTimeout: 30000, // E2E tests need more time for DB operations
  setupFiles: ['<rootDir>/test/e2e/load-env-test.ts'],
};

export default config;
