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
    'src/categories/categories.service.ts',
    'src/products/products.service.ts',
    'src/tables/tables.service.ts',
    'src/branches/branches.service.ts',
    'src/suppliers/suppliers.service.ts',
    'src/customers/customers.service.ts',
    'src/preparation-areas/preparation-areas.service.ts',
    'src/inventory/inventory.service.ts',
    'src/purchases/purchases.service.ts',
    'src/cash/cash.service.ts',
    'src/cash-movements/cash-movements.service.ts',
    'src/cash-foundation/cash-foundation.service.ts',
    'src/reports/reports.service.ts',
    'src/subscription/subscription.service.ts',
    'src/business/business.service.ts',
    'src/users/users.service.ts',
    'src/auth/auth.service.ts',
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
