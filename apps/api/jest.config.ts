import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
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
  collectCoverage: true,
  collectCoverageFrom: [
    'src/orders/order-state-machine.ts',
    'src/orders/orders.service.ts',
    'src/payments/payments.service.ts',
    'src/plans/plans.service.ts',
    'src/audit/audit.service.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 55,
      lines: 60,
      statements: 60,
    },
  },
  coverageReporters: ['text', 'lcov'],
  verbose: true,
};

export default config;
