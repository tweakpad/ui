import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { MapEngine } from '../foundation/map/engine.js';
import { tokenMapTheme, type MapTheme } from '../foundation/map/theme.js';
import {
  googleMapsEngine,
  lisbonBounds,
  lisbonPlaces,
  openFreeMapEngine,
  setupMapExample,
} from './map-example.js';

/** A custom SVG pin; it inherits the pin's `color`. */
export const pinSvg = `<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true" focusable="false">
        <path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 39 16 39s15-12.1 15-23.2C31 7.6 24.3 1 16 1z" fill="currentColor" stroke="white" stroke-width="2" />
        <circle cx="16" cy="15.5" r="5.5" fill="white" />
      </svg>`;

export interface MapMarkupOptions {
  readonly id: string;
  readonly reveal?: string;
  readonly revealZoom?: number | null;
  readonly fitPadding?: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly interactive?: boolean;
  readonly cooperativeGestures?: boolean;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly style?: string;
  /** Replaces the map's empty/loading/error status (`slot="status"`). */
  readonly status?: string;
}

const pinMarkup = () =>
  lisbonPlaces
    .map(
      (place) => `<tp-map-pin
      value="${place.value}"
      latitude="${place.latitude}"
      longitude="${place.longitude}"
      label="${place.name}"
      style="color: ${place.color}"
    >
      ${pinSvg}
      <tp-map-overlay>
        <span slot="title">${place.name}</span>
        <span slot="description">${place.address}</span>
        <tp-button
          size="sm"
          variant="outline"
          href="https://www.openstreetmap.org/?mlat=${place.latitude}&amp;mlon=${place.longitude}&amp;zoom=17"
          target="_blank"
          >Open in OpenStreetMap</tp-button
        >
      </tp-map-overlay>
    </tp-map-pin>`,
    )
    .join('\n    ');

const listMarkup = (id: string) =>
  `<tp-list-item-group aria-label="Lisbon sights" data-map-list>
    ${lisbonPlaces
      .map(
        (place) => `<tp-list-item value="${place.value}" description="${place.address}">
      ${place.name}
      <tp-button slot="actions" size="sm" variant="ghost" data-show="${place.value}" aria-controls="${id}"
        >Show</tp-button
      >
    </tp-list-item>`,
      )
      .join('\n    ')}
  </tp-list-item-group>`;

/** The canonical composition: map, external zoom/reset controls and a location list. */
export function mapMarkup(options: MapMarkupOptions): string {
  const attributes = [
    `id="${options.id}"`,
    `label="${options.label ?? 'Lisbon sights'}"`,
    `default-bounds="${lisbonBounds}"`,
    `reveal="${options.reveal ?? 'always'}"`,
    options.revealZoom === null ? '' : `reveal-zoom="${options.revealZoom ?? 15}"`,
    options.fitPadding === undefined ? '' : `fit-padding="${options.fitPadding}"`,
    options.minZoom === undefined ? '' : `min-zoom="${options.minZoom}"`,
    options.maxZoom === undefined ? '' : `max-zoom="${options.maxZoom}"`,
    options.interactive === false ? 'interactive="false"' : '',
    options.cooperativeGestures === false ? '' : 'cooperative-gestures',
    options.disabled ? 'disabled' : '',
    options.style ? `style="${options.style}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<section aria-label="Lisbon sights explorer" data-example="map" style="display: grid; gap: var(--tp-space-4); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); align-items: start; max-inline-size: 64rem">
  <div style="display: grid; gap: var(--tp-space-3); grid-column: span 2; min-inline-size: 0">
    <tp-button-group label="Map view">
      <tp-map-control map="${options.id}" action="zoom-in"></tp-map-control>
      <tp-map-control map="${options.id}" action="zoom-out"></tp-map-control>
      <tp-map-control map="${options.id}" action="reset"></tp-map-control>
      <tp-map-control map="${options.id}" action="fit-pins"></tp-map-control>
    </tp-button-group>
    <tp-map ${attributes}>
    ${options.status ? `<p slot="status">${options.status}</p>\n    ` : ''}${pinMarkup()}
    </tp-map>
  </div>
  ${listMarkup(options.id)}
</section>`;
}

/** Renders `markup` and runs the example setup with `engine()` once connected. */
export function renderMapExample(
  markup: string,
  engine: () => MapEngine | null,
  theme: MapTheme | null = null,
) {
  let cleanup: (() => void) | undefined;
  return html`<div
    ${ref((node) => {
      cleanup?.();
      cleanup = undefined;
      if (node)
        queueMicrotask(() => {
          if (!node.isConnected) return;
          const map = (node as HTMLElement).querySelector('tp-map');
          if (map && theme) map.theme = theme;
          const selected = engine();
          cleanup = selected ? setupMapExample(node as HTMLElement, selected) : undefined;
        });
    })}
  >
    ${unsafeHTML(markup)}
  </div>`;
}

const setupScript = (engine: string) => `import * as maplibregl from 'maplibre-gl';
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
import { createMapLibreEngine, createGoogleMapsEngine } from '@tweakpad/ui/map';

const map = document.querySelector('tp-map');
${engine}

// The list's current row follows the map selection; each row's button reveals its pin.
const list = document.querySelector('[data-map-list]');
map.subscribe((state) => state.selectedPin, (selected) => {
  for (const item of list.querySelectorAll('tp-list-item')) item.selected = item.value === selected;
});
list.addEventListener('click', (event) => {
  const value = event.target.closest('[data-show]')?.dataset.show;
  if (!value) return;
  if (map.state.selectedPin === value) map.revealPin(value);
  else map.selectPin(value);
});`;

const copyable = (markup: string, script: string) =>
  `${markup}\n<script type="module">\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\n${script}\n</script>`;

/** Copyable source of the canonical example (MapLibre + OpenFreeMap). */
export const mapDemoSource = () =>
  copyable(
    mapMarkup({ id: 'lisbon-map' }),
    setupScript(
      `// OpenFreeMap vector tiles through MapLibre (no API key).\nmap.engine = createMapLibreEngine(maplibregl, { css: maplibreCss });`,
    ),
  );

/** The same composition on Google Maps. */
export function googleMapsExample(key: string | undefined) {
  const markup = mapMarkup({
    id: 'lisbon-google-map',
    label: 'Lisbon sights (Google Maps)',
    ...(key ? {} : { status: 'Set STORYBOOK_GOOGLE_MAPS_API_KEY to load the Google Maps engine.' }),
  });
  return {
    title: 'Google Maps engine',
    description:
      'The identical composition on the Google Maps engine. Google renders Google basemaps only; OpenFreeMap vector tiles need the MapLibre engine. Set `STORYBOOK_GOOGLE_MAPS_API_KEY` to run it; without a key the map shows its empty status.',
    code: copyable(
      markup,
      setupScript(
        `import { setOptions, importLibrary } from '@googlemaps/js-api-loader';\nsetOptions({ key: 'YOUR_API_KEY' });\nmap.engine = createGoogleMapsEngine(importLibrary);`,
      ),
    ),
    render: () => renderMapExample(markup, () => (key ? googleMapsEngine(key) : null)),
  };
}

/** Basemap colors that follow the library tokens, in a dark scope. */
export const tokenThemeExample = (() => {
  const markup = mapMarkup({
    id: 'lisbon-themed-map',
    label: 'Lisbon sights (token theme)',
    style: 'color-scheme: dark',
  });
  return {
    title: 'Token theme',
    description:
      'The basemap theme roles reference library tokens (`tokenMapTheme`), so the scoped `color-scheme: dark` recolors land, water, parks, roads and labels together with the pins and controls. Any CSS color works per role and per scheme.',
    code: copyable(
      markup,
      setupScript(
        `import { tokenMapTheme } from '@tweakpad/ui/map';\nmap.theme = tokenMapTheme;\nmap.engine = createMapLibreEngine(maplibregl, { css: maplibreCss, style: 'https://tiles.openfreemap.org/styles/positron' });`,
      ),
    ),
    render: () =>
      html`<div
        style="color-scheme: dark; background: var(--tp-background); padding: var(--tp-space-4); border-radius: var(--tp-radius-lg)"
      >
        ${renderMapExample(
          markup,
          () => openFreeMapEngine({ style: 'https://tiles.openfreemap.org/styles/positron' }),
          tokenMapTheme,
        )}
      </div>`,
  };
})();
