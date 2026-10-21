/**
 * Text and inline node actions of the Tiptap adapter (Widgets `uwg-te-tab-actions` r4,
 * `uwg-te-req-engine-4`, `uwg-te-req-content-7`).
 *
 * Text inserts at the selection or in place of a range, taking the marks that typed text would
 * take there; a line feed becomes a hard break outside a code block. Over a selection across
 * blocks, the shared range deletion and replacement apply. Over the whole-document selection,
 * however it was made (`wholeDocumentSelection`), the document first becomes one empty paragraph
 * with a fresh identifier, so the text lands as at a caret in that paragraph. An inline node
 * inserts with one space after it, the caret following the space.
 */
import { definitionAttributes, type TextEditorPortableMarks } from '../../content/portable.js';
import type { TextEditorTextRange } from '../../model.js';
import type { TextEditorBlockTextPoint } from '../shared/blocks.js';
import { deleteRange, replaceRange, type TextEditorTextEdit } from '../shared/text-edits.js';
import type { TiptapActionHandlers } from './actions.js';
import { applyDocument, editContext, restoreSelection } from './blocks.js';
import { marksOf, posToPoint } from './mapping.js';
import { typedMarks } from './marks.js';
import { isInstance, type TiptapMarkLike, type TiptapNodeLike } from './modules.js';
import { NATIVE, nativeNodeName } from './schema.js';
import { wholeDocumentSelection } from './selection.js';
import type { TiptapEnv, TiptapWork } from './work.js';

interface Range {
  readonly from: number;
  readonly to: number;
}

/**
 * Whether the work's selection is the whole-document selection: the engine's select-all, or a text
 * selection from the first to the last text point (`wholeDocumentSelection`).
 */
export const holdsWholeDocument = (work: TiptapWork): boolean =>
  wholeDocumentSelection(work.env, work.doc, work.selection);

/**
 * Replaces the document with one empty paragraph with a fresh identifier, as input over the
 * whole-document selection does first (`uwg-te-req-engine-11`); answers the paragraph's identifier.
 */
export function clearDocument(work: TiptapWork): string {
  const id = work.env.createId();
  const { tr } = work;
  tr.replaceWith(0, tr.doc.content.size, work.schema.nodes[NATIVE.paragraph]!.create({ id }));
  tr.setSelection(work.env.modules.state.TextSelection.create(tr.doc, 1));
  return id;
}

/**
 * The range that inserted content replaces: `range`, else the text or whole-document selection.
 * The whole-document selection first leaves one empty paragraph.
 */
export function insertionRange(
  work: TiptapWork,
  range: TextEditorTextRange | undefined,
): Range | null {
  if (range) return work.rangePositions(range);
  const { selection } = work;
  const { TextSelection } = work.env.modules.state;
  if (holdsWholeDocument(work)) {
    clearDocument(work);
    return { from: 1, to: 1 };
  }
  if (isInstance(selection, TextSelection)) return { from: selection.from, to: selection.to };
  return null;
}

// Ranges across blocks (`uwg-te-req-content-7`)

/** The ends of a text range across blocks, as block text points. */
export interface TiptapBlockRange {
  readonly anchor: TextEditorBlockTextPoint;
  readonly head: TextEditorBlockTextPoint;
}

/**
 * The text range between two positions when its ends lie in two different blocks outside tables:
 * the range that the shared range deletion takes. A range within one textblock, or
 * with an end in a table cell, is `null`: there the engine's own deletion gives the same result,
 * or the shared rule does not reach.
 */
export function crossBlockRange(
  env: Pick<TiptapEnv, 'tables'>,
  doc: TiptapNodeLike,
  anchor: number,
  head: number,
): TiptapBlockRange | null {
  const from = posToPoint(doc, anchor, env.tables);
  const to = posToPoint(doc, head, env.tables);
  if (!from || !to || from.cell || to.cell || from.block === to.block) return null;
  return {
    anchor: { block: from.block, offset: from.offset },
    head: { block: to.block, offset: to.offset },
  };
}

/** The range across blocks that a work's text selection holds, or `null`. */
export function selectedCrossBlockRange(work: TiptapWork): TiptapBlockRange | null {
  const { selection } = work;
  const { TextSelection } = work.env.modules.state;
  if (selection.empty || !isInstance(selection, TextSelection)) return null;
  return crossBlockRange(work.env, work.doc, selection.anchor, selection.head);
}

/** Applies a shared text edit to a work: its document, then a caret at the point it leaves. */
export function applyTextEdit(work: TiptapWork, edit: TextEditorTextEdit | null): boolean {
  if (!edit || !applyDocument(work, edit.document)) return false;
  work.tr.setStoredMarks(null);
  return restoreSelection(work, { kind: 'text', anchor: edit.caret });
}

/** The portable marks of stored marks, `undefined` without stored marks. */
export function storedPortableMarks(
  storedMarks: readonly TiptapMarkLike[] | null,
): TextEditorPortableMarks | null | undefined {
  if (!storedMarks) return undefined;
  const marks = marksOf(storedMarks);
  return Object.keys(marks).length > 0 ? marks : null;
}

/** Deletes a range across blocks by the shared rule (`deleteRange`); whether it applied. */
export function deleteCrossBlockRange(work: TiptapWork, range: TiptapBlockRange): boolean {
  return applyTextEdit(
    work,
    deleteRange(work.portable(), range.anchor, range.head, editContext(work)),
  );
}

/**
 * Replaces a range across blocks with text by the shared rule (`replaceRange`), the text taking
 * the stored marks, else the marks of the range's first text (a link only inside it).
 */
export function replaceCrossBlockRange(
  work: TiptapWork,
  range: TiptapBlockRange,
  text: string,
): boolean {
  return applyTextEdit(
    work,
    replaceRange(
      work.portable(),
      range.anchor,
      range.head,
      text,
      editContext(work),
      storedPortableMarks(work.tr.storedMarks),
    ),
  );
}

/**
 * The marks that text inserted over a range takes: at a caret those that typed text takes there
 * (`typedMarks`), else the stored marks or those at the range's start.
 */
function insertedMarks(work: TiptapWork, range: Range): readonly TiptapMarkLike[] {
  const { tr } = work;
  const $from = tr.doc.resolve(range.from);
  if (range.from === range.to) return typedMarks(tr, $from);
  return tr.storedMarks ?? $from.marks();
}

/** Whether a textblock holds inline content other than code text. */
const takesInline = (node: TiptapNodeLike): boolean =>
  node.inlineContent && node.type.name !== NATIVE.code;

/**
 * `text.insert`: the text, a line feed a hard break outside code; the caret follows it. Over a
 * selection across blocks, the shared range replacement (`replaceRange`); over the whole-document
 * selection, at the caret of one empty paragraph (`insertionRange`).
 */
function insertText(work: TiptapWork, text: string, at: TextEditorTextRange | undefined): boolean {
  const across = at || holdsWholeDocument(work) ? null : selectedCrossBlockRange(work);
  if (across) return replaceCrossBlockRange(work, across, text);
  const range = insertionRange(work, at);
  if (!range) return false;
  const { tr, schema } = work;
  const $from = tr.doc.resolve(range.from);
  if (!$from.parent.inlineContent) return false;
  const marks = insertedMarks(work, range);
  const code = $from.parent.type.name === NATIVE.code;
  const nodes: TiptapNodeLike[] = [];
  text.split('\n').forEach((line, index) => {
    if (index > 0) {
      if (code) nodes.push(schema.text('\n'));
      else nodes.push(schema.nodes[NATIVE.hardBreak]!.create());
    }
    if (line !== '') nodes.push(code ? schema.text(line) : schema.text(line, marks));
  });
  const size = nodes.reduce((total, node) => total + node.nodeSize, 0);
  if (nodes.length === 0) tr.delete(range.from, range.to);
  else tr.replaceWith(range.from, range.to, nodes);
  tr.setSelection(work.env.modules.state.TextSelection.create(tr.doc, range.from + size));
  return true;
}

/** `text.delete`: the range's text; the caret stays at its start. */
function deleteText(work: TiptapWork, range: TextEditorTextRange): boolean {
  const positions = work.rangePositions(range);
  if (!positions) return false;
  const { tr } = work;
  tr.delete(positions.from, positions.to);
  tr.setSelection(work.env.modules.state.TextSelection.create(tr.doc, positions.from));
  return true;
}

/** `inline.insert`: the node of a custom inline definition and one space, the caret after both. */
function insertInline(
  work: TiptapWork,
  kind: string,
  attrs: Readonly<Record<string, unknown>>,
  at: TextEditorTextRange | undefined,
): boolean {
  const definition = work.env.nodes.find((node) => node.kind === 'inline' && node.name === kind);
  const type = work.schema.nodes[nativeNodeName(kind)];
  if (!definition || !type) return false;
  const range = insertionRange(work, at);
  if (!range) return false;
  const { tr, schema } = work;
  const $from = tr.doc.resolve(range.from);
  if (!takesInline($from.parent) || $from.parent !== tr.doc.resolve(range.to).parent) return false;
  const marks = insertedMarks(work, range);
  const node = type.create(definitionAttributes(definition, attrs));
  tr.replaceWith(range.from, range.to, [node, schema.text(' ', marks)]);
  tr.setSelection(
    work.env.modules.state.TextSelection.create(tr.doc, range.from + node.nodeSize + 1),
  );
  return true;
}

export const INLINE_HANDLERS: TiptapActionHandlers = {
  'text.insert': (work, action) => insertText(work, action.text, action.range),
  'text.delete': (work, action) => deleteText(work, action.range),
  'inline.insert': (work, action) => insertInline(work, action.kind, action.attrs, action.range),
};
