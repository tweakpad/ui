/**
 * Normalized state of the Tiptap adapter (Widgets `uwg-te-req-engine-4`, `uwg-te-tab-engine` r3,
 * `uwg-te-req-prop-2`).
 *
 * The frozen snapshot of one engine update: its versions, editability, focus, composition,
 * emptiness, selection and history, and what the selection holds. Each selection-dependent part
 * follows the shared rules (`AD/shared/state.ts`, `AD/shared/selection-state.ts`) over the engine
 * nodes the selection touches, mapped one by one: nothing maps the whole document per keystroke.
 *
 * - `marks`: one entry per run of selected text (the text of a cell range, a block selection or
 *   a whole-document selection included), or at a caret the marks that typed text takes.
 * - `block`: the block at the selection head, with its kind, attributes and depth.
 * - `blockKinds`: the kinds of the blocks whose own text the selection meets, of the atoms and
 *   tables it covers, of the selected blocks, or the table of a cell range.
 * - `align`: the alignment those blocks' textblocks share.
 * - `link`: the link run at a selection within one textblock.
 * - `table`: the table holding the selection head, with the cell range of a cell selection.
 * - `caret` and `emptyBlock`: at a collapsed text selection.
 *
 * The whole-document selection (Mod+A) reads as text from the first to the last text point while
 * the engine keeps its own selection; a text selection between those points is the same selection
 * and reads alike, its blocks every block of the document.
 */
import type { TextEditorPortableTable } from '../../content/portable.js';
import type {
  TextEditorBlockState,
  TextEditorCaretState,
  TextEditorEmptyBlockState,
  TextEditorEngineState,
  TextEditorLinkState,
  TextEditorMarkState,
  TextEditorSelection,
  TextEditorTableState,
} from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { blockModel } from '../shared/blocks.js';
import { headBlockId, linkAtSelection, tableState } from '../shared/selection-state.js';
import { deepFreeze } from '../../../freeze.js';
import { MARKS_OFF, NO_SELECTION } from '../../state.js';
import { blockKindKeys, caretTextBefore, markState, selectionAlign } from '../shared/state.js';
import { tableModel } from '../shared/tables.js';
import {
  holderBlock,
  holderKind,
  holderTextblock,
  holderIndex,
  inlineAt,
  inlineUnitsBefore,
  isItemNode,
  isListNode,
  marksOf,
  type TiptapHolder,
} from './mapping.js';
import { typedMarks } from './marks.js';
import {
  isInstance,
  type TextEditorTiptapModules,
  type TiptapEditorStateLike,
  type TiptapNodeLike,
  type TiptapResolvedPosLike,
  type TiptapSelectionLike,
  type TiptapTablesLike,
} from './modules.js';
import { NATIVE, NATIVE_MARKS } from './schema.js';
import {
  isBlockSelection,
  isCellSelection,
  readSelection,
  wholeDocumentText,
} from './selection.js';

/** What a state reads besides the engine state. */
export interface TiptapStateInput {
  readonly modules: TextEditorTiptapModules;
  readonly tables: TiptapTablesLike | undefined;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly state: TiptapEditorStateLike;
  readonly version: number;
  readonly contentVersion: number;
  readonly editable: boolean;
  readonly focused: boolean;
  readonly composing: boolean;
  /** Whether a selection is placed; until then the state reports none. */
  readonly placed: boolean;
}

/** Whether a document is one empty paragraph. */
export function isEmptyTiptapDoc(doc: TiptapNodeLike): boolean {
  const only = doc.firstChild;
  return (
    doc.childCount === 1 &&
    only !== null &&
    only.type.name === NATIVE.paragraph &&
    only.content.size === 0
  );
}

const NO_KINDS = Object.freeze([]);

interface Range {
  readonly from: number;
  readonly to: number;
}

// Holders

/**
 * The holder of the block at a position, resolved through its ancestors: the top-level block, a
 * list item whose own paragraph holds the position, or the table around a cell.
 */
export function holderAt($pos: TiptapResolvedPosLike): TiptapHolder | null {
  let items = 0;
  for (let depth = 1; depth <= $pos.depth; depth += 1) {
    const node = $pos.node(depth);
    const id = typeof node.attrs.id === 'string' ? node.attrs.id : null;
    if (isListNode(node)) continue;
    if (isItemNode(node)) {
      if ($pos.depth > depth && $pos.index(depth) === 0)
        return { id, node, pos: $pos.before(depth), parentId: null, depth: items, index: 0 };
      items += 1;
      continue;
    }
    return { id, node, pos: $pos.before(depth), parentId: null, depth: items, index: 0 };
  }
  return null;
}

/**
 * The holders that a range of the document spans, in document order: each block whose own text
 * meets the range, each atom block or table that it covers or that holds it.
 */
function spannedHolders(doc: TiptapNodeLike, range: Range): TiptapHolder[] {
  const found: TiptapHolder[] = [];
  const meets = (start: number, end: number) => start <= range.to && range.from <= end;
  const holder = (node: TiptapNodeLike, pos: number, depth: number): TiptapHolder => ({
    id: typeof node.attrs.id === 'string' ? node.attrs.id : null,
    node,
    pos,
    parentId: null,
    depth,
    index: 0,
  });
  const visitItems = (list: TiptapNodeLike, listPos: number, depth: number) =>
    list.forEach((item, offset) => {
      const pos = listPos + 1 + offset;
      if (!isItemNode(item) || !meets(pos, pos + item.nodeSize)) return;
      const own = holderTextblock({ node: item, pos });
      if (own && meets(own.pos + 1, own.pos + 1 + own.node.content.size))
        found.push(holder(item, pos, depth));
      item.forEach((child, childOffset) => {
        if (isListNode(child)) visitItems(child, pos + 1 + childOffset, depth + 1);
      });
    });
  doc.forEach((node, pos) => {
    const end = pos + node.nodeSize;
    if (!meets(pos, end)) return;
    if (isListNode(node)) visitItems(node, pos, 0);
    else if (node.isTextblock) {
      if (meets(pos + 1, end - 1)) found.push(holder(node, pos, 0));
    } else if (pos < range.to ? end > range.from : pos <= range.from && range.to < end)
      found.push(holder(node, pos, 0));
  });
  return found;
}

/** The ranges whose text a selection holds, or `null` at a caret. */
function selectedRanges(
  input: TiptapStateInput,
  selection: TiptapSelectionLike,
): readonly Range[] | null {
  if (isBlockSelection(input.modules, selection)) return selection.spans;
  if (isCellSelection(input.tables, selection)) {
    const ranges: Range[] = [];
    selection.forEachCell((node, pos) => ranges.push({ from: pos, to: pos + node.nodeSize }));
    return ranges;
  }
  if (selection.empty && isInstance(selection, input.modules.state.TextSelection)) return null;
  return selection.ranges.map((range) => ({ from: range.$from.pos, to: range.$to.pos }));
}

// Parts

/** The marks of each selected run of text, or at a caret those that typed text takes. */
function marksPart(
  input: TiptapStateInput,
  selection: TiptapSelectionLike,
  ranges: readonly Range[] | null,
): TextEditorMarkState {
  const { state } = input;
  if (!ranges) return markState([marksOf(typedMarks(state, selection.$head))]);
  const runs: ReturnType<typeof marksOf>[] = [];
  for (const { from, to } of ranges)
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return true;
      if (Math.min(to, pos + node.nodeSize) > Math.max(from, pos)) runs.push(marksOf(node.marks));
      return false;
    });
  return runs.length > 0 ? markState(runs) : MARKS_OFF;
}

/**
 * The holders of the blocks a selection spans, in document order: every block for the
 * whole-document selection, however it was made, atoms before its first text point included
 * (`isWholeDocumentSelection`).
 */
function spannedPart(
  input: TiptapStateInput,
  selection: TiptapSelectionLike,
  model: TextEditorSelection,
): TiptapHolder[] {
  const { doc } = input.state;
  if (wholeDocumentText(doc, input.nodes, model))
    return spannedHolders(doc, { from: 0, to: doc.content.size });
  switch (model.kind) {
    case 'blocks': {
      const { byId } = holderIndex(doc);
      return model.ids.flatMap((id) => {
        const holder = byId.get(id);
        return holder ? [holder] : [];
      });
    }
    case 'cells': {
      const holder = holderAt(doc.resolve(selection.from));
      return holder ? [holder] : [];
    }
    case 'text':
      return spannedHolders(doc, { from: selection.from, to: selection.to });
    default:
      return [];
  }
}

/**
 * The holder of the block at the selection head: resolved from the engine's head for a text
 * selection or a cell range, else by identifier (the last selected block, or the block of the
 * last text point of a whole-document selection).
 */
function headHolder(
  input: TiptapStateInput,
  selection: TiptapSelectionLike,
  model: TextEditorSelection,
): TiptapHolder | null {
  const id = headBlockId(model);
  if (id === null) return null;
  const { doc } = input.state;
  const resolved =
    model.kind === 'cells'
      ? holderAt(doc.resolve(selection.from))
      : model.kind === 'text'
        ? holderAt(selection.$head)
        : null;
  return resolved?.id === id ? resolved : (holderIndex(doc).byId.get(id) ?? null);
}

/** The block state of a holder: its portable kind and attributes, and its depth. */
function blockPart(
  input: TiptapStateInput,
  holder: TiptapHolder | null,
): TextEditorBlockState | null {
  if (!holder?.id) return null;
  const block = holderBlock(input.state.doc, holder, input.nodes);
  if (!block) return null;
  const { kind, attrs } = blockModel(block);
  return { id: holder.id, kind, attrs, depth: holder.depth };
}

/** The link at a text selection within one textblock, its edges included (`linkAtSelection`). */
const linkPart = (
  input: TiptapStateInput,
  model: TextEditorSelection,
): TextEditorLinkState | null => linkAtSelection(model, inlineAt(input.state.doc, input.tables));

/** The table holding the selection head, with the cell range of a cell selection. */
function tablePart(
  input: TiptapStateInput,
  model: TextEditorSelection,
): TextEditorTableState | null {
  const { doc } = input.state;
  const id = headBlockId(model);
  if (id === null || (model.kind !== 'cells' && model.kind !== 'text')) return null;
  const head = model.kind === 'cells' ? model.range.head : model.head.cell;
  if (!head) return null;
  const holder = findTable(doc, id);
  if (!holder) return null;
  const block = holderBlock(doc, holder, input.nodes);
  if (block?.type !== 'table') return null;
  const table = tableModel(id, block as TextEditorPortableTable);
  return tableState(table, head, model.kind === 'cells' ? model.range : null);
}

/** The top-level table with an identifier. */
function findTable(doc: TiptapNodeLike, id: string): TiptapHolder | null {
  let found: TiptapHolder | null = null;
  doc.forEach((node, pos) => {
    if (!found && node.type.name === NATIVE.table && node.attrs.id === id)
      found = { id, node, pos, parentId: null, depth: 0, index: 0 };
  });
  return found;
}

/** The caret of a collapsed text selection: its point, the text before it and whether in code. */
function caretPart(
  input: TiptapStateInput,
  selection: TiptapSelectionLike,
  model: TextEditorSelection,
): TextEditorCaretState | null {
  if (model.kind !== 'text' || !model.empty) return null;
  const { $head } = selection;
  const parent = $head.parent;
  const codeMark = input.state.schema.marks[NATIVE_MARKS.code];
  const inCode =
    parent.type.name === NATIVE.code ||
    typedMarks(input.state, $head).some((mark) => mark.type === codeMark);
  return {
    point: model.head,
    textBefore: caretTextBefore(inlineUnitsBefore(parent, $head.parentOffset)),
    inCode,
  };
}

/** The empty textblock that holds the caret: a block's own textblock, not a cell paragraph. */
function emptyBlockPart(
  input: TiptapStateInput,
  selection: TiptapSelectionLike,
  caret: TextEditorCaretState | null,
): TextEditorEmptyBlockState | null {
  if (!caret || caret.point.cell || selection.$head.parent.content.size !== 0) return null;
  const holder = holderAt(selection.$head);
  if (!holder || holder.id !== caret.point.block) return null;
  return { id: holder.id, kind: holderKind(input.state.doc, holder) };
}

/** The frozen normalized state of an engine state. */
export function buildTiptapState(input: TiptapStateInput): TextEditorEngineState {
  const { modules, state } = input;
  const { selection } = state;
  const model: TextEditorSelection = input.placed
    ? readSelection(input, state.doc, selection)
    : NO_SELECTION;
  const ranges = selectedRanges(input, selection);
  const spanned = spannedPart(input, selection, model);
  const caret = caretPart(input, selection, model);
  // The shared alignment of the spanned blocks, code blocks, atoms and tables left out
  // (`selectionAlign`).
  const align = selectionAlign(
    model,
    spanned.flatMap((holder) => {
      const block = holderBlock(state.doc, holder, input.nodes);
      return block ? [block] : [];
    }),
  );
  return deepFreeze({
    version: input.version,
    contentVersion: input.contentVersion,
    editable: input.editable,
    focused: input.focused,
    composing: input.composing,
    empty: isEmptyTiptapDoc(state.doc),
    selection: model,
    marks: model.kind === 'none' ? MARKS_OFF : marksPart(input, selection, ranges),
    block: blockPart(input, headHolder(input, selection, model)),
    blockKinds:
      spanned.length === 0
        ? NO_KINDS
        : blockKindKeys(
            spanned.map((holder) => ({
              kind: holderKind(state.doc, holder),
              attrs:
                holder.node.type.name === NATIVE.heading
                  ? { level: holder.node.attrs.level as number }
                  : {},
            })),
          ),
    align,
    link: linkPart(input, model),
    table: tablePart(input, model),
    caret,
    emptyBlock: emptyBlockPart(input, selection, caret),
    history: {
      undo: modules.history.undoDepth(state) > 0,
      redo: modules.history.redoDepth(state) > 0,
    },
  });
}
