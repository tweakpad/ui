import { html, render } from 'lit';
import { live } from 'lit/directives/live.js';
import {
  authoredTokens,
  contrastRatio,
  hex,
  MINIMUM_CONTRAST,
  type Rgba,
} from '../../../../src/docs/token-catalog.js';
import { catalog } from '../../../../src/catalog.js';
import { FLAT_ROLES } from '../../../../src/foundation/appearance.js';
import type { TpValueChangeEvent } from '../../../../src/foundation/events.js';
import { TOKEN_FAMILIES } from '../../../../src/presentation/tokens.js';
import { renderComponentExample } from '../../../../src/stories/examples.js';
import stylesheetSource from '../../../../src/styles.css?raw';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');

type Scheme = 'light' | 'dark';
type Appearance = 'default' | 'flat';
type Values = Partial<Record<Scheme, string>>;
/** Tuned role values, per appearance and per scheme. Unset values keep the library's. */
type Overrides = Record<Appearance, Record<string, Values>>;

const STATUS = ['primary', 'destructive', 'success', 'warning'] as const;
/** The roles the tuner edits, grouped as the token set documents them. */
const GROUPS = [
  {
    title: 'Solid fills',
    note: 'Default and Secondary variants, checked controls, Slider and Progress, Calendar day, highlighted rows (accent).',
    pairs: ['primary', 'secondary', 'accent', 'destructive', 'success', 'warning'].map((role) => ({
      fill: role,
      text: `${role}-foreground`,
    })),
  },
  {
    title: 'Status tints',
    note: 'Status variants of Badge, Button, Bubble and Copy button; Alerts (a lighter tint of the fill); error text and destructive menu commands (the text tone).',
    pairs: STATUS.map((role) => ({
      fill: `${role}-subtle`,
      text: `${role}-subtle-foreground`,
      edge: `${role}-border`,
    })),
  },
  {
    title: 'Surfaces and lines',
    note: 'The page, panels, fields and the lines between them. In flat, edge and input are transparent and fields separate by fill.',
    pairs: [
      { fill: 'background', text: 'foreground' },
      { fill: 'card', text: 'card-foreground' },
      { fill: 'muted', text: 'muted-foreground' },
      { fill: 'control', text: 'foreground' },
      { fill: 'control-strong', text: 'foreground' },
      { fill: 'choice', text: 'choice-foreground' },
      { fill: 'pressed', text: 'pressed-foreground', edge: 'pressed-border' },
    ],
    lines: ['border', 'edge', 'input', 'control-border', 'ring'],
  },
] as const;
const STORAGE_KEY = 'tp-color-roles-tuner-v2';

// Every color role the default set derives from another, re-stated on the preview region so a
// tuned role carries into the roles derived from it there.
const colorRoles = new Set<string>(TOKEN_FAMILIES.color);
const derived = [...authoredTokens(stylesheetSource)].filter(
  ([role, value]) => colorRoles.has(role) && value.includes('var(--tp-'),
);

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const context = canvas.getContext('2d', { willReadFrequently: true })!;
function bytes(color: string): Rgba {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return [red!, green!, blue!, alpha!];
}

function load(): Overrides {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Overrides | null;
    if (saved?.default && saved.flat) return saved;
  } catch {
    // Unreadable storage starts from the library's values.
  }
  return { default: {}, flat: {} };
}
let overrides = load();
let appearance: Appearance = 'default';
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // The tuning still applies to the page without storage.
  }
}

const declaration = (role: string, values: Values) =>
  `  --tp-${role}: light-dark(${values.light}, ${values.dark});`;
const block = (selector: string, lines: readonly string[]) =>
  lines.length ? `${selector} {\n${lines.join('\n')}\n}` : '';
/** The tuning as CSS, for the preview region (`scope`) or for a page (no scope). */
function stylesheet(scope?: string): string {
  const tuned = (mode: Appearance) =>
    Object.entries(overrides[mode]).map(([role, values]) => declaration(role, values));
  if (!scope)
    return [block(':root', tuned('default')), block("[appearance='flat']", tuned('flat'))]
      .filter(Boolean)
      .join('\n\n');
  return [
    block(scope, [
      ...derived.map(([role, value]) => `  --tp-${role}: ${value};`),
      ...tuned('default'),
    ]),
    block(`${scope}[appearance='flat']`, [
      ...FLAT_ROLES.map(([name, value]) => `  ${name}: ${value};`),
      ...tuned('flat'),
    ]),
  ].join('\n\n');
}

const applied = document.head.appendChild(document.createElement('style'));
const app = document.getElementById('app')!;
let surface: HTMLElement | null = null;
let probe: HTMLElement | null = null;

/** A color as the preview resolves it, in its own scheme or the given one. */
function resolve(expression: string, scheme?: Scheme): string {
  if (!probe) return '#000000';
  probe.style.colorScheme = scheme ?? '';
  probe.style.color = expression;
  return hex(bytes(getComputedStyle(probe).color));
}
const role = (name: string, scheme?: Scheme) => resolve(`var(--tp-${name})`, scheme);
/** The scheme the preview resolves to. */
function surfaceScheme(): Scheme {
  if (!probe) return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return resolve('light-dark(#000000, #ffffff)') === '#ffffff' ? 'dark' : 'light';
}

/** Contrast of a color over a surface, where a translucent surface sits on the page background. */
function ratio(text: string, fill: string) {
  const page = bytes(role('background'));
  const top = bytes(fill);
  const alpha = top[3] / 255;
  const surfaceColor: Rgba = [
    top[0] * alpha + page[0] * (1 - alpha),
    top[1] * alpha + page[1] * (1 - alpha),
    top[2] * alpha + page[2] * (1 - alpha),
    255,
  ];
  return contrastRatio(bytes(text), surfaceColor);
}
const contrast = (value: number, minimum = MINIMUM_CONTRAST) =>
  html`<tp-badge variant="outline" title="Contrast against its surface"
    >${value.toFixed(1)} : 1 ${value >= minimum ? 'pass' : 'low'}</tp-badge
  >`;

function edit(name: string, scheme: Scheme, value: string) {
  const values = (overrides[appearance][name] ??= {
    light: role(name, 'light'),
    dark: role(name, 'dark'),
  });
  values[scheme] = value;
  save();
  update();
}

function update() {
  applied.textContent = stylesheet('.surface');
  const scheme = surfaceScheme();
  const color = (name: string) =>
    html`<tp-color-input
      variant="inline"
      size="sm"
      alpha
      label=${name}
      .value=${live(role(name))}
      @tp-value-change=${(event: TpValueChangeEvent<string>) =>
        edit(name, scheme, event.detail.value)}
    ></tp-color-input>`;
  render(
    html`<div class="tuner">
      <aside class="controls" aria-label="Color roles">
        <div class="group">
          <h1>Color roles</h1>
          <p class="note">
            Editing the ${appearance} appearance in the ${scheme} theme. Changes are kept in this
            browser.
          </p>
          <tp-field label="Filter components"
            ><tp-input
              placeholder="Every component"
              .value=${live(query)}
              @tp-value-change=${(event: TpValueChangeEvent<string>) => {
                query = event.detail.value;
                update();
              }}
            ></tp-input
          ></tp-field>
          <div class="actions">
            <tp-theme-switcher
              variant="group"
              storage-key="tp-color-roles-theme"
              .target=${surface}
            ></tp-theme-switcher>
            <tp-toggle-group
              label="Appearance"
              variant="outline"
              .value=${live([appearance])}
              @tp-value-change=${(event: TpValueChangeEvent<string[]>) => {
                const next = event.detail.value[0] as Appearance | undefined;
                if (!next) return;
                appearance = next;
                update();
              }}
            >
              <tp-toggle value="default">Default</tp-toggle>
              <tp-toggle value="flat">Flat</tp-toggle>
            </tp-toggle-group>
          </div>
        </div>
        ${GROUPS.map(
          (group) =>
            html`<div class="group">
              <h2>${group.title}</h2>
              <p class="note">${group.note}</p>
              ${group.pairs.map(
                (pair) => html`
                  ${color(pair.fill)}
                  <div class="pair">
                    ${color(pair.text)} ${contrast(ratio(role(pair.text), role(pair.fill)))}
                  </div>
                  ${'edge' in pair ? color(pair.edge) : ''}
                `,
              )}
              ${
                'lines' in group
                  ? html`${group.lines.map((name) => color(name))}
                      <div class="pair">
                        <span class="note"
                          >Checkbox and radio boundary against the card (3 : 1)</span
                        >
                        ${contrast(ratio(role('control-border'), role('card')), 3)}
                      </div>
                      <div class="pair">
                        <span class="note"
                          >Control fill against the page (3 : 1 for a boundary)</span
                        >
                        ${contrast(ratio(role('control'), role('background')), 3)}
                      </div>`
                  : ''
              }
            </div>`,
        )}
        <div class="group">
          <h2>Result</h2>
          <tp-code-block
            language="css"
            label="color-roles.css"
            .code=${stylesheet() || '/* The library values, unchanged. */'}
          ></tp-code-block>
          <div class="actions">
            <tp-button
              variant="outline"
              size="sm"
              @click=${() => {
                overrides = { default: {}, flat: {} };
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {
                  // Nothing stored.
                }
                update();
              }}
              >Reset to library values</tp-button
            >
          </div>
        </div>
      </aside>
      <main class="surface" appearance=${appearance}>
        <span class="probe" aria-hidden="true"></span>
        <div class="section-list" ?hidden=${query.trim() !== ''}>${usage}${preview}</div>
        <h2 class="part-heading">Every component</h2>
        ${components.map(
          ({ name, example }) =>
            html`<section ?hidden=${!name.toLowerCase().includes(query.trim().toLowerCase())}>
              <h2>${name}</h2>
              <div class="example">${example}</div>
            </section>`,
        )}
      </main>
    </div>`,
    app,
  );
}

// Every library component, through its own documented example, built once so a re-render keeps
// each example's state.
const components = catalog.map(([name, tag]) => ({ name, example: renderComponentExample(tag) }));
let query = '';

const statusVariants = ['default', 'secondary', 'destructive', 'success', 'warning'];
const title = (variant: string) => variant[0]!.toUpperCase() + variant.slice(1);

/**
 * The color-usage board: real components grouped by the global role their paint comes from, each
 * captioned with its source and whether it goes through a shared role or helper or makes its own
 * choice. For reviewing the library's color system visually, one theme at a time.
 */
type Verdict = 'shared' | 'own' | 'literal';
const VERDICT = {
  shared: { variant: 'success', text: 'Shared role' },
  own: { variant: 'warning', text: 'Own choice' },
  literal: { variant: 'destructive', text: 'Own color' },
} as const;
const usageItem = (name: string, source: string, verdict: Verdict, content: unknown) => html`
  <figure class="usage-item">
    <div class="usage-sample">${content}</div>
    <figcaption>
      <strong>${name}</strong>
      <code>${source}</code>
      <tp-badge variant=${VERDICT[verdict].variant}>${VERDICT[verdict].text}</tp-badge>
    </figcaption>
  </figure>
`;
const swatch = (token: string) =>
  html`<span class="usage-swatch" style="background: var(${token})" title=${token}></span>`;
const usageGroup = (heading: string, note: string, items: unknown) => html`
  <section class="usage-group">
    <h2>${heading}</h2>
    <p class="note">${note}</p>
    <div class="usage-grid">${items}</div>
  </section>
`;
const usage = html`
  <h2 class="part-heading">Color usage</h2>
  ${usageGroup(
    'Primary emphasis',
    'The strongest accent: the primary action, and selected, checked or active state. Most components write --tp-primary themselves, so a theme cannot retune "emphasis" in one place.',
    html`
      ${usageItem(
        'Button default',
        'primary-subtle-foreground / primary-subtle (inverted)',
        'shared',
        html`<tp-button>Save station</tp-button>`,
      )}
      ${usageItem(
        'Calendar selected day',
        '--tp-primary + --tp-primary-foreground',
        'own',
        html`<tp-calendar
          label="Survey day"
          today="2026-11-02"
          default-value="2026-11-05"
        ></tp-calendar>`,
      )}
      ${usageItem(
        'Checkbox checked',
        '--tp-primary + --tp-primary-foreground',
        'own',
        html`<tp-checkbox default-checked>Notify crew</tp-checkbox>`,
      )}
      ${usageItem(
        'Radio selected',
        '--tp-choice / --tp-choice-foreground',
        'shared',
        html`<tp-radio-group default-value="hourly" label="Interval">
          <tp-radio-group-item value="hourly">Hourly</tp-radio-group-item>
          <tp-radio-group-item value="daily">Daily</tp-radio-group-item>
        </tp-radio-group>`,
      )}
      ${usageItem(
        'Switch on',
        '--tp-primary fill, light-dark(background, primary-foreground) thumb',
        'own',
        html`<tp-switch default-checked>Live readings</tp-switch>`,
      )}
      ${usageItem(
        'Toggle pressed',
        '--tp-pressed / --tp-pressed-foreground',
        'shared',
        html`<tp-toggle-group label="Range" variant="outline" default-value='["week"]'>
          <tp-toggle value="day">Day</tp-toggle>
          <tp-toggle value="week">Week</tp-toggle>
        </tp-toggle-group>`,
      )}
      ${usageItem(
        'Slider range',
        '--tp-primary',
        'own',
        html`<tp-slider label="Sample depth" default-value="40"></tp-slider>`,
      )}
      ${usageItem(
        'Progress',
        '--tp-primary',
        'own',
        html`<tp-progress
          value="56"
          label="Uploading readings"
          style="inline-size: 12rem"
        ></tp-progress>`,
      )}
      ${usageItem(
        'Avatar badge',
        '--tp-primary + --tp-primary-foreground',
        'own',
        html`<tp-avatar fallback="MC" alt="Maya Chen"
          ><span slot="badge" role="img" aria-label="Online"></span
        ></tp-avatar>`,
      )}
      ${usageItem(
        'Status dot default',
        '--tp-primary (own variant map)',
        'own',
        html`<tp-status-dot label="Running" show-label></tp-status-dot>`,
      )}
    `,
  )}
  ${usageGroup(
    'Role tints',
    'A role over the background: <role>-subtle fill, -subtle-foreground text, -border edge. The same three tokens are composed by hand in several places.',
    html`
      ${usageItem(
        'Badge variants',
        'variantPresentation (shared)',
        'shared',
        html`<div class="row">
          ${statusVariants.map(
            (variant) => html`<tp-badge variant=${variant}>${title(variant)}</tp-badge>`,
          )}
        </div>`,
      )}
      ${usageItem(
        'Alert severities',
        'calloutTint: the same triple written again',
        'own',
        html`<div class="stack">
          <tp-alert title="Survey window opens Monday">Crews can book boats.</tp-alert>
          <tp-alert severity="danger" title="Sensor offline">Station 3 stopped.</tp-alert>
        </div>`,
      )}
      ${usageItem(
        'Attachment error',
        'destructive-subtle + -subtle-foreground, no edge (inline)',
        'own',
        html`<tp-attachment
          filename="readings-0412.raw"
          status="error"
          error-message="This format isn't supported."
        ></tp-attachment>`,
      )}
      ${usageItem(
        'File upload invalid',
        '--tp-destructive edge + destructive-subtle (inline)',
        'own',
        html`<tp-file-upload name="usage-upload" invalid></tp-file-upload>`,
      )}
    `,
  )}
  ${usageGroup(
    'Highlight and neutral',
    'Row highlight (accent) and the quiet muted pair. A shared rowHighlight and the subdued variant exist; most rows and chips inline the tokens instead.',
    html`
      ${usageItem(
        'List item selected',
        '--tp-accent / --tp-accent-foreground (inline)',
        'own',
        html`<tp-list aria-label="Stations">
          <tp-list-item selected>North buoy</tp-list-item>
          <tp-list-item>Station 7</tp-list-item>
        </tp-list>`,
      )}
      ${usageItem(
        'Bubble subdued',
        'variantPresentation subdued (shared)',
        'shared',
        html`<tp-bubble variant="subdued">The north buoy reported at 06:40.</tp-bubble>`,
      )}
      ${usageItem(
        'Kbd',
        '--tp-muted + own text color (inline)',
        'own',
        html`<tp-kbd-group separator="none"
          ><tp-kbd value="mod"></tp-kbd><tp-kbd value="K"></tp-kbd
        ></tp-kbd-group>`,
      )}
      ${usageItem(
        'Avatar fallback',
        '--tp-muted + --tp-muted-foreground (inline)',
        'own',
        html`<tp-avatar fallback="DK" alt="Daniel Kim"></tp-avatar>`,
      )}
    `,
  )}
  ${usageGroup(
    'Categorical palette',
    'Two palettes: chart-1..5 are fixed hex values that do not follow the color scheme (Plot, Data visualization, Flow tones, glow borders); content-* are nine scheme-aware hues used only by the text editor.',
    html`
      ${usageItem(
        'Chart (5, fixed)',
        '--tp-chart-1 … --tp-chart-5',
        'literal',
        html`<div class="row">
          ${[1, 2, 3, 4, 5].map((index) => swatch(`--tp-chart-${index}`))}
        </div>`,
      )}
      ${usageItem(
        'Content hues (9, scheme-aware)',
        '--tp-content-gray … --tp-content-red',
        'shared',
        html`<div class="row">
          ${['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'].map(
            (hue) => swatch(`--tp-content-${hue}`),
          )}
        </div>`,
      )}
      ${usageItem(
        'Marker tones',
        'own tone → role map',
        'own',
        html`<div class="stack">
          <tp-marker tone="accent">Review requested from Priya</tp-marker>
          <tp-marker tone="success">All checks passed</tp-marker>
          <tp-marker tone="danger">Deploy failed</tp-marker>
        </div>`,
      )}
    `,
  )}
  ${usageGroup(
    'Own colors',
    'Literal colors or scheme swaps written in a component instead of a role.',
    html`
      ${usageItem(
        'Glow border',
        'chart-2/1/5 + light-dark(transparent, #fff) core',
        'literal',
        html`<tp-mo-glow-border style="inline-size: 16rem"
          ><tp-card size="sm"><span slot="header">North buoy</span></tp-card></tp-mo-glow-border
        >`,
      )}
      ${usageItem(
        'Card shadow',
        'rgb(0 0 0 / 16–20%) (fixed black)',
        'literal',
        html`<tp-card size="sm" style="box-shadow: var(--tp-shadow-md)"
          ><span slot="header">Raised card</span></tp-card
        >`,
      )}
    `,
  )}
`;
const preview = html`
  <section>
    <h2>Badge</h2>
    <div class="row">
      ${[...statusVariants, 'outline', 'ghost', 'link'].map(
        (variant) => html`<tp-badge variant=${variant}>${title(variant)}</tp-badge>`,
      )}
    </div>
  </section>
  <section>
    <h2>Button</h2>
    <div class="row">
      ${['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'].map(
        (variant) => html`<tp-button variant=${variant}>${title(variant)}</tp-button>`,
      )}
      <tp-button disabled>Disabled</tp-button>
    </div>
    <div class="row">
      ${['default', 'secondary', 'destructive', 'outline', 'ghost'].map(
        (variant) =>
          html`<tp-copy-button
            variant=${variant}
            show-label
            value="TIDE-204"
            label="Copy ${variant} ID"
          ></tp-copy-button>`,
      )}
    </div>
    <div class="row">
      <tp-toggle-group label="Chart range" variant="outline" default-value='["week"]'>
        <tp-toggle value="day">Day</tp-toggle>
        <tp-toggle value="week">Week</tp-toggle>
        <tp-toggle value="month">Month</tp-toggle>
      </tp-toggle-group>
      <tp-menu label="Station actions" .portal=${false}>
        <tp-button slot="trigger" variant="outline">Station actions</tp-button>
        <tp-menu-item value="calibrate">Calibrate</tp-menu-item>
        <tp-menu-item value="export">Export readings</tp-menu-item>
        <tp-menu-item value="retire" variant="destructive">Retire station</tp-menu-item>
      </tp-menu>
    </div>
  </section>
  <section>
    <h2>Alert</h2>
    <div class="stack">
      <tp-alert title="Survey window opens Monday">Crews can book boats from Friday.</tp-alert>
      <tp-alert severity="success" title="Readings uploaded">All 14 stations reported.</tp-alert>
      <tp-alert severity="warning" title="Battery low">Station 7 has two days left.</tp-alert>
      <tp-alert severity="danger" title="Sensor offline">Station 3 stopped at 04:12.</tp-alert>
    </div>
  </section>
  <section>
    <h2>Card and fields</h2>
    <tp-card class="stack">
      <span slot="header">North buoy</span>
      <span slot="description">Calibration for the next survey.</span>
      <tp-field label="Station name"><tp-input default-value="North buoy"></tp-input></tp-field>
      <tp-field label="Notes"
        ><tp-text-area placeholder="Anything the crew should know"></tp-text-area
      ></tp-field>
      <tp-field label="Region">
        <tp-native-select default-value="north">
          <option value="north">North bay</option>
          <option value="south">South bay</option>
        </tp-native-select>
      </tp-field>
      <tp-field label="Station code" error="Use four letters, such as TIDE.">
        <tp-input invalid default-value="TD1"></tp-input>
      </tp-field>
      <div class="row">
        <tp-checkbox default-checked>Notify crew</tp-checkbox>
        <tp-checkbox>Archive readings</tp-checkbox>
        <tp-switch default-checked>Live readings</tp-switch>
        <tp-switch>Night mode</tp-switch>
      </div>
      <tp-radio-group default-value="hourly" label="Interval">
        <tp-radio-group-item value="hourly">Hourly</tp-radio-group-item>
        <tp-radio-group-item value="daily">Daily</tp-radio-group-item>
      </tp-radio-group>
      <tp-slider label="Sample depth" default-value="40"></tp-slider>
      <tp-progress value="56" label="Uploading readings"></tp-progress>
      <div slot="footer" class="row">
        <tp-button variant="outline">Cancel</tp-button>
        <tp-button>Save station</tp-button>
      </div>
    </tp-card>
  </section>
  <section>
    <h2>Tabs and table</h2>
    <tp-tabs default-value="readings" label="Station">
      <button slot="tab" value="readings">Readings</button>
      <button slot="tab" value="crew">Crew</button>
      <section slot="panel" value="readings">
        <tp-table label="Latest readings">
          <tp-table-header>
            <tp-table-row>
              <tp-table-head>Station</tp-table-head>
              <tp-table-head>State</tp-table-head>
              <tp-table-head style="text-align:end">Depth</tp-table-head>
            </tp-table-row>
          </tp-table-header>
          <tp-table-body>
            <tp-table-row>
              <tp-table-head scope="row">North buoy</tp-table-head>
              <tp-table-cell><tp-badge variant="success">Live</tp-badge></tp-table-cell>
              <tp-table-cell style="text-align:end">12.4 m</tp-table-cell>
            </tp-table-row>
            <tp-table-row>
              <tp-table-head scope="row">Station 7</tp-table-head>
              <tp-table-cell><tp-badge variant="warning">Limited</tp-badge></tp-table-cell>
              <tp-table-cell style="text-align:end">8.1 m</tp-table-cell>
            </tp-table-row>
            <tp-table-row>
              <tp-table-head scope="row">Station 3</tp-table-head>
              <tp-table-cell><tp-badge variant="destructive">Offline</tp-badge></tp-table-cell>
              <tp-table-cell style="text-align:end">—</tp-table-cell>
            </tp-table-row>
          </tp-table-body>
        </tp-table>
      </section>
      <section slot="panel" value="crew">Three crews this week.</section>
    </tp-tabs>
  </section>
  <section>
    <h2>Bubble and status</h2>
    <div class="stack">
      ${['default', 'secondary', 'destructive', 'tinted', 'subdued', 'outline'].map(
        (variant, index) =>
          html`<tp-bubble variant=${variant} align=${index % 2 ? 'end' : 'start'}
            >${title(variant)}: the north buoy reported at 06:40.</tp-bubble
          >`,
      )}
    </div>
    <div class="row">
      ${statusVariants.map(
        (variant) =>
          html`<tp-status-dot
            variant=${variant}
            label=${title(variant)}
            show-label
          ></tp-status-dot>`,
      )}
    </div>
    <tp-attachment
      filename="readings-0412.raw"
      status="error"
      error-message="This format isn't supported. Export as CSV and try again."
      removable
    ></tp-attachment>
    <tp-calendar label="Survey day" today="2026-11-02" default-value="2026-11-05"></tp-calendar>
  </section>
`;

update();
surface = app.querySelector<HTMLElement>('.surface');
probe = app.querySelector<HTMLElement>('.probe');
update();
// The theme switcher writes the preview's color scheme; edits follow the scheme it shows.
new MutationObserver(() => update()).observe(surface!, {
  attributes: true,
  attributeFilter: ['data-theme', 'style'],
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => update());

/**
 * Marks that keep their edge in every appearance: value paint (swatches, handles, plot dots) and
 * the cursor label. State marks (checked, selected) and explicit outline variants are told apart
 * by their state or host instead.
 */
const keptMarks =
  /(?:^|\s)(?:slider-thumb|color-input-chip|color-picker-[\w-]*(?:swatch|preview|thumb|handle|marker)[\w-]*|timeline-item-dot|content)(?:\s|$)/u;

/**
 * Every visible four-sided edge in the preview that the flat appearance should have removed:
 * walked through shadow roots, skipping edges painted in their own fill color, explicit outline
 * variants, checked or selected marks, and the marks above. Empty when flat reaches everything.
 */
function flatEdges(): string[] {
  const found = new Set<string>();
  const visible = (color: string) => !/rgba\(0, 0, 0, 0\)|transparent|\/ 0\)$/u.test(color);
  const visit = (root: ParentNode, section: string) => {
    for (const element of root.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(
        (side) =>
          parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
          style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== 'none' &&
          visible(style.getPropertyValue(`border-${side.toLowerCase()}-color`)),
      );
      const host = (element.getRootNode() as ShadowRoot).host as Element | undefined;
      const part = element.getAttribute('part') ?? '';
      const kept =
        style.borderTopColor === style.backgroundColor ||
        host?.getAttribute('variant') === 'outline' ||
        element.closest('[data-checked], [data-selected], [data-pressed]') !== null ||
        element.matches('[aria-invalid="true"], [data-invalid]') ||
        keptMarks.test(part);
      if (sides.length === 4 && box.width > 6 && box.height > 6 && !kept)
        found.add(
          `${section}: ${element.localName}[${part || element.className}] ${style.borderTopColor}`,
        );
      if (element.shadowRoot) visit(element.shadowRoot, section);
    }
  };
  for (const section of surface?.querySelectorAll<HTMLElement>(
    ':scope > section, .section-list > section',
  ) ?? [])
    visit(section, section.querySelector('h2')?.textContent ?? '');
  return [...found];
}

Object.assign(window, {
  colorRolesAPI: {
    flatEdges,
    overrides: () => overrides,
    appearance: () => appearance,
    scheme: surfaceScheme,
    role,
    ratio,
    css: () => stylesheet(),
    update,
  },
});
document.documentElement.dataset.fixtureReady = 'true';
