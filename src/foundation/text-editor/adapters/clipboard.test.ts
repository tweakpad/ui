/**
 * Clipboard goldens of both engine adapters (node environment; Widgets `uwg-te-req-content-6`,
 * `uwg-te-req-engine-12`).
 *
 * One source document is mounted headless in each engine (Tiptap over the real engine with a
 * structural view, Lexical as the adapter's real editor without a root). For four selections the
 * payload of a copy is taken through each adapter's clipboard handler, which writes the clipboard
 * data of the copy's event: Tiptap's `copy` handler of its editor props, and Lexical's
 * `COPY_COMMAND` listener, which its extension registers, on the rootless editor.
 * The two flavours are stored as
 * `tiptap/goldens/clipboard/<case>.json` and `lexical/goldens/clipboard/<case>.json`.
 *
 * The cases check that each payload parses with the shared clipboard reader to the fragment of the
 * selection, with its record (a text range or blocks), and that both engines write the same
 * payload. A payload of either engine inserted with `content.insert` into the other gives the same
 * canonical HTML, a range merging into the text at the point and blocks following its block.
 * Foreign HTML reads as a text range.
 *
 * The golden rule of `goldens.test.ts` applies: a golden changes only with a deliberate, reviewed
 * change of an adapter, the shared serializers or an engine pin. Regenerate with
 * `TEXT_EDITOR_UPDATE_GOLDENS=1 npx vitest run src/foundation/text-editor/adapters/clipboard.test.ts`
 * and review every changed file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importHtml, readClipboardHtml } from '../content/html.js';
import { htmlSource } from '../content/html-source.test.js';
import { canonicalize, type TextEditorPortableFragment } from '../content/portable.js';
import type { TextEditorEngineInstance } from '../engine.js';
import type { TextEditorSelectionInput, TextEditorTextPoint } from '../model.js';
import { blocksFragment, rangeFragment } from './shared/fragments.js';
import { headlessLexical } from './lexical/lexical-stubs.test.js';
import { html, mountTiptap, type StubView } from './tiptap/tiptap-stubs.test.js';

const UPDATE = process.env.TEXT_EDITOR_UPDATE_GOLDENS === '1';

/** The source: two paragraphs with marks and a link, a table with a header row, a paragraph. */
const SOURCE = [
  '<p data-id="c1">Pack the <strong>rain shell</strong> first.</p>',
  '<p data-id="c2">Then the <a href="https://camp.example/stove">stove</a> and the fuel.</p>',
  '<table data-id="c3"><thead><tr><th><p>Item</p></th><th><p>Weight</p></th></tr></thead>' +
    '<tbody><tr><td><p>Tent <em>body</em></p></td><td><p>1.2 kg</p></td></tr></tbody></table>',
  '<p data-id="c4">Check the list twice.</p>',
].join('\n');

/** Identifiers `n000000001`, … in order, the same in both engines. */
const sequence = () => {
  let count = 0;
  return () => `n${String((count += 1)).padStart(9, '0')}`;
};

const point = (block: string, offset: number, cell?: TextEditorTextPoint['cell']) =>
  ({ block, offset, ...(cell ? { cell } : {}) }) satisfies TextEditorTextPoint;

interface ClipboardCase {
  readonly name: string;
  readonly selection: TextEditorSelectionInput;
  readonly record: TextEditorPortableFragment['kind'];
}

/**
 * The selections: a text range across two paragraphs, one inside a paragraph, a block selection of
 * two blocks and a range in a table cell. The payloads that the widget's block mode copies in a
 * browser are checked on the widget's pages.
 */
const CASES: readonly ClipboardCase[] = [
  {
    name: 'range-two-paragraphs',
    selection: { kind: 'text', anchor: point('c1', 9), head: point('c2', 14) },
    record: 'range',
  },
  {
    name: 'range-one-paragraph',
    selection: { kind: 'text', anchor: point('c1', 9), head: point('c1', 19) },
    record: 'range',
  },
  { name: 'blocks-two', selection: { kind: 'blocks', ids: ['c1', 'c2'] }, record: 'blocks' },
  {
    name: 'range-table-cell',
    selection: {
      kind: 'text',
      anchor: point('c3', 0, { row: 1, column: 0, paragraph: 0 }),
      head: point('c3', 9, { row: 1, column: 0, paragraph: 0 }),
    },
    record: 'range',
  },
];

/** The two flavours of a copy. */
interface Payload {
  readonly 'text/html': string;
  readonly 'text/plain': string;
}

/** One engine as the clipboard goldens see it. */
interface ClipboardEngine {
  readonly folder: 'tiptap' | 'lexical';
  /** A headless mount of HTML content. */
  mount(content: string): TextEditorEngineInstance;
  /** The payload that a copy of the instance's selection writes. */
  copy(instance: TextEditorEngineInstance): Payload;
}

const EXECUTE = { reason: 'imperative-action', focus: false } as const;

/** The mounts of each engine, to reach the view or the runtime of an instance. */
const tiptapViews = new WeakMap<TextEditorEngineInstance, StubView>();
const lexicalRuntimes = new WeakMap<
  TextEditorEngineInstance,
  ReturnType<typeof headlessLexical>['rt']
>();

const tiptap: ClipboardEngine = {
  folder: 'tiptap',
  mount(content) {
    const { instance, view } = mountTiptap({ content: html(content), createId: sequence() });
    tiptapViews.set(instance, view);
    return instance;
  },
  copy(instance) {
    const view = tiptapViews.get(instance)!;
    const data = new Map<string, string>();
    let prevented = false;
    const event = {
      clipboardData: {
        clearData: () => data.clear(),
        setData: (format: string, value: string) => void data.set(format, value),
      },
      preventDefault: () => void (prevented = true),
    };
    const handlers = view.props.handleDOMEvents as Record<
      string,
      (view: StubView, event: unknown) => boolean
    >;
    expect(handlers.copy!(view, event)).toBe(true);
    expect(prevented).toBe(true);
    // Only the two flavours, in this order, and no engine attribute.
    expect([...data.keys()]).toEqual(['text/html', 'text/plain']);
    return { 'text/html': data.get('text/html')!, 'text/plain': data.get('text/plain')! };
  },
};

const lexical: ClipboardEngine = {
  folder: 'lexical',
  mount(content) {
    const { instance, rt } = headlessLexical({ html: content, createId: sequence() });
    lexicalRuntimes.set(instance, rt);
    return instance;
  },
  copy(instance) {
    const rt = lexicalRuntimes.get(instance)!;
    // The adapter's copy listener, registered by its extension, receives the copy's event.
    const data = new Map<string, string>();
    let prevented = false;
    const event = {
      clipboardData: { setData: (format: string, value: string) => void data.set(format, value) },
      preventDefault: () => void (prevented = true),
    };
    expect(rt.engine.dispatchCommand(rt.lexical.COPY_COMMAND, event)).toBe(true);
    expect(prevented).toBe(true);
    expect([...data.keys()]).toEqual(['text/html', 'text/plain']);
    return { 'text/html': data.get('text/html')!, 'text/plain': data.get('text/plain')! };
  },
};

const ENGINES = [tiptap, lexical] as const;

/** The payload of a case on an engine: the source mounted, the selection set, then a copy. */
function copyOf(engine: ClipboardEngine, entry: ClipboardCase): Payload {
  const instance = engine.mount(SOURCE);
  expect(instance.execute([{ type: 'selection.set', selection: entry.selection }], EXECUTE)).toBe(
    true,
  );
  return engine.copy(instance);
}

/** The golden payload of a case; update mode writes the engine's copy first. */
function golden(engine: ClipboardEngine, entry: ClipboardCase): Payload {
  const url = new URL(`${engine.folder}/goldens/clipboard/${entry.name}.json`, import.meta.url);
  if (UPDATE) {
    mkdirSync(new URL('./', url), { recursive: true });
    writeFileSync(url, `${JSON.stringify(copyOf(engine, entry), null, 2)}\n`);
  }
  return JSON.parse(readFileSync(url, 'utf8')) as Payload;
}

/** The source document, canonical and engine-independent. */
const sourceDocument = () => importHtml(htmlSource(SOURCE)).document;

/**
 * The fragment of a case's selection, from the shared fragment rules over the source, its blocks
 * canonical: a block the fragment gives no identifier (a cell's paragraph) takes `n000000001`, …
 */
function expectedFragment(entry: ClipboardCase): TextEditorPortableFragment {
  const document = sourceDocument();
  const { selection } = entry;
  const fragment =
    selection.kind === 'blocks'
      ? blocksFragment(document, selection.ids)
      : selection.kind === 'text'
        ? rangeFragment(document, selection.anchor, selection.head ?? selection.anchor)
        : null;
  if (!fragment) throw new Error(`No fragment for ${entry.name}.`);
  const { blocks } = canonicalize({ blocks: fragment.blocks }, { createId: sequence() }).document;
  return { kind: fragment.kind, blocks };
}

/** Clipboard HTML read by the shared clipboard reader, as a paste reads it. */
const read = (markup: string) => readClipboardHtml(htmlSource(markup), { createId: sequence() });

describe.each(ENGINES)('$folder clipboard goldens (uwg-te-req-content-6)', (engine) => {
  it.each(CASES)('V-131: $name: the copy equals the golden', (entry) => {
    expect(copyOf(engine, entry)).toStrictEqual(golden(engine, entry));
  });

  it.each(CASES)(
    'V-131: $name: the payload parses to the fragment of the selection with its record',
    (entry) => {
      const payload = golden(engine, entry);
      expect(payload['text/html']).toMatch(
        new RegExp(`^<div data-text-editor-fragment="${entry.record}">`, 'u'),
      );
      expect(payload['text/html']).not.toMatch(/data-pm-slice|data-lexical/u);
      const { fragment, diagnostics } = read(payload['text/html']);
      expect(diagnostics).toEqual([]);
      expect(fragment).toEqual(expectedFragment(entry));
    },
  );
});

/** Where the payloads are pasted: inside the last paragraph, `Check |the list twice.` */
const PASTE_AT: TextEditorSelectionInput = { kind: 'text', anchor: point('c4', 6) };

/** The source on an engine after a payload's fragment is inserted where a paste would put it. */
function pasteInto(engine: ClipboardEngine, payload: Payload): string {
  const instance = engine.mount(SOURCE);
  const { fragment } = read(payload['text/html']);
  expect(
    instance.execute([{ type: 'content.insert', content: fragment, at: PASTE_AT }], EXECUTE),
  ).toBe(true);
  return instance.getContent('html');
}

/** The last paragraph after each paste; identifiers of new blocks come from `n000000001`, … */
const PASTED: Readonly<Record<string, readonly string[]>> = {
  'range-two-paragraphs': [
    '<p data-id="c4">Check <strong>rain shell</strong> first.</p>',
    '<p data-id="n000000003">Then the <a href="https://camp.example/stove">stove</a>the list twice.</p>',
  ],
  'range-one-paragraph': ['<p data-id="c4">Check <strong>rain shell</strong>the list twice.</p>'],
  'blocks-two': [
    '<p data-id="c4">Check the list twice.</p>',
    '<p data-id="n000000001">Pack the <strong>rain shell</strong> first.</p>',
    '<p data-id="n000000002">Then the <a href="https://camp.example/stove">stove</a> and the fuel.</p>',
  ],
  'range-table-cell': ['<p data-id="c4">Check Tent <em>body</em>the list twice.</p>'],
};

describe('clipboard payloads across engines (uwg-te-req-content-6, uwg-te-req-engine-12)', () => {
  it.each(CASES)('V-131: $name: both engines write the same payload', (entry) => {
    expect(golden(tiptap, entry)).toStrictEqual(golden(lexical, entry));
  });

  it.each(CASES)(
    'V-131: $name: each payload inserted into the other engine gives the same canonical HTML',
    (entry) => {
      const intoLexical = pasteInto(lexical, golden(tiptap, entry));
      const intoTiptap = pasteInto(tiptap, golden(lexical, entry));
      expect(intoLexical).toBe(intoTiptap);
      // A range merges into the text at the point, blocks follow its block (reviewed values).
      expect(intoLexical).toBe(
        [...SOURCE.split('\n').slice(0, 3), ...PASTED[entry.name]!].join('\n'),
      );
    },
  );

  it('V-131: foreign HTML reads as a text range', () => {
    for (const markup of [
      '<p>From a web page</p><p>with two paragraphs</p>',
      '<meta charset="utf-8"><b>bold words</b> and plain ones',
      '<div data-text-editor-fragment="blocks"><p>a record</p></div><p>beside another block</p>',
      '<div data-text-editor-fragment="tables"><p>an unknown record</p></div>',
    ])
      expect(read(markup).fragment.kind, markup).toBe('range');
  });
});
