import { describe, expect, it } from 'vitest';
import { domError } from '../../../dom-error.js';
import { imageProtocols, linkProtocols } from '../../../markdown/url.js';
import { BASE_CAPABILITIES, OPTIONAL_CAPABILITIES } from '../../capabilities.js';
import { CORPUS_ENTRIES, corpusFile, corpusGolden, corpusIds } from '../../content/corpus.test.js';
import { htmlSource } from '../../content/html-source.test.js';
import type {
  TextEditorPortableDocument,
  TextEditorPortableDraft,
  TextEditorPortableDraftBlock,
} from '../../content/portable.js';
import type { TextEditorEngine, TextEditorUrlPolicy } from '../../engine.js';
import { defineTextEditorBlock, defineTextEditorInline } from '../../nodes.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import {
  readTextEditorContent,
  TextEditorAdapterSnapshot,
  textEditorContentGlue,
  textEditorContentOf,
  writeTextEditorContent,
  type TextEditorContentGlue,
} from './content.js';

const URLS: TextEditorUrlPolicy = { links: linkProtocols(null), images: imageProtocols(null) };
const NATIVE = 'test-native';

/** A stand-in for an adapter's mapper: `{ type: 'test-native', blocks }` holds portable blocks. */
function fromTestNative(json: unknown): TextEditorPortableDraft {
  const record = json as { readonly type?: unknown; readonly blocks?: unknown } | null;
  if (typeof record !== 'object' || record?.type !== NATIVE || !Array.isArray(record.blocks))
    throw domError('DataError', 'The native JSON is no test document.');
  return { blocks: record.blocks as TextEditorPortableDraftBlock[] };
}

const note = defineTextEditorBlock({
  name: 'note',
  element: 'aside',
  content: 'inline',
  attrs: { tone: { type: 'enum', values: ['info', 'warn'], default: 'info' } },
  tool: { label: 'Note' },
});
const tag = defineTextEditorInline({
  name: 'tag',
  element: 'span',
  attrs: { label: { type: 'string', default: '' } },
  text: (attrs) => `#${String(attrs.label)}`,
});

interface GlueInput {
  readonly nodes?: readonly TextEditorNodeDefinition[];
  readonly capabilities?: Iterable<string>;
  readonly createId?: () => string;
  readonly parse?: boolean;
  readonly urls?: TextEditorUrlPolicy;
}

function glueOf(input: GlueInput = {}): TextEditorContentGlue {
  const engine: Pick<TextEditorEngine, 'capabilities' | 'supportsNode'> = {
    capabilities: new Set(
      (input.capabilities ?? [
        ...BASE_CAPABILITIES,
        ...OPTIONAL_CAPABILITIES,
      ]) as Iterable<'block.table'>,
    ),
    supportsNode: () => true,
  };
  const context = {
    urls: input.urls ?? URLS,
    nodes: input.nodes ?? [],
    createId: input.createId ?? corpusIds(),
  };
  return textEditorContentGlue(context, engine, fromTestNative, {
    parseHtml: input.parse === false ? undefined : htmlSource,
  });
}

const text = (value: string) => ({ type: 'text' as const, text: value });

describe('content glue: reading (uwg-te-req-content-1, uwg-te-req-engine-8)', () => {
  it('reads every corpus document through the shared converters, writing its goldens back', () => {
    for (const entry of CORPUS_ENTRIES) {
      const glue = glueOf({ nodes: entry.nodes ?? [] });
      const input = corpusFile(`${entry.name}.input.${entry.input === 'html' ? 'html' : 'md'}`);
      const { document } = readTextEditorContent(input, entry.input, glue);
      expect(writeTextEditorContent(document, 'html', glue), entry.name).toBe(
        corpusGolden(`${entry.name}.html`),
      );
      expect(writeTextEditorContent(document, 'markdown', glue), entry.name).toBe(
        corpusFile(`${entry.name}.md`),
      );
      expect(writeTextEditorContent(document, 'text', glue), entry.name).toBe(
        corpusGolden(`${entry.name}.txt`),
      );
    }
  });

  it('reads text as paragraphs and native JSON, an object or JSON text, through the mapper', () => {
    const glue = glueOf();
    expect(readTextEditorContent('a\nb\n\nc', 'text', glue).document).toEqual({
      blocks: [
        {
          type: 'paragraph',
          id: 'te00000001',
          content: [text('a'), { type: 'hard-break' }, text('b')],
        },
        { type: 'paragraph', id: 'te00000002', content: [text('c')] },
      ],
    });
    const native = {
      type: NATIVE,
      blocks: [{ type: 'paragraph', id: 'p1', content: [text('Dock'), text(' four')] }],
    };
    const expected: TextEditorPortableDocument = {
      blocks: [{ type: 'paragraph', id: 'p1', content: [text('Dock four')] }],
    };
    expect(readTextEditorContent(native, 'json', glue)).toEqual({
      document: expected,
      diagnostics: [],
    });
    expect(readTextEditorContent(JSON.stringify(native), 'json', glue).document).toEqual(expected);
  });

  it('throws a DataError for JSON that cannot be parsed or that the mapper refuses', () => {
    const glue = glueOf();
    expect(() => readTextEditorContent('{bad', 'json', glue)).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
    expect(() => readTextEditorContent({ root: { children: [] } }, 'json', glue)).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
    expect(() => readTextEditorContent({ type: 'doc', content: [] }, 'json', glue)).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
  });

  it('throws a NotSupportedError for an unknown format, and for HTML without a parser', () => {
    const glue = glueOf();
    for (const format of ['rtf', 'HTML', ''])
      expect(() => readTextEditorContent('x', format as 'html', glue)).toThrow(
        expect.objectContaining({ name: 'NotSupportedError' }),
      );
    // Node has no DOMParser: without the structural parser, HTML cannot be read.
    expect(() => readTextEditorContent('<p>x</p>', 'html', glueOf({ parse: false }))).toThrow(
      expect.objectContaining({ name: 'NotSupportedError' }),
    );
  });

  it('converts what the instance cannot represent, with exactly one diagnostic per load', () => {
    const html =
      '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>' +
      '<aside data-type="note">Tide</aside><p>Ask <span data-type="tag" data-label="crew">#crew</span></p>';
    // The mount's nodes and the table capability keep everything: no conversion, no diagnostic.
    const full = glueOf({ nodes: [note, tag] });
    expect(full.capabilities.has('block.note') && full.capabilities.has('inline.tag')).toBe(true);
    const kept = readTextEditorContent(html, 'html', full);
    expect(kept.document.blocks.map((block) => block.type)).toEqual([
      'table',
      'custom',
      'paragraph',
    ]);
    expect(kept.diagnostics).toEqual([]);
    // Without them, the table and the custom nodes of native JSON convert in one load.
    const reduced = glueOf({ capabilities: BASE_CAPABILITIES, nodes: [] });
    const native = { type: NATIVE, blocks: kept.document.blocks };
    const { document, diagnostics } = readTextEditorContent(native, 'json', reduced);
    expect(document.blocks.map((block) => block.type)).toEqual([
      'paragraph',
      'paragraph',
      'paragraph',
    ]);
    expect(writeTextEditorContent(document, 'text', reduced)).toBe('a\tb\n\nTide\n\nAsk ');
    expect(diagnostics).toEqual([
      {
        code: 'text-editor-content-converted',
        message: 'Converted content that the engine cannot represent: table, note, tag.',
      },
    ]);
    expect(Object.isFrozen(diagnostics)).toBe(true);
    const table = readTextEditorContent(html, 'html', reduced);
    expect(table.diagnostics.map(({ code, message }) => [code, message])).toEqual([
      [
        'text-editor-content-converted',
        'Converted content that the engine cannot represent: table.',
      ],
    ]);
  });

  it('applies the URL policy to native JSON as the HTML importer does, reporting nothing', () => {
    const native = {
      type: NATIVE,
      blocks: [
        {
          type: 'paragraph',
          id: 'p1',
          content: [
            text('Call '),
            { type: 'text', text: 'the pilot', marks: { link: 'javascript:alert(1)' } },
            text(' now'),
          ],
        },
        { type: 'image', id: 'i1', src: ' javascript:alert(2)', alt: 'Buoy chart' },
        { type: 'image', id: 'i2', src: 'data:image/png;base64,AAAA', alt: '' },
        { type: 'image', id: 'i3', src: 'charts/buoy.png', alt: 'Buoy' },
        {
          type: 'list-bullet',
          id: 'l1',
          content: [text('Stow')],
          children: [
            {
              type: 'list-bullet',
              id: 'l2',
              content: [{ type: 'text', text: 'oars', marks: { link: 'vbscript:x', code: true } }],
              children: [],
            },
          ],
        },
        {
          type: 'table',
          id: 't1',
          headerRow: false,
          headerColumn: false,
          rows: [
            {
              cells: [
                {
                  paragraphs: [
                    {
                      content: [
                        {
                          type: 'text',
                          text: 'Depth',
                          marks: { link: 'JaVaScRiPt:x', italic: true },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'custom',
          id: 'n1',
          name: 'note',
          attrs: { tone: 'info' },
          content: [{ type: 'text', text: 'Tide', marks: { link: 'mailto:pilot@harbor.example' } }],
        },
      ],
    };
    const read = readTextEditorContent(native, 'json', glueOf({ nodes: [note] }));
    expect(read.diagnostics).toEqual([]);
    expect(read.document).toEqual({
      blocks: [
        { type: 'paragraph', id: 'p1', content: [text('Call the pilot now')] },
        { type: 'paragraph', id: 'i1', content: [text('Buoy chart')] },
        { type: 'image', id: 'i3', src: 'charts/buoy.png', alt: 'Buoy' },
        {
          type: 'list-bullet',
          id: 'l1',
          content: [text('Stow')],
          children: [
            {
              type: 'list-bullet',
              id: 'l2',
              content: [{ type: 'text', text: 'oars', marks: { code: true } }],
              children: [],
            },
          ],
        },
        {
          type: 'table',
          id: 't1',
          headerRow: false,
          headerColumn: false,
          rows: [
            {
              cells: [
                {
                  paragraphs: [
                    { content: [{ type: 'text', text: 'Depth', marks: { italic: true } }] },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'custom',
          id: 'n1',
          name: 'note',
          attrs: { tone: 'info' },
          content: [{ type: 'text', text: 'Tide', marks: { link: 'mailto:pilot@harbor.example' } }],
        },
      ],
    });
    // The context's policy decides: here mailto links fail and data images pass.
    const strict = glueOf({
      nodes: [note],
      urls: { links: ['https:'], images: ['https:', 'data:'] },
    });
    const blocks = readTextEditorContent(native, 'json', strict).document.blocks;
    expect(blocks[2]).toEqual({
      type: 'image',
      id: 'i2',
      src: 'data:image/png;base64,AAAA',
      alt: '',
    });
    expect(blocks.at(-1)).toEqual({
      type: 'custom',
      id: 'n1',
      name: 'note',
      attrs: { tone: 'info' },
      content: [text('Tide')],
    });
    // An image without alternative text leaves nothing; an empty document keeps one paragraph.
    const lone = {
      type: NATIVE,
      blocks: [{ type: 'image', id: 'i1', src: 'javascript:x', alt: '' }],
    };
    expect(readTextEditorContent(lone, 'json', glueOf()).document).toEqual({
      blocks: [{ type: 'paragraph', id: 'te00000001', content: [] }],
    });
  });

  it('reports only text-editor- codes: block identifiers yes, the Markdown URL policy no', () => {
    const glue = glueOf();
    const markdown = readTextEditorContent(
      '[x](javascript:void) and ![i](ftp://a/b.png)',
      'markdown',
      glue,
    );
    expect(markdown.diagnostics).toEqual([]);
    const ids = readTextEditorContent('<p data-id="a1">a</p><p data-id="a1">b</p>', 'html', glue);
    expect(ids.diagnostics).toEqual([
      {
        code: 'text-editor-block-id',
        message: 'Replaced 1 invalid or duplicate block identifier.',
      },
    ]);
  });
});

describe('content glue: writing (uwg-te-req-content-1, uwg-te-tab-engine r5)', () => {
  const document: TextEditorPortableDocument = {
    blocks: [
      { type: 'paragraph', id: 'p1', content: [text('Harbor')] },
      {
        type: 'list-bullet',
        id: 'l1',
        content: [text('Ropes')],
        children: [
          { type: 'list-bullet', id: 'l2', content: [text('Bow line')], children: [] },
          { type: 'list-bullet', id: 'l3', content: [text('Stern line')], children: [] },
        ],
      },
      { type: 'heading', id: 'h1', level: 2, content: [text('Tides')] },
    ],
  };

  it('limits the output to the subtrees of the listed blocks, in document order', () => {
    const glue = glueOf();
    expect(writeTextEditorContent(document, 'text', glue, { blocks: ['h1', 'l1'] })).toBe(
      'Ropes\nBow line\nStern line\n\nTides',
    );
    expect(writeTextEditorContent(document, 'html', glue, { blocks: ['l3', 'p1'] })).toBe(
      '<p data-id="p1">Harbor</p>\n<ul><li data-id="l3"><p>Stern line</p></li></ul>',
    );
    expect(writeTextEditorContent(document, 'markdown', glue, { blocks: ['missing'] })).toBe('');
    expect(writeTextEditorContent(document, 'markdown', glue)).toBe(
      'Harbor\n\n- Ropes\n  - Bow line\n  - Stern line\n\n## Tides\n',
    );
  });

  it('leaves json to the adapter and refuses unknown formats', () => {
    const glue = glueOf();
    for (const format of ['json', 'rtf'])
      expect(() => writeTextEditorContent(document, format as 'html', glue)).toThrow(
        expect.objectContaining({ name: 'NotSupportedError' }),
      );
  });

  it('builds the glue of a mount from its context, engine and mapper', () => {
    const ids: string[] = [];
    const context = {
      urls: URLS,
      nodes: [note],
      createId: () => {
        ids.push('x');
        return `id${ids.length}`;
      },
    };
    const engine = { capabilities: BASE_CAPABILITIES, supportsNode: () => true };
    const glue = textEditorContentGlue(context, engine, fromTestNative);
    expect(Object.isFrozen(glue)).toBe(true);
    expect(glue.urls).toBe(URLS);
    expect(glue.nodes).toBe(context.nodes);
    expect([...glue.capabilities]).toEqual([...BASE_CAPABILITIES, 'block.note']);
    expect(glue.createId()).toBe('id1');
    expect(glue.fromNative).toBe(fromTestNative);
    expect(
      textEditorContentGlue({ ...context, nodes: [] }, engine, fromTestNative).capabilities,
    ).toBe(BASE_CAPABILITIES);
  });
});

describe('content glue: converted definitions (uwg-te-req-engine-8)', () => {
  const engine = { capabilities: BASE_CAPABILITIES, supportsNode: () => true };
  const context = { urls: URLS, createId: corpusIds() };

  it('reads with the converted definitions after the mount ones, each name once', () => {
    const otherNote = defineTextEditorBlock({
      name: 'note',
      element: 'section',
      content: 'inline',
      tool: { label: 'Section note' },
    });
    const glue = textEditorContentGlue(
      { ...context, nodes: [note], convertNodes: [otherNote, tag] },
      engine,
      fromTestNative,
    );
    expect(glue.nodes).toEqual([note]);
    expect(glue.readNodes).toEqual([note, tag]);
    expect(Object.isFrozen(glue.readNodes)).toBe(true);
    expect(
      textEditorContentGlue({ ...context, nodes: [note] }, engine, fromTestNative).readNodes,
    ).toEqual([note]);
  });

  it('converts a node of a converted definition with the diagnostic and writes without it', () => {
    const glue = textEditorContentGlue(
      { ...context, nodes: [note], convertNodes: [tag] },
      engine,
      fromTestNative,
      { parseHtml: htmlSource },
    );
    const html = '<p data-id="p1">Ask <span data-type="tag" data-label="kiln"></span></p>';
    const read = readTextEditorContent(html, 'html', glue);
    expect(writeTextEditorContent(read.document, 'html', glue)).toBe(
      '<p data-id="p1">Ask #kiln</p>',
    );
    expect(read.diagnostics).toEqual([
      {
        code: 'text-editor-content-converted',
        message: 'Converted content that the engine cannot represent: tag.',
      },
    ]);
    // Without the definition the element is unknown: its content stays, with no diagnostic.
    const unknown = textEditorContentGlue({ ...context, nodes: [note] }, engine, fromTestNative, {
      parseHtml: htmlSource,
    });
    expect(readTextEditorContent(html, 'html', unknown).diagnostics).toEqual([]);
  });
});

describe('adapter snapshots (uwg-te-req-content-1: serialized only when read)', () => {
  it('maps the revision once, on the first portable read, and serializes on every read', () => {
    const glue = glueOf();
    const calls: string[] = [];
    const document: TextEditorPortableDocument = {
      blocks: [{ type: 'paragraph', id: 'p1', content: [text('Quay')] }],
    };
    const snapshot = new TextEditorAdapterSnapshot(
      7,
      false,
      {
        portable: () => {
          calls.push('portable');
          return document;
        },
        native: () => {
          calls.push('native');
          return { type: NATIVE, blocks: document.blocks };
        },
      },
      glue,
    );
    expect([snapshot.revision, snapshot.empty]).toEqual([7, false]);
    expect(calls).toEqual([]);
    expect(snapshot.getContent('html')).toBe('<p data-id="p1">Quay</p>');
    expect(snapshot.getContent('markdown')).toBe('Quay\n');
    expect(snapshot.getContent('text')).toBe('Quay');
    expect(snapshot.getContent('json')).toEqual({ type: NATIVE, blocks: document.blocks });
    expect(calls).toEqual(['portable', 'native']);
    expect(() => snapshot.getContent('rtf' as 'html')).toThrow(
      expect.objectContaining({ name: 'NotSupportedError' }),
    );
  });
});

describe('content of a mount (uwg-te-req-content-1, uwg-te-tab-engine r5: getContent)', () => {
  const glue = glueOf();
  const document = readTextEditorContent(
    '<p data-id="p1">one</p><ul><li data-id="a"><p>a</p></li></ul>',
    'html',
    glue,
  ).document;
  const native = { type: NATIVE, blocks: document.blocks };
  const source = {
    portable: () => document,
    native: () => native,
    toNative: (subtree: typeof document) => ({ type: NATIVE, blocks: subtree.blocks }),
  };

  it('writes the portable formats through the shared converters, block subtrees included', () => {
    expect(textEditorContentOf(source, 'html', glue)).toBe(
      writeTextEditorContent(document, 'html', glue),
    );
    expect(textEditorContentOf(source, 'text', glue, { blocks: ['a'] })).toBe('a');
  });

  it('gives native JSON as the engine holds it, or of the selected blocks through the mapper', () => {
    expect(textEditorContentOf(source, 'json', glue)).toBe(native);
    expect(textEditorContentOf(source, 'json', glue, { blocks: ['p1'] })).toEqual({
      type: NATIVE,
      blocks: [document.blocks[0]],
    });
  });

  it('throws a NotSupportedError for a value that names no format', () => {
    expect(() => textEditorContentOf(source, 'rtf' as never, glue)).toThrow(
      expect.objectContaining({
        name: 'NotSupportedError',
        message: '"rtf" is not a content format.',
      }),
    );
  });
});
