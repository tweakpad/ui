import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { generateParagraphs } from './text-generator.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  variant: 'list' | 'compact';
  side: 'inline-start' | 'inline-end';
  openDelay: number;
  closeDelay: number;
  label: string;
  navigation: 'fragment' | 'scroll';
  scrollBehavior: ScrollBehavior;
  activationOffset: string;
  scrollThrottle: number;
  scrollDebounce: number;
}

/** The sections of the generated page the stories scroll through. */
const pageSections = [
  { id: 'installation', title: 'Installation', paragraphs: 4 },
  { id: 'registration', title: 'Registration', paragraphs: 5 },
  { id: 'theming', title: 'Theming', paragraphs: 6 },
  { id: 'composition', title: 'Composition', paragraphs: 5 },
  { id: 'accessibility', title: 'Accessibility', paragraphs: 4 },
  { id: 'performance', title: 'Performance', paragraphs: 6 },
  { id: 'release-notes', title: 'Release notes', paragraphs: 1 },
] as const;

const article = (prefix: string, extra = 0) =>
  pageSections.map(
    (section, index) =>
      html`<h2
          id="${prefix}-${section.id}"
          style="margin-block: 0 0.75rem; scroll-margin-block-start: 1.5rem"
        >
          ${section.title}
          <a href="#${prefix}-${section.id}" aria-label="Link to ${section.title}">#</a>
        </h2>
        ${generateParagraphs(index + 11, section.paragraphs + extra).map((text) => html`<p>${text}</p>`)}`,
  );

const items = (prefix: string) =>
  pageSections.map(
    (section) =>
      html`<tp-table-of-contents-item href="#${prefix}-${section.id}"
        >${section.title}</tp-table-of-contents-item
      >`,
  );

const meta = {
  title: 'Components/Table of contents',
  component: 'tp-table-of-contents',
  parameters: { docs: libraryDocs('components/table-of-contents') },
  args: {
    variant: 'list',
    side: 'inline-start',
    openDelay: 300,
    closeDelay: 0,
    label: '',
    navigation: 'fragment',
    scrollBehavior: 'smooth',
    activationOffset: '',
    scrollThrottle: 0,
    scrollDebounce: 0,
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['list', 'compact'],
      table: { defaultValue: { summary: 'list' } },
    },
    side: {
      control: 'inline-radio',
      options: ['inline-start', 'inline-end'],
      table: { defaultValue: { summary: 'inline-start' } },
    },
    openDelay: {
      control: { type: 'number', min: 0, step: 50 },
      table: { defaultValue: { summary: '300' } },
    },
    closeDelay: {
      control: { type: 'number', min: 0, step: 50 },
      table: { defaultValue: { summary: '0' } },
    },
    label: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    navigation: {
      control: 'inline-radio',
      options: ['fragment', 'scroll'],
      table: { defaultValue: { summary: 'fragment' } },
    },
    scrollBehavior: {
      control: 'inline-radio',
      options: ['smooth', 'instant', 'auto'],
      table: { defaultValue: { summary: 'smooth' } },
    },
    activationOffset: {
      control: 'text',
      table: { defaultValue: { summary: 'null' } },
    },
    scrollThrottle: {
      control: { type: 'number', min: 0, step: 10 },
      table: { defaultValue: { summary: '0' } },
    },
    scrollDebounce: {
      control: { type: 'number', min: 0, step: 10 },
      table: { defaultValue: { summary: '0' } },
    },
  },
  render: (args) => {
    const compact = args.variant === 'compact';
    return html`<tp-scroll-area style="block-size: 34rem">
      <div
        style="display: grid; grid-template-columns: minmax(0, 1fr) ${
          compact ? 'auto' : '13rem'
        }; gap: 2.5rem; padding: 1.5rem; align-items: start"
      >
        <article>${article('story-toc')}</article>
        <aside
          style=${
            compact
              ? 'position: sticky; top: 50%; translate: 0 -50%'
              : 'position: sticky; top: 1.5rem; max-block-size: 31rem; overflow: auto'
          }
        >
          <tp-table-of-contents
            .variant=${args.variant}
            .side=${args.side}
            .openDelay=${args.openDelay}
            .closeDelay=${args.closeDelay}
            .label=${args.label}
            .navigation=${args.navigation}
            .scrollBehavior=${args.scrollBehavior}
            .activationOffset=${args.activationOffset || null}
            .scrollThrottle=${args.scrollThrottle}
            .scrollDebounce=${args.scrollDebounce}
            >${items('story-toc')}</tp-table-of-contents
          >
        </aside>
      </div>
    </tp-scroll-area>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A page that scrolls inside its container, with the table of contents sticky beside it. */
export const Default: Story = {};

/** The document itself scrolls; the table of contents stays sticky at the end of the page. */
export const DocumentScroll: Story = {
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  render: () =>
    html`<div
      style="display: grid; grid-template-columns: minmax(0, 1fr) 14rem; gap: 3rem; padding: 2rem; align-items: start"
    >
      <article>${article('document', 2)}</article>
      <aside style="position: sticky; top: 2rem">
        <tp-table-of-contents>${items('document')}</tp-table-of-contents>
      </aside>
    </div>`,
};
