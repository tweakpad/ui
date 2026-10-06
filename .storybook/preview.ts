import { definePreview } from '@storybook/web-components-vite';
import addonDocs from '@storybook/addon-docs';
import DocumentationPage from './docs-page.mdx';
import '../src/styles.css';
import './docs.css';
import '../src/register.js';

const preview = definePreview({
  addons: [addonDocs()],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: {
      page: DocumentationPage,
      source: { format: false },
      // Every story on a docs page keeps the canvas toolbar (reload, zoom, open isolated).
      canvas: { withToolbar: true },
    },
    layout: 'centered',
  },
});

export default preview;
