import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/playwright-report', '**/test-results', '**/results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/expect-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
    },
  },
);
