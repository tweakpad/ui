/**
 * Copy and cut payload goldens of both engine adapters over the round-trip corpus (node
 * environment; Widgets `uwg-te-req-content-6`, `uwg-te-req-engine-12`).
 *
 * Every corpus document (`01`–`08` and `portable`) is mounted headless in each engine from its
 * canonical HTML golden. Four clipboard events run through each adapter's own clipboard handler
 * (Tiptap's `copy` and `cut` handlers of its editor props, Lexical's `COPY_COMMAND` and
 * `CUT_COMMAND` listeners):
 *
 * - `copy-blocks`: a block selection of every block of the document;
 * - `copy-range`: a text range from the document's first text point to its last;
 * - `cut-blocks`: a block selection of every block but the first and the last;
 * - `cut-range`: a text range from the second character of the first block that holds text to
 *   the last but one character of the last one (a table's last cell when the document ends with
 *   a table).
 *
 * The payloads (`text/html` and `text/plain`) and, for a cut, the document's HTML afterwards are
 * stored as `tiptap/goldens/clipboard/corpus/<document>.json` and
 * `lexical/goldens/clipboard/corpus/<document>.json`. The cases check each engine against its
 * golden, that both engines' goldens are equal, that every `text/html` parses with the shared
 * clipboard reader to the fragment of its selection with its record, and that every `text/plain`
 * is the shared text serialization of that fragment.
 *
 * The golden rule of `goldens.test.ts` applies: a golden changes only with a deliberate, reviewed
 * change of an adapter, the shared serializers or an engine pin. Regenerate with
 * `TEXT_EDITOR_UPDATE_GOLDENS=1 npx vitest run src/foundation/text-editor/adapters/clipboard-corpus.test.ts`
 * and review every changed file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CORPUS_ENTRIES, corpusGolden, corpusNodes } from '../content/corpus.test.js';
import { importHtml, readClipboardHtml } from '../content/html.js';
import { htmlSource } from '../content/html-source.test.js';
import { firstTextEdge } from '../content/edges.js';
import {
  canonicalize,
  isListItem,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableFragment,
} from '../content/portable.js';
import { writeText } from '../content/text.js';
import type { TextEditorEngineInstance } from '../engine.js';
import type { TextEditorSelectionInput, TextEditorTextPoint } from '../model.js';
import type { TextEditorNodeDefinition } from '../nodes.js';
import { headlessLexical, type Headless } from './lexical/lexical-stubs.test.js';
import { blocksFragment, rangeFragment } from './shared/fragments.js';
import { html, mountTiptap, type StubView } from './tiptap/tiptap-stubs.test.js';

const UPDATE = process.env.TEXT_EDITOR_UPDATE_GOLDENS === '1';

/** Identifiers `n000000001`, … in order, the same in both engines. */
const sequence = () => {
  let count = 0;
  return () => `n${String((count += 1)).padStart(9, '0')}`;
};

/** A corpus document with its custom nodes. */
interface ClipboardDocument {
  readonly name: string;
  readonly nodes: readonly TextEditorNodeDefinition[];
}

const DOCUMENTS: readonly ClipboardDocument[] = [
  ...CORPUS_ENTRIES.map(({ name, nodes }) => ({ name, nodes: nodes ?? [] })),
  { name: 'portable', nodes: [] },
];

type CaseName = 'copy-blocks' | 'copy-range' | 'cut-blocks' | 'cut-range';
const CASE_NAMES: readonly CaseName[] = ['copy-blocks', 'copy-range', 'cut-blocks', 'cut-range'];

/** The two flavours a clipboard event writes. */
interface Payload {
  readonly 'text/html': string;
  readonly 'text/plain': string;
}

/** A case's golden: the payload, and for a cut the document's HTML afterwards. */
interface CaseGolden {
  readonly payload: Payload;
  readonly html?: string;
}

type DocumentGolden = Readonly<Record<CaseName, CaseGolden>>;

/** The canonical portable document of a corpus document. */
function canonicalOf(document: ClipboardDocument): TextEditorPortableDocument {
  const read = importHtml(htmlSource(corpusGolden(`${document.name}.html`)), {
    nodes: document.nodes,
  });
  expect(read.diagnostics).toEqual([]);
  return read.document;
}

/** The blocks that hold text, in document order, nested items included. */
const textblocks = (blocks: readonly TextEditorPortableBlock[]): TextEditorPortableBlock[] =>
  blocks.flatMap((block) => [
    ...(block.type === 'table' || 'content' in block ? [block] : []),
    ...(isListItem(block) ? textblocks(block.children) : []),
  ]);

/** A text point two characters into a textblock, or its start when it is shorter. */
function nearEdge(
  block: TextEditorPortableBlock,
  side: 'start' | 'end',
): TextEditorTextPoint | null {
  const edge = firstTextEdge([block], side);
  if (!edge || edge.cell) return edge;
  return side === 'start'
    ? { ...edge, offset: Math.min(1, edge.offset === 0 ? 1 : edge.offset) }
    : { ...edge, offset: Math.max(0, edge.offset - 1) };
}

/** The selection of a case over a document; `null` when the document has no such selection. */
function selectionOf(
  document: TextEditorPortableDocument,
  name: CaseName,
): TextEditorSelectionInput | null {
  const ids = document.blocks.map(({ id }) => id!);
  const ordered = textblocks(document.blocks);
  switch (name) {
    case 'copy-blocks':
      return { kind: 'blocks', ids };
    case 'cut-blocks':
      return ids.length < 3 ? null : { kind: 'blocks', ids: ids.slice(1, -1) };
    case 'copy-range': {
      const anchor = firstTextEdge(ordered, 'start');
      const head = firstTextEdge([...ordered].reverse(), 'end');
      return anchor && head ? { kind: 'text', anchor, head } : null;
    }
    case 'cut-range': {
      const anchor = ordered[0] && nearEdge(ordered[0], 'start');
      const head = ordered.at(-1) && nearEdge(ordered.at(-1)!, 'end');
      return anchor && head && ordered.length > 1 ? { kind: 'text', anchor, head } : null;
    }
  }
}

/** The fragment the shared rules take for a selection, canonical as the reader returns it. */
function expectedFragment(
  document: TextEditorPortableDocument,
  selection: TextEditorSelectionInput,
  nodes: readonly TextEditorNodeDefinition[],
): TextEditorPortableFragment {
  const fragment =
    selection.kind === 'blocks'
      ? blocksFragment(document, selection.ids)
      : selection.kind === 'text'
        ? rangeFragment(document, selection.anchor, selection.head ?? selection.anchor)
        : null;
  if (!fragment) throw new Error('No fragment for the selection.');
  const { blocks } = canonicalize(
    { blocks: fragment.blocks },
    { nodes, createId: sequence() },
  ).document;
  return { kind: fragment.kind, blocks };
}

/** One engine as these goldens see it. */
interface ClipboardEngine {
  readonly folder: 'tiptap' | 'lexical';
  mount(content: string, nodes: readonly TextEditorNodeDefinition[]): TextEditorEngineInstance;
  /** Runs a copy or a cut of the instance's selection and returns what it wrote. */
  event(instance: TextEditorEngineInstance, type: 'copy' | 'cut'): Payload;
}

const tiptapViews = new WeakMap<TextEditorEngineInstance, StubView>();
const lexicalMounts = new WeakMap<TextEditorEngineInstance, Headless>();

const tiptap: ClipboardEngine = {
  folder: 'tiptap',
  mount(content, nodes) {
    const { instance, view } = mountTiptap({ content: html(content), nodes, createId: sequence() });
    tiptapViews.set(instance, view);
    return instance;
  },
  event(instance, type) {
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
    expect(handlers[type]!(view, event)).toBe(true);
    expect(prevented).toBe(true);
    expect([...data.keys()]).toEqual(['text/html', 'text/plain']);
    return { 'text/html': data.get('text/html')!, 'text/plain': data.get('text/plain')! };
  },
};

const lexical: ClipboardEngine = {
  folder: 'lexical',
  mount(content, nodes) {
    const headless = headlessLexical({ html: content, nodes, createId: sequence() });
    lexicalMounts.set(headless.instance, headless);
    return headless.instance;
  },
  event(instance, type) {
    const { rt, editor } = lexicalMounts.get(instance)!;
    const data = new Map<string, string>();
    let prevented = false;
    const event = {
      clipboardData: { setData: (format: string, value: string) => void data.set(format, value) },
      preventDefault: () => void (prevented = true),
    };
    const command = type === 'copy' ? rt.lexical.COPY_COMMAND : rt.lexical.CUT_COMMAND;
    expect(rt.engine.dispatchCommand(command, event)).toBe(true);
    editor.read(() => undefined);
    expect(prevented).toBe(true);
    expect([...data.keys()]).toEqual(['text/html', 'text/plain']);
    return { 'text/html': data.get('text/html')!, 'text/plain': data.get('text/plain')! };
  },
};

const ENGINES = [tiptap, lexical] as const;

const EXECUTE = { reason: 'imperative-action', focus: false } as const;

/** What an engine writes for every case of a document; a case without a selection is left out. */
function run(engine: ClipboardEngine, document: ClipboardDocument): Partial<DocumentGolden> {
  const canonical = canonicalOf(document);
  const content = corpusGolden(`${document.name}.html`);
  const result: Partial<Record<CaseName, CaseGolden>> = {};
  for (const name of CASE_NAMES) {
    const selection = selectionOf(canonical, name);
    if (!selection) continue;
    const instance = engine.mount(content, document.nodes);
    expect(instance.execute([{ type: 'selection.set', selection }], EXECUTE)).toBe(true);
    const cut = name.startsWith('cut');
    const payload = engine.event(instance, cut ? 'cut' : 'copy');
    result[name] = cut ? { payload, html: instance.getContent('html') as string } : { payload };
  }
  return result;
}

/** The golden of a document on an engine; update mode writes the engine's events first. */
function golden(engine: ClipboardEngine, document: ClipboardDocument): Partial<DocumentGolden> {
  const url = new URL(
    `${engine.folder}/goldens/clipboard/corpus/${document.name}.json`,
    import.meta.url,
  );
  if (UPDATE) {
    mkdirSync(new URL('./', url), { recursive: true });
    writeFileSync(url, `${JSON.stringify(run(engine, document), null, 2)}\n`);
  }
  return JSON.parse(readFileSync(url, 'utf8')) as Partial<DocumentGolden>;
}

describe.each(ENGINES)(
  '$folder clipboard goldens over the corpus (uwg-te-req-content-6)',
  (engine) => {
    it.each(DOCUMENTS)('V-131: $name: copy and cut equal the golden', (document) => {
      expect(run(engine, document)).toStrictEqual(golden(engine, document));
    });

    it.each(DOCUMENTS)(
      'V-131: $name: each payload parses to the fragment of its selection, its text the shared text',
      (document) => {
        const canonical = canonicalOf(document);
        const cases = golden(engine, document);
        expect(Object.keys(cases)).toEqual(
          CASE_NAMES.filter((name) => selectionOf(canonical, name)),
        );
        for (const name of CASE_NAMES) {
          const entry = cases[name];
          const selection = selectionOf(canonical, name);
          if (!entry || !selection) continue;
          const expected = expectedFragment(canonical, selection, document.nodes);
          const markup = entry.payload['text/html'];
          expect(markup, name).toMatch(
            new RegExp(`^<div data-text-editor-fragment="${expected.kind}">`, 'u'),
          );
          expect(markup, name).not.toMatch(
            /data-pm-slice|data-lexical|ProseMirror|class="(?!language-)/u,
          );
          const read = readClipboardHtml(htmlSource(markup), {
            nodes: document.nodes,
            createId: sequence(),
          });
          expect(read.diagnostics, name).toEqual([]);
          expect(read.fragment, name).toEqual(expected);
          expect(entry.payload['text/plain'], name).toBe(
            writeText({ blocks: expected.blocks }, { nodes: document.nodes }),
          );
        }
      },
    );

    it.each(DOCUMENTS)(
      'V-131: $name: a cut of blocks leaves the other blocks unchanged',
      (document) => {
        const canonical = canonicalOf(document);
        const selection = selectionOf(canonical, 'cut-blocks');
        const entry = golden(engine, document)['cut-blocks'];
        if (!selection || selection.kind !== 'blocks' || !entry) return;
        const kept = new Set(
          canonical.blocks.map(({ id }) => id).filter((id) => !selection.ids.includes(id!)),
        );
        const remaining = importHtml(htmlSource(entry.html!), { nodes: document.nodes }).document;
        expect(remaining.blocks.map(({ id }) => id)).toEqual([...kept]);
      },
    );
  },
);

describe('clipboard goldens over the corpus across engines (uwg-te-req-engine-12)', () => {
  it.each(DOCUMENTS)('V-131: $name: both engines write the same payloads and cuts', (document) => {
    expect(golden(tiptap, document)).toStrictEqual(golden(lexical, document));
  });

  it('covers every case on the corpus', () => {
    const counts = Object.fromEntries(
      CASE_NAMES.map((name) => [
        name,
        DOCUMENTS.filter((document) => golden(tiptap, document)[name]).length,
      ]),
    );
    expect(counts).toEqual({
      'copy-blocks': DOCUMENTS.length,
      'copy-range': DOCUMENTS.length,
      'cut-blocks': DOCUMENTS.length,
      'cut-range': DOCUMENTS.length,
    });
    expect(corpusNodes.length).toBeGreaterThan(0);
  });
});
