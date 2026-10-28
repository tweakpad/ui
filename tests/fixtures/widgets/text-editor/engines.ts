/**
 * Bootstrap of the engines parity page. Builds the engine modules from the installed engines,
 * passes them to the adapters (imported by their module paths, never through the package entry)
 * and hosts each adapter through the real controller (`harness.ts`). Query parameters:
 * `?level=0|1|2` (ancestor open shadow roots of every host), `?only=<ids>`, `?engine=tiptap|lexical`,
 * `?content=<corpus document>` (the mount content of the non-empty instances, default `state`)
 * and `?baseline` (bare engines with the same content and no adapter).
 * Driven only through the Chrome DevTools MCP (see README.md).
 */
import type { TextEditorEngine } from '../../../../src/foundation/text-editor/engine.js';
import { corpusNodes } from './corpus/nodes.js';
import * as api from './api.js';
import { mountBareLexical, mountBareTiptap } from './baseline.js';
import { loadCorpus, loadFixtureEngines, serializerCounter } from './engine-modules.js';
import {
  createHost,
  editorOf,
  fixture,
  FixtureEditor,
  summarize,
  type EngineName,
  type Level,
  type Variant,
} from './harness.js';
import * as parityHelpers from './parity.js';

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
.slot[hidden] { display: none; }
.slot-label { margin: 0; display: flex; gap: 8px; font-size: var(--tp-text-sm); color: var(--tp-muted-foreground); }
.slot-label output { font-weight: 600; }
`;

const params = new URLSearchParams(location.search);
const level = (
  Number(params.get('level')) === 1 ? 1 : Number(params.get('level')) === 2 ? 2 : 0
) as Level;
const only = new Set(
  (params.get('only') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
const engineFilter = params.get('engine');
const baselineWanted = params.has('baseline');

// An adopted document sheet, so that the page holds no `style` element.
const pageSheet = new CSSStyleSheet();
pageSheet.replaceSync(PAGE_CSS);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];
fixture.level = level;

// Corpus ------------------------------------------------------------------------------------

loadCorpus();
const contentName = fixture.corpus.has(params.get('content') ?? '')
  ? params.get('content')!
  : 'state';

// Engine modules, with counters on the engines' own serializers -------------------------------

const serializers = serializerCounter();
const wanted = (engine: EngineName) => !engineFilter || engineFilter === engine;
const fixtureEngines = await loadFixtureEngines({ wanted, spy: serializers.spy });

const engines: Record<
  EngineName,
  { full: TextEditorEngine | null; reduced: TextEditorEngine | null }
> = {
  tiptap: wanted('tiptap')
    ? {
        full: fixtureEngines.createEngine('tiptap', 'full'),
        reduced: fixtureEngines.createEngine('tiptap', 'reduced'),
      }
    : { full: null, reduced: null },
  lexical: wanted('lexical')
    ? {
        full: fixtureEngines.createEngine('lexical', 'full'),
        reduced: fixtureEngines.createEngine('lexical', 'reduced'),
      }
    : { full: null, reduced: null },
};

// Instances ---------------------------------------------------------------------------------

interface VariantSpec {
  readonly variant: Variant;
  readonly title: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly reduced?: boolean;
  readonly custom?: boolean;
  readonly empty?: boolean;
}

const VARIANTS: readonly VariantSpec[] = [
  { variant: 'default', title: 'Default', label: 'Field notes' },
  { variant: 'empty', title: 'Empty', label: 'Empty notes', placeholder: 'Write…', empty: true },
  { variant: 'readonly', title: 'Read-only', label: 'Read-only notes', readOnly: true },
  { variant: 'disabled', title: 'Disabled', label: 'Disabled notes', disabled: true },
  {
    variant: 'reduced',
    title: 'Without table modules',
    label: 'Notes without tables',
    reduced: true,
  },
  { variant: 'custom', title: 'Custom nodes', label: 'Notes with custom nodes', custom: true },
];
const ENGINES: readonly EngineName[] = ['tiptap', 'lexical'];

const instances = document.getElementById('instances')!;
const meta = document.getElementById('meta')!;
const summary = document.getElementById('summary')!;

function slot(parent: HTMLElement, id: string): { slot: HTMLElement; status: HTMLElement } {
  const element = document.createElement('div');
  element.className = 'slot';
  element.dataset['instance'] = id;
  const label = document.createElement('p');
  label.className = 'slot-label';
  label.dataset['fixtureChrome'] = '';
  const name = document.createElement('span');
  name.textContent = id;
  const status = document.createElement('output');
  status.textContent = 'idle';
  label.append(name, status);
  element.append(label);
  parent.append(element);
  return { slot: element, status };
}

for (const spec of VARIANTS) {
  const ids = ENGINES.map((engine) => `${engine}-${spec.variant}`).filter(
    (id, index) => wanted(ENGINES[index]!) && (only.size === 0 || only.has(id)),
  );
  if (ids.length === 0) continue;
  const section = document.createElement('section');
  section.className = 'variant';
  section.dataset['variant'] = spec.variant;
  const heading = document.createElement('h2');
  heading.textContent = spec.title;
  const pair = document.createElement('div');
  pair.className = 'pair';
  section.append(heading, pair);
  instances.append(section);
  for (const engine of ENGINES) {
    const id = `${engine}-${spec.variant}`;
    if (!ids.includes(id)) continue;
    const { slot: parent, status } = slot(pair, id);
    const content = spec.empty
      ? null
      : spec.custom && !params.has('content')
        ? '05-custom'
        : contentName;
    const instance = new FixtureEditor({
      id,
      engineName: engine,
      variant: spec.variant,
      engine: spec.reduced ? engines[engine].reduced : engines[engine].full,
      parent,
      level,
      label: spec.label,
      placeholder: spec.placeholder,
      readOnly: spec.readOnly,
      disabled: spec.disabled,
      nodes: spec.custom ? corpusNodes : [],
      content: content ? { content: fixture.corpus.get(content)!.html, format: 'html' } : null,
      status,
    });
    fixture.editors.set(id, instance);
  }
}

// Baseline: bare engines, the same content, no adapter (V-588) -------------------------------

const baseline: Record<string, { readonly native: unknown; readonly root: HTMLElement }> = {};

if (baselineWanted) {
  const section = document.createElement('section');
  section.className = 'variant';
  section.dataset['variant'] = 'baseline';
  const heading = document.createElement('h2');
  heading.textContent = 'Bare engines (no adapter)';
  const pair = document.createElement('div');
  pair.className = 'pair';
  section.append(heading, pair);
  instances.append(section);
  const html = fixture.corpus.get(contentName)!.html;
  if (wanted('tiptap')) {
    const { slot: parent, status } = slot(pair, 'tiptap-baseline');
    const { TIPTAP_BASE_CSS } =
      await import('../../../../src/foundation/text-editor/adapters/tiptap/css.js');
    const bare = mountBareTiptap(
      createHost(parent, 'tiptap-baseline', level),
      html,
      TIPTAP_BASE_CSS,
    );
    baseline['tiptap-baseline'] = { native: bare.native, root: bare.root };
    status.textContent = 'ready';
  }
  if (wanted('lexical')) {
    const { slot: parent, status } = slot(pair, 'lexical-baseline');
    const bare = mountBareLexical(createHost(parent, 'lexical-baseline', level), html);
    baseline['lexical-baseline'] = { native: bare.native, root: bare.root };
    status.textContent = 'ready';
  }
}

// Page API ----------------------------------------------------------------------------------

api.captureBaseline();

const textEditorAPI = {
  ...api,
  ...parityHelpers,
  level,
  factories: fixtureEngines.factories,
  modules: fixtureEngines.modules,
  /** How often the engines' own serializers ran through the modules the adapters received. */
  serializers: () => serializers.counts(),
  loadErrors: () => summarize(fixtureEngines.loadErrors),
  baseline: (id: string) => baseline[id] ?? null,
  /** The relative image source beside the page, for content with an image and no remote load. */
  fixtureImage: 'pantry-shelf.svg',
};
(window as unknown as { textEditorAPI: typeof textEditorAPI }).textEditorAPI = textEditorAPI;

meta.textContent = `level ${level}; content ${contentName}${engineFilter ? `; engine ${engineFilter}` : ''}${only.size > 0 ? `; only ${[...only].join(', ')}` : ''}${baselineWanted ? '; baseline' : ''}`;

const READY_TIMEOUT = 10_000;
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
const count = Object.keys(statuses).length;
summary.textContent =
  failed.length > 0
    ? `Not ready: ${failed.map(([id, status]) => `${id} (${status})`).join(', ')}.`
    : count === 0
      ? 'No instance matches the query.'
      : count === 1
        ? 'The instance is ready.'
        : `All ${count} instances ready.`;
if (failed.length === 0) document.documentElement.dataset['fixtureReady'] = '';
else document.documentElement.dataset['fixtureError'] = failed.map(([id]) => id).join(' ');
