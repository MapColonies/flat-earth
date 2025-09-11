import { config } from '@map-colonies/eslint-config/helpers';
import jestConfig from '@map-colonies/eslint-config/jest';
import tsBaseConfig from '@map-colonies/eslint-config/ts-base';
import explicitException from 'eslint-plugin-explicit-exceptions';
import jest from 'eslint-plugin-jest';
import jestExtended from 'eslint-plugin-jest-extended';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';

export default config(
  {
    ignores: ['**/*.js', 'dist', 'coverage', 'reports', '.husky'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      'jest/no-standalone-expect': ['error', { additionalTestBlockFunctions: ['it.only', 'it.each'] }],
      'tsdoc/syntax': 'warn',
    },
    plugins: {
      jest: jest,
      'jest-extended': jestExtended,
      tsdoc: tsdoc,
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      jsdoc,
    },
    rules: {
      'jsdoc/require-throws': 'warn',
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      jsdoc,
      explicitException,
    },
    rules: {
      'jsdoc/require-throws': 'warn',
      'explicitException/no-undocumented-throws': 'warn',
      'explicitException/check-throws-tag-type': 'warn',
    },
  },
  jestConfig,
  tsBaseConfig
);
