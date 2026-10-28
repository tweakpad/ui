/**
 * The round-trip corpus for the content tests (node environment): the documents of
 * `tests/fixtures/widgets/text-editor/corpus`, the definitions of its custom nodes, which
 * `corpus/nodes.ts` holds for these tests and the browser fixtures alike, and the canonical
 * document of each input. The corpus and fake tests import these; a `*.test.ts` module stays out
 * of the build, and the suites at the end keep the file from counting as an empty one.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { corpusNodes } from '../../../../tests/fixtures/widgets/text-editor/corpus/nodes.js';
import type { TextEditorNodeDefinition } from '../nodes.js';
import { importHtml, serializeHtml } from './html.js';
import { htmlSource } from './html-source.test.js';
import { readMarkdown } from './markdown.js';
import type { TextEditorPortableDocument, TextEditorPortableTable } from './portable.js';

export { corpusNodes };

const CORPUS = new URL('../../../../tests/fixtures/widgets/text-editor/corpus/', import.meta.url);

export interface CorpusEntry {
  /** The file name stem: `NN-name`. */
  readonly name: string;
  /** The format of the input file, `NN-name.input.html` or `NN-name.input.md`. */
  readonly input: 'html' | 'markdown';
  /** The custom node definitions the document is read and written with. */
  readonly nodes?: readonly TextEditorNodeDefinition[];
}

/** The corpus documents of the round-trip assertions, 1–8, as the corpus README lists them. */
export const CORPUS_ENTRIES: readonly CorpusEntry[] = [
  { name: '01-marks', input: 'html' },
  { name: '02-blocks', input: 'html' },
  { name: '03-lists', input: 'html' },
  { name: '04-tables', input: 'html' },
  { name: '05-custom', input: 'html', nodes: corpusNodes },
  { name: '06-ids', input: 'html' },
  { name: '07-hostile', input: 'html' },
  { name: '08-markdown', input: 'markdown' },
];

/** Block identifiers in the canonical shape, `te00000001`, `te00000002`, … in order. */
export function corpusIds(): () => string {
  let next = 0;
  return () => `te${String((next += 1)).padStart(8, '0')}`;
}

/** A corpus file as UTF-8 text. */
export const corpusFile = (file: string): string => readFileSync(new URL(file, CORPUS), 'utf8');

/** A golden as the serializers write it: the file holds one more line feed at its end. */
export const corpusGolden = (file: string): string => corpusFile(file).replace(/\n$/u, '');

/** The canonical document of a corpus input, with identifiers from `corpusIds`. */
export function corpusDocument(entry: CorpusEntry): {
  readonly document: TextEditorPortableDocument;
  readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
} {
  const options = { nodes: entry.nodes, createId: corpusIds() };
  return entry.input === 'html'
    ? importHtml(htmlSource(corpusFile(`${entry.name}.input.html`)), options)
    : readMarkdown(corpusFile(`${entry.name}.input.md`), options);
}

describe('round-trip corpus', () => {
  it('holds each document with its input and its HTML, Markdown and text goldens', () => {
    for (const entry of CORPUS_ENTRIES)
      for (const file of [
        `${entry.name}.input.${entry.input === 'html' ? 'html' : 'md'}`,
        `${entry.name}.html`,
        `${entry.name}.md`,
        `${entry.name}.txt`,
      ])
        expect(existsSync(new URL(file, CORPUS)), file).toBe(true);
    expect(corpusDocument(CORPUS_ENTRIES[0]!).document.blocks[0]?.id).toBe('te00000001');
  });
});

/**
 * Canonical documents without an input or format goldens, which the parity page loads into both
 * engines: their HTML is the golden, with fixed identifiers.
 */
export const CANONICAL_DOCUMENTS: readonly Omit<CorpusEntry, 'input'>[] = [
  { name: 'tables' },
  { name: 'addressing', nodes: corpusNodes },
  { name: 'state' },
  { name: 'lists', nodes: corpusNodes },
];

describe('canonical parity documents', () => {
  for (const entry of CANONICAL_DOCUMENTS)
    it(`${entry.name}.html reads and writes back unchanged`, () => {
      const source = corpusGolden(`${entry.name}.html`);
      const { document, diagnostics } = importHtml(htmlSource(source), { nodes: entry.nodes });
      expect(diagnostics).toEqual([]);
      expect(serializeHtml(document, { nodes: entry.nodes })).toBe(source);
    });

  // The cell-range rows start from a table of two rows and two columns with text in every cell.
  it('tables.html holds a 2×2 table without spans and with text in every cell', () => {
    const { document } = importHtml(htmlSource(corpusGolden('tables.html')));
    const grids = document.blocks.filter(
      (block): block is TextEditorPortableTable =>
        block.type === 'table' &&
        block.rows.length === 2 &&
        block.rows.every(
          (row) =>
            row.cells.length === 2 &&
            row.cells.every(
              (cell) =>
                (cell.rowSpan ?? 1) === 1 &&
                (cell.colSpan ?? 1) === 1 &&
                cell.paragraphs.some((paragraph) => paragraph.content.length > 0),
            ),
        ),
    );
    expect(grids.map((table) => table.id)).toEqual(['tables0004']);
  });
});
