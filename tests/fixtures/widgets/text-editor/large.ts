/**
 * Bootstrap of the large-document page `large.html` (C-449, C-450): one generated document of
 * `?blocks=` top-level blocks (default 2,000) in a paired `tp-text-editor` instance per engine and,
 * unless `?nobaseline`, in each bare engine with no adapter, every editor in a bounded scrolling
 * box. The performance probes of `perf.ts` measure typing, pointer moves, layout passes and
 * overlay mutations; `mountTimes()` and `measureMounts()` compare mounts with the bare engines.
 * Query parameters: `?blocks=<n>`, `?engine=tiptap|lexical`, `?nobaseline`. Driven only through
 * the Chrome DevTools MCP (see README.md).
 */
import '../../../../src/register.js';
import '../../../../src/register/widgets.js';
import type { TextEditorEngine } from '../../../../src/foundation/text-editor/engine.js';
import * as api from './api.js';
import { mountBareLexical, mountBareTiptap, type BareEngine } from './baseline.js';
import * as elementHelpers from './element-editor.js';
import {
  bindElementFixturePage,
  ElementFixtureEditor,
  elementEditorOf,
  installElementFixture,
} from './element-editor.js';
import { loadFixtureEngines } from './engine-modules.js';
import {
  check,
  createHost,
  editorOf,
  fixture,
  report,
  summarize,
  type EngineName,
  type HostParts,
  type Report,
} from './harness.js';
import * as perf from './perf.js';

// Page --------------------------------------------------------------------------------------

const PAGE_CSS = `
body { margin: 0; background: var(--tp-background); color: var(--tp-foreground); font-family: var(--tp-font-sans); }
main { box-sizing: border-box; max-width: 1240px; margin: 0 auto; padding: 24px 16px; display: grid; gap: 20px; }
h1 { margin: 0; font-size: var(--tp-text-xl); }
main > button { justify-self: start; }
.meta { margin: 0; color: var(--tp-muted-foreground); font-size: var(--tp-text-sm); }
.variant { display: grid; gap: 8px; }
.variant h2 { margin: 0; font-size: var(--tp-text-base); }
.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.slot { min-inline-size: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; align-content: start; }
.slot-label { margin: 0; display: flex; gap: 8px; font-size: var(--tp-text-sm); color: var(--tp-muted-foreground); }
.slot-label output { font-weight: 600; }
.bounded { block-size: 600px; }
.editor-host.bounded { display: block; overflow: auto; }
`;

const params = new URLSearchParams(location.search);
const requested = Number.parseInt(params.get('blocks') ?? '', 10);
const BLOCKS = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 5000) : 2000;
const engineFilter = params.get('engine');
const baselineWanted = !params.has('nobaseline');
const ENGINES: readonly EngineName[] = ['tiptap', 'lexical'];
const wanted = (engine: EngineName) => !engineFilter || engineFilter === engine;

const pageSheet = new CSSStyleSheet();
pageSheet.replaceSync(PAGE_CSS);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];
fixture.level = 0;
installElementFixture();

// The generated document ----------------------------------------------------------------------

const STOPS = ['north quay', 'island pier', 'lighthouse steps', 'river mouth', 'salt flats'];
const time = (index: number): string =>
  `${String(6 + (index % 14)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`;

/**
 * A ferry log of `blocks` top-level blocks: a heading every 25 blocks and, between them,
 * paragraphs with marks and links, three-item lists, quotes, code blocks, dividers and 3×3
 * tables at fixed intervals, the same for every load.
 */
export function generateDocument(blocks: number): string {
  const parts: string[] = [];
  for (let index = 0; index < blocks; index++) {
    const n = index + 1;
    const stop = STOPS[index % STOPS.length]!;
    if (index % 25 === 0) parts.push(`<h2>Week ${index / 25 + 1} crossings</h2>`);
    else if (index % 100 === 13)
      parts.push(
        '<table><tbody>' +
          `<tr><th><p>Stop</p></th><th><p>Departure</p></th><th><p>Passengers</p></th></tr>` +
          `<tr><td><p>${stop}</p></td><td><p>${time(index)}</p></td><td><p>${n % 41}</p></td></tr>` +
          `<tr><td><p>${STOPS[(index + 1) % STOPS.length]}</p></td><td><p>${time(index + 3)}</p></td><td><p>${n % 29}</p></td></tr>` +
          '</tbody></table>',
      );
    else if (index % 60 === 29) parts.push('<hr>');
    else if (index % 50 === 7)
      parts.push(
        `<ul><li><p>Deck check at ${stop}</p></li><li><p>Ropes coiled and stowed</p></li><li><p>Fuel level logged</p></li></ul>`,
      );
    else if (index % 40 === 19)
      parts.push(`<blockquote><p>The tide turned early near the ${stop}.</p></blockquote>`);
    else if (index % 70 === 41)
      parts.push(`<pre><code>crossing ${n}: ${stop} ${time(index)}</code></pre>`);
    else
      parts.push(
        `<p>Crossing ${n} left the ${stop} at ${time(index)} with <strong>${(n % 37) + 3}</strong> passengers; the swell stayed <em>low</em> and the <a href="https://harbor.example/log/${n}">log entry</a> is filed.</p>`,
      );
  }
  return parts.join('');
}

const html = generateDocument(BLOCKS);

// Instances ---------------------------------------------------------------------------------

const fixtureEngines = await loadFixtureEngines({ wanted });
const instances = document.getElementById('instances')!;
const mount = document.getElementById('mount')!;
const meta = document.getElementById('meta')!;
const summary = document.getElementById('summary')!;

function section(title: string, variant: string): HTMLElement {
  const element = document.createElement('section');
  element.className = 'variant';
  element.dataset['variant'] = variant;
  const heading = document.createElement('h2');
  heading.textContent = title;
  const pair = document.createElement('div');
  pair.className = 'pair';
  element.append(heading, pair);
  instances.append(element);
  return pair;
}

function slot(parent: HTMLElement, name: string): { slot: HTMLElement; status: HTMLElement } {
  const element = document.createElement('div');
  element.className = 'slot';
  element.dataset['instance'] = name;
  const label = document.createElement('p');
  label.className = 'slot-label';
  label.dataset['fixtureChrome'] = '';
  const text = document.createElement('span');
  text.textContent = name;
  const status = document.createElement('output');
  status.textContent = 'idle';
  label.append(text, status);
  element.append(label);
  parent.append(element);
  return { slot: element, status };
}

bindElementFixturePage({
  engines: fixtureEngines,
  elements: {
    notesForm: null,
    notesFieldset: null,
    otherForm: null,
    lateForm: null,
    fieldForms: {},
    fields: {},
    dialogs: {},
    markdownReference: null,
    mount,
  },
});

await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
api.captureBaseline();

/** When each instance was created, for the mount times. */
const created = new Map<string, number>();

const widgetPair = section(`${BLOCKS} blocks`, 'large');
for (const engine of ENGINES.filter(wanted)) {
  const id = `${engine}-large`;
  const target = slot(widgetPair, id);
  const configured: TextEditorEngine | null = fixtureEngines.createEngine(engine, 'full');
  created.set(id, performance.now());
  const editor = new ElementFixtureEditor({
    id,
    variant: 'large',
    engineName: engine,
    engine: configured,
    configured,
    parent: target.slot,
    levels: [],
    defaultValue: html,
    attributes: { label: 'Ferry log', class: 'bounded' },
  });
  fixture.editors.set(id, editor);
  void editor.settled().then((value) => (target.status.textContent = value));
}

const baselines = new Map<string, BareEngine>();

/** Mounts the bare engine of `engine` into `parts`; its CSS module loads only when wanted. */
async function bare(engine: EngineName, parts: HostParts): Promise<BareEngine> {
  if (engine === 'lexical') return mountBareLexical(parts, html);
  const { TIPTAP_BASE_CSS } =
    await import('../../../../src/foundation/text-editor/adapters/tiptap/css.js');
  return mountBareTiptap(parts, html, TIPTAP_BASE_CSS);
}

if (baselineWanted) {
  const pair = section('Bare engines (no adapter)', 'baseline');
  for (const engine of ENGINES.filter(wanted)) {
    const id = `${engine}-baseline`;
    const target = slot(pair, id);
    const parts = createHost(target.slot, id, 0);
    parts.host.classList.add('bounded');
    const engineBaseline = await bare(engine, parts);
    baselines.set(id, engineBaseline);
    perf.registerProbeTarget(id, engineBaseline.root);
    target.status.textContent = 'ready';
  }
}

// Page helpers ------------------------------------------------------------------------------

/** Mount times of the instances at load: the adapter's mount and the element's, in ms. */
function mountTimes() {
  const widgets = Object.fromEntries(
    [...created].map(([id, start]) => {
      const editor = elementEditorOf(id);
      const calls = editor.calls();
      const mountCall = calls['mount']?.[0]?.time;
      const readyCall = calls['ready']?.[0]?.time;
      const readyEvent = editor.events().find((event) => event.type === 'tp-text-editor-ready');
      return [
        id,
        {
          adapter:
            mountCall !== undefined && readyCall !== undefined ? readyCall - mountCall : null,
          element: readyEvent ? readyEvent.time - start : null,
        },
      ];
    }),
  );
  const bareTimes = Object.fromEntries([...baselines].map(([id, value]) => [id, value.mountMs]));
  return { blocks: BLOCKS, widgets, baselines: bareTimes };
}

const median = (values: readonly number[]): number => perf.stats(values).median;

/**
 * Mounts each engine's widget and bare engine `runs` times (default 3) in `#mount` with the
 * page's document and removes them again; the adapter's mount, from its `mount` call to its ready
 * notification, may take at most 15% more than the bare engine's (V-589).
 */
async function measureMounts(options: { readonly runs?: number } = {}): Promise<Report> {
  const runs = options.runs ?? 3;
  const records: Record<string, unknown> = {};
  const checks = [];
  for (const engine of ENGINES.filter(wanted)) {
    const adapter: number[] = [];
    const element: number[] = [];
    const engineTimes: number[] = [];
    for (let run = 0; run < runs; run++) {
      const id = `${engine}-mount-${run}-${Math.round(performance.now())}`;
      const start = performance.now();
      const editor = elementHelpers.create(engine, {
        id,
        defaultValue: html,
        attributes: { label: 'Mount probe', class: 'bounded' },
      });
      await editor.settled();
      const calls = editor.calls();
      const readyEvent = editor.events().find((event) => event.type === 'tp-text-editor-ready');
      adapter.push((calls['ready']?.[0]?.time ?? NaN) - (calls['mount']?.[0]?.time ?? NaN));
      element.push((readyEvent?.time ?? NaN) - start);
      editor.host.remove();
      fixture.editors.delete(id);
      const scratch = document.createElement('div');
      mount.append(scratch);
      const parts = createHost(scratch, `${engine}-mount-baseline-${run}`, 0);
      parts.host.classList.add('bounded');
      const value = await bare(engine, parts);
      engineTimes.push(value.mountMs);
      value.destroy();
      scratch.remove();
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    }
    const ratio = median(adapter) / median(engineTimes);
    records[engine] = {
      adapter: perf.stats(adapter),
      element: perf.stats(element),
      bare: perf.stats(engineTimes),
      ratio: Math.round(ratio * 100) / 100,
    };
    checks.push(check(`${engine}: adapter mount ≤ bare engine + 15%`, ratio <= 1.15, ratio));
  }
  return report(checks, { blocks: BLOCKS, ...records });
}

/** The number of top-level blocks an instance holds. */
function blockCount(id: string): number | null {
  const instance = editorOf(id).instance;
  if (!instance) return null;
  return instance.getBlocks().roots.length;
}

const textEditorAPI = {
  ...api,
  create: elementHelpers.create,
  layoutShifts: elementHelpers.layoutShifts,
  passes: elementHelpers.passes,
  ...perf,
  blocks: BLOCKS,
  generatedHtml: () => html,
  blockCount,
  baseline: (id: string) => {
    const value = baselines.get(id);
    return value ? { native: value.native, root: value.root, mountMs: value.mountMs } : null;
  },
  mountTimes,
  measureMounts,
  factories: fixtureEngines.factories,
  loadErrors: () => summarize(fixtureEngines.loadErrors),
};
(window as unknown as { textEditorAPI: typeof textEditorAPI }).textEditorAPI = textEditorAPI;

meta.textContent = [
  `${BLOCKS} blocks`,
  engineFilter ? `engine ${engineFilter}` : '',
  baselineWanted ? 'baseline' : 'no baseline',
]
  .filter(Boolean)
  .join('; ');

const READY_TIMEOUT = 30_000;
const statuses = await Promise.race([
  api.ready(),
  new Promise<Record<string, string>>((resolve) =>
    setTimeout(
      () =>
        resolve(
          Object.fromEntries([...fixture.editors.keys()].map((id) => [id, editorOf(id).status])),
        ),
      READY_TIMEOUT,
    ),
  ),
]);
const failed = Object.entries(statuses).filter(([, status]) => status !== 'ready');
summary.textContent =
  failed.length > 0
    ? `Not ready: ${failed.map(([id, status]) => `${id} (${status})`).join(', ')}.`
    : `All ${Object.keys(statuses).length} instances settled.`;
if (failed.length === 0) document.documentElement.dataset['fixtureReady'] = '';
else document.documentElement.dataset['fixtureError'] = failed.map(([id]) => id).join(' ');
