/**
 * Tables of the Tiptap adapter (Widgets `uwg-te-req-tables-1` to `uwg-te-req-tables-5`,
 * `uwg-te-tab-actions` r7, `uwg-te-req-blocks-1`).
 *
 * Every table action computes the next portable table with the shared table edit, which both
 * engines apply alike: positional header state that a moved or copied line never carries,
 * spans, merges in row-major content order, splits whose new cells copy the background and the
 * alignment, moves refused while a cell is merged, all-or-nothing widths of at least 48 CSS
 * pixels. The adapter replaces the table in one transaction and sets the selection the edit
 * leaves, or moves the current one with its cells (`keptTableSelection`). A cell range is painted
 * on the cells of the shared rule, grown over merged cells, through the engine's decorations,
 * never through the engine's own selected-cell class (`uwg-te-req-tables-5`); Backspace and Delete
 * over a range clear its cells, without deleting the table.
 */
import type { TextEditorAction } from '../../actions.js';
import { findBlock } from '../shared/blocks.js';
import { keptTableSelection, tableCaret, tableEdit } from '../shared/table-edits.js';
import type { TiptapActionHandlers } from './actions.js';
import { applyDocument, modelSelection, restoreSelection } from './blocks.js';
import {
  hasTiptapTables,
  type TiptapEditorStateLike,
  type TiptapExtensionLike,
} from './modules.js';
import { TABLE_SELECTION_FLAG } from './schema.js';
import { isCellSelection, selectedCells, type TiptapSelectionEnv } from './selection.js';
import type { TiptapWork } from './work.js';

type TableAction = Extract<TextEditorAction, { readonly table: string }>;

/** Applies the shared edit of a table action and sets the selection it leaves. */
function editTable(work: TiptapWork, action: TableAction): boolean {
  if (!work.env.tables) return false;
  const document = work.portable();
  const table = findBlock(document.blocks, action.table);
  if (table?.type !== 'table') return false;
  const { capabilities } = work.env;
  const edit = tableEdit(action.table, table, action, {
    move: capabilities.has('table.move'),
    merge: capabilities.has('table.merge'),
  });
  if (!edit) return false;
  const selection = modelSelection(work);
  const blocks = document.blocks.map((block) => (block === table ? edit.table : block));
  if (!applyDocument(work, work.canonical({ blocks }))) return false;
  const next =
    edit.selection === 'keep' ? keptTableSelection(selection, action.table, edit) : edit.selection;
  // A selection that no longer resolves leaves the caret in the table's first cell; none stays.
  if (!restoreSelection(work, next) && selection.kind !== 'none')
    restoreSelection(work, tableCaret(action.table, 0, 0));
  return true;
}

/** The handlers of the table actions. */
export const TABLE_HANDLERS: TiptapActionHandlers = {
  'table.insert-row': editTable,
  'table.insert-column': editTable,
  'table.delete-rows': editTable,
  'table.delete-columns': editTable,
  'table.move-row': editTable,
  'table.move-column': editTable,
  'table.duplicate-row': editTable,
  'table.duplicate-column': editTable,
  'table.merge-cells': editTable,
  'table.split-cell': editTable,
  'table.set-header': editTable,
  'table.align': editTable,
  'table.background': editTable,
  'table.column-widths': editTable,
  'table.clear-cells': editTable,
};

// Painting a cell range

/**
 * The extension that paints a cell range: `tp-te-cell-selected` on its cells, the cells of the
 * shared rule with the range grown over merged cells (`selectedCells`), written through the
 * engine's node decorations, and a decoration of its table flagged `tpTableSelection` that the
 * table view turns into `tp-te-table-selection` on the table element, since the table node's own
 * element is its scroll wrapper; `null` without tables.
 */
export function tableSelectionExtension(env: TiptapSelectionEnv): TiptapExtensionLike | null {
  const { modules } = env;
  const factory = modules.core.Decoration;
  if (!hasTiptapTables(modules) || typeof factory?.Node !== 'function') return null;
  const { tables } = modules;
  return modules.core.Extension.create({
    name: 'tpCellSelection',
    addDecorations: () => ({
      create: ({ state }: { readonly state: TiptapEditorStateLike }): object[] => {
        const { selection } = state;
        if (!isCellSelection(tables, selection)) return [];
        const decorations: object[] = selectedCells(env, state.doc, selection).map(
          ({ node, pos }) =>
            factory.Node(pos, pos + node.nodeSize, { class: 'tp-te-cell-selected' }),
        );
        const table = selection.$anchorCell.node(-1);
        const pos = selection.$anchorCell.before(-1);
        decorations.push(
          factory.Node(pos, pos + table.nodeSize, {}, { [TABLE_SELECTION_FLAG]: true }),
        );
        return decorations;
      },
      shouldUpdate: ({
        tr,
        oldState,
        newState,
      }: {
        readonly tr: { readonly docChanged: boolean };
        readonly oldState: TiptapEditorStateLike;
        readonly newState: TiptapEditorStateLike;
      }) => tr.docChanged || !oldState.selection.eq(newState.selection),
    }),
  });
}
