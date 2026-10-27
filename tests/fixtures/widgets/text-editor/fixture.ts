/**
 * Bootstrap of the widget page `index.html`: paired `tp-text-editor` instances of both engines,
 * each wrapped by the element-backed fixture editor (`element-editor.ts`). Query parameters:
 * `?level=0|1|2`, `?only=<variants or ids>`, `?engine=tiptap|lexical`, `?content=<document>` and
 * `?defer`, `?ledger` (the resource ledger installed before the first instance) and `?built` (the
 * library from `dist/`: its stylesheet, `register.js`, `register/widgets.js` and adapters); they
 * combine.
 * Driven only through the Chrome DevTools MCP (see README.md).
 */
import type { TextEditorEngine } from '../../../../src/foundation/text-editor/engine.js';
import { serializeHtml } from '../../../../src/foundation/text-editor/content/html.js';
import { readMarkdown } from '../../../../src/foundation/text-editor/content/markdown.js';
import { writeText } from '../../../../src/foundation/text-editor/content/text.js';
import * as api from './api.js';
import type { TextEditorInlineDefinition } from '../../../../src/foundation/text-editor/nodes.js';
import { corpusNodes, mention } from './corpus/nodes.js';
import * as elementHelpers from './element-editor.js';
import {
  bindElementFixturePage,
  ElementFixtureEditor,
  installElementFixture,
  uploadHook,
  type ElementFixtureEditorOptions,
  type ElementVariant,
} from './element-editor.js';
import {
  loadCorpus,
  loadFixtureEngines,
  serializerCounter,
  type EngineVariant,
} from './engine-modules.js';
import {
  check,
  editorOf,
  fixture,
  nestInLevels,
  report,
  summarize,
  type Check,
  type EngineName,
  type Level,
  type Report,
} from './harness.js';
import * as parityHelpers from './parity.js';
import {
  assertCleanup as ledgerCleanup,
  installLedger,
  ledgerCounts,
  ledgerEntries,
  ledgerMark,
  type CleanupOptions,
} from './ledger.js';
import * as perf from './perf.js';

// Library ------------------------------------------------------------------------------------

/** `?built`: the page runs the built library (`npm run build`) instead of the sources. */
const built = new URLSearchParams(location.search).has('built');
for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
  if (built && link.getAttribute('href') === '/src/styles.css') link.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');
/** The feature factories, from the graph the page runs the widget from. */
const featureModule = (await import(
  /* @vite-ignore */ built ? '/dist/widgets.js' : '/src/widgets/text-editor/features/index.ts'
)) as typeof import('../../../../src/widgets/text-editor/features/index.js');
/** Every feature, with an upload hook for the images feature when given. */
function allFeatures(upload?: ReturnType<typeof uploadHook>) {
  return [
    featureModule.textEditorBlocks(),
    featureModule.textEditorTables(),
    featureModule.textEditorImages(upload ? { upload } : {}),
    featureModule.textEditorLinks(),
    featureModule.textEditorSelectionToolbar(),
    featureModule.textEditorSuggestions(),
  ];
}

// Page --------------------------------------------------------------------------------------

const PAGE_CSS = `
body { margin: 0; background: var(--tp-background); color: var(--tp-foreground); font-family: var(--tp-font-sans); }
main { box-sizing: border-box; max-width: 1240px; margin: 0 auto; padding: 24px 16px; display: grid; gap: 20px; }
h1 { margin: 0; font-size: var(--tp-text-xl); }
main > button { justify-self: start; }
#drop-source { justify-self: start; margin: 0; padding: 6px 10px; border: 1px dashed var(--tp-border); border-radius: var(--tp-radius-md); cursor: grab; font-size: var(--tp-text-sm); }
.meta { margin: 0; color: var(--tp-muted-foreground); font-size: var(--tp-text-sm); }
.variant { display: grid; gap: 8px; }
.variant h2 { margin: 0; font-size: var(--tp-text-base); }
.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.slot { min-inline-size: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; align-content: start; }
.slot.narrow { inline-size: 320px; }
.slot-label { margin: 0; display: flex; gap: 8px; font-size: var(--tp-text-sm); color: var(--tp-muted-foreground); }
.slot-label output { font-weight: 600; }
[hidden] { display: none; }
`;

/** The block size of the `-long` hosts: their content is taller, so the viewport scrolls. */
const BOUNDED_STYLE = 'block-size: 260px';
const FORM_STYLE = 'display: grid; gap: 8px; margin: 0';
const FIELDSET_STYLE =
  'display: grid; gap: 8px; margin: 0; border: 0; padding: 0; min-inline-size: 0';

const params = new URLSearchParams(location.search);
const level = (
  Number(params.get('level')) === 1 ? 1 : Number(params.get('level')) === 2 ? 2 : 0
) as Level;
const only = new Set(
  (params.get('only') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);
const engineFilter = params.get('engine');
const deferred = params.has('defer');
if (params.has('ledger')) installLedger();
const ENGINES: readonly EngineName[] = ['tiptap', 'lexical'];
const wanted = (engine: EngineName) => !engineFilter || engineFilter === engine;

const pageSheet = new CSSStyleSheet();
pageSheet.replaceSync(PAGE_CSS);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];
fixture.level = level;

installElementFixture();

// Documents -----------------------------------------------------------------------------------

const FIELD_NOTES = `# Greenhouse log

Morning check on the **seed trays**: the basil sprouted overnight, see the [planting calendar](https://example.com/calendar).

Watering times follow the [shared schedule](https://example.com/schedule).

## Afternoon

The roof vent opened at noon and the air stayed warm and still.

---

Plans for the rest of the week:

- **Thin the trays:** keep the strongest seedling in each cell.
- **Label the rows:** mark the three new pepper varieties.
- **Check the drip line:** clear any clogged emitter.

\`\`\`
water 06:30 and 18:30
\`\`\`
`;

loadCorpus();
function addDocument(name: string, markdown: string): void {
  const { document } = readMarkdown(markdown);
  fixture.corpus.set(name, {
    name,
    html: serializeHtml(document),
    markdown,
    text: writeText(document),
    custom: false,
  });
}
addDocument('field-notes', FIELD_NOTES);
addDocument('long-notes', Array.from({ length: 4 }, () => FIELD_NOTES).join('\n'));
addDocument('auto-notes', Array.from({ length: 8 }, () => FIELD_NOTES).join('\n'));
const contentName = fixture.corpus.has(params.get('content') ?? '')
  ? params.get('content')!
  : 'field-notes';
const html = (name: string) => fixture.corpus.get(name)!.html;

// Engines -----------------------------------------------------------------------------------

const serializers = serializerCounter();
const fixtureEngines = await loadFixtureEngines({ wanted, spy: serializers.spy });
const engineCache = new Map<string, TextEditorEngine | null>();
function engineOf(name: EngineName, variant: EngineVariant): TextEditorEngine | null {
  const key = `${name}-${variant}`;
  if (!engineCache.has(key)) engineCache.set(key, fixtureEngines.createEngine(name, variant));
  return engineCache.get(key)!;
}

// Instances ---------------------------------------------------------------------------------

type Section = 'own' | 'form' | 'field' | 'dialog' | 'late';
type Expected = 'ready' | 'idle' | 'error';

interface InstanceSpec {
  readonly variant: ElementVariant;
  readonly title: string;
  readonly label: string;
  /** Unpaired instances name their one engine; `null` builds none. */
  readonly engines?: readonly (EngineName | null)[];
  readonly engineVariant?: EngineVariant;
  readonly content?: string | null;
  readonly section?: Section;
  readonly expected?: Expected;
  readonly options?: (
    id: string,
    engine: EngineName | null,
  ) => Partial<ElementFixtureEditorOptions>;
  readonly slotClass?: string;
  readonly slotDir?: 'rtl';
}

const LONG = { attributes: { style: BOUNDED_STYLE } };

/** The people that the `mention` pair's `@` list searches. */
const PEOPLE = [
  { id: 'p-ines', name: 'Ines Okafor', team: 'Seed bank' },
  { id: 'p-tomas', name: 'Tomas Lindqvist', team: 'Irrigation' },
  { id: 'p-mara', name: 'Mara Quint', team: 'Greenhouse B' },
  { id: 'p-oren', name: 'Oren Vale', team: 'Compost' },
  { id: 'p-hana', name: 'Hana Sato', team: 'Seed bank' },
] as const;
type Person = (typeof PEOPLE)[number];

/** Each query the mention source received, when it started, and whether it settled or was aborted. */
const mentionLog: { query: string; time: number; aborted: boolean; settled: boolean }[] = [];
function mentionQueries(): { query: string; time: number; aborted: boolean; settled: boolean }[] {
  return mentionLog.map((entry) => ({ ...entry }));
}
/** How long the mention source takes to answer, default 400 ms. */
let mentionDelayMs = 400;
function mentionDelay(ms = 400): void {
  mentionDelayMs = ms;
}

/** The corpus mention with an `@` suggestion whose source answers after `mentionDelay` or on abort. */
const mentionWithSource: TextEditorInlineDefinition = {
  ...mention,
  suggest: {
    trigger: '@',
    source: ({ query, signal }) => {
      const entry = { query, time: performance.now(), aborted: false, settled: false };
      mentionLog.push(entry);
      return new Promise<readonly Person[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          entry.settled = true;
          const needle = query.toLowerCase();
          resolve(PEOPLE.filter((person) => person.name.toLowerCase().includes(needle)));
        }, mentionDelayMs);
        signal.addEventListener(
          'abort',
          () => {
            if (entry.settled) return;
            entry.aborted = true;
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
    label: (item) => (item as Person).name,
    description: (item) => (item as Person).team,
    attrs: (item) => ({ person: (item as Person).id, label: (item as Person).name }),
  },
};

const SPECS: readonly InstanceSpec[] = [
  { variant: 'default', title: 'Default', label: 'Field notes' },
  {
    variant: 'empty',
    title: 'Empty',
    label: 'Empty notes',
    content: null,
    options: () => ({ attributes: { placeholder: 'Start the log…' } }),
  },
  {
    variant: 'readonly',
    title: 'Read-only',
    label: 'Read-only notes',
    options: () => ({ attributes: { readonly: '' } }),
  },
  {
    variant: 'disabled',
    title: 'Disabled',
    label: 'Disabled notes',
    options: () => ({ attributes: { disabled: '' } }),
  },
  {
    variant: 'long',
    title: 'Long',
    label: 'Long notes',
    content: 'long-notes',
    options: () => LONG,
  },
  {
    variant: 'long-readonly',
    title: 'Long, read-only',
    label: 'Long read-only notes',
    content: 'long-notes',
    options: () => ({ attributes: { style: BOUNDED_STYLE, readonly: '' } }),
  },
  {
    variant: 'long-disabled',
    title: 'Long, disabled',
    label: 'Long disabled notes',
    content: 'long-notes',
    options: () => ({ attributes: { style: BOUNDED_STYLE, disabled: '' } }),
  },
  { variant: 'auto', title: 'Auto height', label: 'Season notes', content: 'auto-notes' },
  {
    variant: 'auto-disabled',
    title: 'Auto height, disabled',
    label: 'Disabled season notes',
    content: 'auto-notes',
    options: () => ({ attributes: { disabled: '' } }),
  },
  {
    variant: 'form',
    title: 'In a form',
    label: 'Form notes',
    section: 'form',
    content: null,
    options: () => ({
      attributes: { name: 'notes', format: 'markdown', 'default-value': FIELD_NOTES },
    }),
  },
  {
    variant: 'outside-form',
    title: 'Outside its form',
    label: 'Outside notes',
    engines: ['tiptap'],
    section: 'form',
    content: null,
    options: () => ({
      attributes: { form: 'notes-form', name: 'outside', 'default-value': html('field-notes') },
    }),
  },
  { variant: 'field', title: 'In a field', label: 'Log entry', section: 'field' },
  { variant: 'rtl', title: 'Right to left', label: 'Right-to-left notes', slotDir: 'rtl' },
  { variant: 'narrow', title: 'Narrow', label: 'Narrow notes', slotClass: 'narrow' },
  { variant: 'dialog', title: 'In a dialog', label: 'Dialog notes', section: 'dialog' },
  {
    variant: 'reduced',
    title: 'Without table modules',
    label: 'Notes without tables',
    engineVariant: 'reduced',
  },
  {
    variant: 'custom',
    title: 'Custom nodes',
    label: 'Notes with custom nodes',
    content: '05-custom',
    options: () => ({ nodes: corpusNodes }),
  },
  {
    variant: 'upload',
    title: 'Image upload',
    label: 'Notes with uploads',
    options: (id) => ({ features: allFeatures(uploadHook(id, 'pantry-shelf.svg')) }),
  },
  {
    variant: 'core',
    title: 'Core only',
    label: 'Notes without features',
    options: () => ({ features: [] }),
  },
  {
    variant: 'classic',
    title: 'Classic toolbar',
    label: 'Notes with a classic toolbar',
    options: () => ({
      features: [
        featureModule.textEditorLinks(),
        featureModule.textEditorTables(),
        featureModule.textEditorImages(),
      ],
    }),
  },
  {
    variant: 'mention',
    title: 'Mentions',
    label: 'Notes with mentions',
    options: () => ({
      nodes: [mentionWithSource],
      layout: { suggestions: ['slash', 'mention'] },
    }),
  },
  {
    variant: 'late',
    title: 'Late engine',
    label: 'Late notes',
    section: 'late',
    expected: 'idle',
    content: null,
    options: () => ({ attributes: { name: 'late' }, defaultValue: html('field-notes') }),
  },
  {
    variant: 'failing',
    title: 'Failing engine',
    label: 'Failing notes',
    engineVariant: 'failing',
    expected: 'error',
  },
  {
    variant: 'late-json',
    title: 'Late, JSON',
    label: 'Late JSON notes',
    engines: ['tiptap'],
    expected: 'idle',
    content: null,
    options: () => ({
      attributes: { format: 'json' },
      defaultValue: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Seed order' }] },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Two packets of chili and one of chard.' }],
          },
        ],
      },
    }),
  },
  {
    variant: 'late-markdown',
    title: 'Late, Markdown',
    label: 'Late Markdown notes',
    engines: ['tiptap'],
    expected: 'idle',
    content: null,
    options: () => ({ attributes: { format: 'markdown' }, defaultValue: FIELD_NOTES }),
  },
  {
    variant: 'late-text',
    title: 'Late, text',
    label: 'Late text notes',
    engines: ['tiptap'],
    expected: 'idle',
    content: null,
    options: () => ({
      attributes: { format: 'text' },
      defaultValue: fixture.corpus.get('field-notes')!.text,
    }),
  },
  {
    variant: 'no-engine',
    title: 'No engine',
    label: 'Notes without an engine',
    engines: [null],
    expected: 'idle',
  },
  {
    variant: 'swap',
    title: 'Engine swap',
    label: 'Swap notes',
    engines: ['tiptap'],
    content: 'portable',
  },
];

const paired = (spec: InstanceSpec) => !spec.engines;
const idOf = (spec: InstanceSpec, engine: EngineName | null) =>
  paired(spec) ? `${engine}-${spec.variant}` : spec.variant;
function kept(spec: InstanceSpec, engine: EngineName | null): boolean {
  if (engine !== null && !wanted(engine)) return false;
  if (only.size === 0) return true;
  const id = idOf(spec, engine);
  if (only.has(id)) return true;
  if (paired(spec)) return only.has(spec.variant);
  // The unpaired instance of a shared section stays with it.
  return spec.section === 'form' && only.has('form');
}

const instances = document.getElementById('instances')!;
const mount = document.getElementById('mount')!;
const meta = document.getElementById('meta')!;
const summary = document.getElementById('summary')!;

// The external drag source of the drop rows: its drag carries HTML and text.
document.getElementById('drop-source')?.addEventListener('dragstart', (event) => {
  event.dataTransfer?.setData('text/html', '<strong>Rainbow chard</strong> seed packet');
  event.dataTransfer?.setData('text/plain', 'Rainbow chard seed packet');
});

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

const page = {
  notesForm: null as HTMLFormElement | null,
  notesFieldset: null as HTMLFieldSetElement | null,
  otherForm: null as HTMLFormElement | null,
  lateForm: null as HTMLFormElement | null,
  fieldForms: {} as Record<string, HTMLFormElement>,
  fields: {} as Record<string, HTMLElement>,
  dialogs: {} as Record<string, HTMLElement>,
  markdownReference: null as HTMLElement | null,
  mount,
};

function button(text: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('tp-button');
  element.textContent = text;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

interface Planned {
  readonly spec: InstanceSpec;
  readonly engine: EngineName | null;
  readonly id: string;
  readonly parent: HTMLElement;
  readonly levels: readonly HTMLElement[];
  /** The slot's status output; null in a shared section. */
  readonly status: HTMLElement | null;
}
const planned: Planned[] = [];

// The chrome: sections, slots, forms, fields and dialogs, before the baseline.
const shared = new Map<Section, { parent: HTMLElement; levels: readonly HTMLElement[] }>();
let outsideParent: HTMLElement | null = null;
for (const spec of SPECS) {
  const engines = (spec.engines ?? ENGINES).filter((engine) => kept(spec, engine));
  if (engines.length === 0) continue;
  const sectionName = spec.section ?? 'own';
  let pair: HTMLElement | null = null;
  for (const engine of engines) {
    const id = idOf(spec, engine);
    if (sectionName === 'form' || sectionName === 'late') {
      let frame = shared.get(sectionName);
      if (!frame) {
        const target = slot(
          section(spec.title, sectionName),
          sectionName === 'form' ? 'notes-form' : 'late-form',
        );
        target.status.textContent = '';
        const nested = nestInLevels(target.slot, level);
        const form = document.createElement('form');
        form.setAttribute('style', FORM_STYLE);
        nested.frame.append(form);
        if (sectionName === 'form') {
          form.id = 'notes-form';
          const fieldset = document.createElement('fieldset');
          fieldset.setAttribute('style', FIELDSET_STYLE);
          form.append(fieldset);
          const actions = document.createElement('div');
          actions.append(
            button('Save notes', { type: 'submit' }),
            button('Reset notes', { type: 'reset' }),
          );
          form.append(actions);
          const outside = document.createElement('div');
          nested.frame.append(outside);
          const other = document.createElement('form');
          other.dataset['fixtureForm'] = 'other';
          nested.frame.append(other);
          page.notesForm = form;
          page.notesFieldset = fieldset;
          page.otherForm = other;
          outsideParent = outside;
          shared.set('form', { parent: fieldset, levels: nested.levels });
        } else {
          form.id = 'late-form';
          page.lateForm = form;
          shared.set('late', { parent: form, levels: nested.levels });
        }
        frame = shared.get(sectionName)!;
      }
      const parent = spec.variant === 'outside-form' ? outsideParent! : frame.parent;
      planned.push({ spec, engine, id, parent, levels: frame.levels, status: null });
      continue;
    }
    pair ??= section(spec.title, spec.variant);
    const target = slot(pair, id);
    if (spec.slotClass) target.slot.classList.add(spec.slotClass);
    if (spec.slotDir) target.slot.dir = spec.slotDir;
    const nested = nestInLevels(target.slot, level);
    let parent = nested.frame;
    if (sectionName === 'field') {
      const form = document.createElement('form');
      form.setAttribute('style', FORM_STYLE);
      const field = document.createElement('tp-field');
      field.setAttribute('name', 'log');
      field.setAttribute('label', 'Log entry');
      field.setAttribute('description', 'What changed since the last visit.');
      field.setAttribute('error', 'Write at least one line.');
      form.append(field);
      parent.append(form);
      page.fieldForms[id] = form;
      page.fields[id] = field;
      parent = field;
    } else if (sectionName === 'dialog') {
      const dialog = document.createElement('tp-dialog');
      dialog.dataset['fixtureSurface'] = '';
      dialog.setAttribute('label', 'Notes');
      dialog.append(button('Open notes', { slot: 'trigger' }));
      parent.append(dialog);
      page.dialogs[id] = dialog;
      parent = dialog;
    }
    planned.push({ spec, engine, id, parent, levels: nested.levels, status: target.status });
  }
}

// The Markdown reference beside the default pair's width.
if (only.size === 0 || only.has('default') || only.has('markdown-reference')) {
  const target = slot(section('Markdown reference', 'markdown-reference'), 'markdown-reference');
  target.status.textContent = '';
  const nested = nestInLevels(target.slot, level);
  const reference = document.createElement('tp-markdown');
  reference.id = 'markdown-reference';
  (reference as HTMLElement & { source: string }).source = FIELD_NOTES;
  nested.frame.append(reference);
  page.markdownReference = reference;
}

bindElementFixturePage({ engines: fixtureEngines, elements: page });

await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
api.captureBaseline();

const expected = new Map<string, Expected>();
for (const { spec, engine, id, parent, levels, status } of planned) {
  const configured = engine === null ? null : engineOf(engine, spec.engineVariant ?? 'full');
  const loadsEngine = !deferred && spec.expected !== 'idle';
  const documentName = spec.content === undefined ? contentName : spec.content;
  const extra = spec.options?.(id, engine) ?? {};
  const editor = new ElementFixtureEditor({
    defaultValue: documentName ? html(documentName) : undefined,
    features: allFeatures(),
    ...extra,
    attributes: { label: spec.label, ...extra.attributes },
    id,
    variant: spec.variant,
    engineName: engine,
    engine: loadsEngine ? configured : null,
    configured,
    parent,
    levels,
  });
  fixture.editors.set(id, editor);
  expected.set(id, deferred ? 'idle' : (spec.expected ?? 'ready'));
  if (status) void editor.settled().then((value) => (status.textContent = value));
}

// Lifecycle (V-618) ---------------------------------------------------------------------------

/**
 * The lifecycle of the instances expected ready (or of `ids`): ready after one mount with one ready
 * event and no error, an editing root with the textbox role and content; a remount carries the
 * document over to a second mount that is ready again. V-618 runs it on the source page and with
 * `?built` and compares the reports.
 */
async function assertLifecycle(ids?: readonly string[]): Promise<Report> {
  const wanted = ids ?? [...expected].filter(([, status]) => status === 'ready').map(([id]) => id);
  const checks: Check[] = [];
  const bounded = <T>(promise: Promise<T>) =>
    Promise.race([
      promise,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 2500)),
    ]);
  for (const id of wanted) {
    const editor = elementHelpers.elementEditorOf(id);
    const count = (type: string) => editor.events().filter((event) => event.type === type).length;
    checks.push(check(`${id}: ready`, editor.status === 'ready', editor.status));
    checks.push(check(`${id}: one mount`, editor.mounts === 1, editor.mounts));
    checks.push(
      check(
        `${id}: one ready event`,
        count('tp-text-editor-ready') === 1,
        count('tp-text-editor-ready'),
      ),
    );
    checks.push(
      check(`${id}: no error`, count('tp-text-editor-error') === 0, count('tp-text-editor-error')),
    );
    checks.push(
      check(
        `${id}: textbox root`,
        editor.root?.getAttribute('role') === 'textbox',
        editor.root?.getAttribute('role') ?? null,
      ),
    );
    const before = editor.getContent('html');
    checks.push(
      check(`${id}: content`, typeof before === 'string' && before.length > 0, typeof before),
    );
    const status = await bounded(editor.remount());
    checks.push(check(`${id}: remount ready`, status === 'ready', status));
    checks.push(check(`${id}: two mounts`, editor.mounts === 2, editor.mounts));
    checks.push(check(`${id}: content kept`, editor.getContent('html') === before, null));
  }
  return report(checks, { built, ids: wanted });
}

// Page API ----------------------------------------------------------------------------------

const textEditorAPI = {
  ...api,
  ...parityHelpers,
  create: elementHelpers.create,
  assign: elementHelpers.assign,
  holdMount: elementHelpers.holdMount,
  releaseMount: elementHelpers.releaseMount,
  fatal: elementHelpers.fatal,
  reasons: elementHelpers.reasons,
  lanes: elementHelpers.lanes,
  layoutShifts: elementHelpers.layoutShifts,
  passes: elementHelpers.passes,
  uploads: elementHelpers.uploads,
  uploadMode: elementHelpers.uploadMode,
  mentionQueries,
  mentionDelay,
  elements: elementHelpers.elements,
  calibrateEngineReactions: elementHelpers.calibrateEngineReactions,
  startRootWatch: elementHelpers.startRootWatch,
  stopRootWatch: elementHelpers.stopRootWatch,
  scrollViewport: elementHelpers.scrollViewport,
  resizeHost: elementHelpers.resizeHost,
  assertNoWidgetRootWrites: elementHelpers.assertNoWidgetRootWrites,
  assertRootAttributeWrites: elementHelpers.assertRootAttributeWrites,
  assertSurfacesInRoot: elementHelpers.assertSurfacesInRoot,
  selfTest: elementHelpers.selfTest,
  assertLifecycle,
  built,
  /** With `?ledger`: removes the host and checks what it left registered (V-584). */
  assertCleanup: (id: string, options?: CleanupOptions) => {
    const editor = elementHelpers.elementEditorOf(id);
    return ledgerCleanup(id, editor.host, editor.root, options);
  },
  ledger: { counts: ledgerCounts, entries: ledgerEntries, mark: ledgerMark },
  ...perf,
  level,
  factories: fixtureEngines.factories,
  modules: fixtureEngines.modules,
  /** How often the engines' own serializers ran through the modules the adapters received. */
  serializers: () => serializers.counts(),
  loadErrors: () => summarize(fixtureEngines.loadErrors),
  /** The relative image source beside the page, for content with an image and no remote load. */
  fixtureImage: 'pantry-shelf.svg',
};
(window as unknown as { textEditorAPI: typeof textEditorAPI }).textEditorAPI = textEditorAPI;

meta.textContent = [
  `level ${level}`,
  `content ${contentName}`,
  engineFilter ? `engine ${engineFilter}` : '',
  only.size > 0 ? `only ${[...only].join(', ')}` : '',
  deferred ? 'defer' : '',
  params.has('ledger') ? 'ledger' : '',
]
  .filter(Boolean)
  .join('; ');

const READY_TIMEOUT = 10_000;
let readyTimer: ReturnType<typeof setTimeout> | undefined;
const statuses = await Promise.race([
  api.ready(),
  new Promise<Record<string, string>>((resolve) => {
    readyTimer = setTimeout(
      () =>
        resolve(
          Object.fromEntries([...fixture.editors.keys()].map((id) => [id, editorOf(id).status])),
        ),
      READY_TIMEOUT,
    );
  }),
]);
// The page's own timer ends here, so that the ledger counts none of it (`assertCleanup`).
clearTimeout(readyTimer);
const failed = Object.entries(statuses).filter(([id, status]) => status !== expected.get(id));
const count = Object.keys(statuses).length;
summary.textContent =
  failed.length > 0
    ? `Not as expected: ${failed.map(([id, status]) => `${id} (${status}, expected ${expected.get(id)})`).join(', ')}.`
    : count === 0
      ? 'No instance matches the query.'
      : count === 1
        ? 'The instance settled.'
        : `All ${count} instances settled.`;
if (failed.length === 0) document.documentElement.dataset['fixtureReady'] = '';
else document.documentElement.dataset['fixtureError'] = failed.map(([id]) => id).join(' ');
