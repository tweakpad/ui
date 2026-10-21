/**
 * Selections of the Tiptap adapter (Widgets `uwg-te-tab-actions` r6, `uwg-te-req-engine-4`,
 * `uwg-te-req-blocks-4`, `uwg-te-tab-engine` r13).
 *
 * `selection.set` resolves the engine-neutral selection inputs to engine selections: a text or
 * caret selection to a text selection, a block selection to the adapter's own range selection
 * class, one range per block (each list item with its nested items), and a cell range to the
 * engine's cell selection, whose cells are those of the shared rule, the range grown over merged
 * cells. The engine selection is read back as the model's selection. A
 * programmatic text selection carries no stored marks, so text typed next takes the marks of the
 * text at the caret, as after a click. The whole-document selection is the engine's select-all or
 * a text selection from the first to the last text point, however it was made (the shared
 * `isWholeDocumentSelection`). The DOM selection of a press is read as the engine reads it
 * (`domSelectionOf`), for a press that the engine itself would miss.
 */
import type {
  TextEditorCellAddress,
  TextEditorSelection,
  TextEditorSelectionInput,
  TextEditorTextPoint,
} from '../../model.js';
import type { TextEditorPortableBlock } from '../../content/portable.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { NO_SELECTION } from '../../state.js';
import { blockTree } from '../shared/blocks.js';
import { domSelectionIn } from '../shared/presses.js';
import {
  blockTextEdge,
  firstTextEdge,
  isWholeDocumentSelection,
  mayBeWholeDocument,
  normalizeBlockIds,
  type TextEditorTextEdges,
} from '../shared/selection-state.js';
import { tableModel, tableTargetCells } from '../shared/tables.js';
import {
  cellAt,
  holderBlock,
  holderIndex,
  holderTextblock,
  pointToPos,
  posToPoint,
  type TiptapHolder,
} from './mapping.js';
import {
  isInstance,
  type TextEditorTiptapModules,
  type TiptapCellSelectionLike,
  type TiptapMappableLike,
  type TiptapNodeLike,
  type TiptapResolvedPosLike,
  type TiptapSelectionLike,
  type TiptapSelectionRangeLike,
  type TiptapStateLike,
  type TiptapTablesLike,
  type TiptapViewLike,
} from './modules.js';
import { NATIVE } from './schema.js';
import type { TiptapEnv, TiptapWork } from './work.js';

// Block selections

/** A block span: the positions before and after one selected block. */
interface Span {
  readonly from: number;
  readonly to: number;
}

/** The adapter's block selection: one range per selected block, painted by the widget. */
export interface TiptapBlockSelection extends TiptapSelectionLike {
  readonly spans: readonly Span[];
}

interface BlockSelectionClass {
  new (doc: TiptapNodeLike, spans: readonly Span[]): TiptapBlockSelection;
  readonly prototype: TiptapBlockSelection;
}

const BLOCK_SELECTION_ID = 'tp-text-editor-blocks';
const blockClasses = new WeakMap<object, BlockSelectionClass>();

/** Whether a span still covers exactly one block holder of a document. */
function validSpan(doc: TiptapNodeLike, span: Span): boolean {
  if (span.from < 0 || span.to > doc.content.size || span.from >= span.to) return false;
  const node = doc.nodeAt(span.from);
  if (!node || node.nodeSize !== span.to - span.from) return false;
  return holderIndex(doc).list.some((holder) => holder.pos === span.from);
}

/**
 * The block selection class of a state module, defined once per module (`uwg-te-req-blocks-4`): a `Selection`
 * subclass whose ranges are the selected blocks, invisible, mapped through changes as long as its
 * blocks survive, with a bookmark so that undo restores it.
 */
export function blockSelectionClass(state: TiptapStateLike): BlockSelectionClass {
  let Class = blockClasses.get(state);
  if (Class) return Class;
  type Base = TiptapSelectionLike;
  const Selection = state.Selection as unknown as abstract new (
    anchor: TiptapResolvedPosLike,
    head: TiptapResolvedPosLike,
    ranges?: readonly TiptapSelectionRangeLike[],
  ) => Base;
  const Range = state.SelectionRange as unknown as new (
    from: TiptapResolvedPosLike,
    to: TiptapResolvedPosLike,
  ) => TiptapSelectionRangeLike;
  const near = (doc: TiptapNodeLike, pos: number) =>
    state.Selection.near(doc.resolve(Math.max(0, Math.min(pos, doc.content.size))));

  class BlockBookmark {
    constructor(readonly spans: readonly Span[]) {}
    map(mapping: TiptapMappableLike): BlockBookmark {
      return new BlockBookmark(
        this.spans.map((span) => ({
          from: mapping.map(span.from, 1),
          to: mapping.map(span.to, -1),
        })),
      );
    }
    resolve(doc: TiptapNodeLike): TiptapSelectionLike {
      const spans = this.spans.filter((span) => validSpan(doc, span));
      return spans.length > 0 ? new Class!(doc, spans) : near(doc, this.spans[0]?.from ?? 0);
    }
  }

  Class = class TiptapBlockRangeSelection extends Selection implements TiptapBlockSelection {
    readonly spans: readonly Span[];

    constructor(doc: TiptapNodeLike, spans: readonly Span[]) {
      const ranges = spans.map((span) => new Range(doc.resolve(span.from), doc.resolve(span.to)));
      super(ranges[0]!.$from, ranges[ranges.length - 1]!.$to, ranges);
      this.spans = spans;
    }

    override get visible(): boolean {
      return false;
    }

    override get $from(): TiptapResolvedPosLike {
      return this.ranges[0]!.$from;
    }

    override get $to(): TiptapResolvedPosLike {
      return this.ranges[this.ranges.length - 1]!.$to;
    }

    override map(doc: TiptapNodeLike, mapping: TiptapMappableLike): TiptapSelectionLike {
      return new BlockBookmark(this.spans).map(mapping).resolve(doc);
    }

    override eq(other: TiptapSelectionLike): boolean {
      if (!(other instanceof TiptapBlockRangeSelection)) return false;
      const spans = (other as TiptapBlockRangeSelection).spans;
      return (
        spans.length === this.spans.length &&
        spans.every(
          (span, index) =>
            span.from === this.spans[index]!.from && span.to === this.spans[index]!.to,
        )
      );
    }

    override toJSON(): unknown {
      return { type: BLOCK_SELECTION_ID, spans: this.spans.map((span) => ({ ...span })) };
    }

    getBookmark(): BlockBookmark {
      return new BlockBookmark(this.spans);
    }

    static fromJSON(
      doc: TiptapNodeLike,
      json: { readonly spans?: readonly Span[] },
    ): TiptapSelectionLike {
      return new BlockBookmark(json.spans ?? []).resolve(doc);
    }
  } as unknown as BlockSelectionClass;
  try {
    state.Selection.jsonID(BLOCK_SELECTION_ID, Class);
  } catch {
    // Registered by an earlier definition for this module; the class still works without JSON.
  }
  blockClasses.set(state, Class);
  return Class;
}

/** Whether a selection is the adapter's block selection. */
export function isBlockSelection(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  selection: TiptapSelectionLike,
): selection is TiptapBlockSelection {
  return selection instanceof blockSelectionClass(modules.state);
}

/**
 * The block selection of identifiers, which `normalizeBlockIds` gave (the topmost blocks in
 * document order, `uwg-te-req-blocks-4`): one span per block, each list item with its nested items; `null`
 * when one is unknown or none is given.
 */
export function blockSelection(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  doc: TiptapNodeLike,
  ids: readonly string[],
): TiptapBlockSelection | null {
  const { byId } = holderIndex(doc);
  const holders: TiptapHolder[] = [];
  for (const id of ids) {
    const holder = byId.get(id);
    if (!holder) return null;
    holders.push(holder);
  }
  if (holders.length === 0) return null;
  const Class = blockSelectionClass(modules.state);
  return new Class(
    doc,
    holders.map((holder) => ({ from: holder.pos, to: holder.pos + holder.node.nodeSize })),
  );
}

/** The identifiers of a block selection's blocks, in document order. */
export function blockSelectionIds(selection: TiptapBlockSelection, doc: TiptapNodeLike): string[] {
  const positions = holderIndex(doc);
  return selection.spans.flatMap((span) => {
    const holder = positions.list.find((entry) => entry.pos === span.from);
    return holder?.id ? [holder.id] : [];
  });
}

/**
 * The identifiers of the blocks that a selection holds as a block selection, in document order:
 * those of the adapter's block selection, or the block of the engine's node selection of a block
 * holder, such as an atom that a press or a key selected (`uwg-te-req-blocks-4`); `null` for any other
 * selection.
 */
export function selectedBlockIds(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  doc: TiptapNodeLike,
  selection: TiptapSelectionLike,
): string[] | null {
  if (isBlockSelection(modules, selection)) return blockSelectionIds(selection, doc);
  if (!isInstance(selection, modules.state.NodeSelection)) return null;
  const holder = holderIndex(doc).list.find((entry) => entry.pos === selection.from);
  return holder?.id ? [holder.id] : null;
}

// Inputs

/** The position before the cell that an address names in a table holder, or `null`. */
function cellPosition(
  doc: TiptapNodeLike,
  table: string,
  cell: TextEditorCellAddress,
  tables: TiptapTablesLike | undefined,
): number | null {
  const holder = holderIndex(doc).byId.get(table);
  if (!holder || holder.node.type.name !== NATIVE.table || !tables) return null;
  return cellAt(holder.node, holder.pos, cell, tables)?.pos ?? null;
}

/** The caret position at the start or the end of a block or a cell, or `null`. */
export function caretPosition(
  doc: TiptapNodeLike,
  block: string,
  cell: TextEditorCellAddress | undefined,
  position: 'start' | 'end',
  tables: TiptapTablesLike | undefined,
): number | null {
  const holder = holderIndex(doc).byId.get(block);
  if (!holder) return null;
  if (holder.node.type.name === NATIVE.table) {
    if (!tables) return null;
    if (!cell) {
      // The start of cell (0,0) or the end of the last cell in document order
      // (`uwg-te-req-tables-1`).
      const table = holderBlock(doc, holder, []);
      const edge = table ? blockTextEdge(table, position) : null;
      return edge ? pointToPos(doc, edge, tables) : null;
    }
    const found = cellAt(holder.node, holder.pos, cell, tables);
    if (!found) return null;
    return position === 'start' ? found.pos + 2 : found.pos + found.node.nodeSize - 2;
  }
  if (cell) return null;
  const textblock = holderTextblock(holder);
  if (!textblock) return null;
  return position === 'start' ? textblock.pos + 1 : textblock.pos + 1 + textblock.node.content.size;
}

/** The engine selection of a selection input, or `null` when it does not resolve. */
export function resolveSelectionInput(
  work: TiptapWork,
  input: TextEditorSelectionInput,
): TiptapSelectionLike | null {
  const { doc } = work;
  const { state } = work.env.modules;
  switch (input.kind) {
    case 'text': {
      const anchor = work.pointPos(input.anchor);
      const head = input.head ? work.pointPos(input.head) : anchor;
      if (anchor === null || head === null) return null;
      return state.TextSelection.create(doc, anchor, head);
    }
    case 'caret': {
      const pos = caretPosition(doc, input.block, input.cell, input.position, work.env.tables);
      return pos === null ? null : state.TextSelection.create(doc, pos);
    }
    case 'blocks': {
      // The topmost blocks in document order (`normalizeBlockIds`).
      const ids = normalizeBlockIds(blockTree(work.portable(), 0), input.ids);
      return ids ? blockSelection(work.env.modules, doc, ids) : null;
    }
    case 'cells': {
      const { tables } = work.env;
      const anchor = cellPosition(doc, input.table, input.range.anchor, tables);
      const head = cellPosition(doc, input.table, input.range.head, tables);
      if (anchor === null || head === null || !tables) return null;
      return tables.CellSelection.create(doc, anchor, head);
    }
  }
}

/**
 * `selection.set` (`uwg-te-tab-actions` r6): the selection, without stored marks, so that typed
 * text takes the marks at the caret as after a click; it places the selection.
 */
export function setSelection(work: TiptapWork, input: TextEditorSelectionInput): boolean {
  const selection = resolveSelectionInput(work, input);
  if (!selection) return false;
  work.tr.setSelection(selection);
  work.tr.setStoredMarks(null);
  work.placed = true;
  work.cleared = false;
  return true;
}

/**
 * Clears the selection (`selection.set` with none, `uwg-te-req-surfaces-6`): the engine has no
 * empty selection, so its own selection rests at the text point nearest the start of the earlier
 * one, never on a block or a cell range, unplaced, and the state reports none.
 */
export function clearSelection(work: TiptapWork): boolean {
  const { doc } = work;
  const { Selection } = work.env.modules.state;
  const from = doc.resolve(Math.max(0, Math.min(work.tr.selection.from, doc.content.size)));
  const rest =
    Selection.findFrom(from, 1, true) ??
    Selection.findFrom(from, -1, true) ??
    edgeSelection(work.env, doc, 'start');
  work.tr.setSelection(rest);
  work.tr.setStoredMarks(null);
  work.placed = false;
  work.cleared = true;
  return true;
}

/**
 * Writes a text selection of the engine into the document's selection of the focused editing root
 * while the editor is read-only (`uwg-te-req-engine-4`, `uwg-te-req-pres-4`): the engine writes
 * none then unless the document's active element contains its root, which a root in a shadow tree
 * never satisfies, so a selection set through the API would leave the native paint and a native
 * copy on the DOM's earlier selection. The points are those the engine writes, each leaning on the
 * content before it but at the document's start, the anchor first. A block selection or a cell
 * range has no DOM range. Answers whether it wrote one.
 */
export function showReadOnlySelection(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  view: TiptapViewLike,
): boolean {
  if (view.editable || !view.hasFocus()) return false;
  const { selection } = view.state;
  if (!isInstance(selection, modules.state.TextSelection)) return false;
  const target = view.dom.ownerDocument.getSelection?.() ?? null;
  if (!target) return false;
  const anchor = view.domAtPos(selection.anchor, selection.anchor ? -1 : 1);
  const head = view.domAtPos(selection.head, selection.head ? -1 : 1);
  target.setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset);
  return true;
}

/** The document position of a DOM position in the editing root, leaning forward, or `null`. */
function domPosition(view: TiptapViewLike, node: Node, offset: number): number | null {
  try {
    const pos = view.posAtDOM(node, offset, 1);
    return pos >= 0 ? pos : null;
  } catch {
    // A position the view does not map, such as one inside a node it does not render.
    return null;
  }
}

/**
 * The engine selection of the DOM selection inside the editing root, as the engine reads the
 * selection of a press (`uwg-te-req-engine-4`): the text selection between the positions of its
 * anchor and focus, leaning forward; `null` without a DOM selection in the root or when an end does
 * not map.
 */
export function domSelectionOf(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  view: TiptapViewLike,
): TiptapSelectionLike | null {
  const dom = domSelectionIn(view.dom);
  if (!dom) return null;
  const anchor = domPosition(view, dom.anchorNode, dom.anchorOffset);
  const head = domPosition(view, dom.focusNode, dom.focusOffset);
  if (anchor === null || head === null) return null;
  const { doc } = view.state;
  return modules.state.TextSelection.between(doc.resolve(anchor), doc.resolve(head), 1);
}

// Reading

/** Whether a selection is the engine's cell selection. */
export function isCellSelection(
  tables: TiptapTablesLike | undefined,
  selection: TiptapSelectionLike,
): selection is TiptapCellSelectionLike {
  return tables !== undefined && selection instanceof tables.CellSelection;
}

/** The holders of a document mapped one by one as they are reached, in order. */
function* mappedHolders(
  doc: TiptapNodeLike,
  holders: readonly TiptapHolder[],
  nodes: readonly TextEditorNodeDefinition[],
): Generator<TextEditorPortableBlock> {
  for (const holder of holders) {
    const block = holderBlock(doc, holder, nodes);
    if (block) yield block;
  }
}

/**
 * The first (`start`) or last (`end`) text point of a document: the shared rule over the blocks at
 * that end, mapped only as far as they are reached; a leading table gives cell (0,0), and an atom
 * holds none, so it is never selected implicitly (`uwg-te-tab-engine` r13).
 */
export function documentEdge(
  doc: TiptapNodeLike,
  nodes: readonly TextEditorNodeDefinition[],
  side: 'start' | 'end',
): TextEditorTextPoint | null {
  const { list } = holderIndex(doc);
  return firstTextEdge(
    mappedHolders(doc, side === 'start' ? list : [...list].reverse(), nodes),
    side,
  );
}

/**
 * The caret at the first or last text point of a document (`documentEdge`): where a mount and
 * `setContent` leave the engine's selection, which the state reports only once it is placed, and
 * where `focus` puts it without an earlier selection (`uwg-te-tab-engine` r13).
 */
export function edgeSelection(
  env: TiptapSelectionEnv,
  doc: TiptapNodeLike,
  side: 'start' | 'end',
): TiptapSelectionLike {
  const { Selection, TextSelection } = env.modules.state;
  const point = documentEdge(doc, env.nodes, side);
  const pos = point ? pointToPos(doc, point, env.tables) : null;
  if (pos !== null) return TextSelection.create(doc, pos);
  return side === 'start' ? Selection.atStart(doc) : Selection.atEnd(doc);
}

/** The first and the last text point of a document, for its whole-document selection. */
export function documentEnds(
  doc: TiptapNodeLike,
  nodes: readonly TextEditorNodeDefinition[],
): TextEditorTextEdges | null {
  const first = documentEdge(doc, nodes, 'start');
  const last = documentEdge(doc, nodes, 'end');
  return first && last ? { first, last } : null;
}

/** What reading a selection needs from the mount. */
export type TiptapSelectionEnv = Pick<TiptapEnv, 'modules' | 'tables' | 'nodes'>;

/**
 * Whether an engine selection is the whole-document selection (`uwg-te-req-engine-4`): the
 * engine's select-all, or a text selection that the shared rule takes for it, from the first to
 * the last text point of the document, either way round, however it was made
 * (`isWholeDocumentSelection`). Only a text selection that is not collapsed maps its edges.
 */
export function wholeDocumentSelection(
  env: TiptapSelectionEnv,
  doc: TiptapNodeLike,
  selection: TiptapSelectionLike,
): boolean {
  const { AllSelection, TextSelection } = env.modules.state;
  if (isInstance(selection, AllSelection)) return true;
  if (selection.empty || !isInstance(selection, TextSelection)) return false;
  return wholeDocumentText(doc, env.nodes, readSelection(env, doc, selection));
}

/**
 * Whether a model selection of a document is its whole-document selection
 * (`isWholeDocumentSelection`); the document's edges are mapped only for a selection that can be
 * one (`mayBeWholeDocument`).
 */
export function wholeDocumentText(
  doc: TiptapNodeLike,
  nodes: readonly TextEditorNodeDefinition[],
  model: TextEditorSelection,
): boolean {
  return mayBeWholeDocument(model) && isWholeDocumentSelection(model, documentEnds(doc, nodes));
}

/** The engine's own whole-document selection of a document, its select-all. */
export function selectAllOf(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  doc: TiptapNodeLike,
): TiptapSelectionLike {
  const All = modules.state.AllSelection as unknown as new (
    doc: TiptapNodeLike,
  ) => TiptapSelectionLike;
  return new All(doc);
}

/**
 * The model's selection of an engine selection: text with its points, the blocks of a block
 * selection or of a selected atom block, a cell range, the whole document as text from its first
 * to its last text point, or none.
 */
export function readSelection(
  env: TiptapSelectionEnv,
  doc: TiptapNodeLike,
  selection: TiptapSelectionLike,
): TextEditorSelection {
  const { modules, tables } = env;
  const blocks = selectedBlockIds(modules, doc, selection);
  if (blocks) return blocks.length > 0 ? { kind: 'blocks', ids: blocks } : NO_SELECTION;
  if (isBlockSelection(modules, selection)) return NO_SELECTION;
  if (isCellSelection(tables, selection)) {
    const table = selection.$anchorCell.node(-1);
    const id = table.attrs.id;
    if (typeof id !== 'string' || !tables) return NO_SELECTION;
    const map = tables.TableMap.get(table);
    const start = selection.$anchorCell.start(-1);
    const anchor = map.findCell(selection.$anchorCell.pos - start);
    const head = map.findCell(selection.$headCell.pos - start);
    return {
      kind: 'cells',
      table: id,
      range: {
        anchor: { row: anchor.top, column: anchor.left },
        head: { row: head.top, column: head.left },
      },
    };
  }
  if (isInstance(selection, modules.state.AllSelection)) {
    const ends = documentEnds(doc, env.nodes);
    return ends
      ? { kind: 'text', anchor: ends.first, head: ends.last, empty: false }
      : NO_SELECTION;
  }
  // A node selection of a node that is no block: nothing the model can report.
  if (isInstance(selection, modules.state.NodeSelection)) return NO_SELECTION;
  const anchor = posToPoint(doc, selection.anchor, tables);
  const head = posToPoint(doc, selection.head, tables);
  if (!anchor || !head) return NO_SELECTION;
  return { kind: 'text', anchor, head, empty: selection.empty };
}

/**
 * The cells that a cell selection selects, in document order: the cells of its range's rectangle
 * grown over merged cells (the shared `tableTargetCells`), so that a merged cell starting outside
 * the engine's own rectangle is selected with the others (`uwg-te-req-tables-5`). Painting and
 * measuring a range read these, never the engine's own cells.
 */
export function selectedCells(
  env: TiptapSelectionEnv,
  doc: TiptapNodeLike,
  selection: TiptapCellSelectionLike,
): readonly { readonly node: TiptapNodeLike; readonly pos: number }[] {
  const { tables } = env;
  const model = readSelection(env, doc, selection);
  if (model.kind !== 'cells' || !tables) return [];
  const holder = holderIndex(doc).byId.get(model.table);
  const table = holder ? holderBlock(doc, holder, env.nodes) : null;
  if (!holder || table?.type !== 'table') return [];
  const grid = tableModel(model.table, table);
  return tableTargetCells(grid, { range: model.range }).flatMap((index) => {
    const cell = grid.cells[index];
    const found = cell ? cellAt(holder.node, holder.pos, cell, tables) : null;
    return found ? [found] : [];
  });
}
