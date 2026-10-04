import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import landscape from './assets/ratio-landscape.svg';
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
      examples: [
        {
          title: 'Horizontal scrolling',
          render: () => HorizontalGallery.render(defaults),
          get code() {
            return HorizontalGallery.parameters.docs.source.code;
          },
        },
        {
          title: 'Both axes',
          render: () => BothAxes.render(defaults),
          get code() {
            return BothAxes.parameters.docs.source.code;
          },
        },
      ],
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
const HorizontalGallery = {
  render: (args: Args) =>
    html`<tp-scroll-area
      orientation="horizontal"
      .scrollbarVisibility=${args.scrollbarVisibility}
      .keepMounted=${args.keepMounted}
      .disabled=${args.disabled}
      label="Landscape gallery"
      style="inline-size:calc(var(--tp-spacing) * 120);max-inline-size:100%"
      ><div style="display:flex;width:max-content;gap:var(--tp-space-4);padding:var(--tp-space-4)">
        ${['Mountains', 'River', 'Valley'].map(
          (label) =>
            html`<figure style="margin:0;inline-size:calc(var(--tp-spacing) * 60)">
              <tp-aspect-ratio ratio="1.5"><img src=${landscape} alt=${label} /></tp-aspect-ratio>
              <figcaption style="padding-block:var(--tp-space-2);font-size:var(--tp-text-sm)">
                ${label}
              </figcaption>
            </figure>`,
        )}
      </div></tp-scroll-area
    >`,
  parameters: {
    docs: {
      source: {
        code: `<tp-scroll-area orientation="horizontal" label="Landscape gallery" style="inline-size:calc(var(--tp-spacing) * 120);max-inline-size:100%"><div style="display:flex;width:max-content;gap:var(--tp-space-4);padding:var(--tp-space-4)">${['Mountains', 'River', 'Valley'].map((label) => `<figure style="margin:0;inline-size:calc(var(--tp-spacing) * 60)"><tp-aspect-ratio ratio="1.5"><img src="${landscape}" alt="${label}" /></tp-aspect-ratio><figcaption style="padding-block:var(--tp-space-2);font-size:var(--tp-text-sm)">${label}</figcaption></figure>`).join('\n')}</div></tp-scroll-area>`,
      },
    },
  },
};
const BothAxes = {
  render: (args: Args) =>
    html`<tp-scroll-area
      axis="both"
      .scrollbarVisibility=${args.scrollbarVisibility}
      .showCorner=${args.showCorner}
      .keepMounted=${args.keepMounted}
      label="Release notes"
      style="inline-size:calc(var(--tp-spacing) * 100);block-size:calc(var(--tp-spacing) * 72);max-inline-size:100%"
      ><div style="min-inline-size:calc(var(--tp-spacing) * 160);padding:var(--tp-space-4)">
        ${records.map((record) => html`<p>${record} — Updated components, documentation and examples.</p>`)}
      </div></tp-scroll-area
    >`,
  parameters: {
    docs: {
      source: {
        code: `<tp-scroll-area axis="both" label="Release notes" style="inline-size:calc(var(--tp-spacing) * 100);block-size:calc(var(--tp-spacing) * 72);max-inline-size:100%"><div style="min-inline-size:calc(var(--tp-spacing) * 160);padding:var(--tp-space-4)">${records.map((record) => `<p>${record} — Updated components, documentation and examples.</p>`).join('\n')}</div></tp-scroll-area>`,
      },
    },
  },
};
