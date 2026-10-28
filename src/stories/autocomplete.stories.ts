import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

const cities = [
  'Amsterdam',
  'Barcelona',
  'Berlin',
  'Copenhagen',
  'Edinburgh',
  'Lisbon',
  'London',
  'Madrid',
  'Paris',
  'Prague',
  'Vienna',
];
const defaultSource = `<tp-field label="Destination" description="Try a typo: amsterdma, lisbn">
  <tp-autocomplete name="destination" placeholder="Search cities">
${cities.map((city) => `    <option>${city}</option>`).join('\n')}
  </tp-autocomplete>
</tp-field>`;

interface Args {
  matching: 'fuzzy' | 'contains' | 'prefix' | 'exact';
  completionMode: 'list' | 'both' | 'inline' | 'none';
  autoHighlight: 'false' | 'true' | 'always';
  highlightMatches: boolean;
  limit: number;
  showClear: boolean;
  showTrigger: boolean;
  openOnInputClick: boolean;
  disabled: boolean;
}

const meta = {
  title: 'Components/Autocomplete',
  component: 'tp-autocomplete',
  parameters: { docs: libraryDocs('components/autocomplete') },
  args: {
    matching: 'fuzzy',
    completionMode: 'list',
    autoHighlight: 'false',
    highlightMatches: true,
    limit: -1,
    showClear: false,
    showTrigger: false,
    openOnInputClick: false,
    disabled: false,
  },
  argTypes: {
    matching: {
      control: 'inline-radio',
      options: ['fuzzy', 'contains', 'prefix', 'exact'],
      table: { defaultValue: { summary: 'fuzzy' } },
    },
    completionMode: {
      control: 'inline-radio',
      options: ['list', 'both', 'inline', 'none'],
      table: { defaultValue: { summary: 'list' } },
    },
    autoHighlight: {
      control: 'inline-radio',
      options: ['false', 'true', 'always'],
      table: { defaultValue: { summary: 'false' } },
    },
    highlightMatches: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    limit: {
      control: { type: 'number', min: -1, step: 1 },
      table: { defaultValue: { summary: '-1' } },
    },
    showClear: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    showTrigger: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    openOnInputClick: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: { control: 'boolean', table: { defaultValue: { summary: 'false' } } },
  },
  render: (args) => {
    // The default source is the composition; story controls set the autocomplete's own properties.
    const attributes = [
      `matching="${args.matching}"`,
      `completion-mode="${args.completionMode}"`,
      args.autoHighlight === 'false' ? '' : `auto-highlight="${args.autoHighlight}"`,
      args.highlightMatches ? '' : 'highlight-matches="false"',
      `limit="${args.limit}"`,
      args.showClear ? 'show-clear' : '',
      args.showTrigger ? 'show-trigger' : '',
      args.openOnInputClick ? 'open-on-input-click' : '',
      args.disabled ? 'disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const markup = defaultSource.replace(
      '<tp-autocomplete name="destination"',
      `<tp-autocomplete name="destination" ${attributes}`,
    );
    return html`<div style="max-inline-size: 22rem">${unsafeHTML(markup)}</div>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** City suggestions with ranked, typo-tolerant matching and highlighted matches. */
export const Default: Story = {};
