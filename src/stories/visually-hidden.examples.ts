import { markupExample, moduleExample } from './documentation-examples.js';
import { setupVisuallyHiddenExample } from './visually-hidden-example.js';
import setupSource from './visually-hidden-example.js?raw';

const layer = (value: string, name: string) =>
  `<tp-toggle value="${value}"><tp-icon data-layer-icon="${value}"></tp-icon><tp-visually-hidden>${name}</tp-visually-hidden></tp-toggle>`;

const tools = [
  'Orbital sander',
  'Jigsaw',
  'Pole saw',
  'Cordless drill',
  'Step ladder',
  'Tile cutter',
];

const loans = [
  ['Orbital sander', 'Fri 18 Oct'],
  ['Pole saw', 'Mon 21 Oct'],
  ['Tile cutter', 'Wed 23 Oct'],
] as const;

export const visuallyHiddenExamples = [
  moduleExample({
    title: 'Icon-only controls',
    id: 'visually-hidden-layers',
    markup: `<tp-toggle-group label="Trail map layers" multiple variant="outline" default-value='["campsites"]'>
  ${layer('campsites', 'Campsites')}
  ${layer('routes', 'Trail routes')}
  ${layer('sun', 'Sun exposure')}
</tp-toggle-group>`,
    setup: setupVisuallyHiddenExample,
    source: setupSource,
    call: "setupVisuallyHiddenExample(document.getElementById('visually-hidden-layers'));",
    description:
      'Each Toggle shows only its icon. The hidden text beside the icon is the name that assistive technology announces for the Toggle.',
  }),
  moduleExample({
    title: 'Announce a change',
    id: 'visually-hidden-tools',
    markup: `<tp-input label="Find a tool" placeholder="Saw, drill, ladder…"></tp-input>
<tp-list aria-label="Tools">
${tools.map((tool) => `  <tp-list-item>${tool}</tp-list-item>`).join('\n')}
</tp-list>
<tp-visually-hidden role="status" data-match-count></tp-visually-hidden>`,
    wrapperStyle: 'display:grid;gap:var(--tp-space-3);max-inline-size:22rem',
    setup: setupVisuallyHiddenExample,
    source: setupSource,
    call: "setupVisuallyHiddenExample(document.getElementById('visually-hidden-tools'));",
    description:
      'Sighted users see the list shrink as they type. A hidden status region, present from the start, announces how many tools match.',
  }),
  markupExample(
    'Context for repeated actions',
    `<div style="max-inline-size:30rem"><tp-table label="Your loans">
  <tp-table-header
    ><tp-table-row>
      <tp-table-head scope="col">Tool</tp-table-head>
      <tp-table-head scope="col">Due</tp-table-head>
      <tp-table-head scope="col"><tp-visually-hidden>Actions</tp-visually-hidden></tp-table-head>
    </tp-table-row></tp-table-header
  >
  <tp-table-body
    >${loans
      .map(
        ([tool, due]) => `<tp-table-row>
      <tp-table-head scope="row">${tool}</tp-table-head>
      <tp-table-cell>${due}</tp-table-cell>
      <tp-table-cell><tp-button size="sm" variant="outline">Renew<tp-visually-hidden> ${tool}</tp-visually-hidden></tp-button></tp-table-cell>
    </tp-table-row
    >`,
      )
      .join('')}</tp-table-body
  >
</tp-table></div>`,
    'Every row shows the same Renew button. Hidden text completes each name, such as "Renew Pole saw", and names the actions column without printing a heading over it.',
  ),
];
