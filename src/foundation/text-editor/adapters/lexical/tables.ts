/**
 * Tables on Lexical (Widgets `uwg-te-req-tables-1`, `uwg-te-tab-actions` r7, `uwg-te-req-tables-3`,
 * `uwg-te-lis-up-i2`).
 *
 * Every table action edits the portable table with the shared table edits
 * (`AD/shared/table-edits.ts`) and rebuilds the rows of the table node in the action's update; the
 * table node keeps its key, its identifier and its scroll wrapper. Header state is positional: the
 * mapper writes each cell's header bits from the table's two flags, so after every structural
 * change exactly the first row and column are header cells and a moved or copied line never
 * carries header state, unlike the engine's per-cell header state, which moves with its row.
 * Moves are refused while a cell is merged; widths are all or nothing and never below 48 CSS
 * pixels. An edit that leaves the table unchanged rebuilds nothing, and a kept selection moves
 * with its cells (the shared `keptTableSelection`). Backspace, Delete and the deletion input over
 * a cell range clear its cells, never the table, Shift with an arrow key selects the cell range
 * of the shared rule, whose cells the engine selects grown over merged cells as the shared rule
 * does, and plain ArrowUp and ArrowDown move a caret from cell to cell by the shared rule and leave
 * it where it is when they would leave a table that no block lies beyond. While a focused root
 * holds a cell range, the DOM selection stays a caret in its anchor cell, so that the browser's
 * Copy and Cut commands fire in the root.
 */
import type { TextEditorAction, TextEditorContentInsertAction } from '../../actions.js';
import type { TextEditorCellSelection, TextEditorTextPoint } from '../../model.js';
import { canonicalize, type TextEditorPortableTable } from '../../content/portable.js';
import {
  cellParagraphs,
  prepareFragment,
  type TextEditorFragmentContext,
} from '../shared/fragment-insert.js';
import { findBlock } from '../shared/blocks.js';
import { isRightToLeft } from '../shared/dom-geometry.js';
import {
  cellCaretExit,
  cellCaretKey,
  cellCaretStays,
  cellRangeKey,
} from '../shared/selection-state.js';
import {
  cellRangeInsertEdit,
  keptTableSelection,
  tableCaret,
  tableEdit,
} from '../shared/table-edits.js';
import { placedCell } from '../shared/tables.js';
import { $locateBlock, $portableDocument, $textEdgeIn } from './document.js';
import { LexicalGeometry } from './geometry.js';
import { $holderById } from './ids.js';
import { portableTableToLexical } from './mapping.js';
import type { LexicalSerializedNodeLike, LexicalTableLike } from './modules.js';
import type { LexicalRuntime } from './runtime.js';
import { $applySelection, $readSelection, $selectCells, $selectText } from './selection.js';
import { rootFocused } from './state.js';

// Engine

/** The portable table of a table block and its node, or `null`. */
function $tableOf(
  rt: LexicalRuntime,
  id: string,
): { node: LexicalTableLike; table: TextEditorPortableTable } | null {
  const node = $holderById(rt, id);
  if (!node || !rt.isTable(node)) return null;
  const block = findBlock($portableDocument(rt).blocks, id);
  return block?.type === 'table' ? { node, table: block } : null;
}

/** The canonical form of an edited portable table. */
function canonicalTable(
  rt: LexicalRuntime,
  table: TextEditorPortableTable,
): TextEditorPortableTable {
  const canonical = canonicalize({ blocks: [table] }, { nodes: rt.nodes, createId: rt.createId })
    .document.blocks[0];
  if (canonical?.type !== 'table') throw new Error('A table edit left no table.');
  return canonical;
}

/** Rebuilds the rows of a table node from a portable table; the node itself stays. */
export function $rebuildTable(
  rt: LexicalRuntime,
  node: LexicalTableLike,
  table: TextEditorPortableTable,
): void {
  const canonical = canonicalTable(rt, table);
  const json = portableTableToLexical(canonical);
  const rows = (json['children'] as readonly LexicalSerializedNodeLike[]).map((row) =>
    rt.lexical.$parseSerializedNode(row),
  );
  node.clear();
  node.append(...rows);
  node.setColWidths(canonical.widths ? [...canonical.widths] : undefined);
}

const TABLE_TYPES: ReadonlySet<string> = new Set([
  'table.insert-row',
  'table.insert-column',
  'table.delete-rows',
  'table.delete-columns',
  'table.move-row',
  'table.move-column',
  'table.duplicate-row',
  'table.duplicate-column',
  'table.merge-cells',
  'table.split-cell',
  'table.set-header',
  'table.align',
  'table.background',
  'table.column-widths',
  'table.clear-cells',
]);

/** Whether an action is a table action. */
export const isTableAction = (
  action: TextEditorAction,
): action is Extract<TextEditorAction, { table: string }> => TABLE_TYPES.has(action.type);

/**
 * `content.insert` over a cell range (`uwg-te-req-tables-5`) by the shared edit: the cells cleared
 * and the fragment in the first cell, or a pasted table filling the range from its first cell, the
 * caret where the edit leaves it; the converted diagnostic of the prepared fragment is reported
 * once it applied.
 */
export function $prepareCellRangeInsert(
  rt: LexicalRuntime,
  action: TextEditorContentInsertAction & { readonly at: TextEditorCellSelection },
  context: TextEditorFragmentContext,
): (() => boolean) | null {
  if (!rt.modules.table) return null;
  const { table, range } = action.at;
  const found = $tableOf(rt, table);
  if (!found) return null;
  const prepared = prepareFragment(action.content, context);
  const edit = cellRangeInsertEdit(table, found.table, range, prepared.blocks, (blocks) =>
    cellParagraphs(blocks, context),
  );
  if (!edit || edit.selection === 'keep') return null;
  const selection = edit.selection;
  return () => {
    const current = $tableOf(rt, table);
    if (!current) return false;
    $rebuildTable(rt, current.node, canonicalTable(rt, edit.table));
    rt.diagnostics.push(...prepared.diagnostics);
    return $applySelection(rt, selection);
  };
}

/** Prepares a table action; `move` and `merge` follow the engine's capabilities. */
export function $prepareTable(
  rt: LexicalRuntime,
  action: Extract<TextEditorAction, { table: string }>,
  options: { readonly move: boolean; readonly merge: boolean },
): (() => boolean) | null {
  if (!rt.modules.table) return null;
  const found = $tableOf(rt, action.table);
  if (!found) return null;
  const edit = tableEdit(action.table, found.table, action, options);
  if (!edit) return null;
  return () => {
    const before = $readSelection(rt);
    const current = $tableOf(rt, action.table);
    if (!current) return false;
    // An edit that leaves the table as it is rebuilds nothing, so it changes no node.
    const next = canonicalTable(rt, edit.table);
    if (JSON.stringify(next) !== JSON.stringify(current.table))
      $rebuildTable(rt, current.node, next);
    const wanted =
      edit.selection === 'keep' ? keptTableSelection(before, action.table, edit) : edit.selection;
    if (wanted && $applySelection(rt, wanted)) return true;
    if (before.kind === 'none') {
      rt.lexical.$setSelection(null);
      return true;
    }
    return (
      $applySelection(rt, tableCaret(action.table, 0, 0)) || (rt.lexical.$setSelection(null), true)
    );
  };
}

// Deletion over a cell range (`uwg-te-lis-up-i2`)

/**
 * Clears the cells of the cell range being read through the shared `table.clear-cells` (the range
 * grown over merged cells, the range kept); answers whether a cell range was selected. The table
 * itself is never deleted, which the engine does when every cell is selected.
 */
export function $clearCellRange(rt: LexicalRuntime): boolean {
  const module = rt.modules.table;
  if (!module || !module.$isTableSelection(rt.lexical.$getSelection())) return false;
  const selection = $readSelection(rt);
  if (selection.kind !== 'cells') return true;
  $prepareTable(
    rt,
    { type: 'table.clear-cells', table: selection.table, range: selection.range },
    { move: false, merge: false },
  )?.();
  return true;
}

/**
 * Registers Backspace, Delete and the deletion commands of input events over a cell range at
 * critical priority, ahead of the engine's table handlers.
 */
export function registerCellRangeDeletion(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  if (!rt.modules.table) return () => undefined;
  const CRITICAL = lexical.COMMAND_PRIORITY_CRITICAL;
  const key = (event: KeyboardEvent | null) => {
    if (!editor.isEditable() || !$clearCellRange(rt)) return false;
    event?.preventDefault();
    return true;
  };
  const input = () => editor.isEditable() && $clearCellRange(rt);
  return lexical.mergeRegister(
    editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, key, CRITICAL),
    editor.registerCommand(lexical.KEY_DELETE_COMMAND, key, CRITICAL),
    editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, input, CRITICAL),
    editor.registerCommand(lexical.DELETE_WORD_COMMAND, input, CRITICAL),
    editor.registerCommand(lexical.DELETE_LINE_COMMAND, input, CRITICAL),
    editor.registerCommand(lexical.REMOVE_TEXT_COMMAND, input, CRITICAL),
  );
}

// The DOM caret of a cell range (`uwg-te-req-content-6`)

/**
 * Keeps the document's selection a collapsed caret at the start of the anchor cell while the root
 * holds focus and the selection is a cell range: the engine removes the DOM selection when it sets
 * a cell range itself (through `selection.set`, say), and the browser's Copy and Cut commands, from
 * its menus or `execCommand`, then fire outside the root, where nothing writes the cells. The caret
 * is not drawn while a cell range is painted (base CSS). Returns the removal of the listener.
 */
export function registerCellRangeCaret(rt: LexicalRuntime): () => void {
  const module = rt.modules.table;
  if (!module) return () => undefined;
  return rt.engine.registerUpdateListener(({ editorState }) => {
    const root = rt.root;
    if (!root || !rootFocused(root)) return;
    const key = editorState.read(() => {
      const selection = rt.lexical.$getSelection();
      return module.$isTableSelection(selection) ? selection.anchor.key : null;
    });
    const cell = key === null ? null : rt.engine.getElementByKey(key);
    const selection = root.ownerDocument.getSelection?.() ?? null;
    if (!cell || !selection) return;
    if (selection.rangeCount > 0) {
      const points = rt.lexical.getDOMSelectionPoints(selection, root);
      if (points.anchorNode && root.contains(points.anchorNode)) return;
    }
    selection.collapse(cell, 0);
  });
}

// Shift with an arrow key (`uwg-te-req-tables-5`)

/**
 * Selects the cell range of Shift with an arrow key by the shared rule (`cellRangeKey`): over a
 * cell range one step of the grid rule, kept at the table's edge, and from a text selection at a
 * cell's edge that step from the cell; answers whether it did. Otherwise the key moves or extends
 * within a cell's text as the engine does.
 */
export function $cellRangeArrow(rt: LexicalRuntime, key: string): boolean {
  if (!rt.modules.table) return false;
  const geometry = new LexicalGeometry(rt);
  const next = cellRangeKey({
    selection: $readSelection(rt),
    key,
    table: (id) => $tableOf(rt, id)?.table ?? null,
    rtl: (id) => isRightToLeft(geometry.tableElements(id)?.table ?? null),
    onEdgeLine: (point, side) => geometry.onEdgeLine(point, side),
  });
  return next !== null && $selectCells(rt, next.table, next.range);
}

/**
 * Plain ArrowUp on the first line of a cell's first paragraph, or ArrowDown on the last line of its
 * last paragraph, with a row beyond the cell's span (`uwg-te-req-engine-9`): the caret goes to the
 * end of the cell above or the start of the cell below by the shared rule (`cellCaretKey`), named
 * by the grid's columns. The engine's own move takes the cell at the same index among the cells
 * of the next row, which beside a merged cell lies in another column or is missing. Where the key
 * would leave a table that no block lies beyond, it is handled and the selection stays
 * (`cellCaretStays`). `onEdgeLine` tells whether a text point lies on the first or last line of
 * its paragraph as laid out. A key that leaves the table toward a block from a cell spanning
 * several rows is `$leaveSpanningCell`'s. Answers whether it handled the key; otherwise the engine
 * moves the caret, within the cell or out of the table.
 */
export function $cellCaretArrow(
  rt: LexicalRuntime,
  key: 'ArrowUp' | 'ArrowDown',
  onEdgeLine: (point: TextEditorTextPoint, side: 'first' | 'last') => boolean,
): boolean {
  if (!rt.modules.table) return false;
  const input = {
    selection: $readSelection(rt),
    key,
    table: (id: string) => {
      const block = $locateBlock(rt, id)?.block;
      return block?.type === 'table' ? block : null;
    },
    onEdgeLine,
  };
  const target = cellCaretKey(input);
  if (target !== null) return $selectText(rt, target);
  const blockBeyond = (id: string, step: 'up' | 'down') => {
    const node = $holderById(rt, id);
    return !node || (step === 'up' ? node.getPreviousSibling() : node.getNextSibling()) !== null;
  };
  return cellCaretStays({ ...input, blockBeyond }) || $leaveSpanningCell(rt, input);
}

/**
 * Plain ArrowUp or ArrowDown that leaves the table toward a block (`cellCaretExit`,
 * `uwg-te-req-tables-7`) from a cell spanning several rows: the engine's own move takes the cell at
 * the same index among the cells of the row after the cell's own row, which lies inside the table
 * when the span reaches the last row from a row above it. The caret goes to the start of the block
 * after the table or the end of the one before it (`$textEdgeIn`: a list's first or last item, a
 * table's edge cell); with no block there it has stayed already (`cellCaretStays`). An atom beside
 * the table is selected by the block cursor's keys (`$verticalToAtom`); from a cell of one row the
 * engine's move leaves the table by the same rule. Answers whether it handled the key.
 */
function $leaveSpanningCell(
  rt: LexicalRuntime,
  input: Parameters<typeof cellCaretExit>[0],
): boolean {
  const { selection } = input;
  if (selection.kind !== 'text' || !selection.head.cell) return false;
  const { row, column } = selection.head.cell;
  const table = input.table(selection.head.block);
  if (!table || (placedCell(table, row, column)?.rowSpan ?? 1) < 2) return false;
  const id = cellCaretExit(input);
  if (id === null) return false;
  const up = input.key === 'ArrowUp';
  const node = $holderById(rt, id);
  if (!node) return false;
  const beside = up ? node.getPreviousSibling() : node.getNextSibling();
  if (!beside) return false;
  const target = $textEdgeIn(rt, [beside], up ? 'end' : 'start');
  return target !== null && $selectText(rt, target);
}

/**
 * Registers the arrow keys in tables at critical priority, ahead of the engine's own table keys:
 * Shift with an arrow key, whose selected cells and steps differ across merged cells on the
 * engine, and plain ArrowUp and ArrowDown from cell to cell, which the engine moves to the start
 * of the cell below but the end of the cell above, by the cells' order in their rows, out of the
 * table from a cell spanning several rows, and out of a table that no block lies beyond, where the
 * selection stays.
 */
export function registerCellKeys(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  if (!rt.modules.table) return () => undefined;
  const CRITICAL = lexical.COMMAND_PRIORITY_CRITICAL;
  const arrow = (key: string) => (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !editor.isEditable()) return false;
    const done = event.shiftKey
      ? $cellRangeArrow(rt, key)
      : (key === 'ArrowUp' || key === 'ArrowDown') &&
        $cellCaretArrow(rt, key, (point, side) => new LexicalGeometry(rt).onEdgeLine(point, side));
    if (!done) return false;
    event.preventDefault();
    return true;
  };
  return lexical.mergeRegister(
    editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, arrow('ArrowUp'), CRITICAL),
    editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, arrow('ArrowDown'), CRITICAL),
    editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, arrow('ArrowLeft'), CRITICAL),
    editor.registerCommand(lexical.KEY_ARROW_RIGHT_COMMAND, arrow('ArrowRight'), CRITICAL),
  );
}
