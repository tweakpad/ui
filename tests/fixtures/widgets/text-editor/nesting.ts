/**
 * Bootstrap of the nesting page `nesting.html`: paired `tp-text-editor` instances of both engines
 * under 0–2 ancestor open shadow roots (`?level`), inside library containers (Dialog, Popover,
 * Tabs, Scroll area) and under a closed shadow root, with move targets for reconnection (another
 * slot, the page outside every level root, a same-origin frame) and the resource ledger installed
 * before the first instance. Query parameters: `?level=0|1|2`, `?only=<variants or ids>` and
 * `?engine=tiptap|lexical`; they combine. Driven only through the Chrome DevTools MCP (see
 * README.md).
 */
import '../../../../src/register.js';
import '../../../../src/register/widgets.js';
import type { TextEditorEngine } from '../../../../src/foundation/text-editor/engine.js';
import * as api from './api.js';
import * as elementHelpers from './element-editor.js';
import {
  bindElementFixturePage,
  ElementFixtureEditor,
  elementEditorOf,
  installElementFixture,
} from './element-editor.js';
import { loadCorpus, loadFixtureEngines } from './engine-modules.js';
import {
  check,
  editorOf,
  fixture,
  nestInLevels,
  report,
  settle,
  summarize,
  type EngineName,
  type Level,
  type Report,
} from './harness.js';
import {
  assertCleanup as ledgerCleanup,
  installLedger,
  ledgerCounts,
  ledgerEntries,
  ledgerMark,
  wrapFrame,
  type CleanupOptions,
} from './ledger.js';
import * as perf from './perf.js';

installLedger();

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
.scroll-box { block-size: 260px; }
.closed-host { display: block; }
.move-frame { inline-size: 100%; block-size: 320px; border: 1px dashed var(--tp-border); border-radius: var(--tp-radius-md); }
[hidden] { display: none; }
`;

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
const ENGINES: readonly EngineName[] = ['tiptap', 'lexical'];
const wanted = (engine: EngineName) => !engineFilter || engineFilter === engine;

const pageSheet = new CSSStyleSheet();
pageSheet.replaceSync(PAGE_CSS);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];
fixture.level = level;
installElementFixture();

const corpus = loadCorpus();
const html = corpus.get('state')?.html ?? '<p>Field notes</p>';
const longHtml = Array.from({ length: 4 }, () => html).join('');

const fixtureEngines = await loadFixtureEngines({ wanted });
const engineCache = new Map<EngineName, TextEditorEngine | null>();
function engineOf(name: EngineName): TextEditorEngine | null {
  if (!engineCache.has(name)) engineCache.set(name, fixtureEngines.createEngine(name, 'full'));
  return engineCache.get(name)!;
}

// Sections ----------------------------------------------------------------------------------

type Section = 'nested' | 'dialog' | 'popover' | 'tabs' | 'scroll' | 'closed-root';

const SECTIONS: readonly {
  readonly variant: Section;
  readonly title: string;
  readonly label: string;
}[] = [
  { variant: 'nested', title: 'Nested at the page level', label: 'Nested notes' },
  { variant: 'dialog', title: 'In a dialog', label: 'Dialog notes' },
  { variant: 'popover', title: 'In a popover', label: 'Popover notes' },
  { variant: 'tabs', title: 'In a tab panel', label: 'Tab notes' },
  { variant: 'scroll', title: 'In a scroll area', label: 'Scrolled notes' },
  { variant: 'closed-root', title: 'Under a closed shadow root', label: 'Closed-root notes' },
];

const kept = (variant: Section, engine: EngineName): boolean =>
  wanted(engine) && (only.size === 0 || only.has(variant) || only.has(`${engine}-${variant}`));

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

function button(text: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('tp-button');
  element.textContent = text;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

/** The containers by instance id: the dialog, popover, tabs or scroll area that holds it. */
const containers = new Map<string, HTMLElement>();
/** The closed shadow roots by instance id; the page keeps them, nothing else can reach them. */
const closedRoots = new Map<string, ShadowRoot>();
/** Each instance's own slot, outside every level root: the `outer` move target. */
const outerSlots = new Map<string, HTMLElement>();

/** The parent an instance of a section is appended to, inside `frame`. */
function sectionParent(variant: Section, id: string, engine: EngineName, frame: HTMLElement) {
  switch (variant) {
    case 'dialog': {
      const dialog = document.createElement('tp-dialog');
      dialog.dataset['fixtureSurface'] = '';
      dialog.setAttribute('label', `Notes (${engine})`);
      dialog.append(button(`Open ${engine} notes`, { slot: 'trigger' }));
      frame.append(dialog);
      containers.set(id, dialog);
      return dialog;
    }
    case 'popover': {
      const popover = document.createElement('tp-popover');
      popover.setAttribute('label', `Notes (${engine})`);
      popover.append(button(`Show ${engine} notes`, { slot: 'trigger', variant: 'outline' }));
      const body = document.createElement('div');
      popover.append(body);
      frame.append(popover);
      containers.set(id, popover);
      return body;
    }
    case 'tabs': {
      const tabs = document.createElement('tp-tabs');
      tabs.setAttribute('label', `Notebook (${engine})`);
      tabs.setAttribute('default-value', 'notes');
      const notesTab = document.createElement('button');
      notesTab.slot = 'tab';
      notesTab.value = 'notes';
      notesTab.textContent = 'Notes';
      const summaryTab = document.createElement('button');
      summaryTab.slot = 'tab';
      summaryTab.value = 'summary';
      summaryTab.textContent = 'Summary';
      const indicator = document.createElement('span');
      indicator.slot = 'indicator';
      indicator.setAttribute('aria-hidden', 'true');
      const notes = document.createElement('section');
      notes.slot = 'panel';
      notes.setAttribute('value', 'notes');
      notes.toggleAttribute('keep-mounted', true);
      const other = document.createElement('section');
      other.slot = 'panel';
      other.setAttribute('value', 'summary');
      other.textContent = 'Three entries this week.';
      tabs.append(notesTab, summaryTab, indicator, notes, other);
      frame.append(tabs);
      containers.set(id, tabs);
      return notes;
    }
    case 'scroll': {
      const area = document.createElement('tp-scroll-area');
      area.setAttribute('label', `Scrolled notes (${engine})`);
      area.className = 'scroll-box';
      frame.append(area);
      containers.set(id, area);
      return area;
    }
    case 'closed-root': {
      const host = document.createElement('div');
      host.className = 'closed-host';
      host.id = `closed-host-${engine}`;
      frame.append(host);
      const root = host.attachShadow({ mode: 'closed' });
      const inner = document.createElement('div');
      root.append(inner);
      closedRoots.set(id, root);
      return inner;
    }
    default:
      return frame;
  }
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

// Move targets: another slot at the page's level, and a same-origin frame.
const elsewhereSlot = slot(section('Move target', 'elsewhere'), 'elsewhere');
elsewhereSlot.status.textContent = '';
const elsewhere = nestInLevels(elsewhereSlot.slot, level).frame;
elsewhere.id = 'elsewhere';
const frameSlot = slot(section('Move target in another document', 'frame'), 'frame');
frameSlot.status.textContent = '';
const moveFrame = document.createElement('iframe');
moveFrame.className = 'move-frame';
moveFrame.title = 'Move target in another document';
moveFrame.srcdoc =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/src/styles.css"></head><body></body></html>';
const frameLoaded = new Promise<void>((resolve) =>
  moveFrame.addEventListener('load', () => resolve(), { once: true }),
);
frameSlot.slot.append(moveFrame);
await frameLoaded;
if (moveFrame.contentWindow) wrapFrame(moveFrame.contentWindow);

await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
api.captureBaseline();

const origins = new Map<string, HTMLElement>();
for (const { variant, title, label } of SECTIONS) {
  const engines = ENGINES.filter((engine) => kept(variant, engine));
  if (engines.length === 0) continue;
  const pair = section(title, variant);
  for (const engine of engines) {
    const id = `${engine}-${variant}`;
    const target = slot(pair, id);
    outerSlots.set(id, target.slot);
    const nested = nestInLevels(target.slot, level);
    const parent = sectionParent(variant, id, engine, nested.frame);
    origins.set(id, parent);
    const configured = engineOf(engine);
    const editor = new ElementFixtureEditor({
      id,
      variant:
        variant === 'nested' ? 'nested' : variant === 'closed-root' ? 'closed-root' : 'container',
      engineName: engine,
      engine: configured,
      configured,
      parent,
      levels: nested.levels,
      defaultValue: variant === 'scroll' ? longHtml : html,
      attributes: { label },
    });
    fixture.editors.set(id, editor);
    void editor.settled().then((value) => (target.status.textContent = value));
  }
}

// Page helpers ------------------------------------------------------------------------------

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const countCalls = (id: string, name: string): number => editorOf(id).callCounts()[name] ?? 0;

/** Where `move` puts a host: a named target or an element. */
type MoveTarget = 'elsewhere' | 'outer' | 'back' | 'frame' | HTMLElement;

function destination(id: string, target: MoveTarget): HTMLElement {
  if (typeof target !== 'string') return target;
  switch (target) {
    case 'elsewhere':
      return elsewhere;
    case 'outer':
      return outerSlots.get(id) ?? elsewhere;
    case 'back':
      return origins.get(id) ?? mount;
    case 'frame': {
      const body = moveFrame.contentDocument?.body;
      if (!body) throw new Error('The move frame has no document.');
      return body;
    }
    default:
      throw new Error(`Unknown move target "${String(target)}".`);
  }
}

/** What a move compares: calls, status, document, selection and history. */
function moveState(id: string) {
  const editor = elementEditorOf(id);
  return {
    mounts: countCalls(id, 'mount'),
    destroys: countCalls(id, 'destroy'),
    status: editor.status,
    html: editor.status === 'ready' ? editor.getContent('html') : null,
    selection: summarize(editor.state.selection),
    history: summarize(editor.state.history),
    document: editor.host.ownerDocument === document ? 'page' : 'frame',
    focused: api.deepActiveElement(),
  };
}

/**
 * Moves the host of `id` to `target`: in one task by default (a reconnection within the release
 * window), or after `gapFrames` frames detached. Resolves after the instance settled, with the
 * state before and after.
 */
async function move(
  id: string,
  target: MoveTarget = 'elsewhere',
  options: { gapFrames?: number } = {},
) {
  const editor = elementEditorOf(id);
  const to = destination(id, target);
  const before = moveState(id);
  const gap = options.gapFrames ?? 0;
  if (gap === 0) to.append(editor.host);
  else {
    editor.host.remove();
    for (let index = 0; index < gap; index++) await nextFrame();
    to.append(editor.host);
  }
  await settle();
  await editor.settled();
  await settle();
  const after = moveState(id);
  return {
    before,
    after,
    kept: after.mounts === before.mounts && after.destroys === before.destroys,
    remounted: after.mounts - before.mounts,
    destroyed: after.destroys - before.destroys,
  };
}

/**
 * Removes the host of `id` and counts the frames until its instance is destroyed (expected 2), up
 * to `max`; the host stays detached until `move(id, 'back')`.
 */
async function removeAndCount(id: string, max = 6) {
  const editor = elementEditorOf(id);
  const destroys = countCalls(id, 'destroy');
  editor.host.remove();
  let frames = 0;
  while (countCalls(id, 'destroy') === destroys && frames < max) {
    await nextFrame();
    frames += 1;
  }
  const container = editor.host.shadowRoot?.querySelector('[part~="text-editor-content"]');
  return {
    frames,
    destroyed: countCalls(id, 'destroy') - destroys,
    contentChildren: container?.childElementCount ?? null,
    releaseStyles: countCalls(id, 'releaseStyles'),
    status: editor.status,
  };
}

/**
 * Each closed-root instance reported exactly one `text-editor-closed-root` diagnostic per
 * connection, naming the closed root's host, and every other instance reported none (V-579).
 */
function assertClosedRoot(): Report {
  const checks = [];
  for (const id of fixture.editors.keys()) {
    const diagnostics = editorOf(id)
      .events()
      .filter(
        (event) =>
          event.type === 'tp-diagnostic' &&
          (event.detail as { code?: unknown }).code === 'text-editor-closed-root',
      );
    const closed = closedRoots.has(id);
    const host = closed ? `closed-host-${id.split('-')[0]}` : null;
    checks.push(
      check(
        closed
          ? `${id}: one closed-root diagnostic naming its host`
          : `${id}: no closed-root diagnostic`,
        closed
          ? diagnostics.length === 1 &&
              String((diagnostics[0]!.detail as { message?: unknown }).message).includes(host!)
          : diagnostics.length === 0,
        diagnostics.map((event) => event.detail),
      ),
    );
  }
  return report(checks);
}

/** Opens or closes the container of `id`: a dialog or popover, or selects a tab of the tabs. */
async function container(id: string, open = true, tab = 'notes') {
  const element = containers.get(id);
  if (!element) throw new Error(`"${id}" sits in no container.`);
  const surface = element as HTMLElement & { setOpen?: (open: boolean) => unknown };
  if (element.localName === 'tp-tabs') {
    const target = element.querySelector<HTMLButtonElement>(`button[slot="tab"][value="${tab}"]`);
    target?.click();
  } else if (typeof surface.setOpen === 'function') surface.setOpen(open);
  await settle();
  return { container: element.localName, open, editor: moveState(id) };
}

const textEditorAPI = {
  ...api,
  create: elementHelpers.create,
  assign: elementHelpers.assign,
  holdMount: elementHelpers.holdMount,
  releaseMount: elementHelpers.releaseMount,
  reasons: elementHelpers.reasons,
  layoutShifts: elementHelpers.layoutShifts,
  passes: elementHelpers.passes,
  elements: () => ({
    elsewhere,
    frame: moveFrame,
    mount,
    containers: Object.fromEntries(containers),
  }),
  move,
  removeAndCount,
  container,
  assertClosedRoot,
  /** Removes the host and checks what it left registered (V-584); see `ledger.ts`. */
  assertCleanup: (id: string, options?: CleanupOptions) => {
    const editor = elementEditorOf(id);
    return ledgerCleanup(id, editor.host, editor.root, options);
  },
  ledger: { counts: ledgerCounts, entries: ledgerEntries, mark: ledgerMark },
  ...perf,
  level,
  factories: fixtureEngines.factories,
  loadErrors: () => summarize(fixtureEngines.loadErrors),
};
(window as unknown as { textEditorAPI: typeof textEditorAPI }).textEditorAPI = textEditorAPI;

meta.textContent = [
  `level ${level}`,
  engineFilter ? `engine ${engineFilter}` : '',
  only.size > 0 ? `only ${[...only].join(', ')}` : '',
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
const failed = Object.entries(statuses).filter(([, status]) => status !== 'ready');
const count = Object.keys(statuses).length;
summary.textContent =
  failed.length > 0
    ? `Not ready: ${failed.map(([id, status]) => `${id} (${status})`).join(', ')}.`
    : count === 0
      ? 'No instance matches the query.'
      : `All ${count} instances settled.`;
if (failed.length === 0) document.documentElement.dataset['fixtureReady'] = '';
else document.documentElement.dataset['fixtureError'] = failed.map(([id]) => id).join(' ');
