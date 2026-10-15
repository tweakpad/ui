import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/visually-hidden.md?raw';
import { renderComponentExample } from './examples.js';
import { visuallyHiddenExamples } from './visually-hidden.examples.js';

const meta = {
  title: 'Components/Visually hidden',
  component: 'tp-visually-hidden',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: visuallyHiddenExamples,
      source: {
        code: `import { html, render } from 'lit';
import { mapPinIcon } from '@tweakpad/ui/icons/map';
import { sunIcon } from '@tweakpad/ui/icons/sun';
import { waypointsIcon } from '@tweakpad/ui/icons/waypoints';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

render(
  html\`<tp-toggle-group label="Trail map layers" multiple variant="outline">
    <tp-toggle value="campsites">
      <tp-icon .icon=\${mapPinIcon}></tp-icon>
      <tp-visually-hidden>Campsites</tp-visually-hidden>
    </tp-toggle>
    <tp-toggle value="routes">
      <tp-icon .icon=\${waypointsIcon}></tp-icon>
      <tp-visually-hidden>Trail routes</tp-visually-hidden>
    </tp-toggle>
    <tp-toggle value="sun">
      <tp-icon .icon=\${sunIcon}></tp-icon>
      <tp-visually-hidden>Sun exposure</tp-visually-hidden>
    </tp-toggle>
  </tp-toggle-group>\`,
  document.querySelector('#app'),
);`,
      },
    },
  },
  render: () => renderComponentExample('tp-visually-hidden'),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
