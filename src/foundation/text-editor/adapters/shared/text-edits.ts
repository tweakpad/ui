/**
 * Text edits across blocks over the portable model (Widgets `uwg-te-req-content-7`,
 * `uwg-te-req-parity-1`, `uwg-te-lis-up-i2`).
 *
 * Pure functions for what typing, deletion and the deletion keys do across block boundaries: the
 * range deletion, the joins and unnesting of Backspace and Delete at list boundaries, the marks of
 * inserted text and text replacing a range. Each adapter applies the result in one engine
 * transaction or update, then places a caret at the returned text point. Text points lie outside
 * tables.
 */
import {
  isAtomOrTable,
  isListItem,
  textToInline,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
  type TextEditorPortableMarks,
} from '../../content/portable.js';
import type { TextEditorTextPoint } from '../../model.js';
import {
  editedDocument,
  outdentItems,
  replaceAt,
  withInline,
  type TextEditorEditContext,
} from './block-edits.js';
import {
  blockAt,
  blockInline,
  findPath,
  inlineLength,
  isTextblock,
  locatedBlocks,
  splitInline,
  type TextEditorBlockTextPoint,
  type TextEditorLocatedBlock,
} from './blocks.js';

type Block = TextEditorPortableBlock;
type Item = TextEditorPortableListItem;
type Inline = TextEditorPortableInline;

/** A document after a text edit, with the caret it leaves (a text point outside tables). */
export interface TextEditorTextEdit {
  readonly document: TextEditorPortableDocument;
  readonly caret: TextEditorBlockTextPoint;
}

/** The deletion keys. */
export type TextEditorDeleteKey = 'backspace' | 'delete';

/**
 * The blocks without those of `removed`, `replaced` blocks swapped in; a removed list item's
 * nested items that stay are lifted: appended to the nested items of the list item right before it
 * among its siblings, so that they keep their depth, or, when no list item precedes it there, put
 * in its place, one level up (a removed top-level item's nested items become top-level items).
 */
function liftRemoved(
  list: readonly Block[],
  removed: ReadonlySet<Block>,
  replaced: ReadonlyMap<Block, Block>,
): Block[] {
  const result: Block[] = [];
  for (const block of list) {
    const children = isListItem(block) ? liftRemoved(block.children, removed, replaced) : null;
    if (!removed.has(block)) {
      const kept = replaced.get(block) ?? block;
      result.push(children && isListItem(kept) ? ({ ...kept, children } as Block) : kept);
      continue;
    }
    if (!children || children.length === 0) continue;
    const previous = result[result.length - 1];
    if (previous && isListItem(previous))
      result[result.length - 1] = {
        ...previous,
        children: [...previous.children, ...(children as Item[])],
      } as Block;
    else result.push(...children);
  }
  return result;
}

/** The textblock at a text point outside tables, with its place in document order. */
function textPointAt(
  order: readonly TextEditorLocatedBlock[],
  point: TextEditorBlockTextPoint,
): { index: number; block: Block; content: readonly Inline[] } | null {
  const index = order.findIndex(({ block }) => block.id === point.block);
  const block = order[index]?.block;
  const content = block ? blockInline(block) : null;
  if (!block || !content || point.offset < 0 || point.offset > inlineLength(content)) return null;
  return { index, block, content };
}

/**
 * The deletion of the text between two text points outside tables, in either order. The range
 * deletion rule of every adapter, for typing, `text.insert`, `text.delete`, paste and cut over a
 * range, and Backspace, Delete and Enter over one:
 * 1. The points are ordered in document order (an item before its nested items); the first point's
 *    textblock is the start block, the last point's the end block. Within one textblock the text
 *    between the points goes and nothing else changes.
 * 2. The start block keeps its kind, attributes and place, and its text before the start point;
 *    the end block's text after the end point joins it at that point. Text taken from a code block
 *    into another kind keeps its line breaks as hard breaks; text joining a code block becomes its
 *    plain text (marks dropped, hard breaks as line breaks, inline nodes as their text).
 * 3. Every block after the start block in document order up to the end block, the end block
 *    included, is removed: paragraphs, headings, quotes, code blocks, atoms and tables between the
 *    points, and list items between them, which are fully covered, together with the end block.
 *    A removed list item's nested items that the range does not cover stay and are lifted: they
 *    join the nested items of the list item right before the removed item among its siblings, so
 *    they keep their depth, or, without such an item, take the removed item's place one level up
 *    (nested items of a removed top-level item become top-level items). The start block's own
 *    nested items that the range does not cover stay its nested items. Lists that the removal
 *    leaves adjacent merge by normalization.
 * 4. Identifiers (`uwg-te-req-content-7`): the joined block keeps the identifier of the block that
 *    holds its first character: the start block's, unless the start point is at the start of the
 *    start block and the end block has text after the end point, when it takes the end block's
 *    identifier (the start block's kind still applies). When it holds no text, the start block's.
 *    Every other block keeps its identifier.
 * 5. The caret is at the join point: the joined block at the length of the start block's kept text.
 * Text inserted afterwards is `replaceRange`'s. Enter over a range applies this deletion, then
 * the collapsed caret's Enter at `caret` (the split rules of `uwg-te-req-content-7` and
 * `uwg-te-req-parity-1`), in one transaction. `null` when a point names no textblock outside
 * tables or lies beyond its text; a range with a point in a table cell is not covered.
 */
export function deleteRange(
  document: TextEditorPortableDocument,
  anchor: TextEditorBlockTextPoint,
  head: TextEditorBlockTextPoint,
  context: TextEditorEditContext,
): TextEditorTextEdit | null {
  const order = locatedBlocks(document.blocks);
  const a = textPointAt(order, anchor);
  const h = textPointAt(order, head);
  if (!a || !h) return null;
  const forward = a.index < h.index || (a.index === h.index && anchor.offset <= head.offset);
  const [start, end] = forward ? [a, h] : [h, a];
  const [from, to] = forward ? [anchor, head] : [head, anchor];
  const before = splitInline(start.content, from.offset)[0];
  const after = splitInline(end.content, to.offset)[1];
  const keepsId =
    start.index !== end.index && inlineLength(before) === 0 && inlineLength(after) > 0
      ? end.block.id!
      : start.block.id!;
  const joined = {
    ...withInline(start.block, [...before, ...after], context.nodes),
    id: keepsId,
  } as Block;
  const removed = new Set(order.slice(start.index + 1, end.index + 1).map(({ block }) => block));
  const blocks = liftRemoved(document.blocks, removed, new Map([[start.block, joined]]));
  return {
    document: editedDocument(blocks, context),
    caret: { block: keepsId, offset: inlineLength(before) },
  };
}

/**
 * The join of the textblock `second` into the textblock `first` right before it in document order
 * (an item's first nested item comes right after the item), as Backspace at the start of `second`
 * or Delete at the end of `first` joins them (see `listBoundaryEdit`): when `first` is empty and
 * `second` is not, `first` goes and `second` keeps its place, kind and identifier, the nested items
 * of a removed list item lifted as `deleteRange` lifts them, the caret at its start; otherwise
 * `second`'s text joins `first` at its end (`deleteRange` from the end of `first` to the start of
 * `second`), `first` keeping its kind and identifier and `second`'s nested items lifted. `null`
 * unless both are textblocks outside tables and `second` comes right after `first`.
 */
export function joinBlocks(
  document: TextEditorPortableDocument,
  first: string,
  second: string,
  context: TextEditorEditContext,
): TextEditorTextEdit | null {
  const order = locatedBlocks(document.blocks);
  const index = order.findIndex(({ block }) => block.id === first);
  const earlier = order[index]?.block;
  const later = order[index + 1]?.block;
  if (!earlier || !later || later.id !== second) return null;
  const earlierContent = blockInline(earlier);
  const laterContent = blockInline(later);
  if (!earlierContent || !laterContent) return null;
  if (inlineLength(earlierContent) === 0 && inlineLength(laterContent) > 0) {
    const blocks = liftRemoved(document.blocks, new Set([earlier]), new Map());
    return { document: editedDocument(blocks, context), caret: { block: second, offset: 0 } };
  }
  return deleteRange(
    document,
    { block: first, offset: inlineLength(earlierContent) },
    { block: second, offset: 0 },
    context,
  );
}

/** Kinds whose Backspace at the start turns them into a paragraph first (`uwg-te-req-parity-1`). */
const COLLAPSING: ReadonlySet<string> = new Set(['heading', 'quote', 'code']);

/**
 * Backspace with a collapsed caret at the start of a paragraph or a custom textblock right after a
 * code block, or Delete at the end of a code block right before a textblock other than a list
 * item: the later block joins the code block by the shared join (`joinBlocks`), one rule for every
 * engine, which runs it before the engine's own join (`uwg-te-req-content-7`). The joined text
 * becomes the code block's plain text: marks dropped, hard breaks as line breaks and each inline
 * node as the text that the text format writes for it, a mention its label, never dropped
 * (`uwg-te-req-content-5`). An empty code block goes instead, the later block keeping its place,
 * kind, identifier and inline nodes, as in every join. A list item's boundaries are
 * `listBoundaryEdit`'s, and a heading or quote at the caret turns into a paragraph before it joins
 * anything (`uwg-te-req-parity-1`). `null` for any other key, point or pair, and in a table cell.
 */
export function codeJoinEdit(
  document: TextEditorPortableDocument,
  key: TextEditorDeleteKey,
  point: TextEditorTextPoint,
  context: TextEditorEditContext,
): TextEditorTextEdit | null {
  if (point.cell) return null;
  const order = locatedBlocks(document.blocks);
  const index = order.findIndex(({ block }) => block.id === point.block);
  const at = order[index]?.block;
  const content = at ? blockInline(at) : null;
  if (!at || !content) return null;
  const backspace = key === 'backspace';
  if (point.offset !== (backspace ? 0 : inlineLength(content))) return null;
  const [first, second] = backspace ? [order[index - 1]?.block, at] : [at, order[index + 1]?.block];
  if (first?.type !== 'code' || !first.id || !second?.id) return null;
  if (!isTextblock(second) || isListItem(second)) return null;
  if (backspace && COLLAPSING.has(second.type)) return null;
  return joinBlocks(document, first.id, second.id, context);
}

/**
 * Backspace or Delete with a collapsed caret at a list boundary; the shared rule of every adapter,
 * which runs it before the engine's own deletion, outside tables:
 * 1. Backspace with the caret at the start of a list item's text unnests the item
 *    (`outdentItems`), whether the item is empty or not: a nested item follows its parent item,
 *    its following siblings becoming its nested items; a top-level item becomes a paragraph,
 *    splitting the outermost list there, its nested items following as top-level items. So
 *    Backspace at the start of a top-level first item, or in an empty top-level item, turns it
 *    into a paragraph. The item keeps its identifier; the caret stays at its start.
 * 2. Backspace with the caret at the start of a paragraph or a custom textblock whose previous
 *    block in document order is a list item, which is the deepest last item of the list before
 *    it, joins it into that item (`joinBlocks`). Headings, quotes and code blocks first turn into
 *    paragraphs (`uwg-te-req-parity-1`), which is not a list boundary.
 * 3. Delete with the caret at the end of a list item's text joins the next block in document
 *    order into it when that block is a textblock (`joinBlocks`): the item's first nested item, or
 *    the next item, or a block after the list. Delete at the end of any other textblock joins the
 *    next block when that block is a list item.
 * 4. A join (`joinBlocks`) appends the later block's text to the earlier block, which keeps its
 *    kind, attributes and identifier, the caret at the join point; the later block goes, and its
 *    nested items keep their depth under the list item right before it among its siblings, or else
 *    take its place one level up (nested items of a removed top-level item become top-level
 *    items). When the earlier block is empty and the later is not, the earlier block goes instead
 *    and the later keeps its place, kind and identifier, the caret at its start. Either way the
 *    block holding the first character keeps its identifier (`uwg-te-req-content-7`). Code text
 *    joining another kind gives hard breaks; text joining a code block becomes its plain text.
 * `null` when the key acts at no list boundary: a caret elsewhere in its text, a block without a
 * neighbor, a neighbor that is an atom or a table (which the key block-selects), or two neighbors
 * neither of which is a list item; the engine's own deletion then applies.
 */
export function listBoundaryEdit(
  document: TextEditorPortableDocument,
  key: TextEditorDeleteKey,
  point: TextEditorBlockTextPoint,
  context: TextEditorEditContext,
): TextEditorTextEdit | null {
  const order = locatedBlocks(document.blocks);
  const here = textPointAt(order, point);
  if (!here) return null;
  const { index, block, content } = here;
  const id = block.id!;
  if (key === 'backspace') {
    if (point.offset !== 0) return null;
    if (isListItem(block)) {
      const next = outdentItems(document, [id], context);
      return next ? { document: next, caret: { block: id, offset: 0 } } : null;
    }
    if (COLLAPSING.has(block.type)) return null;
    const previous = order[index - 1]?.block;
    return previous?.id && isListItem(previous)
      ? joinBlocks(document, previous.id, id, context)
      : null;
  }
  if (point.offset !== inlineLength(content)) return null;
  const next = order[index + 1]?.block;
  if (!next?.id || !isTextblock(next)) return null;
  if (!isListItem(block) && !isListItem(next)) return null;
  return joinBlocks(document, id, next.id, context);
}

/**
 * The block that Backspace with a collapsed caret at the start of a textblock, or Delete at its
 * end, selects (`uwg-te-req-engine-9`): the atom block or table right before the textblock
 * (Backspace) or right after it (Delete) in document order, an item before its nested items. The
 * key selects that block and keeps the textblock, an empty one included; a further key deletes the
 * selected block. `null` for a caret elsewhere in its text, in a table cell, or beside any other
 * block or none. The rules that act at a block's start first, such as Backspace turning a heading,
 * quote or code block or a top-level list item into a paragraph, come before it.
 */
export function blockBesideKey(
  document: TextEditorPortableDocument,
  key: TextEditorDeleteKey,
  point: TextEditorTextPoint,
): string | null {
  if (point.cell) return null;
  const order = locatedBlocks(document.blocks);
  const here = textPointAt(order, point);
  if (!here) return null;
  const backward = key === 'backspace';
  if (point.offset !== (backward ? 0 : inlineLength(here.content))) return null;
  const beside = order[backward ? here.index - 1 : here.index + 1]?.block;
  return beside?.id && isAtomOrTable(beside) ? beside.id : null;
}

/** The marks of a text unit, `null` for a hard break, an inline node or no unit. */
const unitMarks = (unit: Inline | undefined): TextEditorPortableMarks | null =>
  unit?.type === 'text' ? (unit.marks ?? null) : null;

/** The units right before and right after an offset of inline content. */
function unitsAround(
  content: readonly Inline[],
  offset: number,
): [Inline | undefined, Inline | undefined] {
  const [before, after] = splitInline(content, offset);
  return [before[before.length - 1], after[0]];
}

/**
 * The marks that text inserted over the range from `anchor` to `head`, or at the caret when they
 * are equal, takes (`uwg-te-lis-up-i2`: marks and colors are inclusive at their end and exclusive
 * at their start, and links are inclusive at neither): over a range, the marks of the first text
 * the range covers in document order (a range without text acts as a caret at its start); at a
 * caret, the marks and colors of the text right before it, and none at the start of a block or
 * after a hard break or an inline node, even when a marked run follows. A link carries over only
 * when the inserted text lies inside it: once the range is removed, the text on both sides of the
 * insertion point has that same link (text inserted inside a link stays inside it; at a link's
 * edges it does not). `null` for plain text, in a code block, and for points that name no
 * textblock outside tables.
 */
export function insertionMarks(
  document: TextEditorPortableDocument,
  anchor: TextEditorBlockTextPoint,
  head: TextEditorBlockTextPoint,
): TextEditorPortableMarks | null {
  const order = locatedBlocks(document.blocks);
  const a = textPointAt(order, anchor);
  const h = textPointAt(order, head);
  if (!a || !h) return null;
  const forward = a.index < h.index || (a.index === h.index && anchor.offset <= head.offset);
  const [start, end] = forward ? [a, h] : [h, a];
  const [from, to] = forward ? [anchor, head] : [head, anchor];
  if (start.block.type === 'code') return null;
  let marks: TextEditorPortableMarks | null | undefined;
  // The first text the range covers.
  for (let index = start.index; index <= end.index && marks === undefined; index += 1) {
    const block = order[index]!.block;
    const content = blockInline(block);
    if (!content || block.type === 'code') continue;
    const lower = index === start.index ? from.offset : 0;
    const upper = index === end.index ? to.offset : inlineLength(content);
    const covered = splitInline(splitInline(content, upper)[0], lower)[1];
    const text = covered.find((unit) => unit.type === 'text');
    if (text) marks = unitMarks(text);
  }
  // The unit before the insertion point once the range is removed: a caret's marks come from it.
  const left = unitsAround(start.content, from.offset)[0];
  if (marks === undefined) marks = unitMarks(left);
  if (!marks) return null;
  const right = unitsAround(end.content, to.offset)[1];
  const { link, ...rest } = marks;
  const inside =
    link !== undefined && unitMarks(left)?.link === link && unitMarks(right)?.link === link;
  const result: TextEditorPortableMarks = inside ? { ...rest, link } : rest;
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * `deleteRange`, then `text` inserted at the caret it leaves, a line feed as a hard break (kept as
 * a line feed in a code block), the text taking `marks` when given (the caret's stored marks, or
 * `null` for plain text) and else `insertionMarks` of the range; the caret after the inserted text.
 * An empty `text` is `deleteRange`. `null` as `deleteRange`.
 */
export function replaceRange(
  document: TextEditorPortableDocument,
  anchor: TextEditorBlockTextPoint,
  head: TextEditorBlockTextPoint,
  text: string,
  context: TextEditorEditContext,
  marks?: TextEditorPortableMarks | null,
): TextEditorTextEdit | null {
  const deleted = deleteRange(document, anchor, head, context);
  if (!deleted || text === '') return deleted;
  const applied = marks === undefined ? insertionMarks(document, anchor, head) : marks;
  const { caret } = deleted;
  const path = findPath(deleted.document.blocks, caret.block)!;
  const block = blockAt(deleted.document.blocks, path)!;
  const inserted = textToInline(text).map((unit) =>
    unit.type === 'text' && applied && block.type !== 'code' ? { ...unit, marks: applied } : unit,
  );
  const [before, after] = splitInline(blockInline(block)!, caret.offset);
  const next = withInline(block, [...before, ...inserted, ...after], context.nodes);
  return {
    document: editedDocument(replaceAt(deleted.document.blocks, path, [next]), context),
    caret: { block: caret.block, offset: caret.offset + inlineLength(inserted) },
  };
}
