// Storybook compiles MDX documentation pages to React components.
declare module '*.mdx' {
  import type { ComponentType } from 'react';

  const Page: ComponentType;
  export default Page;
}
