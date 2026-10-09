import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import documentation from '../../docs/table-of-contents.md?raw';
import {
  pageMarkup,
  tableOfContentsDefaultSource,
  tableOfContentsExamples,
} from './table-of-contents.examples.js';
import { fillGeneratedText, generateParagraphs } from './text-generator.js';
import { pageSections } from './table-of-contents.examples.js';

interface Args {
  label: string;
  navigation: 'fragment' | 'scroll';
  scrollBehavior: ScrollBehavior;
  activationOffset: string;
  scrollThrottle: number;
  scrollDebounce: number;
}

const attribute = (name: string, value: string | number, fallback: string | number) =>
  value === fallback || value === '' ? '' : ` ${name}="${value}"`;

const meta = {
  title: 'Components/Table of contents',
  component: 'tp-table-of-contents',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: tableOfContentsExamples,
      source: { code: tableOfContentsDefaultSource },
    },
  },
  args: {
    label: '',
    navigation: 'fragment',
    scrollBehavior: 'smooth',
    activationOffset: '',
    scrollThrottle: 0,
    scrollDebounce: 0,
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Title text; the `title` slot replaces it. Empty uses the title message.',
      table: { defaultValue: { summary: "''" } },
    },
    navigation: {
      control: 'inline-radio',
      options: ['fragment', 'scroll'],
      description: '`fragment` records the target in the URL; `scroll` leaves the URL untouched.',
      table: { defaultValue: { summary: 'fragment' } },
    },
    scrollBehavior: {
      control: 'inline-radio',
      options: ['smooth', 'instant', 'auto'],
      description:
        '`scroll-behavior`: how the content scrolls when navigating. `auto` follows the CSS of the scroll container; reduced motion is always instant.',
      table: { defaultValue: { summary: 'smooth' } },
    },
    activationOffset: {
      control: 'text',
      description:
        '`activation-offset`: reading line in pixels or a percentage of the scroll container. Empty uses its scroll padding plus one pixel.',
      table: { defaultValue: { summary: 'null' } },
    },
    scrollThrottle: {
      control: { type: 'number', min: 0, step: 10 },
      description:
        '`scroll-throttle`: milliseconds between updates while scrolling; 0 is every frame.',
      table: { defaultValue: { summary: '0' } },
    },
    scrollDebounce: {
      control: { type: 'number', min: 0, step: 10 },
      description:
        '`scroll-debounce`: update only after scrolling pauses this long; wins over throttle.',
      table: { defaultValue: { summary: '0' } },
    },
  },
  render: (args) =>
    html`<div
      ${ref((node) => {
        // The page markup is inserted after the ref runs.
        if (node) queueMicrotask(() => fillGeneratedText(node));
      })}
    >
      ${unsafeHTML(
        pageMarkup({
          prefix: 'story-toc',
          attributes: [
            args.label ? ` label="${args.label}"` : '',
            attribute('navigation', args.navigation, 'fragment'),
            attribute('scroll-behavior', args.scrollBehavior, 'smooth'),
            attribute('activation-offset', args.activationOffset, ''),
            attribute('scroll-throttle', args.scrollThrottle, 0),
            attribute('scroll-debounce', args.scrollDebounce, 0),
          ].join(''),
        }),
      )}
    </div>`,
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
      <article>
        ${pageSections.map(
          (section, index) =>
            html`<h2 id="document-${section.id}" style="scroll-margin-block-start: 2rem">
                ${section.title}
                <a href="#document-${section.id}" aria-label="Link to ${section.title}">#</a>
              </h2>
              ${generateParagraphs(index + 11, section.paragraphs + 2).map(
                (text) => html`<p>${text}</p>`,
              )}`,
        )}
      </article>
      <aside style="position: sticky; top: 2rem">
        <tp-table-of-contents>
          ${pageSections.map(
            (section) =>
              html`<tp-table-of-contents-item href="#document-${section.id}"
                >${section.title}</tp-table-of-contents-item
              >`,
          )}
        </tp-table-of-contents>
      </aside>
    </div>`,
};
