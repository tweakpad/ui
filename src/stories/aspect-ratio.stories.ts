import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { aspectRatioExamples } from './aspect-ratio.examples.js';
import documentation from '../../docs/aspect-ratio.md?raw';
import {
  renderAspectRatioExample,
  aspectRatioDefaults,
  type AspectRatioArgs,
} from './presentation-primitives.examples.js';
const meta = {
  title: 'Components/Aspect-ratio box',
  component: 'tp-aspect-ratio',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: aspectRatioExamples,
      source: {
        code: '<tp-aspect-ratio ratio="1.7777777777777777"><div style="inline-size:100%;block-size:100%;background:var(--tp-muted)"></div></tp-aspect-ratio>',
      },
    },
  },
  args: aspectRatioDefaults,
  argTypes: {
    ratio: { control: { type: 'number', min: 0.1, step: 0.1 } },
    fit: { control: 'select', options: ['fill', 'contain', 'cover', 'none', 'scale-down'] },
  },
  render: renderAspectRatioExample,
} satisfies Meta<AspectRatioArgs>;
export default meta;
type Story = StoryObj<AspectRatioArgs>;
export const Default: Story = {};
