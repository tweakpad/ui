import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import documentation from '../../docs/description-list.md?raw';
import { descriptionListExamples } from './description-list.examples.js';

interface Args {
  limit: number | null;
  orientation: 'vertical' | 'horizontal';
  layout: 'inline' | 'stacked';
  align: 'start' | 'center';
  open: boolean;
  hiddenUntilFound: boolean;
  disabled: boolean;
  showMore: string;
  showLess: string;
}

const meta = {
  title: 'Components/Description list',
  component: 'tp-description-list',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: descriptionListExamples,
      source: {
        code: `<tp-description-list limit="3">
  <tp-description-list-item label="Plot">B-14, east terrace</tp-description-list-item>
  <tp-description-list-item label="Gardener">Mara Lindqvist</tp-description-list-item>
  <tp-description-list-item label="Status"><tp-badge variant="success">Active</tp-badge></tp-description-list-item>
  <tp-description-list-item label="Size">3 × 4 m</tp-description-list-item>
  <tp-description-list-item label="Water access">Shared tap, row C</tp-description-list-item>
</tp-description-list>`,
      },
    },
  },
  args: {
    limit: 3,
    orientation: 'vertical',
    layout: 'inline',
    align: 'start',
    open: false,
    hiddenUntilFound: false,
    disabled: false,
    showMore: 'Show more',
    showLess: 'Show less',
  },
  argTypes: {
    limit: {
      control: { type: 'number', min: 0 },
      table: { type: { summary: 'number | null' }, defaultValue: { summary: 'null' } },
    },
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
      table: { defaultValue: { summary: 'vertical' } },
    },
    layout: {
      control: 'inline-radio',
      options: ['inline', 'stacked'],
      table: { defaultValue: { summary: 'inline' } },
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'center'],
      table: { defaultValue: { summary: 'start' } },
    },
    open: { table: { defaultValue: { summary: 'false' } } },
    hiddenUntilFound: { table: { defaultValue: { summary: 'false' } } },
    disabled: { table: { defaultValue: { summary: 'false' } } },
    showMore: { control: 'text', description: '`messages.showMore`: button text while closed.' },
    showLess: { control: 'text', description: '`messages.showLess`: button text while open.' },
  },
  render: ({
    limit,
    orientation,
    layout,
    align,
    open,
    hiddenUntilFound,
    disabled,
    showMore,
    showLess,
  }) =>
    html`<tp-description-list
      limit=${limit ?? nothing}
      orientation=${orientation}
      layout=${layout}
      align=${align}
      .open=${open}
      ?hidden-until-found=${hiddenUntilFound}
      ?disabled=${disabled}
      .messages=${{ showMore, showLess }}
      style="max-inline-size:28rem"
    >
      <tp-description-list-item label="Plot">B-14, east terrace</tp-description-list-item>
      <tp-description-list-item label="Gardener">Mara Lindqvist</tp-description-list-item>
      <tp-description-list-item label="Status">
        <tp-badge variant="success">Active</tp-badge>
      </tp-description-list-item>
      <tp-description-list-item label="Size">3 × 4 m</tp-description-list-item>
      <tp-description-list-item label="Water access">Shared tap, row C</tp-description-list-item>
      <tp-description-list-item label="Soil test">pH 6.8, tested in March</tp-description-list-item>
    </tp-description-list>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
