/**
 * The page API of `engines.html` (`window.textEditorAPI`): instance access, call and event logs,
 * DOM probes and the assertion helpers, each of which returns `{ checks, records, passed }`.
 * Evaluated through the Chrome DevTools MCP (see README.md).
 */
import type {
  TextEditorAction,
  TextEditorActionType,
} from '../../../../src/foundation/text-editor/actions.js';
import { tableModel } from '../../../../src/foundation/text-editor/adapters/shared/tables.js';
import { parseHtmlDocument } from '../../../../src/foundation/text-editor/content/dom.js';
import { importHtml } from '../../../../src/foundation/text-editor/content/html.js';
import {
  convertUnsupported,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableTable,
} from '../../../../src/foundation/text-editor/content/portable.js';
import { isValidBlockId } from '../../../../src/foundation/text-editor/ids.js';
import { TEXT_EDITOR_LAYOUT_SURFACES } from '../../../../src/foundation/text-editor/layout.js';
import type { TextEditorSelectionInput } from '../../../../src/foundation/text-editor/model.js';
import { textEditorStrings } from '../../../../src/foundation/text-editor/strings.js';
import {
  resolveTextEditorCapabilities,
  toolActions,
  toolActive,
  toolEnabled,
  toolItemIds,
  toolLabel,
  toolVisible,
  type TextEditorToolContext,
  type TextEditorToolTarget,
} from '../../../../src/foundation/text-editor/tools.js';
import {
  check,
  corpusOf,
  editorOf,
  EVENT_NAMES,
  fixture,
  nodeLabel,
  report,
  resetEditor,
  settle,
  summarize,
  type Check,
  type FixtureEditorLike,
  type Report,
} from './harness.js';
import { compareSnapshots, differences, pairIds, parityScenarios, snapshot } from './parity.js';

const DEFAULT_PAIR: readonly [string, string] = ['tiptap-default', 'lexical-default'];

const errorName = (error: unknown): string =>
  error instanceof Error || error instanceof DOMException ? error.name : String(error);

// Instances and logs --------------------------------------------------------------------------

/** The instance ids on this page. */
export const ids = (): string[] => [...fixture.editors.keys()];

/** The facade of an instance: `run`, `setContent`, `getContent`, `state`, setters and more. */
export const editor = (id: string): FixtureEditorLike => editorOf(id);

/** The recording wrapper of an instance's live engine instance, or `null`. */
export const instance = (id: string) => editorOf(id).instance;

/** Recorded calls by name: `mount`, every instance method and every context notification. */
export const calls = (id: string) => editorOf(id).calls();

/** How many calls of each name were recorded. */
export const callCounts = (id: string) => editorOf(id).callCounts();

/** The host-hook log under the widget's event names; every instance's, with `id`, without one. */
export function events(id?: string) {
  if (id) return editorOf(id).events();
  return [...fixture.editors.values()]
    .flatMap((item) => item.events().map((event) => ({ id: item.id, ...event })))
    .sort((a, b) => a.time - b.time);
}

/** The details as the hooks received them: snapshot handles, source events and errors. */
export const rawEvents = (id: string) => editorOf(id).rawEvents();

/** Clears the calls and events of one instance, or of every instance. */
export function clear(id?: string): void {
  for (const item of id ? [editorOf(id)] : fixture.editors.values()) item.clear();
}

/** Mounts anew with a fresh wrapper of the same engine; the document carries over. */
export const remount = (id: string) => editorOf(id).remount();

/** Loads a corpus document through `restoreContent`: silent, the history cleared. */
export const reset = (id: string, name: string) => resetEditor(id, name);

/** Resolves once every instance (or the listed ones) is ready or failed; their statuses. */
export async function ready(list: readonly string[] = ids()): Promise<Record<string, string>> {
  const statuses = await Promise.all(list.map((id) => editorOf(id).settled()));
  return Object.fromEntries(list.map((id, index) => [id, statuses[index]!]));
}

/** The corpus documents: names and whether they need the custom node definitions. */
export const corpus = () =>
  [...fixture.corpus.values()].map(({ name, custom }) => ({ name, custom }));

/** A corpus document's canonical HTML, and its Markdown and text goldens where they exist. */
export const corpusDocument = (name: string) => corpusOf(name);

export { settle };

// DOM probes ----------------------------------------------------------------------------------

/** Every open shadow root on the page, outermost first. */
export function shadowRoots(): ShadowRoot[] {
  const roots: ShadowRoot[] = [];
  const visit = (root: Document | ShadowRoot) => {
    for (const element of root.querySelectorAll('*'))
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
        visit(element.shadowRoot);
      }
  };
  visit(document);
  return roots;
}

const LIVE_REGIONS = '[aria-live], [role="status"], [role="alert"], [role="log"]';
const STYLESHEET_LINKS = 'link[rel~="stylesheet"]';

function liveRegionElements(): Element[] {
  return [document.head, document.body, ...shadowRoots()].flatMap((root) => [
    ...root.querySelectorAll(LIVE_REGIONS),
  ]);
}

/** Live regions in the head, the body and every shadow root. */
export function liveRegions() {
  const trees: [string, ParentNode][] = [
    ['head', document.head],
    ['body', document.body],
    ...shadowRoots().map((root): [string, ParentNode] => [nodeLabel(root), root]),
  ];
  const regions = trees.flatMap(([tree, root]) =>
    [...root.querySelectorAll(LIVE_REGIONS)].map((element) => ({
      tree,
      element: nodeLabel(element),
      live: element.getAttribute('aria-live'),
      role: element.getAttribute('role'),
    })),
  );
  return { total: regions.length, regions };
}

/** `style` elements, stylesheet links and adopted sheets of the document and every shadow root. */
export function styleCounts() {
  const roots = shadowRoots().map((root) => ({
    root: nodeLabel(root),
    style: root.querySelectorAll('style').length,
    links: root.querySelectorAll(STYLESHEET_LINKS).length,
    adopted: root.adoptedStyleSheets.length,
  }));
  const own = {
    style: document.querySelectorAll('style').length,
    links: document.querySelectorAll(STYLESHEET_LINKS).length,
    adopted: document.adoptedStyleSheets.length,
  };
  return {
    document: own,
    roots,
    editors: Object.fromEntries(
      [...fixture.editors.values()].map((item) => [item.id, item.shadow.adoptedStyleSheets.length]),
    ),
    totals: {
      style: own.style + roots.reduce((sum, root) => sum + root.style, 0),
      links: own.links + roots.reduce((sum, root) => sum + root.links, 0),
    },
  };
}

interface ForeignCounts {
  readonly head: readonly string[];
  readonly bodyChildren: number;
  readonly liveRegions: number;
  readonly styleElements: number;
  readonly stylesheetLinks: number;
}

function foreignCounts(): ForeignCounts {
  const styles = styleCounts();
  return {
    head: [...document.head.children].map((element) => nodeLabel(element)),
    bodyChildren: document.body.childElementCount,
    liveRegions: liveRegions().total,
    styleElements: styles.totals.style,
    stylesheetLinks: styles.totals.links,
  };
}

let foreignBaseline: ForeignCounts | null = null;

/** Records the counts that `assertNoForeignNodes` compares with; the page calls it before mount. */
export function captureBaseline(): ForeignCounts {
  foreignBaseline = foreignCounts();
  return foreignBaseline;
}

/** The editing root's attributes and the computed styles the parity rows compare. */
export function rootAttributes(id: string) {
  const root = editorOf(id).root;
  if (!root) return null;
  const style = getComputedStyle(root);
  return {
    tag: root.localName,
    attributes: Object.fromEntries(
      root.getAttributeNames().map((name) => [name, root.getAttribute(name)]),
    ),
    computed: {
      whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap,
      userSelect: style.userSelect,
      direction: style.direction,
    },
    passed: editorOf(id).rootAttributeRecord(),
  };
}

/** The focused element through every open shadow root, and the instance whose root it is in. */
export function deepActiveElement() {
  const chain: Element[] = [];
  let active: Element | null = document.activeElement;
  while (active) {
    chain.push(active);
    active = active.shadowRoot?.activeElement ?? null;
  }
  const element = chain.at(-1) ?? null;
  const owner = [...fixture.editors.values()].find(
    (item) => item.root && element && (item.root === element || item.root.contains(element)),
  );
  return {
    chain: chain.map((item) => nodeLabel(item)),
    element: nodeLabel(element),
    editor: owner?.id ?? null,
    isRoot: owner ? owner.root === element : false,
  };
}

/** The selection as `getComposedRanges({ shadowRoots })` reports it, with each range's rects. */
export function composedRanges(id?: string) {
  const selection = document.getSelection();
  if (!selection) return [];
  const root = id ? editorOf(id).root : null;
  return selection.getComposedRanges({ shadowRoots: shadowRoots() }).map((range) => {
    let rects: unknown[] = [];
    let text = '';
    try {
      const live = document.createRange();
      live.setStart(range.startContainer, range.startOffset);
      live.setEnd(range.endContainer, range.endOffset);
      rects = [...live.getClientRects()].map((rect) => summarize(rect));
      text = live.toString();
    } catch {
      // A range across trees cannot be rebuilt as a live range.
    }
    return {
      start: nodeLabel(range.startContainer),
      startOffset: range.startOffset,
      end: nodeLabel(range.endContainer),
      endOffset: range.endOffset,
      collapsed: range.collapsed,
      text,
      rects,
      inRoot: root
        ? root.contains(range.startContainer) && root.contains(range.endContainer)
        : null,
    };
  });
}

/** Per surface: the resolved tools with visibility, enablement, activity, value, label, actions. */
export function surfaces(id: string) {
  const target = editorOf(id);
  const state = target.state;
  const live = target.instance;
  const registry = target.registry;
  const layout = target.resolvedLayout;
  const table = live && state.table ? live.getTable(state.table.id) : null;
  const direction = getComputedStyle(target.host).direction === 'rtl' ? 'rtl' : 'ltr';
  const enablement = {
    ready: target.status === 'ready',
    disabled: target.disabled,
    editable: !target.readOnly && !target.disabled,
    registry,
    can: (action: TextEditorAction) => target.can(action),
  };
  const safely = <T>(read: () => T): T | { error: string } => {
    try {
      return read();
    } catch (error) {
      return { error: errorName(error) };
    }
  };
  const result: Record<string, unknown> = {};
  for (const [surface, key] of TEXT_EDITOR_LAYOUT_SURFACES) {
    let toolTarget: TextEditorToolTarget = { kind: 'selection' };
    if (surface === 'block-menu' && state.block)
      toolTarget = { kind: 'blocks', ids: [state.block.id] };
    if (surface.startsWith('table-')) {
      if (!state.table) {
        result[surface] = { skipped: 'no table at the selection' };
        continue;
      }
      toolTarget =
        surface === 'table-row'
          ? { kind: 'table', table: state.table.id, axis: 'row', index: state.table.cell.row }
          : surface === 'table-column'
            ? {
                kind: 'table',
                table: state.table.id,
                axis: 'column',
                index: state.table.cell.column,
              }
            : { kind: 'table', table: state.table.id, axis: 'cells' };
    }
    const context: TextEditorToolContext = {
      state,
      strings: textEditorStrings,
      surface,
      target: toolTarget,
      direction,
      layout,
      table,
    };
    result[surface] = layout[key].map((group) =>
      group.map((toolId) => {
        const tool = registry.tools.get(toolId)!;
        const bare = { ...context, value: undefined };
        return {
          id: toolId,
          kind: tool.kind,
          visible: safely(() => toolVisible(tool, context)),
          enabled: safely(() => toolEnabled(tool, context, enablement)),
          active: safely(() => toolActive(tool, context)),
          value:
            tool.kind === 'radio-menu'
              ? safely(
                  () =>
                    toolItemIds(tool, context).find(
                      (item) => registry.tools.get(item)?.isActive?.(bare) === true,
                    ) ?? null,
                )
              : null,
          label: safely(() => toolLabel(tool, context)),
          actions: safely(() => summarize(toolActions(tool, context, registry))),
        };
      }),
    );
  }
  return result;
}

// Event probes --------------------------------------------------------------------------------

interface ProbeRecord {
  readonly phase: 'capture' | 'root' | 'bubble' | 'window';
  readonly type: string;
  readonly time: number;
  readonly target: string;
  readonly defaultPrevented: boolean;
  readonly trusted: boolean;
  readonly detail: Record<string, unknown>;
}

let probe: { records: ProbeRecord[]; stop: () => void } | null = null;

const describeTarget = (target: EventTarget | undefined): string =>
  target instanceof Node ? nodeLabel(target) : target === window ? 'window' : String(target);

function probeDetail(event: Event): Record<string, unknown> {
  if (event instanceof KeyboardEvent)
    return { key: event.key, code: event.code, composing: event.isComposing };
  if (event instanceof InputEvent) return { inputType: event.inputType, data: event.data };
  if (event instanceof ClipboardEvent) {
    const data = event.clipboardData;
    const types = data ? [...data.types] : [];
    return {
      types,
      data: Object.fromEntries(types.map((type) => [type, data?.getData(type) ?? ''])),
    };
  }
  if (event instanceof DragEvent) return { types: [...(event.dataTransfer?.types ?? [])] };
  return {};
}

/**
 * Records events of `types` at document capture, at the editing root of `id` (when given), at
 * document bubble and at the window: the key, input, clipboard payload and `defaultPrevented` of
 * each. `probeRecords` reads them and `stopProbe` removes the listeners.
 */
export function startProbe(
  types: readonly string[] = ['keydown'],
  id?: string,
): { readonly started: readonly string[] } {
  stopProbe();
  const records: ProbeRecord[] = [];
  const listen = (phase: ProbeRecord['phase']) => (event: Event) => {
    records.push({
      phase,
      type: event.type,
      time: performance.now(),
      target: describeTarget(event.composedPath()[0]),
      defaultPrevented: event.defaultPrevented,
      trusted: event.isTrusted,
      detail: probeDetail(event),
    });
  };
  const removers: (() => void)[] = [];
  const add = (target: EventTarget, phase: ProbeRecord['phase'], capture: boolean) => {
    const listener = listen(phase);
    for (const type of types) target.addEventListener(type, listener, capture);
    removers.push(() => {
      for (const type of types) target.removeEventListener(type, listener, capture);
    });
  };
  add(document, 'capture', true);
  const root = id ? editorOf(id).root : null;
  if (root) add(root, 'root', false);
  add(document, 'bubble', false);
  add(window, 'window', false);
  probe = { records, stop: () => removers.forEach((remove) => remove()) };
  return { started: [...types] };
}

export function probeRecords(): ProbeRecord[] {
  return probe ? [...probe.records] : [];
}

export function stopProbe(): ProbeRecord[] {
  const records = probeRecords();
  probe?.stop();
  probe = null;
  return records;
}

// Assertions ----------------------------------------------------------------------------------

/** The fixture instance whose host's shadow tree holds `node` (nested component roots included). */
function widgetTreeOf(node: Node): string | null {
  const hosts = new Map([...fixture.editors.values()].map((item) => [item.host, item.id]));
  let root = node.getRootNode();
  while (root instanceof ShadowRoot) {
    const id = hosts.get(root.host as HTMLElement);
    if (id !== undefined) return id;
    root = root.host.getRootNode();
  }
  return null;
}

/**
 * No node outside the instances: head, body, live regions and styles as before the first mount.
 * With `id` (element mode), the live regions inside an instance's shadow tree are the widget's own
 * and leave the count; every region added since the baseline must sit inside one, and
 * `records.announcer[id]` counts those inside `id`'s tree.
 */
export function assertNoForeignNodes(id?: string): Report {
  const now = foreignCounts();
  const before = foreignBaseline;
  if (!before) return report([check('baseline captured before mount', false, null)]);
  if (id !== undefined) editorOf(id);
  const regions = id === undefined ? null : liveRegionElements();
  const outside = regions?.filter((element) => widgetTreeOf(element) === null) ?? [];
  const regionChecks = regions
    ? [
        check(
          'no live region added outside a widget tree',
          outside.length === before.liveRegions,
          outside.map((element) => nodeLabel(element)),
        ),
      ]
    : [check('no live region added', now.liveRegions === before.liveRegions, liveRegions())];
  const announcer = regions
    ? Object.fromEntries(
        [...fixture.editors.keys()].map((key) => [
          key,
          regions.filter((element) => widgetTreeOf(element) === key).length,
        ]),
      )
    : undefined;
  return report(
    [
      check(
        'head children unchanged',
        JSON.stringify(now.head) === JSON.stringify(before.head),
        now.head,
      ),
      check('body children unchanged', now.bodyChildren === before.bodyChildren, now.bodyChildren),
      ...regionChecks,
      check(
        'no style element added',
        now.styleElements === before.styleElements,
        now.styleElements,
      ),
      check(
        'no stylesheet link added',
        now.stylesheetLinks === before.stylesheetLinks,
        now.stylesheetLinks,
      ),
    ],
    announcer ? { before, now, announcer } : { before, now },
  );
}

/** The canonical document of a corpus entry as an instance holds it, its conversions applied. */
function expectedDocument(target: FixtureEditorLike, name: string): TextEditorPortableDocument {
  const root = parseHtmlDocument(corpusOf(name).html, window);
  if (!root) throw new Error('No DOMParser.');
  const { document } = importHtml(root, { nodes: target.nodes });
  const capabilities = resolveTextEditorCapabilities(target.engine, target.nodes);
  return convertUnsupported(document, { capabilities, nodes: target.nodes }).document;
}

/**
 * Resets each instance from a corpus document and compares `getTable(id)` of every table with
 * the model the shared table planner builds from the document: rows, columns, cells with spans,
 * header flags, backgrounds, alignment, emptiness, the grid, widths and `merged`. An instance
 * without tables expects `null`. Also compares the two instances' models.
 */
export async function assertTables(
  list: readonly string[] = DEFAULT_PAIR,
  name = 'tables',
): Promise<Report> {
  const checks: Check[] = [];
  const models: Record<string, Record<string, unknown>> = {};
  for (const id of list) {
    await resetEditor(id, name);
    const target = editorOf(id);
    const live = target.instance;
    const tables = corpusTables(name);
    const capable = target.engine?.capabilities.has('block.table') ?? false;
    const expected = expectedDocument(target, name);
    models[id] = {};
    for (const table of tables) {
      const actual = live?.getTable(table) ?? null;
      const portable = expected.blocks.find(
        (block): block is TextEditorPortableTable => block.type === 'table' && block.id === table,
      );
      const model = capable && portable ? tableModel(table, portable) : null;
      const diff = differences(
        JSON.parse(JSON.stringify(model)),
        JSON.parse(JSON.stringify(actual)),
      );
      checks.push(check(`${id} ${table} equals the corpus`, diff.length === 0, diff));
      models[id]![table] = summarize(actual);
    }
  }
  if (list.length === 2) {
    const [a, b] = list;
    const diff = differences(models[a!], models[b!]);
    checks.push(check('both instances report equal tables', diff.length === 0, diff));
  }
  return report(checks, { models });
}

function corpusTables(name: string): string[] {
  return [...corpusOf(name).html.matchAll(/<table data-id="([^"]+)"/g)].map((match) => match[1]!);
}

interface ExpectedBlock {
  readonly id: string;
  readonly kind: string;
  readonly parentId: string | null;
  readonly depth: number;
  readonly index: number;
}

function expectedBlocks(document: TextEditorPortableDocument): ExpectedBlock[] {
  const out: ExpectedBlock[] = [];
  const walk = (
    blocks: readonly TextEditorPortableBlock[],
    parentId: string | null,
    depth: number,
  ) =>
    blocks.forEach((block, index) => {
      const kind = block.type === 'custom' ? block.name : block.type;
      out.push({ id: block.id ?? '?', kind, parentId, depth, index });
      if ('children' in block) walk(block.children, block.id ?? '?', depth + 1);
    });
  walk(document.blocks, null, 0);
  return out;
}

/**
 * Resets each instance from a corpus document and checks its block tree: the identifiers, kinds,
 * parents, depths and indices of the document in order (an identifier the corpus does not fix,
 * such as that of a converted block, compares by position); valid unique identifiers; each block
 * before its nested items, with reciprocal parent and children; `roots` and `get` agreeing with
 * `ordered()`; no element of a block being a `[data-lexical-cursor]`; the same tree object until
 * `contentVersion` changes, then a new one. Also compares the two instances' trees.
 */
export async function assertBlocks(
  list: readonly string[] = DEFAULT_PAIR,
  name = 'lists',
): Promise<Report> {
  const checks: Check[] = [];
  const trees: Record<string, unknown> = {};
  for (const id of list) {
    await resetEditor(id, name);
    const target = editorOf(id);
    const live = target.instance;
    if (!live) {
      checks.push(check(`${id} is ready`, false, target.status));
      continue;
    }
    const tree = live.getBlocks();
    const ordered = tree.ordered();
    // Identifiers the corpus fixes compare by value; fresh ones (a conversion) by position.
    const fixed = new Set(
      [...corpusOf(name).html.matchAll(/data-id="([^"]+)"/g)].map((match) => match[1]!),
    );
    const named = (block: string | null) => (block === null || fixed.has(block) ? block : '@new');
    const actual = ordered.map(({ id: block, kind, parentId, depth, index }) => ({
      id: named(block),
      kind,
      parentId: named(parentId),
      depth,
      index,
    }));
    trees[id] = actual;
    const expected = expectedBlocks(expectedDocument(target, name)).map((block) => ({
      ...block,
      id: named(block.id),
      parentId: named(block.parentId),
    }));
    const diff = differences(expected, actual);
    checks.push(check(`${id} blocks equal the corpus`, diff.length === 0, diff));
    const seen = new Set<string>();
    const problems: string[] = [];
    const position = new Map(ordered.map((block, index) => [block.id, index]));
    for (const block of ordered) {
      if (!isValidBlockId(block.id) || seen.has(block.id)) problems.push(`id ${block.id}`);
      seen.add(block.id);
      if (tree.get(block.id) !== block) problems.push(`get(${block.id})`);
      if (block.parentId !== null) {
        const parent = tree.get(block.parentId);
        if (!parent?.children.includes(block.id)) problems.push(`parent of ${block.id}`);
        if ((position.get(block.parentId) ?? Infinity) > (position.get(block.id) ?? -1))
          problems.push(`order of ${block.id}`);
      }
      for (const child of block.children)
        if (tree.get(child)?.parentId !== block.id) problems.push(`child ${child}`);
      if (live.blockElement(block.id)?.matches('[data-lexical-cursor]'))
        problems.push(`cursor ${block.id}`);
    }
    const roots = ordered.filter((block) => block.parentId === null).map((block) => block.id);
    if (JSON.stringify(roots) !== JSON.stringify(tree.roots)) problems.push('roots');
    checks.push(check(`${id} tree is consistent`, problems.length === 0, problems));
    const version = live.getState().contentVersion;
    checks.push(
      check(`${id} same tree object while the content is unchanged`, live.getBlocks() === tree, {
        version,
        treeVersion: tree.version,
      }),
    );
    const first = ordered.find((block) => block.textblock);
    if (first) {
      await target.run(
        [{ type: 'text.insert', text: 'x', range: { block: first.id, from: 0, to: 0 } }],
        { focus: false },
      );
      await settle();
      const next = live.getBlocks();
      checks.push(
        check(
          `${id} a new tree after a content change`,
          next !== tree && next.version > tree.version,
          {
            before: tree.version,
            after: next.version,
            contentVersion: live.getState().contentVersion,
          },
        ),
      );
    }
  }
  if (list.length === 2) {
    const diff = differences(trees[list[0]!], trees[list[1]!]);
    checks.push(check('both instances report equal trees', diff.length === 0, diff));
  }
  return report(checks, { trees });
}

/**
 * Geometry reads of one instance against the browser: `blockRects(id).content` against the
 * block element's client rectangle, `selectionRects()` and `caretRect()` against the composed
 * selection, each within 1 CSS pixel; no mutation anywhere while reading; an unknown identifier
 * answering `null` or `[]`; with `detach`, a hidden ancestor and a disconnected host answering
 * `null` or `[]` too.
 */
export async function assertGeometry(
  id: string,
  options: { readonly detach?: boolean } = {},
): Promise<Report> {
  const target = editorOf(id);
  const live = target.instance;
  if (!live) return report([check(`${id} is ready`, false, target.status)]);
  await settle();
  const observers = [document, ...shadowRoots()].map((root) => {
    const observer = new MutationObserver(() => {});
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    return observer;
  });
  const ordered = live.getBlocks().ordered();
  const blockProblems: string[] = [];
  const inside = (outer: DOMRectReadOnly, inner: DOMRectReadOnly) =>
    inner.left >= outer.left - 1 &&
    inner.top >= outer.top - 1 &&
    inner.right <= outer.right + 1 &&
    inner.bottom <= outer.bottom + 1;
  for (const block of ordered) {
    const rects = live.blockRects(block.id);
    const element = live.blockElement(block.id);
    if (!rects || !element) {
      blockProblems.push(`${block.id}: ${rects ? 'no element' : 'no rects'}`);
      continue;
    }
    if (!inside(rects.box, element.getBoundingClientRect())) blockProblems.push(`${block.id}.box`);
    if (!inside(rects.box, rects.content)) blockProblems.push(`${block.id}.content`);
    if (!inside(rects.content, rects.firstLine)) blockProblems.push(`${block.id}.firstLine`);
  }
  const selection = live.selectionRects();
  const caret = live.caretRect();
  const ranges = composedRanges(id).filter((range) => range.inRoot);
  const unknown = {
    blockRects: live.blockRects('unknown-block-id'),
    rangeRects: live.rangeRects({ block: 'unknown-block-id', from: 0, to: 1 }),
    blockElement: live.blockElement('unknown-block-id'),
  };
  const mutations = observers.reduce((sum, observer) => {
    const count = observer.takeRecords().length;
    observer.disconnect();
    return sum + count;
  }, 0);
  const union = (rects: readonly { x: number; y: number; width: number; height: number }[]) => {
    if (rects.length === 0) return null;
    const left = Math.min(...rects.map((rect) => rect.x));
    const top = Math.min(...rects.map((rect) => rect.y));
    const right = Math.max(...rects.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
  };
  const composed = union(
    ranges.flatMap(
      (range) => range.rects as { x: number; y: number; width: number; height: number }[],
    ),
  );
  const ours = union(selection);
  const state = target.state.selection;
  const collapsed = state.kind === 'text' && state.empty;
  const near = (a: { x: number; y: number; width: number; height: number } | null, b: typeof a) =>
    !a || !b
      ? a === b
      : (['x', 'y', 'width', 'height'] as const).every((key) => Math.abs(a[key] - b[key]) <= 1);
  const checks: Check[] = [
    check(
      'block boxes hold their elements, contents and first lines within 1 px',
      blockProblems.length === 0,
      blockProblems,
    ),
    check('no mutation while reading geometry', mutations === 0, mutations),
    check(
      'unknown identifiers answer null or []',
      unknown.blockRects === null &&
        unknown.rangeRects.length === 0 &&
        unknown.blockElement === null,
      summarize(unknown),
    ),
  ];
  if (!collapsed && state.kind === 'text' && composed)
    checks.push(
      check('selection rects cover the composed range within 1 px', near(ours, composed), {
        selection: ours,
        composed,
      }),
    );
  if (collapsed && caret && composed && composed.height > 0)
    checks.push(
      check(
        'caret rect at the composed caret within 1 px',
        Math.abs(caret.x - composed.x) <= 1 && Math.abs(caret.y - composed.y) <= 1,
        {
          caret: summarize(caret),
          composed,
        },
      ),
    );
  if (options.detach) {
    const first = ordered[0]?.id;
    const slot = document.querySelector<HTMLElement>(`[data-instance="${id}"]`);
    if (first && slot) {
      slot.hidden = true;
      const hidden = { blockRects: live.blockRects(first), caret: live.caretRect() };
      slot.hidden = false;
      const parent = slot.parentElement!;
      const next = slot.nextSibling;
      slot.remove();
      const detached = { blockRects: live.blockRects(first), selection: live.selectionRects() };
      parent.insertBefore(slot, next);
      checks.push(
        check(
          'a hidden ancestor answers null',
          hidden.blockRects === null && hidden.caret === null,
          summarize(hidden),
        ),
        check(
          'a disconnected host answers null or []',
          detached.blockRects === null && detached.selection.length === 0,
          summarize(detached),
        ),
      );
    }
  }
  return report(checks, {
    selection: state,
    caret: summarize(caret),
    selectionRects: summarize(selection),
    composed: ranges,
  });
}

/**
 * Engine DOM writes: with `steps`, mutations outside the editing root while they run (each step
 * receives the instance's facade); always, the attribute values in the editing root that equal a
 * block identifier and any `data-id` attribute there.
 */
export async function assertNoEngineDomWrites(
  id: string,
  steps: readonly ((editor: FixtureEditorLike) => unknown)[] = [],
): Promise<Report> {
  const target = editorOf(id);
  const root = target.root;
  if (!root || !target.instance) return report([check(`${id} is ready`, false, target.status)]);
  const outside: string[] = [];
  // Nodes that left the editing root while the steps ran. An engine may still move the children
  // of an element it replaced into the new element, and those records target its own detached
  // nodes; a detached node counts as outside only once it is back in the document.
  const leftRoot = new WeakSet<Node>();
  const inRoot = (node: Node): boolean =>
    node === root ||
    root.contains(node) ||
    (!node.isConnected && (leftRoot.has(node) || leftRoot.has(node.getRootNode())));
  const observers = [document, ...shadowRoots()].map((tree) => {
    const observer = new MutationObserver((records) => {
      // Until no record adds a node: a parent may leave the root after its children did.
      for (let grew = true; grew;) {
        grew = false;
        for (const record of records)
          if (inRoot(record.target))
            for (const removed of record.removedNodes)
              if (!leftRoot.has(removed)) {
                leftRoot.add(removed);
                grew = true;
              }
      }
      for (const record of records) {
        const node = record.target;
        if (inRoot(node)) continue;
        if ((node instanceof Element ? node : node.parentElement)?.closest('[data-fixture-chrome]'))
          continue;
        if (record.type === 'childList' && node === target.container) {
          // The mount itself replaces the root; anything else in the container is foreign.
          if ([...record.addedNodes, ...record.removedNodes].every((item) => item === root))
            continue;
        }
        outside.push(
          `${record.type} ${nodeLabel(node)}${record.attributeName ? `@${record.attributeName}` : ''}`,
        );
      }
    });
    observer.observe(tree, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    return observer;
  });
  for (const step of steps) {
    await step(target);
    await settle();
  }
  for (const observer of observers) {
    observer.takeRecords();
    observer.disconnect();
  }
  const blockIds = new Set(
    target.instance
      .getBlocks()
      .ordered()
      .map((block) => block.id),
  );
  const carriers: string[] = [];
  for (const element of [root, ...root.querySelectorAll('*')])
    for (const name of element.getAttributeNames())
      if (name === 'data-id' || blockIds.has(element.getAttribute(name) ?? ''))
        carriers.push(`${nodeLabel(element)}@${name}`);
  return report(
    [
      check('no mutation outside the editing root', outside.length === 0, outside.slice(0, 20)),
      check(
        'no attribute value equals a block identifier',
        carriers.length === 0,
        carriers.slice(0, 20),
      ),
    ],
    { steps: steps.length },
  );
}

// The action matrix (V-019, V-046) ------------------------------------------------------------

interface MatrixEntry {
  readonly type: TextEditorActionType;
  readonly corpus: string;
  /** The pair suffix, when the action needs one other than the requested pair. */
  readonly pair?: string;
  readonly select?: TextEditorSelectionInput;
  /** Requests run before the action, each as one `run`. */
  readonly setup?: readonly TextEditorAction[];
  readonly action: TextEditorAction;
}

/** The UTF-16 offset of `needle` in `text`, for text points in the corpus documents. */
const at = (text: string, needle: string): number => {
  const offset = text.indexOf(needle);
  if (offset < 0) throw new Error(`"${needle}" is not in "${text}".`);
  return offset;
};

const STATE_PROOF = 'Proof the rye loaves, then score the tops and check the oven twice.';
const STATE_WASH = 'Wash the trays before midnight.';
const STATE_DOCS = 'Every timing is in the recipe docs by the door.';
const STATE_TITLE = 'Night bake checklist';

const textRange = (block: string, from: number, to: number): TextEditorSelectionInput => ({
  kind: 'text',
  anchor: { block, offset: from },
  head: { block, offset: to },
});
const caretAt = (block: string, offset: number): TextEditorSelectionInput => ({
  kind: 'text',
  anchor: { block, offset },
});

/** Each of the 37 action types once, on a fitting target of a corpus document. */
export const ACTION_MATRIX: readonly MatrixEntry[] = Object.freeze([
  {
    type: 'mark.toggle',
    corpus: 'state',
    select: textRange('state00002', 0, 5),
    action: { type: 'mark.toggle', mark: 'bold' },
  },
  {
    type: 'mark.color',
    corpus: 'state',
    select: textRange('state00002', 0, 5),
    action: { type: 'mark.color', mark: 'text-color', color: 'green' },
  },
  {
    type: 'mark.clear',
    corpus: 'state',
    select: textRange('state00002', 0, STATE_PROOF.length),
    action: { type: 'mark.clear' },
  },
  {
    type: 'link.set',
    corpus: 'state',
    select: textRange('state00003', at(STATE_WASH, 'trays'), at(STATE_WASH, 'trays') + 5),
    action: { type: 'link.set', href: 'https://bakery.example/trays' },
  },
  {
    type: 'link.unset',
    corpus: 'state',
    select: caretAt('state00004', at(STATE_DOCS, 'docs') + 2),
    action: { type: 'link.unset' },
  },
  {
    type: 'block.set-type',
    corpus: 'state',
    select: caretAt('state00003', 0),
    action: { type: 'block.set-type', kind: 'heading', attrs: { level: 3 } },
  },
  {
    type: 'block.set-attrs',
    corpus: 'state',
    action: { type: 'block.set-attrs', id: 'state00001', attrs: { level: 3 } },
  },
  {
    type: 'block.align',
    corpus: 'state',
    select: caretAt('state00002', 0),
    action: { type: 'block.align', align: 'end' },
  },
  { type: 'block.indent', corpus: 'state', action: { type: 'block.indent', ids: ['state00009'] } },
  {
    type: 'block.outdent',
    corpus: 'lists',
    action: { type: 'block.outdent', ids: ['lists00003'] },
  },
  {
    type: 'blocks.insert',
    corpus: 'state',
    action: { type: 'blocks.insert', kind: 'divider', at: { after: 'state00003' } },
  },
  {
    type: 'blocks.move',
    corpus: 'state',
    action: { type: 'blocks.move', ids: ['state00003'], to: { parent: null, index: 0 } },
  },
  {
    type: 'blocks.duplicate',
    corpus: 'state',
    action: { type: 'blocks.duplicate', ids: ['state00002'] },
  },
  {
    type: 'blocks.delete',
    corpus: 'state',
    action: { type: 'blocks.delete', ids: ['state00003'] },
  },
  {
    type: 'text.insert',
    corpus: 'state',
    select: caretAt('state00001', STATE_TITLE.length),
    action: { type: 'text.insert', text: ' tonight' },
  },
  {
    type: 'text.delete',
    corpus: 'state',
    action: { type: 'text.delete', range: { block: 'state00001', from: 0, to: 6 } },
  },
  {
    type: 'inline.insert',
    corpus: 'state',
    pair: 'custom',
    select: caretAt('state00002', STATE_PROOF.length),
    action: { type: 'inline.insert', kind: 'mention', attrs: { person: 'u-8', label: 'Ines' } },
  },
  {
    type: 'content.insert',
    corpus: 'state',
    action: {
      type: 'content.insert',
      content: {
        kind: 'blocks',
        blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'Knead again at dawn.' }] }],
      },
      at: { kind: 'caret', block: 'state00005', position: 'start' },
    },
  },
  {
    type: 'content.set',
    corpus: 'state',
    action: {
      type: 'content.set',
      content: '<p>Shift handed over.</p>',
      format: 'html',
      history: 'push',
    },
  },
  {
    type: 'selection.set',
    corpus: 'state',
    action: {
      type: 'selection.set',
      selection: { kind: 'caret', block: 'state00004', position: 'end' },
    },
  },
  {
    type: 'history.undo',
    corpus: 'state',
    select: caretAt('state00001', STATE_TITLE.length),
    setup: [{ type: 'text.insert', text: ' tonight' }],
    action: { type: 'history.undo' },
  },
  {
    type: 'history.redo',
    corpus: 'state',
    select: caretAt('state00001', STATE_TITLE.length),
    setup: [{ type: 'text.insert', text: ' tonight' }, { type: 'history.undo' }],
    action: { type: 'history.redo' },
  },
  {
    type: 'table.insert-row',
    corpus: 'tables',
    action: { type: 'table.insert-row', table: 'tables0002', index: 1 },
  },
  {
    type: 'table.insert-column',
    corpus: 'tables',
    action: { type: 'table.insert-column', table: 'tables0002', index: 1 },
  },
  {
    type: 'table.delete-rows',
    corpus: 'tables',
    action: { type: 'table.delete-rows', table: 'tables0002', from: 1, to: 1 },
  },
  {
    type: 'table.delete-columns',
    corpus: 'tables',
    action: { type: 'table.delete-columns', table: 'tables0002', from: 1, to: 1 },
  },
  {
    type: 'table.move-row',
    corpus: 'tables',
    action: { type: 'table.move-row', table: 'tables0002', from: 2, to: 1 },
  },
  {
    type: 'table.move-column',
    corpus: 'tables',
    action: { type: 'table.move-column', table: 'tables0002', from: 2, to: 0 },
  },
  {
    type: 'table.duplicate-row',
    corpus: 'tables',
    action: { type: 'table.duplicate-row', table: 'tables0002', index: 1 },
  },
  {
    type: 'table.duplicate-column',
    corpus: 'tables',
    action: { type: 'table.duplicate-column', table: 'tables0002', index: 1 },
  },
  {
    type: 'table.merge-cells',
    corpus: 'tables',
    action: {
      type: 'table.merge-cells',
      table: 'tables0002',
      range: { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } },
    },
  },
  {
    type: 'table.split-cell',
    corpus: 'tables',
    action: { type: 'table.split-cell', table: 'tables0003', cell: { row: 1, column: 1 } },
  },
  {
    type: 'table.set-header',
    corpus: 'tables',
    action: { type: 'table.set-header', table: 'tables0002', column: true },
  },
  {
    type: 'table.align',
    corpus: 'tables',
    action: { type: 'table.align', table: 'tables0002', target: { column: 1 }, align: 'center' },
  },
  {
    type: 'table.background',
    corpus: 'tables',
    action: { type: 'table.background', table: 'tables0002', target: { row: 1 }, color: 'green' },
  },
  {
    type: 'table.column-widths',
    corpus: 'tables',
    action: { type: 'table.column-widths', table: 'tables0002', widths: [160, 120, 96] },
  },
  {
    type: 'table.clear-cells',
    corpus: 'tables',
    action: {
      type: 'table.clear-cells',
      table: 'tables0002',
      range: { anchor: { row: 1, column: 0 }, head: { row: 1, column: 2 } },
    },
  },
] satisfies MatrixEntry[]);

/** The first block of each matrix document, where the `can` mode moves the caret. */
const FIRST_BLOCK: Readonly<Record<string, string>> = {
  state: 'state00001',
  lists: 'lists00001',
  tables: 'tabpara001',
};

export interface ActionMatrixOptions {
  /** `run` (V-046, default): each action through `run`; `can` (V-019): dry runs only. */
  readonly mode?: 'run' | 'can' | undefined;
  /** The pair suffix; default `default`. */
  readonly pair?: string | undefined;
  /** Only these action types. */
  readonly only?: readonly TextEditorActionType[] | undefined;
  /** Compare geometry too (run mode); default false. */
  readonly geometry?: boolean | undefined;
}

async function prepare(target: FixtureEditorLike, entry: MatrixEntry): Promise<void> {
  await resetEditor(target.id, entry.corpus);
  if (entry.select)
    await target.run({ type: 'selection.set', selection: entry.select }, { focus: false });
  for (const action of entry.setup ?? []) await target.run(action, { focus: false });
  await settle();
  target.clear();
}

const contentOf = (target: FixtureEditorLike) =>
  JSON.stringify([
    target.getContent('html'),
    target.instance
      ?.getBlocks()
      .ordered()
      .map((block) => [block.id, block.kind]),
  ]);

/**
 * The 37-action matrix on a pair from identical states. `run` mode: after each action equal
 * canonical HTML, block tree and state on both engines, equal outcomes, and one request and one
 * `tp-value-change` for each action that changed the document. `can` mode: before and after a
 * caret move, `can` never throws, records no mutation, leaves `version` and history unchanged and
 * answers equally on both engines; a malformed payload answers `false`.
 */
export async function assertActionMatrix(options: ActionMatrixOptions = {}): Promise<Report> {
  const mode = options.mode ?? 'run';
  const entries = ACTION_MATRIX.filter(
    (entry) => !options.only || options.only.includes(entry.type),
  );
  const checks: Check[] = [];
  const records: Record<string, unknown> = {};
  for (const entry of entries) {
    const pair = pairIds({ pair: entry.pair ?? options.pair ?? 'default' });
    const sides = pair.map((id) => editorOf(id));
    if (mode === 'can') {
      const answers: unknown[] = [];
      for (const target of sides) {
        await prepare(target, entry);
        answers.push(await dryRuns(target, entry));
      }
      const [a, b] = answers as { before: boolean; after: boolean; problems: string[] }[];
      checks.push(
        check(`${entry.type}: can() clean on ${pair[0]}`, a!.problems.length === 0, a!.problems),
        check(`${entry.type}: can() clean on ${pair[1]}`, b!.problems.length === 0, b!.problems),
        check(`${entry.type}: equal answers`, a!.before === b!.before && a!.after === b!.after, {
          a,
          b,
        }),
      );
      records[entry.type] = { a, b };
      continue;
    }
    const outcomes: { outcome: unknown; requests: number; changes: number; changed: boolean }[] =
      [];
    for (const target of sides) {
      await prepare(target, entry);
      const before = contentOf(target);
      const outcome = await target
        .run(entry.action, { focus: false })
        .catch((error: unknown) => ({ rejected: errorName(error) }));
      await settle();
      await settle();
      const log = target.events();
      outcomes.push({
        outcome,
        requests: log.filter((event) => event.type === EVENT_NAMES.request).length,
        changes: log.filter((event) => event.type === EVENT_NAMES.valueChange).length,
        changed: contentOf(target) !== before,
      });
    }
    const [a, b] = outcomes;
    const expected = (side: (typeof outcomes)[number]) =>
      entry.type === 'selection.set'
        ? side.requests === 0 && side.changes === 0
        : side.changed
          ? side.requests === 1 && side.changes === 1
          : side.changes === 0;
    checks.push(
      check(
        `${entry.type}: equal outcomes`,
        JSON.stringify(a!.outcome) === JSON.stringify(b!.outcome),
        { a: a!.outcome, b: b!.outcome },
      ),
      check(
        `${entry.type}: one request and one value change per change on ${pair[0]}`,
        expected(a!),
        a,
      ),
      check(
        `${entry.type}: one request and one value change per change on ${pair[1]}`,
        expected(b!),
        b,
      ),
      ...compareSnapshots(snapshot(pair[0]), snapshot(pair[1]), {
        geometry: options.geometry ?? false,
        label: entry.type,
      }),
    );
    records[entry.type] = { a, b };
  }
  return report(checks, records);
}

/** Members of the wrong type for every payload member an action can have. */
const MALFORMED = Object.freeze({
  mark: 'none',
  color: 'puce',
  href: 5,
  text: 4,
  range: 7,
  kind: 9,
  attrs: 'x',
  ids: 'x',
  id: 1,
  align: 'sideways',
  at: 'x',
  select: 'x',
  to: 'x',
  content: 1,
  format: 'rtf',
  history: 'x',
  selection: 3,
  table: 42,
  index: -1,
  from: 'x',
  row: 'x',
  column: 'x',
  cell: 'x',
  target: 'x',
  widths: 'x',
});

async function dryRuns(
  target: FixtureEditorLike,
  entry: MatrixEntry,
): Promise<{ before: boolean; after: boolean; malformed: boolean; problems: string[] }> {
  const live = target.instance;
  if (!live) return { before: false, after: false, malformed: false, problems: ['not ready'] };
  const problems: string[] = [];
  const probeOnce = (): boolean => {
    const root = target.root!;
    const observer = new MutationObserver(() => {});
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const state = live.getState();
    let answer = false;
    try {
      answer = live.can(entry.action);
    } catch (error) {
      problems.push(`threw ${errorName(error)}`);
    }
    const after = live.getState();
    const mutations = observer.takeRecords().length;
    observer.disconnect();
    if (mutations > 0) problems.push(`${mutations} mutations`);
    if (after.version !== state.version) problems.push('version changed');
    if (JSON.stringify(after.history) !== JSON.stringify(state.history))
      problems.push('history changed');
    return answer;
  };
  const before = probeOnce();
  await target.run(
    {
      type: 'selection.set',
      selection: { kind: 'caret', block: FIRST_BLOCK[entry.corpus]!, position: 'end' },
    },
    { focus: false },
  );
  await settle();
  const after = probeOnce();
  let malformed = true;
  try {
    malformed = live.can({ ...MALFORMED, type: entry.type } as unknown as TextEditorAction);
  } catch (error) {
    problems.push(`malformed threw ${errorName(error)}`);
  }
  // A type without payload members cannot be malformed by its members.
  if (malformed && !['mark.clear', 'history.undo', 'history.redo'].includes(entry.type))
    problems.push('a malformed payload answered true');
  return { before, after, malformed, problems };
}

// Named parity scenarios ----------------------------------------------------------------------

parityScenarios.set('actions', (options) =>
  assertActionMatrix({ mode: 'run', pair: options.pair }),
);
parityScenarios.set('can', (options) => assertActionMatrix({ mode: 'can', pair: options.pair }));

/**
 * V-191: the resolved tools of every surface compared across the pair in scripted states: the
 * caret in a paragraph, a heading, a list item, a code block, a table cell and a link, and the
 * paragraph again while read-only.
 */
parityScenarios.set('tools', async (options) => {
  const [first, second] = pairIds(options);
  const states: [string, TextEditorSelectionInput, boolean][] = [
    ['paragraph', caretAt('state00002', 3), false],
    ['heading', caretAt('state00001', 3), false],
    ['list item', caretAt('state00008', 2), false],
    ['code block', caretAt('state00007', 4), false],
    [
      'table cell',
      { kind: 'caret', block: 'state00006', cell: { row: 0, column: 0 }, position: 'end' },
      false,
    ],
    ['link', caretAt('state00004', at(STATE_DOCS, 'docs') + 1), false],
    ['read-only paragraph', caretAt('state00002', 3), true],
  ];
  const checks: Check[] = [];
  const records: Record<string, unknown> = {};
  for (const [name, selection, readOnly] of states) {
    const resolved: unknown[] = [];
    for (const id of [first, second]) {
      const target = editorOf(id);
      target.readOnly = false;
      await resetEditor(id, 'state');
      await target.run({ type: 'selection.set', selection }, { focus: false });
      target.readOnly = readOnly;
      await settle();
      resolved.push(surfaces(id));
    }
    for (const id of [first, second]) editorOf(id).readOnly = false;
    const diff = differences(resolved[0], resolved[1]);
    checks.push(check(`tools equal with the caret in a ${name}`, diff.length === 0, diff));
    records[name] = resolved[0];
  }
  return report(checks, records);
});
