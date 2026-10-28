import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { OverflowCollapseFrom } from '../index.js';

interface Args {
  limit: number | undefined;
  maxRows: number | undefined;
  collapseFrom: OverflowCollapseFrom;
  items: number;
  width: number;
}

const labels = [
  'Stoneware',
  'Matte glaze',
  'Hand-thrown',
  'Food-safe',
  'Speckled',
  'Oven-safe',
  'Small batch',
  'Reduction fired',
  'Celadon',
  'Wheel-trimmed',
  'Signed',
  'Gift boxed',
];

const meta = {
  title: 'Components/Overflow list',
  component: 'tp-overflow-list',
  parameters: { docs: libraryDocs('components/overflow-list') },
  args: {
    limit: 3,
    maxRows: undefined,
    collapseFrom: 'end',
    items: 5,
    width: 480,
  },
  argTypes: {
    limit: {
      control: { type: 'number', min: 0 },
      table: { type: { summary: 'number' } },
    },
    maxRows: {
      name: 'max-rows',
      control: { type: 'number', min: 1 },
      table: { type: { summary: 'number' } },
    },
    collapseFrom: {
      name: 'collapse-from',
      control: 'inline-radio',
      options: ['end', 'start'],
      table: { defaultValue: { summary: 'end' } },
    },
    items: {
      description: 'Fixture: number of items.',
      control: { type: 'range', min: 0, max: labels.length },
    },
    width: {
      description: 'Fixture: inline size of the container, in pixels.',
      control: { type: 'range', min: 40, max: 720 },
    },
  },
  render: ({ limit, maxRows, collapseFrom, items, width }) =>
    html`<div style="inline-size:${width}px">
      <tp-overflow-list
        .limit=${limit ?? null}
        .maxRows=${maxRows ?? null}
        .collapseFrom=${collapseFrom}
      >
        ${labels
          .slice(0, items)
          .map((label) => html`<tp-badge variant="outline">${label}</tp-badge>`)}
      </tp-overflow-list>
    </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
