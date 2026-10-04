export default {
  ignoreFiles: ['**/*.d.ts'],
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
