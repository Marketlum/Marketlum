import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testMatch: ['<rootDir>/test/**/*.steps.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'test/tsconfig.json',
      },
    ],
  },
  testEnvironment: 'node',
  testTimeout: 60000,
  forceExit: true,
};

export default config;
