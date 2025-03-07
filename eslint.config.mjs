import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      // Directories
      '.coverage_artifacts/',
      '.coverage_cache/',
      '.coverage_contracts/',
      '.husky/',
      'artifacts/',
      'build/',
      'cache/',
      'contracts/',
      'coverage/',
      'dependencies/',
      'dist/',
      'foundry-cache/',
      'foundry-out/',
      'node_modules/',
      'outputs/',

      // Files
      '*.env',
      '*.log',
      '.DS_Store',
      '.pnp.*',
      'coverage.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'repos',
      'reports',
      'scope.txt',
      'soldeer.lock',
      'yarn.lock',
    ],
  },
  eslintConfigPrettier,
];
