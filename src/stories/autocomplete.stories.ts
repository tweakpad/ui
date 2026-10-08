import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html } from 'lit';
import documentation from '../../docs/autocomplete.md?raw';
import { autocompleteDefaultSource, autocompleteExamples } from './autocomplete.examples.js';

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
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: autocompleteExamples,
      source: { code: autocompleteDefaultSource },
    },
  },
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
      description: 'How the text matches items; `fuzzy` ranks by relevance and tolerates typos.',
      table: { defaultValue: { summary: 'fuzzy' } },
    },
    completionMode: {
      control: 'inline-radio',
      options: ['list', 'both', 'inline', 'none'],
      description: '`completion-mode`: filtering and inline completion of the text.',
      table: { defaultValue: { summary: 'list' } },
    },
    autoHighlight: {
      control: 'inline-radio',
      options: ['false', 'true', 'always'],
      description: '`auto-highlight`: highlight the first suggestion after typing, or always.',
      table: { defaultValue: { summary: 'false' } },
    },
    highlightMatches: {
      control: 'boolean',
      description: '`highlight-matches`: mark matched text in suggestions.',
      table: { defaultValue: { summary: 'true' } },
    },
    limit: {
      control: { type: 'number', min: -1, step: 1 },
      description: 'Maximum suggestions; `-1` shows all.',
      table: { defaultValue: { summary: '-1' } },
    },
    showClear: {
      control: 'boolean',
      description: '`show-clear`: a clear button while there is text.',
      table: { defaultValue: { summary: 'false' } },
    },
    showTrigger: {
      control: 'boolean',
      description: '`show-trigger`: a button that opens and closes the suggestions.',
      table: { defaultValue: { summary: 'false' } },
    },
    openOnInputClick: {
      control: 'boolean',
      description: '`open-on-input-click`: open the suggestions when the input is pressed.',
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
    const markup = autocompleteDefaultSource.replace(
      '<tp-autocomplete name="fruit"',
      `<tp-autocomplete name="fruit" ${attributes}`,
    );
    return html`<div style="max-inline-size: 22rem">${unsafeHTML(markup)}</div>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** Fruit suggestions with ranked, typo-tolerant matching and highlighted matches. */
export const Default: Story = {};
