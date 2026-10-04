import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { scrollAreaExamples } from './scroll-area.examples.js';
import documentation from '../../docs/scroll-area.md?raw';
import type { ScrollbarVisibility } from '../components/scroll-area/index.js';
interface Args {
  orientation: 'vertical' | 'horizontal';
  scrollbarVisibility: ScrollbarVisibility;
  keepMounted: boolean;
  disabled: boolean;
  showCorner: boolean;
  label: string;
}
const records = Array.from({ length: 30 }, (_, i) => `Release 1.${i}.0`);
const defaults: Args = {
  orientation: 'vertical',
  scrollbarVisibility: 'automatic',
  keepMounted: false,
  disabled: false,
  showCorner: true,
  label: 'Release history',
};
const meta = {
  title: 'Components/Scroll area',
  component: 'tp-scroll-area',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: scrollAreaExamples,
      source: {
        code: `<tp-scroll-area label="Release history" style="block-size:calc(var(--tp-spacing) * 90);inline-size:calc(var(--tp-spacing) * 60);max-inline-size:100%">
  <div style="padding:var(--tp-space-4)">
    <h3 style="margin:0 0 var(--tp-space-4);font-size:var(--tp-text-sm)">Release history</h3>
    ${records.map((record, i) => `${i ? '<tp-separator style="margin-block:var(--tp-space-2)"></tp-separator>' : ''}<div style="font-size:var(--tp-text-sm)">${record}</div>`).join('\n    ')}
  </div>
</tp-scroll-area>`,
        language: 'html',
      },
    },
  },
  args: defaults,
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    scrollbarVisibility: {
      control: 'select',
      options: ['automatic', 'always', 'while-scrolling', 'on-hover'],
    },
    keepMounted: { control: 'boolean' },
    disabled: { control: 'boolean' },
    showCorner: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) =>
    html`<tp-scroll-area
      .orientation=${args.orientation}
      .scrollbarVisibility=${args.scrollbarVisibility}
      .keepMounted=${args.keepMounted}
      .disabled=${args.disabled}
      .showCorner=${args.showCorner}
      .label=${args.label}
      style="block-size:calc(var(--tp-spacing) * 90);inline-size:calc(var(--tp-spacing) * 60);max-inline-size:100%"
      ><div style="padding:var(--tp-space-4)">
        <h3 style="margin:0 0 var(--tp-space-4);font-size:var(--tp-text-sm)">Release history</h3>
        ${records.map(
          (record, i) =>
            html`${i ? html`<tp-separator style="margin-block:var(--tp-space-2)"></tp-separator>` : null}
              <div style="font-size:var(--tp-text-sm)">${record}</div>`,
        )}
      </div></tp-scroll-area
    >`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
