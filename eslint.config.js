// ESLint v9 flat config for TypeScript-only linting
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      'artifacts/**',
      'cache/**',
      'typechain/**',
      'ignition/deployments/**',
      'dist/**',
      'build/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  // TypeScript recommended
  ...tseslint.configs.recommended,
  // Project rules for TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { import: importPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'error',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    },
  },
  // Looser rules in tests
  {
    files: ['test/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  // Relax unused var checks in Ignition modules (deployment scripts often stage unused vars)
  {
    files: ['ignition/modules/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Allow unused in Hardhat config
  {
    files: ['hardhat.config.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
