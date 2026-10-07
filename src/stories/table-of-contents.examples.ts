import { interactiveMarkupExample } from './documentation-examples.js';
import { setupTableOfContentsExample } from './table-of-contents-example.js';
import setupSource from './table-of-contents-example.js?raw';
import generatorSource from './text-generator.js?raw';

export interface PageSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: number;
  readonly children?: readonly PageSection[];
}

/** The sections of the generated documentation page used by the stories and examples. */
export const pageSections: readonly PageSection[] = [
  { id: 'installation', title: 'Installation', paragraphs: 4 },
  { id: 'registration', title: 'Registration', paragraphs: 5 },
  { id: 'theming', title: 'Theming', paragraphs: 6 },
  { id: 'composition', title: 'Composition', paragraphs: 5 },
  { id: 'accessibility', title: 'Accessibility', paragraphs: 4 },
  { id: 'performance', title: 'Performance', paragraphs: 6 },
  { id: 'release-notes', title: 'Release notes', paragraphs: 1 },
];

const margin = 'style="margin-block: 0 0.75rem; scroll-margin-block-start: 1.5rem"';
const anchor = (id: string, title: string) =>
  `<a href="#${id}" aria-label="Link to ${title}">#</a>`;

/**
 * Section markup with a heading anchor and a link to the next section in the text. A section
 * with children wraps them, so it is the target and contains their regions.
 */
function sectionMarkup(
  prefix: string,
  sections: readonly PageSection[],
  indent = '      ',
  level = 2,
): string {
  return sections
    .map((section, index) => {
      const id = `${prefix}-${section.id}`;
      const next = sections[index + 1] ?? sections[0]!;
      const text = `${indent}<div data-generate="${section.paragraphs}"></div>
${indent}<p>Continue with <a href="#${prefix}-${next.id}">${next.title}</a>.</p>`;
      if (!section.children)
        return `${indent}<h${level} id="${id}" ${margin}>${section.title} ${anchor(id, section.title)}</h${level}>
${text}`;
      return `${indent}<section id="${id}" ${margin}>
${indent}  <h${level} style="margin-block: 0 0.75rem">${section.title} ${anchor(id, section.title)}</h${level}>
${text.replaceAll(indent, `${indent}  `)}
${sectionMarkup(prefix, section.children, `${indent}  `, level + 1)}
${indent}</section>`;
    })
    .join('\n');
}

function items(prefix: string, sections: readonly PageSection[], depth = 1): string {
  return sections
    .map(
      (section) =>
        `      <tp-table-of-contents-item href="#${prefix}-${section.id}"${depth > 1 ? ` depth="${depth}"` : ''}>${section.title}</tp-table-of-contents-item>${section.children ? `\n${items(prefix, section.children, depth + 1)}` : ''}`,
    )
    .join('\n');
}

/**
 * A page: a scroll container holding the article and, beside it, a sticky table of contents
 * inside the same scroll container.
 */
export function pageMarkup({
  prefix,
  sections = pageSections,
  side = 'end',
  attributes = '',
}: {
  prefix: string;
  sections?: readonly PageSection[];
  side?: 'start' | 'end';
  attributes?: string;
}) {
  const article = `    <article>
${sectionMarkup(prefix, sections)}
    </article>`;
  const toc = `    <aside style="position: sticky; top: 1.5rem; max-block-size: 31rem; overflow: auto">
      <tp-table-of-contents${attributes}>
${items(prefix, sections)}
      </tp-table-of-contents>
    </aside>`;
  const columns = side === 'end' ? 'minmax(0, 1fr) 13rem' : '13rem minmax(0, 1fr)';
  return `<tp-scroll-area style="block-size: 34rem">
  <div style="display: grid; grid-template-columns: ${columns}; gap: 2.5rem; padding: 1.5rem; align-items: start">
${side === 'end' ? `${article}\n${toc}` : `${toc}\n${article}`}
  </div>
</tp-scroll-area>`;
}

const script = (id: string) =>
  `${generatorSource.replaceAll(/^export /gmu, '')}\n${setupSource
    .replaceAll("'../foundation/collect-targets.js'", "'@tweakpad/ui'")
    .replace(
      /^import \{ fillGeneratedText \}.*\n/mu,
      '',
    )}\nsetupTableOfContentsExample(document.getElementById('${id}'));`;

const example = (title: string, id: string, markup: string, description: string) =>
  interactiveMarkupExample(
    title,
    `<div id="${id}">\n${markup}\n</div>`,
    setupTableOfContentsExample,
    script(id),
    description,
  );

const nestedSections: readonly PageSection[] = [
  {
    id: 'guide',
    title: 'Guide',
    paragraphs: 2,
    children: [
      { id: 'forms', title: 'Forms', paragraphs: 4 },
      { id: 'overlays', title: 'Overlays', paragraphs: 4 },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    paragraphs: 2,
    children: [
      { id: 'events', title: 'Events', paragraphs: 3 },
      { id: 'parts', title: 'Parts', paragraphs: 3 },
    ],
  },
  { id: 'changelog', title: 'Changelog', paragraphs: 1 },
];

const collectedMarkup = `<tp-scroll-area style="block-size: 34rem">
  <div style="display: grid; grid-template-columns: minmax(0, 1fr) 13rem; gap: 2.5rem; padding: 1.5rem; align-items: start">
    <div data-article>
      <div style="scroll-margin-block-start: 1.5rem" data-toc="1" data-toc-label="Release notes"><strong>Release notes</strong><div data-generate="4"></div></div>
      <figure style="scroll-margin-block-start: 1.5rem" data-toc="2" data-toc-label="Benchmark figure"><div data-generate="3"></div></figure>
      <div style="scroll-margin-block-start: 1.5rem" data-toc="1" data-toc-label="Upgrade steps"><strong>Upgrade steps</strong><div data-generate="5"></div></div>
      <div style="scroll-margin-block-start: 1.5rem" data-toc="1" data-toc-label="Known issues"><strong>Known issues</strong><div data-generate="2"></div></div>
    </div>
    <aside style="position: sticky; top: 1.5rem; display: grid; gap: 0.75rem; justify-items: start">
      <tp-table-of-contents data-collect></tp-table-of-contents>
      <tp-button data-add-section variant="outline" size="sm">Add a section</tp-button>
    </aside>
  </div>
</tp-scroll-area>`;

export const tableOfContentsExamples = [
  example(
    'Table of contents on the start side',
    'toc-start',
    pageMarkup({ prefix: 'toc-start', side: 'start' }),
    'The same page with the table of contents in the leading column. It stays sticky inside the page it tracks; heading anchors and the links in the text move the table of contents too.',
  ),
  example(
    'Nested sections',
    'toc-nested',
    pageMarkup({ prefix: 'toc-nested', sections: nestedSections }),
    'Each group is a section wrapping its subsections, so the group stays active while you read inside it and the indicator spans both. Depth only indents; nesting comes from geometry.',
  ),
  example(
    'Instant scrolling, debounced updates',
    'toc-instant',
    pageMarkup({
      prefix: 'toc-instant',
      attributes: ' scroll-behavior="instant" scroll-debounce="120" navigation="scroll"',
    }),
    'scroll-behavior="instant" jumps without animation, scroll-debounce updates only after scrolling pauses, and navigation="scroll" leaves the URL untouched.',
  ),
  example(
    'Collected targets and late content',
    'toc-collected',
    collectedMarkup,
    'collectTargets builds items from a selector the page supplies. These targets have no ids and are not headings; items reference them directly.',
  ),
];

/** Copyable source of the default story. */
export const tableOfContentsDefaultSource = pageMarkup({ prefix: 'toc-page' });
