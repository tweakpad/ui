import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import { setupBadgeExample } from './badge-example.js';
import setupSource from './badge-example.js?raw';

const row = (content: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--tp-space-4)">${content}</div>`;
const interactive = (title: string, id: string, markup: string, description: string) =>
  interactiveMarkupExample(
    title,
    `<div id="${id}">${markup}</div>`,
    setupBadgeExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupBadgeExample(document.getElementById('${id}'));`,
    description,
  );

export const badgeExamples = [
  markupExample(
    'Variants',
    row(
      ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']
        .map(
          (variant) =>
            `<tp-badge variant="${variant}">${variant.charAt(0).toUpperCase()}${variant.slice(1)}</tp-badge>`,
        )
        .join('\n'),
    ),
    'All six visual treatments. The link variant alone does not make a badge interactive.',
  ),
  interactive(
    'With icons',
    'badge-icons',
    row(`<tp-badge variant="secondary"><tp-icon data-icon="check" size="var(--tp-icon-size-xs)"></tp-icon>Verified</tp-badge>
<tp-badge variant="outline">Published<tp-icon data-icon="arrow" size="var(--tp-icon-size-xs)"></tp-icon></tp-badge>`),
    'Place actual Icon components before or after text. Decorative icons have no label; visible words carry status meaning.',
  ),
  markupExample(
    'Counts and metadata',
    row(`<tp-badge variant="secondary">12 unread</tp-badge>
<tp-badge variant="outline">Version 2.4</tp-badge>
<tp-button variant="outline">Notifications <tp-badge variant="secondary">8</tp-badge></tp-button>`),
    'Give counts context. A badge inside a Button stays passive; the Button owns the single action and accessible name.',
  ),
  markupExample(
    'Loading status',
    row(`<tp-badge variant="secondary"><tp-spinner size="sm" label=""></tp-spinner>Generating</tp-badge>
<tp-badge variant="destructive"><tp-spinner size="sm" label=""></tp-spinner>Deleting</tp-badge>`),
    'Spinner supplies motion; Badge supplies the status text. Neither example announces continuously. Use an application-owned live region for updates that need announcements.',
  ),
  interactive(
    'Buttons and links',
    'badge-actions',
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--tp-space-6);padding-block:var(--tp-space-3)">
  <tp-badge interactive data-action="button">Apply filter</tp-badge>
  <tp-badge interactive variant="outline" data-action="link">View details<tp-icon data-icon="arrow" size="var(--tp-icon-size-xs)"></tp-icon></tp-badge>
  <tp-badge interactive variant="secondary" disabled data-action="button">Unavailable</tp-badge>
</div>
<output aria-live="polite">No badge action yet.</output>
<p id="badge-destination">Badge link destination</p>`,
    'Interactive declares intent; the render contract supplies a native button or anchor. Button delegates bind disabled state. Leave space around the expanded pointer targets.',
  ),
];
