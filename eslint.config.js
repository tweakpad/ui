import js from '@eslint/js';
import lit from 'eslint-plugin-lit';
import litA11y from 'eslint-plugin-lit-a11y';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'storybook-static/**', 'node_modules/**', 'tmp/**', 'external/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/stories/navigation-panel-example.js', 'src/stories/drag-drop-list-example.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Browser verification fixtures run as page modules; they follow the src typing policy.
    files: ['tests/fixtures/**/*.{js,ts}'],
    languageOptions: { globals: globals.browser },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['src/**/*.ts', '.storybook/**/*.ts', '*.config.ts'],
    plugins: { lit, ...litA11y.configs.recommended.plugins },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...lit.configs.recommended.rules,
      ...litA11y.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
