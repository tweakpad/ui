import { definePreview } from '@storybook/web-components-vite';
import addonDocs from '@storybook/addon-docs';
import DocumentationPage from './docs-page.mdx';
import '../src/styles.css';
import './docs.css';
import './density-compact.css';
import '../src/register.js';

const preview = definePreview({
  addons: [addonDocs()],
  // Every story file gets a Docs page; opt out per file with `tags: ['!autodocs']`.
  tags: ['autodocs'],
  globalTypes: {
    density: {
      description: 'Token density preset (prototype)',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'default', title: 'Default' },
          { value: 'compact', title: 'Compact' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { density: 'default' },
  decorators: [
    (story, context) => {
      const root = document.documentElement;
      if (context.globals.density === 'compact') root.dataset.tpDensity = 'compact';
      else delete root.dataset.tpDensity;
      return story();
    },
  ],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      page: DocumentationPage,
      source: { format: false },
      // Every story on a docs page keeps the canvas toolbar (reload, zoom, open isolated). The
      // Canvas block reads this parameter as a boolean; its declared type mirrors `withSource`.
      canvas: { withToolbar: true as unknown as 'open' },
    },
    layout: 'padded',
  },
});

export default preview;
