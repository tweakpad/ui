/**
 * Native JSON goldens of both engine adapters (node environment; Widgets `uwg-te-req-content-1`,
 * `uwg-te-tab-engine` r5 and r9, `uwg-te-req-blocks-1`, `uwg-te-req-blocks-6`,
 * `uwg-te-req-inline-1`, `uwg-te-req-engine-12`).
 *
 * For every corpus document (`01`–`08`, `portable` and the canonical parity documents) the files
 * `tiptap/goldens/<name>.json` and `lexical/goldens/<name>.json` hold what each real engine exports
 * for the document's canonical portable model. They live in the adapter folders, the only places
 * besides these integration tests that name an engine. The model goes through the adapter's mapper
 * into a headless mount (Tiptap: the adapter's schema and plugins in a real editor state with a
 * structural view; Lexical: the adapter's real editor without a root) and comes back as the
 * engine's own JSON. The cases check that a golden maps back to the canonical document, that the
 * export of the model equals the golden, that a golden loads and exports unchanged, that HTML,
 * Markdown and text through each adapter equal the corpus goldens, and that both engines hold the
 * same document and block tree and write the same HTML, Markdown and text.
 *
 * The golden rule: a golden changes only with a deliberate, reviewed change of a mapper or of an
 * engine pin, as the corpus README states for its own goldens. Regenerate with
 * `TEXT_EDITOR_UPDATE_GOLDENS=1 npx vitest run src/foundation/text-editor/adapters/goldens.test.ts`,
 * format the files with `npx prettier --write` over both `goldens` folders (the cases compare
 * parsed JSON) and review every changed file against the content model and the
 * engine's source before keeping it; never regenerate to make a failing case pass.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { imageProtocols, linkProtocols } from '../../markdown/url.js';
import {
  CANONICAL_DOCUMENTS,
  CORPUS_ENTRIES,
  corpusFile,
  corpusGolden,
  corpusNodes,
} from '../content/corpus.test.js';
import { importHtml } from '../content/html.js';
import { htmlSource } from '../content/html-source.test.js';
import {
  canonicalize,
  isAtomOrTable,
  isListItem,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
  type TextEditorPortableInline,
} from '../content/portable.js';
import type {
  TextEditorContentInput,
  TextEditorEngineInstance,
  TextEditorPortableFormat,
  TextEditorUrlPolicy,
} from '../engine.js';
import type { TextEditorNodeDefinition } from '../nodes.js';
import { TEXT_EDITOR_COLORS } from '../palette.js';
import { headlessLexical } from './lexical/lexical-stubs.test.js';
import { lexicalToPortable, portableToLexical } from './lexical/mapping.js';
import { createTiptapEngine } from './tiptap/index.js';
import { withTrailingParagraph } from './shared/blocks.js';
import { fromTiptapJson, toTiptapJson } from './tiptap/mapping.js';
import { FakeDocument } from './shared/test-helpers.test.js';
import { stubContext, stubTiptapModules } from './tiptap/tiptap-stubs.test.js';

const UPDATE = process.env.TEXT_EDITOR_UPDATE_GOLDENS === '1';

/** The URL policy of every mount, as the controller passes it. */
const URLS: TextEditorUrlPolicy = Object.freeze({
  links: linkProtocols(null),
  images: imageProtocols(null),
});

/** Identifiers `n000000001`, … in order, for the empty paragraph after a final atom or table. */
const trailingIds = () => {
  let count = 0;
  return () => `n${String((count += 1)).padStart(9, '0')}`;
};

/** A corpus document: its name, its custom nodes and the format goldens it has. */
interface GoldenDocument {
  readonly name: string;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly markdown: boolean;
  readonly text: boolean;
}

const DOCUMENTS: readonly GoldenDocument[] = [
  ...CORPUS_ENTRIES.map((entry) => ({
    name: entry.name,
    nodes: entry.nodes ?? [],
    markdown: true,
    text: true,
  })),
  { name: 'portable', nodes: [], markdown: true, text: false },
  ...CANONICAL_DOCUMENTS.map((entry) => ({
    name: entry.name,
    nodes: entry.nodes ?? [],
    markdown: false,
    text: false,
  })),
];

/** The canonical portable document of a corpus document: its HTML golden, read back. */
function canonicalOf(document: GoldenDocument): TextEditorPortableDocument {
  const read = importHtml(htmlSource(corpusGolden(`${document.name}.html`)), {
    nodes: document.nodes,
  });
  expect(read.diagnostics).toEqual([]);
  return read.document;
}

/**
 * The document an engine holds for a canonical one: `uwg-te-req-blocks-1` keeps an empty paragraph
 * after a final atom block or table, which the formats omit, with the first identifier of the load.
 */
function held(document: TextEditorPortableDocument): TextEditorPortableDocument {
  const last = document.blocks.at(-1);
  if (!last || !isAtomOrTable(last)) return document;
  return {
    blocks: [...document.blocks, { type: 'paragraph', id: trailingIds()(), content: [] }],
  };
}

/** One engine adapter as the goldens see it. */
interface GoldenEngine {
  readonly folder: 'tiptap' | 'lexical';
  /** The adapter's mapper from the portable model to native JSON. */
  toNative(document: TextEditorPortableDocument): unknown;
  /** The adapter's mapper from native JSON to a portable draft. */
  fromNative(json: unknown): TextEditorPortableDraft;
  /** A headless mount with content; the load reports no diagnostic and no error. */
  mount(
    content: TextEditorContentInput,
    nodes: readonly TextEditorNodeDefinition[],
  ): TextEditorEngineInstance;
}

const tiptap: GoldenEngine = {
  folder: 'tiptap',
  // The engine keeps an empty paragraph after a final atom block or table (`uwg-te-req-blocks-1`).
  toNative: (document) => toTiptapJson(withTrailingParagraph(document, trailingIds())),
  fromNative: fromTiptapJson,
  mount(content, nodes) {
    const { modules } = stubTiptapModules();
    const context = { ...stubContext({ content, nodes, createId: trailingIds() }), urls: URLS };
    const container = new FakeDocument().createElement('section');
    const instance = createTiptapEngine(modules).mount(
      container as unknown as HTMLElement,
      context,
    );
    if (instance instanceof Promise) throw new Error('The headless mount is synchronous.');
    expect(context.calls).toEqual(['ready']);
    return instance;
  },
};

const lexical: GoldenEngine = {
  folder: 'lexical',
  toNative: portableToLexical,
  fromNative: lexicalToPortable,
  mount(content, nodes) {
    const { instance, recording } = headlessLexical({
      initialContent: content,
      nodes,
      createId: trailingIds(),
    });
    expect(recording.records.filter(({ type }) => type !== 'ready')).toEqual([]);
    return instance;
  },
};

const ENGINES = [tiptap, lexical] as const;

const goldenUrl = (engine: GoldenEngine, name: string) =>
  new URL(`${engine.folder}/goldens/${name}.json`, import.meta.url);

/** Native JSON as the golden files hold it: plain JSON values. */
const plain = (json: unknown): unknown => JSON.parse(JSON.stringify(json));

/** What an engine exports for a canonical document: the mapper's JSON loaded and exported. */
function exportOf(engine: GoldenEngine, document: GoldenDocument): unknown {
  const native = engine.toNative(canonicalOf(document));
  return engine.mount({ content: native, format: 'json' }, document.nodes).getContent('json');
}

/** The golden of a document; update mode writes the engine's export first. */
function golden(engine: GoldenEngine, document: GoldenDocument): unknown {
  const url = goldenUrl(engine, document.name);
  if (UPDATE) {
    mkdirSync(new URL('./', url), { recursive: true });
    writeFileSync(url, `${JSON.stringify(plain(exportOf(engine, document)), null, 2)}\n`);
  }
  return JSON.parse(readFileSync(url, 'utf8')) as unknown;
}

/** A mount holding a document's golden. */
const goldenMount = (engine: GoldenEngine, document: GoldenDocument) =>
  engine.mount({ content: golden(engine, document), format: 'json' }, document.nodes);

/** A portable draft canonicalized; every identifier must already be there. */
const canonical = (draft: TextEditorPortableDraft, nodes: readonly TextEditorNodeDefinition[]) =>
  canonicalize(draft, {
    nodes,
    createId: () => {
      throw new Error('A golden block has no identifier.');
    },
  }).document;

describe.each(ENGINES)(
  '$folder native JSON goldens (uwg-te-req-content-1, uwg-te-tab-engine r5)',
  (engine) => {
    it.each(DOCUMENTS)(
      'V-047: $name: the export of the canonical document equals the golden',
      (document) => {
        expect(plain(exportOf(engine, document))).toStrictEqual(golden(engine, document));
      },
    );

    it.each(DOCUMENTS)('V-047: $name: the golden maps to the canonical document', (document) => {
      const json = golden(engine, document);
      expect(canonical(engine.fromNative(json), document.nodes)).toEqual(
        held(canonicalOf(document)),
      );
    });

    it.each(DOCUMENTS)(
      'V-047: $name: the golden loads and exports unchanged, and the formats equal the corpus goldens',
      (document) => {
        const json = golden(engine, document);
        const instance = engine.mount({ content: json, format: 'json' }, document.nodes);
        expect(plain(instance.getContent('json'))).toStrictEqual(json);
        expect(instance.getContent('html')).toBe(corpusGolden(`${document.name}.html`));
        if (document.markdown)
          expect(instance.getContent('markdown')).toBe(corpusFile(`${document.name}.md`));
        if (document.text)
          expect(instance.getContent('text')).toBe(corpusGolden(`${document.name}.txt`));
      },
    );
  },
);

/** The blocks of a document in order, each list item before its nested items. */
const flatBlocks = (blocks: readonly TextEditorPortableBlock[]): TextEditorPortableBlock[] =>
  blocks.flatMap((block) => [block, ...(isListItem(block) ? flatBlocks(block.children) : [])]);

/** Every inline run of a document: textblocks, list items and table cell paragraphs. */
const inlineRuns = (document: TextEditorPortableDocument): TextEditorPortableInline[] =>
  flatBlocks(document.blocks).flatMap((block) => {
    if (block.type === 'table')
      return block.rows.flatMap(({ cells }) =>
        cells.flatMap(({ paragraphs }) => paragraphs.flatMap(({ content }) => [...content])),
      );
    return 'content' in block && block.content ? [...block.content] : [];
  });

/** The values under color members of native JSON: text colors, highlights and backgrounds. */
function colorValues(json: unknown): unknown[] {
  if (Array.isArray(json)) return json.flatMap(colorValues);
  if (typeof json !== 'object' || json === null) return [];
  return Object.entries(json).flatMap(([key, value]) => [
    ...(/color|highlight|background/iu.test(key) && typeof value !== 'object' ? [value] : []),
    ...colorValues(value),
  ]);
}

describe('native JSON goldens across the corpus (uwg-te-req-content-1, uwg-te-req-blocks-1)', () => {
  it.each(ENGINES)('V-047: $folder: colors stay palette names', (engine) => {
    const values = DOCUMENTS.flatMap((document) => colorValues(golden(engine, document)));
    expect(values.length).toBeGreaterThan(0);
    // Only palette names, and null where the engine keeps a color member of its own unset.
    expect(
      values.filter((value) => value !== null && !TEXT_EDITOR_COLORS.includes(value as never)),
    ).toEqual([]);
    expect(new Set(values.filter((value) => value !== null))).toEqual(new Set(TEXT_EDITOR_COLORS));
  });

  it.each(ENGINES)(
    'V-047: $folder: foreign and malformed native JSON is a DataError, through the mapper and the adapter',
    (engine) => {
      const other = engine === tiptap ? lexical : tiptap;
      const document = DOCUMENTS.find(({ name }) => name === 'portable')!;
      const foreign = golden(other, document);
      for (const json of [
        foreign,
        null,
        [],
        'doc',
        {},
        { root: null },
        { root: { type: 'root' } },
        { type: 'doc', content: 'sea' },
      ])
        expect(() => engine.fromNative(json), JSON.stringify(json)).toThrow(
          expect.objectContaining({ name: 'DataError' }),
        );
      const own = golden(engine, document);
      const instance = engine.mount({ content: own, format: 'json' }, document.nodes);
      expect(() => instance.setContent(foreign, 'json')).toThrow(
        expect.objectContaining({ name: 'DataError' }),
      );
      expect(plain(instance.getContent('json'))).toStrictEqual(own);
    },
  );

  it('V-365: the goldens cover every block kind, nested items, a checked task, multi-paragraph cells and code in a link', () => {
    const documents = DOCUMENTS.map(canonicalOf);
    const blocks = documents.flatMap((document) => flatBlocks(document.blocks));
    expect(new Set(blocks.map(({ type }) => type))).toEqual(
      new Set([
        'paragraph',
        'heading',
        'quote',
        'code',
        'list-bullet',
        'list-ordered',
        'list-task',
        'divider',
        'image',
        'table',
        'custom',
      ]),
    );
    expect(
      new Set(blocks.flatMap((block) => (block.type === 'heading' ? [block.level] : []))),
    ).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(blocks.some((block) => block.type === 'code' && block.language)).toBe(true);
    expect(blocks.some((block) => isListItem(block) && block.children.length > 0)).toBe(true);
    expect(blocks.some((block) => block.type === 'list-task' && block.checked)).toBe(true);
    expect(blocks.some((block) => block.type === 'list-ordered' && (block.start ?? 1) > 1)).toBe(
      true,
    );
    expect(
      blocks.some(
        (block) =>
          block.type === 'table' &&
          block.rows.some(({ cells }) => cells.some(({ paragraphs }) => paragraphs.length > 1)),
      ),
    ).toBe(true);
    expect(
      documents.some((document) =>
        inlineRuns(document).some(
          (inline) => inline.type === 'text' && inline.marks?.code && inline.marks.link,
        ),
      ),
    ).toBe(true);
  });
});

describe('custom nodes through both adapters (uwg-te-req-blocks-6, uwg-te-req-inline-1)', () => {
  const document = DOCUMENTS.find(({ name }) => name === '05-custom')!;
  // The corpus document of custom nodes is `05-custom`, read with the corpus definitions.
  it('V-481: reads 05-custom with the corpus node definitions', () =>
    expect(document.nodes).toBe(corpusNodes));
  const mention =
    '<span data-type="mention" data-person="u-17" data-label="Mira Okafor">@Mira Okafor</span>';

  it.each(ENGINES)(
    'V-481: $folder: a mention round-trips with its data attributes; Markdown and text write its text',
    (engine) => {
      const json = golden(engine, document);
      const instance = goldenMount(engine, document);
      const html = instance.getContent('html');
      expect(html).toContain(mention);
      const markdown = instance.getContent('markdown');
      expect(markdown).toContain('Thanks to @Mira Okafor and @Teo for testing');
      expect(markdown).not.toContain('data-type');
      expect(instance.getContent('text')).toContain('Thanks to @Mira Okafor and @Teo for testing');
      // The mention survives the mapper both ways.
      const mapped = canonical(engine.fromNative(json), document.nodes);
      expect(inlineRuns(mapped).filter((inline) => inline.type === 'custom')).toEqual([
        { type: 'custom', name: 'mention', attrs: { person: 'u-17', label: 'Mira Okafor' } },
        { type: 'custom', name: 'mention', attrs: { person: 'u-4', label: 'Teo' } },
      ]);
      // Its Markdown read back holds the label as text and no mention node.
      instance.setContent(markdown, 'markdown');
      const read = canonical(engine.fromNative(instance.getContent('json')), document.nodes);
      expect(inlineRuns(read).filter((inline) => inline.type === 'custom')).toEqual([]);
      expect(instance.getContent('text')).toContain('Thanks to @Mira Okafor and @Teo for testing');
    },
  );

  it('V-481: both adapters serialize the custom nodes identically', () => {
    const [first, second] = ENGINES.map((engine) =>
      goldenMount(engine, document).getContent('html'),
    );
    expect(first).toBe(second);
    expect(first).toBe(corpusGolden('05-custom.html'));
  });
});

/**
 * The documents that end with an atom block or a table, after which both engines hold the empty
 * paragraph that the formats omit (`uwg-te-req-blocks-1`).
 */
const TRAILING_PARAGRAPH = ['04-tables', '06-ids', '07-hostile'];

/** The portable formats, which every engine writes through the shared converters. */
const PORTABLE_FORMATS = [
  'html',
  'markdown',
  'text',
] as const satisfies readonly TextEditorPortableFormat[];

describe('both engines hold the same document (uwg-te-req-engine-12)', () => {
  it.each(DOCUMENTS)('$name: equal portable documents and block trees', (document) => {
    const portable = (engine: GoldenEngine) =>
      canonical(engine.fromNative(golden(engine, document)), document.nodes);
    const blocks = (engine: GoldenEngine) =>
      goldenMount(engine, document)
        .getBlocks()
        .ordered()
        .map(({ id, kind, attrs, parentId, depth, textblock, empty }) => ({
          id,
          kind,
          attrs,
          parentId,
          depth,
          textblock,
          empty,
        }));
    const tiptapBlocks = blocks(tiptap);
    expect(portable(tiptap)).toEqual(portable(lexical));
    expect(tiptapBlocks).toEqual(blocks(lexical));
    const trailing = TRAILING_PARAGRAPH.includes(document.name);
    expect(isAtomOrTable(canonicalOf(document).blocks.at(-1)!)).toBe(trailing);
    if (trailing)
      expect(tiptapBlocks.at(-1)).toEqual({
        id: 'n000000001',
        kind: 'paragraph',
        attrs: expect.anything(),
        parentId: null,
        depth: 0,
        textblock: true,
        empty: true,
      });
  });

  it.each(DOCUMENTS)('$name: the same HTML, Markdown and text', (document) => {
    const [first, second] = ENGINES.map((engine) => {
      const instance = goldenMount(engine, document);
      return PORTABLE_FORMATS.map((format) => instance.getContent(format));
    });
    expect(first).toEqual(second);
    // The HTML is the corpus golden, so the trailing paragraph an engine holds is not in it.
    expect(first![0]).toBe(corpusGolden(`${document.name}.html`));
  });
});
