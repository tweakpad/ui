/**
 * Test helpers of the engine adapters and their shared core: the full default URL policy,
 * sequential identifiers, keyboard events that record what the engine did with them, one fake DOM
 * container for mounts with stub modules, and the portable documents and edit context of the
 * shared edit tests. Every adapter test and every shared test takes them from here.
 */
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { corpusNodes } from '../../../../../tests/fixtures/widgets/text-editor/corpus/nodes.js';
import { keyEvent as foundationKeyEvent } from '../../../fakes.test.js';
import { imageProtocols, linkProtocols } from '../../../markdown/url.js';
import { BASE_CAPABILITIES, type TextEditorCapability } from '../../capabilities.js';
import { htmlSource } from '../../content/html-source.test.js';
import { importHtml, serializeHtml } from '../../content/html.js';
import type {
  TextEditorPortableDocument,
  TextEditorPortableMarks,
  TextEditorPortableText,
} from '../../content/portable.js';
import type { TextEditorAction } from '../../actions.js';
import type { TextEditorUrlPolicy } from '../../engine.js';
import type { TextEditorTextSelectionInput } from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { resolveTextEditorCapabilities } from '../../tools.js';
import type { TextEditorFragmentContext } from './fragment-insert.js';

// Policies and identifiers

/** The full default URL policy of a mount: the default link and image protocols, `tel:` included. */
export const TEST_URLS: TextEditorUrlPolicy = Object.freeze({
  links: linkProtocols(null),
  images: imageProtocols(null),
});

/** Identifiers `<prefix>` and a counter of `digits` digits, from 1, in order. */
export function sequentialIds(prefix: string, digits: number): () => string {
  let count = 0;
  return () => `${prefix}${String((count += 1)).padStart(digits, '0')}`;
}

// Keyboard events

/** The modifiers of a key event. */
export interface TestKeyModifiers {
  readonly shift?: boolean | undefined;
  readonly ctrl?: boolean | undefined;
  readonly meta?: boolean | undefined;
  readonly alt?: boolean | undefined;
}

/** How often an event's default action was prevented and its propagation stopped. */
export interface TestKeyRecord {
  prevented: number;
  stopped: number;
}

/**
 * A cancelable `keydown` as an engine's key handling reads it, from the foundation's key event
 * fake, with a record of each `preventDefault` and `stopPropagation` call.
 */
export function keyEvent(
  key: string,
  init: TestKeyModifiers = {},
): { readonly event: KeyboardEvent; readonly record: TestKeyRecord } {
  const record: TestKeyRecord = { prevented: 0, stopped: 0 };
  const event = foundationKeyEvent(key, {
    shiftKey: init.shift === true,
    ctrlKey: init.ctrl === true,
    metaKey: init.meta === true,
    altKey: init.alt === true,
  });
  const prevent = event.preventDefault.bind(event);
  const stop = event.stopPropagation.bind(event);
  Object.defineProperties(event, {
    preventDefault: {
      value: () => {
        record.prevented += 1;
        prevent();
      },
    },
    stopPropagation: {
      value: () => {
        record.stopped += 1;
        stop();
      },
    },
  });
  return { event, record };
}

// A fake DOM for mounts with stub modules

/** Parses HTML through the test-only source builder, as a window's `DOMParser` would. */
class SourceParser {
  parseFromString(source: string) {
    return { body: htmlSource(source) };
  }
}

/** A document of fake elements whose window parses HTML through the source builder. */
export class FakeDocument {
  activeElement: FakeElement | null = null;
  body: FakeElement | null = null;
  readonly defaultView = { DOMParser: SourceParser };
  /** The document's selection, as `getSelection` returns it; none until a test sets one. */
  selection: FakeSelection | null = null;

  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  getSelection(): FakeSelection | null {
    return this.selection;
  }
}

/** A document selection as the adapters read it: its points, its direction and its ranges. */
export interface FakeSelection {
  readonly rangeCount: number;
  readonly anchorNode: unknown;
  readonly anchorOffset: number;
  readonly focusNode: unknown;
  readonly focusOffset: number;
  readonly direction: string;
  getComposedRanges?(options?: { readonly shadowRoots?: readonly unknown[] }): readonly {
    readonly startContainer: unknown;
    readonly startOffset: number;
    readonly endContainer: unknown;
    readonly endOffset: number;
  }[];
}

/**
 * A one-range selection from an anchor to a focus (a caret when the focus is left out), with the
 * direction the browser states for it: `none` for a selection that a mouse made.
 */
export function fakeSelection(
  anchorNode: unknown,
  anchorOffset: number,
  focusNode: unknown = anchorNode,
  focusOffset: number = anchorOffset,
  direction = 'none',
): FakeSelection {
  return { rangeCount: 1, anchorNode, anchorOffset, focusNode, focusOffset, direction };
}

/**
 * An element that records what an adapter does to it: attributes, children, inline styles,
 * listeners and focus. It is an event target, as the controller's cause tracker needs.
 */
export class FakeElement extends EventTarget {
  readonly tagName: string;
  readonly ownerDocument: FakeDocument;
  readonly children: FakeElement[] = [];
  /** Attributes by lowercase name. */
  readonly attributes = new Map<string, string>();
  /** Inline style declarations, as the CSSOM sets them. */
  readonly styles = new Map<string, string>();
  readonly style = {
    getPropertyValue: (name: string) => this.styles.get(name) ?? '',
    setProperty: (name: string, value: string) => void this.styles.set(name, value),
    removeProperty: (name: string) => void this.styles.delete(name),
  };
  /** Listeners by event type, as added and not removed. */
  readonly listeners = new Map<string, Set<unknown>>();
  parent: FakeElement | FakeDocument | null = null;
  /** Whether `focus()` was called after the last `blur()`. */
  focused = false;

  constructor(document: FakeDocument, tagName: string) {
    super();
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
  }

  get isConnected(): boolean {
    let current: FakeElement | FakeDocument | null = this.parent;
    while (current instanceof FakeElement) current = current.parent;
    return current === this.ownerDocument;
  }

  getRootNode(): FakeElement | FakeDocument {
    const parent = this.parent;
    return parent instanceof FakeElement ? parent.getRootNode() : (parent ?? this);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), String(value));
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase());
  }
  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.remove();
      node.parent = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes: FakeElement[]): void {
    for (const child of this.children) child.parent = null;
    this.children.length = 0;
    this.append(...nodes);
  }

  remove(): void {
    const parent = this.parent;
    if (parent instanceof FakeElement) parent.children.splice(parent.children.indexOf(this), 1);
    else if (parent && parent.body === this) parent.body = null;
    this.parent = null;
  }

  contains(node: unknown): boolean {
    let current: unknown = node;
    while (current instanceof FakeElement) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    super.addEventListener(type, listener, options);
  }

  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    this.listeners.get(type)?.delete(listener);
    super.removeEventListener(type, listener, options);
  }

  focus(): void {
    this.focused = true;
    const root = this.getRootNode();
    if (root instanceof FakeDocument) root.activeElement = this;
  }

  blur(): void {
    this.focused = false;
    const root = this.getRootNode();
    if (root instanceof FakeDocument && root.activeElement === this) root.activeElement = null;
  }
}

/** A `div` connected as the body of a new fake document: the container a mount receives. */
export function fakeContainer(): FakeElement {
  const document = new FakeDocument();
  const container = document.createElement('div');
  container.parent = document;
  document.body = container;
  return container;
}

// Portable documents of the shared edit tests

/** The capabilities of a mount with tables and every corpus node. */
export const FULL_CAPABILITIES: ReadonlySet<TextEditorCapability> = resolveTextEditorCapabilities(
  {
    capabilities: new Set<TextEditorCapability>([...BASE_CAPABILITIES, 'block.table']),
    supportsNode: () => true,
  },
  corpusNodes,
);

/**
 * The context of a shared edit: the full default URL policy, the corpus nodes and identifiers
 * `new001`, `new002`… in order.
 */
export function editContext(
  nodes: readonly TextEditorNodeDefinition[] = corpusNodes,
  capabilities: ReadonlySet<TextEditorCapability> = FULL_CAPABILITIES,
): TextEditorFragmentContext {
  return { urls: TEST_URLS, nodes, createId: sequentialIds('new', 3), capabilities };
}

/** The canonical document of HTML, read with the corpus nodes. */
export const readHtml = (html: string): TextEditorPortableDocument =>
  importHtml(htmlSource(html), { nodes: corpusNodes }).document;

/** The HTML of a document, or `'null'` for none. */
export const writeHtml = (document: TextEditorPortableDocument | null | undefined): string =>
  document ? serializeHtml(document, { nodes: corpusNodes }) : 'null';

/** A text node, with marks when given. */
export const textRun = (value: string, marks?: TextEditorPortableMarks): TextEditorPortableText =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };

/** A two-level list: item `a` holding `b` and `c`, then item `d`. */
export const NESTED_LIST =
  '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>';

/** A table `t1` whose last column's first cell spans both rows. */
export const ROW_SPAN_TABLE =
  '<table data-id="t1"><tbody><tr><td><p>a</p></td><td rowspan="2"><p>b</p></td></tr>' +
  '<tr><td><p>c</p></td></tr></tbody></table>';

export { corpusNodes };

// The whole-document selection (uwg-te-req-engine-4)

/**
 * Documents with a text selection from their first to their last text point, forward or backward,
 * and the block kinds that the state reports for the whole-document selection, an atom before the
 * first text point included.
 */
export const WHOLE_DOCUMENTS: readonly {
  readonly source: string;
  readonly selection: TextEditorTextSelectionInput;
  readonly kinds: readonly string[];
}[] = [
  {
    source: '<hr data-id="d1"><p data-id="p1"><strong>ab</strong></p><h2 data-id="h1">cd</h2>',
    selection: {
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'h1', offset: 2 },
    },
    kinds: ['divider', 'paragraph', 'heading:2'],
  },
  {
    source: '<h2 data-id="h1"><em>ab</em></h2>',
    selection: {
      kind: 'text',
      anchor: { block: 'h1', offset: 0 },
      head: { block: 'h1', offset: 2 },
    },
    kinds: ['heading:2'],
  },
  {
    source: '<p data-id="p1">ab</p><ul><li data-id="i1"><p>cd</p></li></ul>',
    selection: {
      kind: 'text',
      anchor: { block: 'i1', offset: 2 },
      head: { block: 'p1', offset: 0 },
    },
    kinds: ['paragraph', 'list-bullet'],
  },
];

/**
 * What each input over the whole-document selection leaves: one empty paragraph with a fresh
 * identifier, the input acting at its caret, written as `freshIds` writes it.
 */
export const WHOLE_DOCUMENT_INPUTS = [
  ['typing', '<p data-id="NEW">x</p>'],
  ['Enter', '<p data-id="NEW"></p>\n<p data-id="NEW"></p>'],
  ['Shift+Enter', '<p data-id="NEW"><br><br></p>'],
  ['Backspace', '<p data-id="NEW"></p>'],
  ['Delete', '<p data-id="NEW"></p>'],
  ['cut', '<p data-id="NEW"></p>'],
  ['text.insert', '<p data-id="NEW">x</p>'],
  ['content.insert', '<p data-id="NEW">x</p>'],
] as const;

/** An input of `WHOLE_DOCUMENT_INPUTS`. */
export type WholeDocumentInput = (typeof WHOLE_DOCUMENT_INPUTS)[number][0];

/** Action lists that keep the selection, each keeping the whole-document selection. */
export const SELECTION_KEEPING_ACTIONS: readonly (readonly TextEditorAction[])[] = [
  [{ type: 'block.align', align: 'center' }],
  [{ type: 'block.set-type', kind: 'heading', attrs: { level: 3 } }],
  [{ type: 'mark.toggle', mark: 'italic' }],
  [{ type: 'blocks.insert', kind: 'divider', select: 'none' }],
  [
    { type: 'block.align', align: 'end' },
    { type: 'mark.toggle', mark: 'bold' },
  ],
];

/** HTML with the identifiers that an adapter created written as `NEW`. */
export const freshIds = (html: string): string =>
  html.replace(/"(?:n\d{9}|gen\d{4}|new\d{3,4})"/gu, '"NEW"');

/** The declarations of each selector of a flat style sheet, as a base CSS writes them. */
export function cssRules(css: string): Map<string, Map<string, string>> {
  const rules = new Map<string, Map<string, string>>();
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu))
    for (const selector of selectors!.split(',').map((part) => part.trim())) {
      const declarations = rules.get(selector) ?? new Map<string, string>();
      for (const declaration of body!.split(';')) {
        const [name, ...value] = declaration.split(':');
        if (name?.trim() && value.length > 0) declarations.set(name.trim(), value.join(':').trim());
      }
      rules.set(selector, declarations);
    }
  return rules;
}

// A second copy of an engine

/** The library's installed packages. */
const INSTALLED = new URL('../../../../../node_modules/', import.meta.url).pathname;

/** A real second copy of engine packages and the module namespaces imported from it. */
export interface TestEngineCopy {
  /** The namespace of each module, by the key it was asked under. */
  readonly modules: Readonly<Record<string, unknown>>;
  /** Removes the copy's folder; the modules stay loaded. */
  remove(): void;
}

/**
 * A real second copy of an engine, for the checks that every module of a mount comes from one copy
 * of its engine: a fresh folder whose `node_modules` holds a copy of each installed package that
 * `copied` accepts and a link to every other one, so that the copies import each other and share
 * everything else. `specifiers` names the modules to import from it, by key.
 */
export async function engineCopy(
  copied: (name: string) => boolean,
  specifiers: Readonly<Record<string, string>>,
): Promise<TestEngineCopy> {
  const folder = mkdtempSync(join(tmpdir(), 'tp-engine-copy-'));
  const packages = join(folder, 'node_modules');
  mkdirSync(packages);
  const place = (name: string) =>
    copied(name)
      ? cpSync(join(INSTALLED, name), join(packages, name), { recursive: true })
      : symlinkSync(join(INSTALLED, name), join(packages, name));
  for (const name of readdirSync(INSTALLED)) {
    if (name.startsWith('.')) continue;
    if (!name.startsWith('@')) place(name);
    else {
      mkdirSync(join(packages, name));
      for (const member of readdirSync(join(INSTALLED, name))) place(`${name}/${member}`);
    }
  }
  // The entry lives among the packages, so that it resolves them as an application would.
  const entry = join(packages, 'tp-engine-copy.mjs');
  writeFileSync(
    entry,
    Object.entries(specifiers)
      .map(([key, specifier]) => `export * as ${key} from ${JSON.stringify(specifier)};\n`)
      .join(''),
  );
  const modules = (await import(/* @vite-ignore */ pathToFileURL(entry).href)) as Readonly<
    Record<string, unknown>
  >;
  return { modules, remove: () => rmSync(folder, { recursive: true, force: true }) };
}

describe('shared adapter test helpers', () => {
  it('the URL policy is the full default one, tel: included', () => {
    expect(TEST_URLS.links).toContain('tel:');
    expect(TEST_URLS.links).toEqual(linkProtocols(null));
    expect(TEST_URLS.images).toEqual(imageProtocols(null));
  });

  it('identifiers count up with a fixed width', () => {
    const next = sequentialIds('gen', 4);
    expect([next(), next()]).toEqual(['gen0001', 'gen0002']);
  });

  it('a key event records preventDefault and stopPropagation and keeps the default flag', () => {
    const { event, record } = keyEvent('Tab', { shift: true });
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
    event.preventDefault();
    event.stopPropagation();
    expect(record).toEqual({ prevented: 1, stopped: 1 });
    expect(event.defaultPrevented).toBe(true);
  });

  it('an engine copy imports real second copies of the copied packages only', async () => {
    const copy = await engineCopy((name) => name === 'orderedmap', {
      copied: 'orderedmap',
      linked: 'w3c-keyname',
    });
    try {
      const copied = (await import('orderedmap')) as Readonly<Record<string, unknown>>;
      const linked = (await import('w3c-keyname')) as Readonly<Record<string, unknown>>;
      const modules = copy.modules as Readonly<Record<string, Readonly<Record<string, unknown>>>>;
      expect(modules['copied']?.['default']).toBeTypeOf('function');
      expect(modules['copied']?.['default']).not.toBe(copied['default']);
      expect(modules['linked']?.['keyName']).toBe(linked['keyName']);
    } finally {
      copy.remove();
    }
  });

  it('the fake container is connected, records attributes and listeners and dispatches events', () => {
    const container = fakeContainer();
    const child = container.ownerDocument.createElement('p');
    container.append(child);
    expect(container.isConnected && child.isConnected).toBe(true);
    expect(container.contains(child)).toBe(true);
    child.setAttribute('Data-Id', 'p1');
    expect(child.getAttribute('data-id')).toBe('p1');
    let seen = 0;
    const listener = () => void (seen += 1);
    container.addEventListener('beforeinput', listener);
    container.dispatchEvent(new Event('beforeinput'));
    container.removeEventListener('beforeinput', listener);
    container.dispatchEvent(new Event('beforeinput'));
    expect(seen).toBe(1);
    expect(container.listeners.get('beforeinput')?.size).toBe(0);
    child.focus();
    expect(container.ownerDocument.activeElement).toBe(child);
    child.remove();
    expect(child.isConnected).toBe(false);
  });
});
