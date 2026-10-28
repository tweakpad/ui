export default {
  // Golden files hold the generator's exact text, not authored CSS.
  ignoreFiles: ['**/*.d.ts', 'src/presentation/recipes/__goldens__/**'],
  extends: ['stylelint-config-standard'],
  overrides: [
    {
      files: ['**/*.ts'],
      customSyntax: 'postcss-lit',
      rules: {
        // postcss-lit represents interpolated CSSResults with uppercase sentinels.
        'value-keyword-case': ['lower', { ignoreKeywords: [/^POSTCSS_LIT_\d+$/] }],
      },
    },
  ],
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
  },
};
