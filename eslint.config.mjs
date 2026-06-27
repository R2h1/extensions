// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignore — never lint generated/third-party code
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },

  // 1) Base: recommended JS rules
  eslint.configs.recommended,

  // 2) TypeScript: recommended type-checked rules
  ...tseslint.configs.recommended,

  // 3) Custom rules
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
      },
    },
    rules: {
      // Enforce explicit return types on public API surfaces
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Allow `any` with caution — prefer `unknown` but not enforced
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow require() in CJS scripts
      '@typescript-eslint/no-require-imports': 'off',

      // Unused vars: error except underscore-prefixed
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Empty function body allowed for no-ops
      '@typescript-eslint/no-empty-function': 'warn',
    },
  },

  // 4) Prettier integration (must come last to act as override)
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'error',
    },
  },
);