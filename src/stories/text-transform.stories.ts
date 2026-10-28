import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import { TEXT_PRESETS, type TruncatePosition, type TruncateUnit } from '../index.js';

interface Args {
  value: string;
  preset: string;
  currency: string;
  unit: string;
  decimals: number | undefined;
  locale: string;
  truncate: TruncatePosition;
  truncateBy: TruncateUnit;
  maxLength: number | undefined;
  tooltip: boolean;
  width: number;
}
const meta = {
  title: 'Components/Text transform',
  component: 'tp-text-transform',
  parameters: { docs: libraryDocs('components/text-transform') },
  args: {
    value: '1234.5',
    preset: 'currency',
    currency: 'EUR',
    unit: '',
    decimals: undefined,
    locale: '',
    truncate: 'none',
    truncateBy: 'chars',
    maxLength: undefined,
    tooltip: true,
    width: 320,
  },
  argTypes: {
    value: { control: 'text' },
    preset: {
      control: 'select',
      options: [...TEXT_PRESETS],
      table: { defaultValue: { summary: 'text' } },
    },
    currency: { control: 'text' },
    unit: { control: 'text' },
    decimals: {
      control: { type: 'number', min: 0, max: 20 },
      table: { type: { summary: 'number' } },
    },
    locale: { control: 'text', table: { defaultValue: { summary: 'closest lang' } } },
    truncate: {
      control: 'select',
      options: ['none', 'start', 'middle', 'end'],
      table: { defaultValue: { summary: 'none' } },
    },
    truncateBy: {
      control: 'inline-radio',
      options: ['chars', 'words'],
      table: { defaultValue: { summary: 'chars' } },
    },
    maxLength: { control: { type: 'number', min: 0 }, table: { type: { summary: 'number' } } },
    tooltip: { control: 'boolean', table: { defaultValue: { summary: 'true' } } },
    width: {
      description: 'Fixture: inline size of the container, in pixels.',
      control: { type: 'range', min: 40, max: 640 },
    },
  },
  render: ({
    value,
    preset,
    currency,
    unit,
    decimals,
    locale,
    truncate,
    truncateBy,
    maxLength,
    tooltip,
    width,
  }) =>
    html`<div style="inline-size:${width}px">
      <tp-text-transform
        .value=${value}
        .preset=${preset}
        .currency=${currency}
        .unit=${unit}
        .decimals=${decimals ?? null}
        .locale=${locale}
        .truncate=${truncate}
        .truncateBy=${truncateBy}
        .maxLength=${maxLength ?? null}
        .tooltip=${tooltip}
      ></tp-text-transform>
    </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
