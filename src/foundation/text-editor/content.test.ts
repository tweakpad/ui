import { describe, expect, it } from 'vitest';
import {
  CORPUS_ENTRIES,
  corpusDocument,
  corpusFile,
  corpusGolden as golden,
  corpusIds,
  corpusNodes,
} from './content/corpus.test.js';
import { isElementLike, type ElementLike } from './content/dom.js';
import { htmlSource, outerHtml } from './content/html-source.test.js';
import {
  importHtml,
  readClipboardHtml,
  serializeHtml,
  writeClipboardHtml,
} from './content/html.js';
import { readMarkdown, writeMarkdown } from './content/markdown.js';
import {
  inlineText,
  outputBlocks,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
  type TextEditorPortableTable,
} from './content/portable.js';
import { readText, writeText } from './content/text.js';
import type { TextEditorNodeDefinition } from './nodes.js';
import { TEXT_EDITOR_COLORS } from './palette.js';

// The round-trip corpus (tests/fixtures/widgets/text-editor/corpus): each document's canonical
// HTML, and its Markdown and text exports with the losses the content model declares.

const withoutIds = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, item]) => [key, withoutIds(item)]),
  );
};

/** Inline content without the hard breaks that end it. */
function withoutFinalBreaks(
  content: readonly TextEditorPortableInline[],
): TextEditorPortableInline[] {
  let end = content.length;
  while (end > 0 && content[end - 1]!.type === 'hard-break') end -= 1;
  return content.slice(0, end);
}

/** Inline content with adjacent text of equal marks merged, as canonicalization leaves it. */
function merged(content: readonly TextEditorPortableInline[]): TextEditorPortableInline[] {
  const out: TextEditorPortableInline[] = [];
  for (const node of content) {
    const last = out[out.length - 1];
    if (
      node.type === 'text' &&
      last?.type === 'text' &&
      JSON.stringify(last.marks ?? {}) === JSON.stringify(node.marks ?? {})
    )
      out[out.length - 1] = { ...last, text: last.text + node.text };
    else out.push(node);
  }
  return out;
}

/**
 * What Markdown keeps of a document, read back (Widgets `uwg-te-tab-content-model`, Markdown
 * column): no identifiers, empty paragraphs or block-final hard breaks; no alignment but the center
 * or end that every cell of a table column shares; no image width; a table with a header row,
 * added when missing, spans as empty cells, one paragraph per cell, and no widths, backgrounds or
 * header column; an inline node as its text. `custom` maps a custom block to the blocks it reads
 * back as.
 */
function markdownKeeps(
  document: TextEditorPortableDocument,
  custom: (block: TextEditorPortableBlock & { type: 'custom' }) => unknown[] = () => [],
): unknown {
  const inline = (content: readonly TextEditorPortableInline[]) =>
    merged(
      withoutFinalBreaks(content).map((node) =>
        node.type === 'custom'
          ? { type: 'text' as const, text: inlineText([node], corpusNodes) }
          : node,
      ),
    );
  const table = (block: TextEditorPortableTable) => {
    const grid = tableGrid(block);
    const shared = Array.from({ length: grid.columns }, (_, column) => {
      const aligns = new Set(
        grid.grid.map((row) => grid.cells[row[column] ?? -1]?.cell.align ?? 'start'),
      );
      const [only] = aligns;
      return aligns.size === 1 && (only === 'center' || only === 'end') ? only : undefined;
    });
    const cell = (content: TextEditorPortableInline[], column: number) => ({
      ...(shared[column] ? { align: shared[column] } : {}),
      paragraphs: [{ content: inline(content) }],
    });
    const rows = grid.grid.map((row, rowIndex) => ({
      cells: row.map((index, column) => {
        const placed = grid.cells[index];
        if (!placed || placed.row !== rowIndex || placed.column !== column) return cell([], column);
        const content: TextEditorPortableInline[] = [];
        placed.cell.paragraphs.forEach((paragraph, position) => {
          if (position > 0) content.push({ type: 'hard-break' });
          content.push(...paragraph.content);
        });
        return cell(content, column);
      }),
    }));
    if (!block.headerRow)
      rows.unshift({
        cells: Array.from({ length: grid.columns }, (_, column) => cell([], column)),
      });
    return { type: 'table', headerRow: true, headerColumn: false, rows };
  };
  const blocks = (list: readonly TextEditorPortableBlock[]): unknown[] =>
    list.flatMap((block): unknown[] => {
      switch (block.type) {
        case 'paragraph': {
          const content = inline(block.content);
          return content.length > 0 ? [{ type: 'paragraph', content }] : [];
        }
        case 'heading':
          return [{ type: 'heading', level: block.level, content: inline(block.content) }];
        case 'quote':
          return [{ type: 'quote', content: inline(block.content) }];
        case 'image':
          return [{ type: 'image', src: block.src, alt: block.alt }];
        case 'table':
          return [table(block)];
        case 'custom':
          return custom(block);
        case 'list-bullet':
        case 'list-ordered':
        case 'list-task':
          return [
            {
              type: block.type,
              ...('start' in block && block.start !== undefined ? { start: block.start } : {}),
              ...('checked' in block ? { checked: block.checked } : {}),
              content: inline(block.content),
              children: blocks(block.children),
            },
          ];
        default:
          return [withoutIds(block)];
      }
    });
  return blocks(outputBlocks(document));
}

/** The blocks that the custom nodes of document 5 read back as from their Markdown. */
const customKeeps = (block: TextEditorPortableBlock & { type: 'custom' }): unknown[] =>
  block.name === 'callout'
    ? [{ type: 'custom', name: 'callout', attrs: block.attrs, content: block.content }]
    : [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: String(block.attrs.caption), marks: { link: block.attrs.url } },
          ],
        },
      ];

describe('corpus (uwg-te-req-content-1, uwg-te-req-value-3)', () => {
  it.each(CORPUS_ENTRIES)(
    'V-111: $name: the canonical HTML equals its golden and export(import(export(D))) equals export(D)',
    (entry) => {
      const { document } = corpusDocument(entry);
      const html = serializeHtml(document, { nodes: entry.nodes });
      expect(html).toBe(golden(`${entry.name}.html`));
      const again = importHtml(htmlSource(html), { nodes: entry.nodes, createId: corpusIds() });
      expect(again.document).toEqual(document);
      expect(again.diagnostics).toEqual([]);
      expect(serializeHtml(again.document, { nodes: entry.nodes })).toBe(html);
    },
  );

  it.each(CORPUS_ENTRIES)(
    'V-113, V-125: $name: the Markdown equals its golden, the second export the first, and the reparsed model keeps what the format keeps',
    (entry) => {
      const { document } = corpusDocument(entry);
      const first = writeMarkdown(document, { nodes: entry.nodes });
      expect(first.markdown).toBe(corpusFile(`${entry.name}.md`));
      expect(writeMarkdown(document, { nodes: entry.nodes })).toEqual(first);
      const read = readMarkdown(first.markdown, { nodes: entry.nodes, createId: corpusIds() });
      expect(writeMarkdown(read.document, { nodes: entry.nodes }).markdown).toBe(first.markdown);
      expect(withoutIds(read.document.blocks)).toEqual(
        markdownKeeps(document, entry.nodes ? customKeeps : undefined),
      );
    },
  );

  it.each(CORPUS_ENTRIES)(
    'V-113, V-127: $name: the text equals its golden and reads back to the same text',
    (entry) => {
      const { document } = corpusDocument(entry);
      const text = writeText(document, { nodes: entry.nodes });
      expect(text).toBe(golden(`${entry.name}.txt`));
      expect(writeText(readText(text, { createId: corpusIds() }))).toBe(text);
    },
  );

  it('V-111, V-544: corpus/portable.html is canonical and corpus/portable.md is its Markdown', () => {
    const source = golden('portable.html');
    const { document, diagnostics } = importHtml(htmlSource(source));
    expect(diagnostics).toEqual([]);
    expect(serializeHtml(document)).toBe(source);
    const markdown = writeMarkdown(document).markdown;
    expect(markdown).toBe(corpusFile('portable.md'));
    expect(writeMarkdown(readMarkdown(markdown).document).markdown).toBe(markdown);
    for (const output of [source, markdown, writeText(document)])
      expect(output).not.toMatch(/tp-te-/u);
  });

  it('V-544: no serialization holds a tp-te- string', () => {
    for (const entry of CORPUS_ENTRIES) {
      const { document } = corpusDocument(entry);
      const outputs = [
        serializeHtml(document, { nodes: entry.nodes }),
        writeMarkdown(document, { nodes: entry.nodes }).markdown,
        writeText(document, { nodes: entry.nodes }),
        writeClipboardHtml({ kind: 'blocks', blocks: document.blocks }, { nodes: entry.nodes }),
        writeClipboardHtml({ kind: 'range', blocks: document.blocks }, { nodes: entry.nodes }),
      ];
      for (const output of outputs) expect(output).not.toMatch(/tp-te-/u);
    }
    // Document 7 holds engine DOM in the class vocabulary.
    expect(corpusFile('07-hostile.input.html')).toMatch(/tp-te-/u);
  });

  it('the identifiers of document 6: valid ones kept, the first of duplicates kept, one diagnostic', () => {
    const { document, diagnostics } = corpusDocument(CORPUS_ENTRIES[5]!);
    const ids = (blocks: readonly TextEditorPortableBlock[]): string[] =>
      blocks.flatMap((block) => [
        block.id ?? '',
        ...('children' in block && Array.isArray(block.children)
          ? ids(block.children as TextEditorPortableBlock[])
          : []),
      ]);
    expect(ids(document.blocks)).toEqual([
      'intro',
      'te00000001',
      'te00000002',
      'te00000003',
      'item-1',
      'te00000004',
      'harbor_table',
      'te00000005',
      'Mixed-Case_9',
      'rule-1',
    ]);
    expect(diagnostics).toEqual([
      {
        code: 'text-editor-block-id',
        message: 'Replaced 4 invalid or duplicate block identifiers.',
      },
    ]);
  });
});

/** Every element of a parsed tree, in document order. */
const elementsOf = (root: ElementLike): ElementLike[] =>
  Array.from(root.childNodes)
    .filter(isElementLike)
    .flatMap((element) => [element, ...elementsOf(element)]);

/** The attributes the profile allows on each element (uwg-te-req-content-2). */
const PROFILE: Readonly<Record<string, readonly string[]>> = {
  p: ['data-id', 'style'],
  h1: ['data-id', 'style'],
  h2: ['data-id', 'style'],
  h3: ['data-id', 'style'],
  h4: ['data-id', 'style'],
  h5: ['data-id', 'style'],
  h6: ['data-id', 'style'],
  blockquote: ['data-id', 'style'],
  pre: ['data-id'],
  code: ['class'],
  ul: ['data-type'],
  ol: ['start'],
  li: ['data-id', 'data-checked'],
  hr: ['data-id'],
  img: ['data-id', 'src', 'alt', 'width'],
  table: ['data-id'],
  colgroup: [],
  col: ['style'],
  thead: [],
  tbody: [],
  tr: [],
  th: ['scope', 'colspan', 'rowspan', 'data-background', 'style'],
  td: ['colspan', 'rowspan', 'data-background', 'style'],
  br: [],
  a: ['href'],
  span: ['data-color'],
  mark: ['data-color'],
  strong: [],
  em: [],
  u: [],
  s: [],
  sup: [],
  sub: [],
};

/**
 * Problems of exported HTML against the profile: elements and attributes outside it, styles other
 * than a logical `text-align` and the `col` width, classes other than `language-*` on `code`, and
 * color names outside the palette. Custom nodes are their definitions' elements with `data-type`.
 */
function profileProblems(html: string, nodes: readonly TextEditorNodeDefinition[] = []): string[] {
  const problems: string[] = [];
  const colors = new Set<string>(TEXT_EDITOR_COLORS);
  for (const element of elementsOf(htmlSource(html))) {
    const tag = element.localName;
    const type = element.getAttribute('data-type');
    const definition = nodes.find((node) => node.name === type && node.element === tag);
    const allowed = definition
      ? ['data-id', 'data-type', ...Object.keys(definition.attrs).map((name) => `data-${name}`)]
      : PROFILE[tag];
    if (!allowed) {
      problems.push(`<${tag}>`);
      continue;
    }
    for (const { name, value } of Array.from(element.attributes)) {
      if (!allowed.includes(name)) problems.push(`<${tag} ${name}>`);
      if (
        name === 'style' &&
        !/^(?:text-align: (?:center|end|justify)|width: \d+(?:\.\d+)?px)$/u.test(value)
      )
        problems.push(`<${tag} style="${value}">`);
      if (name === 'style' && tag === 'col' && !value.startsWith('width: '))
        problems.push(`<col style="${value}">`);
      if (name === 'class' && !/^language-\S+$/u.test(value))
        problems.push(`<${tag} class="${value}">`);
      if ((name === 'data-color' || name === 'data-background') && !colors.has(value))
        problems.push(`<${tag} ${name}="${value}">`);
      if (name === 'data-type' && tag === 'ul' && value !== 'task') problems.push(`<ul ${name}>`);
    }
  }
  return problems;
}

describe('HTML profile over the corpus (uwg-te-req-content-2)', () => {
  it('every exported document holds only the profile', () => {
    // Engine classes and attributes, editability and direction markers are attributes outside
    // the profile, so the scan reports any of them.
    for (const entry of CORPUS_ENTRIES) {
      const html = serializeHtml(corpusDocument(entry).document, { nodes: entry.nodes });
      expect(profileProblems(html, entry.nodes), entry.name).toEqual([]);
    }
    expect(profileProblems('<p contenteditable="false" dir="auto" class="x">a</p>')).toEqual([
      '<p contenteditable>',
      '<p dir>',
      '<p class>',
      '<p class="x">',
    ]);
  });

  it('every block carries data-id; list containers, the paragraphs inside blocks and inline elements carry none', () => {
    for (const entry of CORPUS_ENTRIES) {
      const html = serializeHtml(corpusDocument(entry).document, { nodes: entry.nodes });
      const check = (element: ElementLike, top: boolean) => {
        const tag = element.localName;
        const id = element.getAttribute('data-id');
        if ((top && tag !== 'ul' && tag !== 'ol') || tag === 'li')
          expect(id, `${entry.name}: ${outerHtml(element)}`).toMatch(/^[A-Za-z0-9_-]{1,64}$/u);
        else expect(id, `${entry.name}: ${outerHtml(element)}`).toBeNull();
        for (const child of Array.from(element.childNodes).filter(isElementLike))
          check(child, false);
      };
      for (const child of Array.from(htmlSource(html).childNodes).filter(isElementLike))
        check(child, true);
    }
  });

  it('V-114: corpus 2 and 3 write every block element of the content model rows 1 to 6', () => {
    const html = ['02-blocks', '03-lists'].map((name) => golden(`${name}.html`)).join('\n');
    for (const pattern of [
      /<p data-id="[^"]+">/u,
      /<h1 data-id="[^"]+" style="text-align: center">/u,
      /<h6 data-id/u,
      /<br>/u,
      /<blockquote data-id="[^"]+"><p>[^<]*<br>/u,
      /<pre data-id="[^"]+"><code class="language-python">/u,
      /<ul><li data-id/u,
      /<ol start="4"><li data-id/u,
      /<ul data-type="task"><li data-id="[^"]+" data-checked="true"><p>/u,
      /<hr data-id="[^"]+">/u,
      /<img data-id="[^"]+" src="[^"]+" alt="[^"]+" width="480">/u,
    ])
      expect(html).toMatch(pattern);
  });

  it('V-116: corpus 1 nests marks in the profile order and writes every palette name', () => {
    const html = golden('01-marks.html');
    expect(html).toContain(
      '<a href="https://gullrock.example/storm"><span data-color="blue"><mark data-color="yellow"><strong><em>Every outer mark</em></strong></mark></span></a>',
    );
    expect(html).toContain('<strong><em><u><s>Four marks on one run</s></u></em></strong>');
    expect(html).toContain(
      '<a href="https://gullrock.example/manual#lens"><code>lens.rotate(90)</code></a>',
    );
    for (const color of TEXT_EDITOR_COLORS) {
      expect(html).toContain(`<span data-color="${color}">${color}</span>`);
      expect(html).toContain(`<mark data-color="${color}">${color}</mark>`);
    }
    const markdown = corpusFile('01-marks.md');
    for (const syntax of [
      '**bold**',
      '*italic*',
      '~~struck~~',
      '`inline code`',
      '[a link](https://gullrock.example/log)',
      '<u>underlined</u>',
      '<sup>4</sup>',
      '<sub>16</sub>',
      '<span data-color="red">',
      '<mark data-color="blue">',
    ])
      expect(markdown).toContain(syntax);
  });
});

describe('content without an engine (uwg-te-req-content-1)', () => {
  it('V-108: HTML, Markdown and text are produced and parsed from hand-built portable trees', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        { type: 'heading', id: 'title', level: 2, content: [{ type: 'text', text: 'Harbor log' }] },
        {
          type: 'paragraph',
          id: 'body',
          align: 'center',
          content: [
            { type: 'text', text: 'Calm ' },
            { type: 'text', text: 'sea', marks: { bold: true, link: 'https://harbor.example/' } },
            { type: 'hard-break' },
            { type: 'text', text: 'second line' },
          ],
        },
        {
          type: 'list-task',
          id: 'task',
          checked: true,
          content: [{ type: 'text', text: 'Moorings checked' }],
          children: [],
        },
        { type: 'code', id: 'code', language: 'ts', text: 'const tide = 2;' },
      ],
    };
    const html = serializeHtml(document);
    expect(html).toBe(
      [
        '<h2 data-id="title">Harbor log</h2>',
        '<p data-id="body" style="text-align: center">Calm <a href="https://harbor.example/"><strong>sea</strong></a><br>second line</p>',
        '<ul data-type="task"><li data-id="task" data-checked="true"><p>Moorings checked</p></li></ul>',
        '<pre data-id="code"><code class="language-ts">const tide = 2;</code></pre>',
      ].join('\n'),
    );
    expect(importHtml(htmlSource(html)).document).toEqual(document);
    const markdown = writeMarkdown(document).markdown;
    expect(markdown).toBe(
      '## Harbor log\n\nCalm [**sea**](https://harbor.example/)\\\nsecond line\n\n- [x] Moorings checked\n\n```ts\nconst tide = 2;\n```\n',
    );
    expect(withoutIds(readMarkdown(markdown).document)).toEqual(
      withoutIds({
        blocks: document.blocks.map((block) =>
          block.type === 'paragraph' ? { ...block, align: undefined } : block,
        ),
      }),
    );
    const text = writeText(document);
    expect(text).toBe('Harbor log\n\nCalm sea\nsecond line\n\nMoorings checked\n\nconst tide = 2;');
    expect(writeText(readText(text))).toBe(text);
  });

  it('the clipboard record of every corpus document reads back as written', () => {
    for (const entry of CORPUS_ENTRIES) {
      const { document } = corpusDocument(entry);
      for (const kind of ['range', 'blocks'] as const) {
        const html = writeClipboardHtml({ kind, blocks: document.blocks }, { nodes: entry.nodes });
        const read = readClipboardHtml(htmlSource(html), { nodes: entry.nodes });
        expect(read.fragment.kind).toBe(kind);
        expect(read.fragment.blocks).toEqual(outputBlocks(document));
      }
    }
  });
});
