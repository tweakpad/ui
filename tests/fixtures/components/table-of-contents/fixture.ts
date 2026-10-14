import { html, nothing, render, type TemplateResult } from 'lit';
import { generateParagraphs } from '../../../../src/stories/text-generator.js';

// Pages, chosen by ?page=:
//   end (default)  compact, docked at the inline-end edge, nested sections
//   start          compact, docked at the inline-start edge, side="inline-end"
//   start-flip     compact, docked at the inline-start edge, default side (flips)
//   rtl            end page in a right-to-left document
//   long           36 items in a strip limited to 10rem (rows shrink, the card scrolls)
//   list           list variant in a sticky column (regression)
//   switch         end page with a Button that switches the variant at runtime
// Add ?package to load the built package instead of the sources.
const params = new URL(location.href).searchParams;
const built = params.has('package');
const page = params.get('page') ?? 'end';
const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(sheet);
await (built ? import('../../../../dist/register.js') : import('../../../../src/register.js'));
if (page === 'rtl') document.documentElement.dir = 'rtl';
document.body.style.cssText =
  'margin:0;background:var(--tp-background);color:var(--tp-foreground);font-family:var(--tp-font-sans);font-size:var(--tp-text-sm);line-height:var(--tp-leading-normal)';

interface Section {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: number;
  readonly children?: readonly Section[];
}

/** A ceramics studio handbook: groups wrap their subsections, so a group stays active inside. */
const handbook: readonly Section[] = [
  { id: 'welcome', title: 'Welcome', paragraphs: 2 },
  {
    id: 'access',
    title: 'Studio access',
    paragraphs: 2,
    children: [
      { id: 'hours', title: 'Opening hours', paragraphs: 3 },
      { id: 'key-cards', title: 'Key cards', paragraphs: 2 },
    ],
  },
  {
    id: 'clay',
    title: 'Clay and glazes',
    paragraphs: 2,
    children: [
      { id: 'stoneware', title: 'Stoneware', paragraphs: 3 },
      {
        id: 'glaze-safety',
        title: 'Glaze safety',
        paragraphs: 2,
        children: [{ id: 'respirators', title: 'Respirators', paragraphs: 3 }],
      },
    ],
  },
  {
    id: 'kilns',
    title: 'Kilns',
    paragraphs: 2,
    children: [
      { id: 'loading', title: 'Loading shelves', paragraphs: 3 },
      { id: 'schedules', title: 'Firing schedules', paragraphs: 3 },
    ],
  },
  { id: 'cleanup', title: 'Cleanup', paragraphs: 3 },
  { id: 'shelf', title: "Members' shelf", paragraphs: 1 },
];

const chapters: readonly Section[] = Array.from({ length: 36 }, (_, index) => ({
  id: `chapter-${index + 1}`,
  title: `Chapter ${index + 1}: ${['Wedging', 'Centering', 'Trimming', 'Handles'][index % 4]}`,
  paragraphs: 1,
}));

const sections = page === 'long' ? chapters : handbook;

let seed = 1;
function sectionMarkup(list: readonly Section[], level = 2): TemplateResult[] {
  return list.map((section) => {
    const heading = level === 2 ? html`<h2>${section.title}</h2>` : html`<h3>${section.title}</h3>`;
    const text = generateParagraphs((seed += 1), section.paragraphs).map(
      (paragraph) => html`<p>${paragraph}</p>`,
    );
    return html`<section id=${section.id} style="scroll-margin-block-start:24px">
      ${heading}${text}${section.children ? sectionMarkup(section.children, level + 1) : nothing}
    </section>`;
  });
}

function items(list: readonly Section[], depth = 1): TemplateResult[] {
  return list.flatMap((section) => [
    html`<tp-table-of-contents-item href=${`#${section.id}`} depth=${depth}
      >${section.title}</tp-table-of-contents-item
    >`,
    ...(section.children ? items(section.children, depth + 1) : []),
  ]);
}

const docked = (edge: 'start' | 'end') =>
  `position:fixed;inset-inline-${edge}:16px;top:50%;translate:0 -50%;z-index:1`;

const toc = (variant: 'compact' | 'list', style: string, side?: string) =>
  html`<tp-table-of-contents id="toc" variant=${variant} side=${side ?? nothing} style=${style}
    >${items(sections)}</tp-table-of-contents
  >`;

const article = html`<article
  id="article"
  style="max-inline-size:640px;margin-inline:auto;padding:32px 72px 50vh"
>
  <h1>Studio handbook</h1>
  ${sectionMarkup(sections)}
</article>`;

const switcher = html`<tp-button
  id="switch"
  variant="outline"
  size="sm"
  style="position:fixed;inset-block-start:16px;inset-inline-start:16px;z-index:1"
  @click=${() => {
    const element = document.getElementById('toc') as HTMLElement & { variant: string };
    element.variant = element.variant === 'compact' ? 'list' : 'compact';
  }}
  >Switch variant</tp-button
>`;

const pages: Record<string, () => TemplateResult> = {
  end: () => html`${article}${toc('compact', docked('end'))}`,
  start: () => html`${article}${toc('compact', docked('start'), 'inline-end')}`,
  'start-flip': () => html`${article}${toc('compact', docked('start'))}`,
  rtl: () => html`${article}${toc('compact', docked('end'))}`,
  long: () => html`${article}${toc('compact', `${docked('end')};max-block-size:10rem`)}`,
  list: () =>
    html`<div
      style="display:grid;grid-template-columns:minmax(0,1fr) 14rem;gap:32px;padding:0 32px;align-items:start"
    >
      ${article}
      <aside style="position:sticky;top:24px">${toc('list', '')}</aside>
    </div>`,
  switch: () => html`${switcher}${article}${toc('compact', docked('end'))}`,
};

render((pages[page] ?? pages.end!)(), document.getElementById('fixture')!);
(window as unknown as { fixtureReady: boolean }).fixtureReady = true;
