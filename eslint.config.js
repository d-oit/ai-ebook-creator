import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      '.next/**',
      'node_modules/**',
      'coverage/**',
      '**/*.min.js',
      '**/generated/**',
      'apps/web/public/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  
  // TypeScript files configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json']
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports'
      }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', {
        allowConstantExport: true
      }],
      
      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': ['error', {
        object: true,
        array: false
      }],
      
      // Performance and memory leak prevention
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-duplicate-imports': 'error',
      
      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error'
    }
  },
  
  // JavaScript files configuration
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  
  // Configuration files
  {
    files: [
      '*.config.{js,ts}',
      'tailwind.config.{js,ts}',
      'next.config.{js,ts}',
      'vitest.config.{js,ts}',
      'playwright.config.{js,ts}'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  },
  
  // Test files
  {
    files: [
      '**/*.test.{js,ts,tsx}',
      '**/*.spec.{js,ts,tsx}',
      '**/__tests__/**/*.{js,ts,tsx}',
      '**/e2e/**/*.{js,ts}'
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },
  
  // Prettier compatibility (must be last)
  prettier
];