// Storybook compiles MDX documentation pages to React components.
declare module '*.mdx' {
  import type { ComponentType } from 'react';

  const Page: ComponentType;
  export default Page;
  /** Named React components a block file exports (the themed Docs container). */
  export const ThemedDocsContainer: ComponentType<{ context: unknown; children?: unknown }>;
}

// The framework's manifest reader ships without types; it is a set of preview annotations.
declare module '@storybook/web-components/entry-preview-argtypes' {
  import type { ArgTypesEnhancer, Parameters } from 'storybook/internal/types';

  export const parameters: Parameters;
  export const argTypesEnhancers: ArgTypesEnhancer[];
}
