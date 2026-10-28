import { markupExample, moduleExample } from './documentation-examples.js';
import { setupCitationExample } from './citation-example.js';
import setupSource from './citation-example.js?raw';

/** A small original site mark as an inline SVG image, so examples never fetch remote icons. */
export const siteMark = (fill: string, letter: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="${fill}"/><text x="8" y="11.5" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="white">${letter}</text></svg>`,
  )}`;

const tides = siteMark('#2563eb', 'T');
const grid = siteMark('#16a34a', 'G');
const coast = siteMark('#d97706', 'C');

const row = (content: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--tp-space-3)">${content}</div>`;

export const citationExamples = [
  markupExample(
    'Inline citations',
    `<p style="max-inline-size:36rem">
  Tidal turbines produce power on a timetable set by the moon
  <tp-citation href="https://tides.example/turbines" src="${tides}">tides.example</tp-citation>,
  so grid operators can plan storage weeks ahead
  <tp-citation href="https://grid.example/storage" src="${grid}">Grid storage notes</tp-citation>.
</p>`,
    'A label names the source and `src` adds its site icon. A site address opens in a new tab; while the citation is hovered or focused, an external-link mark appears over the end of its label without changing its width. Set `target="_self"` to open it in the same tab.',
  ),
  markupExample(
    'Source preview',
    `<p style="max-inline-size:36rem">
  Turbine blades now last about twenty years underwater
  <tp-citation
    href="https://tides.example/turbines"
    src="${tides}"
    source-title="Blade wear in fast tidal streams"
    description="Ten-year inspection results from three test sites, with corrosion and fatigue measurements."
  >tides.example</tp-citation>.
</p>`,
    'A `description`, or content in the `preview` slot, adds a preview card with the site icon, host, title and description. It opens after a short hover or on keyboard focus; the link still opens the site.',
  ),
  markupExample(
    'Numbered references',
    `<article style="display:grid;gap:var(--tp-space-4);max-inline-size:36rem">
  <p style="margin:0">
    Output is predictable<tp-citation source="tidal-1" href="#tidal-1" superscript></tp-citation>
    and storage needs stay small<tp-citation source="tidal-2" href="#tidal-2" superscript></tp-citation>,
    though sites vary with the season<tp-citation source="tidal-3" href="#tidal-3" superscript></tp-citation>.
  </p>
  <tp-citation-list label="Sources">
    <tp-citation id="tidal-1" href="https://tides.example/turbines" src="${tides}" description="Ten-year inspection results from three test sites.">Blade wear in fast tidal streams</tp-citation>
    <tp-citation id="tidal-2" href="https://grid.example/storage" src="${grid}" description="How predictable generation reduces battery sizing.">Grid storage notes</tp-citation>
    <tp-citation id="tidal-3" href="https://coast.example/survey" src="${coast}" description="Seasonal flow records for estuary sites.">Coastal survey 2025</tp-citation>
  </tp-citation-list>
</article>`,
    "For footnote-style references, raise numbered markers with `superscript` and list the sources in a Citation list, which numbers its entries in order. Each marker names its entry with `source`, taking its number, title and preview, and links to it with the entry's fragment: activating a marker moves focus to its entry, and the entry opens the site.",
  ),
  moduleExample({
    title: 'Source marks',
    id: 'citation-marks',
    setup: setupCitationExample,
    source: setupSource,
    call: "setupCitationExample(document.getElementById('citation-marks'));",
    markup:
      row(`<tp-citation href="https://tides.example/turbines" src="${tides}">tides.example</tp-citation>
<tp-citation href="https://coast.example/survey"><tp-icon slot="icon" data-icon="file"></tp-icon>Coastal survey 2025</tp-citation>
<tp-citation href="https://grid.example/storage">Grid storage notes</tp-citation>
<tp-citation>Field interview</tp-citation>`),
    description:
      'The source mark leads the label: a site icon through `src`, or an Icon in the `icon` slot. Without an accepted `href` the citation is plain text, not a link. Long labels end in an ellipsis.',
  }),
  markupExample(
    'Variants',
    row(
      ['outline', 'secondary', 'ghost', 'default']
        .map(
          (variant) =>
            `<tp-citation variant="${variant}" href="https://tides.example/turbines" src="${tides}">${variant}</tp-citation>`,
        )
        .join('\n'),
    ),
    'Citations use the Badge treatments; `outline` is the default.',
  ),
];
