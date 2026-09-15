export default {
  extends: ['stylelint-config-standard'],
  overrides: [
    {
      files: ['**/*.ts'],
      customSyntax: 'postcss-lit',
    },
  ],
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
  },
};
