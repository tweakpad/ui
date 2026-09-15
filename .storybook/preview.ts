import type { Preview } from '@storybook/web-components-vite';
import '../src/styles.css';
import '../src/register.js';

const preview: Preview = {
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    layout: 'centered',
  },
};

export default preview;
