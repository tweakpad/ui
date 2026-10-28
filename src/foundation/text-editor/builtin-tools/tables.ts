/**
 * Built-in tools of the tables feature (Widgets `uwg-te-tab-tools-inserts`,
 * `uwg-te-tab-tools-tables`, `uwg-te-req-tables-3`, `uwg-te-req-tables-5`): the table size tool
 * of the toolbar and the slash menu, and the tools of the row, column and cell menus.
 */
import {
  arrowDownIcon,
  arrowLeftIcon,
  arrowRightIcon,
  arrowUpIcon,
} from '../../../icons/arrows.js';
import { copyPlusIcon } from '../../../icons/copy-plus.js';
import {
  clearCellsIcon,
  headerColumnIcon,
  headerRowIcon,
  insertColumnLeftIcon,
  insertColumnRightIcon,
  insertRowAboveIcon,
  insertRowBelowIcon,
  mergeCellsIcon,
  paintBucketIcon,
  splitCellIcon,
  tableIcon,
} from '../../../icons/table-editing.js';
import { trashIcon } from '../../../icons/trash.js';
import type { TextEditorCapability } from '../capabilities.js';
import { paletteName, type TextEditorColorChoice } from '../palette.js';
import {
  insertBlock,
  type TextEditorSurface,
  type TextEditorTableSizeToolValue,
  type TextEditorTool,
  type TextEditorToolContext,
} from '../tools.js';
import type { BuiltinToolIdOf } from './ids.js';
import { ALIGN_ICONS, ALIGN_ITEMS, builtin, sided, sidedIcon, text } from './shared.js';
import { cellsIn, line, scoped, spansBeyond, tableScope } from './table-scope.js';

const TABLE_MENUS: readonly TextEditorSurface[] = ['table-row', 'table-column', 'table-cell'];
const TABLE: readonly TextEditorCapability[] = ['block.table'];
const TABLE_MOVE: readonly TextEditorCapability[] = ['block.table', 'table.move'];
const TABLE_MERGE: readonly TextEditorCapability[] = ['block.table', 'table.merge'];

/** Moves the one targeted row or column by one position, or `null` at an edge. */
function moveLine(axis: 'row' | 'column', step: -1 | 1) {
  return scoped((scope) => {
    const from = line(scope, axis);
    const count = axis === 'row' ? scope.rowCount : scope.columnCount;
    if (from === null) return null;
    const to = from + step;
    if (to < 0 || (count !== null && to >= count)) return null;
    return [
      {
        type: axis === 'row' ? 'table.move-row' : 'table.move-column',
        table: scope.table,
        from,
        to,
      },
    ];
  });
}

/** Moving is disabled while the table has merged cells and at the table's edges. */
function canMoveLine(axis: 'row' | 'column', step: -1 | 1) {
  const resolve = moveLine(axis, step);
  return (context: TextEditorToolContext): boolean => {
    const scope = tableScope(context);
    return scope !== null && !scope.merged && resolve(context) !== null;
  };
}

/** Duplicating a line is disabled while a merged cell spans it and another line. */
function canDuplicateLine(context: TextEditorToolContext, axis: 'row' | 'column'): boolean {
  const scope = tableScope(context);
  const index = scope ? line(scope, axis) : null;
  return scope !== null && index !== null && !spansBeyond(scope.model, axis, index);
}

function tableTool(tool: Omit<TextEditorTool, 'group'>): TextEditorTool {
  return builtin({ group: 'table', ...tool });
}

/** The built-in tools of the tables feature by identifier. */
export const textEditorTableTools = Object.freeze({
  table: builtin({
    id: 'table',
    kind: 'table-size',
    label: text('table'),
    description: text('tableDescription'),
    icon: tableIcon,
    group: 'insert',
    surfaces: ['toolbar', 'slash'],
    requires: ['block.table'],
    action: (context) => {
      const value = context.value as TextEditorTableSizeToolValue | undefined;
      if (value === undefined) return null;
      const attrs = {
        rows: value.rows,
        columns: value.columns,
        headerRow: true,
        headerColumn: false,
      };
      return [insertBlock(context, 'table', attrs, 'start')];
    },
  }),
  'table-insert-row-before': tableTool({
    id: 'table-insert-row-before',
    kind: 'button',
    label: text('tableInsertRowBefore'),
    icon: insertRowAboveIcon,
    surfaces: ['table-row'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.insert-row', table: scope.table, index: scope.rows[0] },
    ]),
  }),
  'table-insert-row-after': tableTool({
    id: 'table-insert-row-after',
    kind: 'button',
    label: text('tableInsertRowAfter'),
    icon: insertRowBelowIcon,
    surfaces: ['table-row'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.insert-row', table: scope.table, index: scope.rows[1] + 1 },
    ]),
  }),
  'table-insert-column-before': tableTool({
    id: 'table-insert-column-before',
    kind: 'button',
    label: sided('tableInsertColumnLeft', 'tableInsertColumnRight'),
    icon: sidedIcon(insertColumnLeftIcon, insertColumnRightIcon),
    surfaces: ['table-column'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.insert-column', table: scope.table, index: scope.columns[0] },
    ]),
  }),
  'table-insert-column-after': tableTool({
    id: 'table-insert-column-after',
    kind: 'button',
    label: sided('tableInsertColumnRight', 'tableInsertColumnLeft'),
    icon: sidedIcon(insertColumnRightIcon, insertColumnLeftIcon),
    surfaces: ['table-column'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.insert-column', table: scope.table, index: scope.columns[1] + 1 },
    ]),
  }),
  'table-move-row-up': tableTool({
    id: 'table-move-row-up',
    kind: 'button',
    label: text('tableMoveRowUp'),
    icon: arrowUpIcon,
    surfaces: ['table-row'],
    requires: TABLE_MOVE,
    action: moveLine('row', -1),
    isEnabled: canMoveLine('row', -1),
  }),
  'table-move-row-down': tableTool({
    id: 'table-move-row-down',
    kind: 'button',
    label: text('tableMoveRowDown'),
    icon: arrowDownIcon,
    surfaces: ['table-row'],
    requires: TABLE_MOVE,
    action: moveLine('row', 1),
    isEnabled: canMoveLine('row', 1),
  }),
  'table-move-column-before': tableTool({
    id: 'table-move-column-before',
    kind: 'button',
    label: sided('tableMoveColumnLeft', 'tableMoveColumnRight'),
    icon: sidedIcon(arrowLeftIcon, arrowRightIcon),
    surfaces: ['table-column'],
    requires: TABLE_MOVE,
    action: moveLine('column', -1),
    isEnabled: canMoveLine('column', -1),
  }),
  'table-move-column-after': tableTool({
    id: 'table-move-column-after',
    kind: 'button',
    label: sided('tableMoveColumnRight', 'tableMoveColumnLeft'),
    icon: sidedIcon(arrowRightIcon, arrowLeftIcon),
    surfaces: ['table-column'],
    requires: TABLE_MOVE,
    action: moveLine('column', 1),
    isEnabled: canMoveLine('column', 1),
  }),
  'table-duplicate-row': tableTool({
    id: 'table-duplicate-row',
    kind: 'button',
    label: text('tableDuplicateRow'),
    icon: copyPlusIcon,
    surfaces: ['table-row'],
    requires: TABLE,
    action: scoped((scope) => {
      const index = line(scope, 'row');
      return index === null ? null : [{ type: 'table.duplicate-row', table: scope.table, index }];
    }),
    isEnabled: (context) => canDuplicateLine(context, 'row'),
  }),
  'table-delete-row': tableTool({
    id: 'table-delete-row',
    kind: 'button',
    label: text('tableDeleteRow'),
    icon: trashIcon,
    tone: 'destructive',
    surfaces: ['table-row'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.delete-rows', table: scope.table, from: scope.rows[0], to: scope.rows[1] },
    ]),
  }),
  'table-duplicate-column': tableTool({
    id: 'table-duplicate-column',
    kind: 'button',
    label: text('tableDuplicateColumn'),
    icon: copyPlusIcon,
    surfaces: ['table-column'],
    requires: TABLE,
    action: scoped((scope) => {
      const index = line(scope, 'column');
      return index === null
        ? null
        : [{ type: 'table.duplicate-column', table: scope.table, index }];
    }),
    isEnabled: (context) => canDuplicateLine(context, 'column'),
  }),
  'table-delete-column': tableTool({
    id: 'table-delete-column',
    kind: 'button',
    label: text('tableDeleteColumn'),
    icon: trashIcon,
    tone: 'destructive',
    surfaces: ['table-column'],
    requires: TABLE,
    action: scoped((scope) => [
      {
        type: 'table.delete-columns',
        table: scope.table,
        from: scope.columns[0],
        to: scope.columns[1],
      },
    ]),
  }),
  'table-toggle-header-row': tableTool({
    id: 'table-toggle-header-row',
    kind: 'toggle',
    label: text('tableToggleHeaderRow'),
    icon: headerRowIcon,
    surfaces: ['table-row'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.set-header', table: scope.table, row: !scope.headerRow },
    ]),
    isActive: (context) => tableScope(context)?.headerRow === true,
  }),
  'table-toggle-header-column': tableTool({
    id: 'table-toggle-header-column',
    kind: 'toggle',
    label: text('tableToggleHeaderColumn'),
    icon: headerColumnIcon,
    surfaces: ['table-column'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.set-header', table: scope.table, column: !scope.headerColumn },
    ]),
    isActive: (context) => tableScope(context)?.headerColumn === true,
  }),
  'table-merge-cells': tableTool({
    id: 'table-merge-cells',
    kind: 'button',
    label: text('tableMergeCells'),
    icon: mergeCellsIcon,
    surfaces: ['table-cell'],
    requires: TABLE_MERGE,
    action: scoped((scope) =>
      line(scope, 'row') !== null && line(scope, 'column') !== null
        ? null
        : [{ type: 'table.merge-cells', table: scope.table, range: scope.range }],
    ),
  }),
  'table-split-cell': tableTool({
    id: 'table-split-cell',
    kind: 'button',
    label: text('tableSplitCell'),
    icon: splitCellIcon,
    surfaces: ['table-cell'],
    requires: TABLE_MERGE,
    action: scoped((scope) => {
      const merged = scope.model
        ? cellsIn(scope).filter((cell) => cell.rowSpan > 1 || cell.colSpan > 1)
        : [];
      if (merged.length > 0)
        return merged.map((cell) => ({
          type: 'table.split-cell' as const,
          table: scope.table,
          cell: { row: cell.row, column: cell.column },
        }));
      return scope.model === null && scope.cellMerged
        ? [{ type: 'table.split-cell', table: scope.table, cell: scope.cell }]
        : null;
    }),
  }),
  'table-cell-align': tableTool({
    id: 'table-cell-align',
    kind: 'radio-menu',
    label: text('tableCellAlign'),
    icon: ALIGN_ICONS.start,
    surfaces: [...TABLE_MENUS],
    requires: TABLE,
    items: [...ALIGN_ITEMS],
  }),
  'cell-background': tableTool({
    id: 'cell-background',
    kind: 'color',
    label: text('cellBackground'),
    icon: paintBucketIcon,
    channel: 'background',
    surfaces: [...TABLE_MENUS],
    requires: TABLE,
    action: (context) => {
      if (context.value === undefined) return null;
      const color = paletteName(context.value as TextEditorColorChoice);
      return scoped((scope) => [
        { type: 'table.background', table: scope.table, target: scope.cells, color },
      ])(context);
    },
  }),
  'table-clear-cells': tableTool({
    id: 'table-clear-cells',
    kind: 'button',
    label: text('tableClearCells'),
    icon: clearCellsIcon,
    surfaces: ['table-cell'],
    requires: TABLE,
    action: scoped((scope) => [
      { type: 'table.clear-cells', table: scope.table, range: scope.range },
    ]),
  }),
} satisfies Readonly<Record<BuiltinToolIdOf<'tables'>, TextEditorTool>>);
