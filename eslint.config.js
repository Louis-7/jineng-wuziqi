// ESLint flat config
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.vite/**',
      'coverage/**',
      '.husky/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  // Apply TypeScript rules only to TS/TSX files
  ...tseslint.configs.strictTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.{ts,tsx}'],
  })),
  prettier,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Non-typed TS lint for config files
  {
    files: ['*.config.ts'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },
];
