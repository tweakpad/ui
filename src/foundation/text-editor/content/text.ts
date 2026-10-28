/**
 * Text format of the text editor (Widgets `uwg-te-req-content-5`, `uwg-te-tab-content-model`).
 *
 * The writer joins blocks with a blank line and consecutive list items with one line break; each
 * block gives its text as `blockText` states it, and a block the format omits leaves no line. The
 * reader is also the shared parser of pasted and dropped text: it splits paragraphs at each pair
 * of consecutive line breaks, read from the start, so that each further pair yields an empty
 * paragraph, and turns every remaining line break into a hard break. Markers, nesting, marks,
 * alignment and identifiers are not written, so text keeps only the text of the content.
 */
import { planIdRepair } from '../ids.js';
import type { TextEditorNodeDefinition } from '../nodes.js';
import {
  blockText,
  isListItem,
  outputBlocks,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
  type TextEditorPortableParagraph,
} from './portable.js';

export interface TextEditorTextWriteOptions {
  /** The custom node definitions, whose text a custom block or inline node gives. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
}

export interface TextEditorTextReadOptions {
  /** Creates the paragraph identifiers; ten random characters by default. */
  readonly createId?: (() => string) | undefined;
}

/**
 * Writes a document as text: blocks joined by a blank line, consecutive list items, nested ones
 * included, by one line break, and the blocks the format omits, such as dividers, left out with
 * their separators.
 */
export function writeText(
  document: TextEditorPortableDocument,
  options: TextEditorTextWriteOptions = {},
): string {
  const entries: { readonly text: string | null; readonly item: boolean }[] = [];
  const visit = (block: TextEditorPortableBlock) => {
    entries.push({ text: blockText(block, options.nodes), item: isListItem(block) });
    if (isListItem(block)) block.children.forEach(visit);
  };
  outputBlocks(document).forEach(visit);
  let text = '';
  let written = false;
  entries.forEach((entry, index) => {
    if (entry.text === null) return;
    // Two list items are consecutive when no block, omitted or not, lies between them.
    if (written) text += entry.item && entries[index - 1]?.item === true ? '\n' : '\n\n';
    text += entry.text;
    written = true;
  });
  return text;
}

/**
 * Reads text as paragraphs: a carriage return with or without a line feed counts as a line break,
 * each pair of consecutive line breaks read from the start ends a paragraph, and every remaining
 * line break is a hard break, so `"a\n\n\n\nb"` holds an empty paragraph between `a` and `b` and
 * the empty text is one empty paragraph. Every paragraph gets a fresh identifier.
 */
export function readText(
  text: string,
  options: TextEditorTextReadOptions = {},
): TextEditorPortableDocument {
  const source = String(text).replace(/\r\n?/gu, '\n');
  const paragraphs: TextEditorPortableInline[][] = [];
  let content: TextEditorPortableInline[] = [];
  let index = 0;
  while (index < source.length) {
    const next = source.indexOf('\n', index);
    const end = next === -1 ? source.length : next;
    if (end > index) content.push({ type: 'text', text: source.slice(index, end) });
    if (next === -1) break;
    if (source[next + 1] === '\n') {
      paragraphs.push(content);
      content = [];
      index = next + 2;
    } else {
      content.push({ type: 'hard-break' });
      index = next + 1;
    }
  }
  paragraphs.push(content);
  const { ids } = planIdRepair(
    paragraphs.map(() => null),
    options.createId,
  );
  return {
    blocks: paragraphs.map((inline, position): TextEditorPortableParagraph => ({
      type: 'paragraph',
      id: ids[position]!,
      content: inline,
    })),
  };
}
