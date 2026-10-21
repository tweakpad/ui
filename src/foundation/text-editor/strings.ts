/**
 * Strings of the text editor (Widgets `uwg-te-tab-props` r12, `uwg-te-req-a11y-1` to
 * `uwg-te-req-a11y-5`, `uwg-te-par-tools-1`, `uwg-te-par-tools-2`, `uwg-te-req-tables-8`).
 *
 * Labels, names, hints and announcement texts in English. Keys are camelCase; a `{name}`
 * placeholder is filled where the text is used. Texts that only the live announcer speaks start
 * with `announce`. The built-in tools take their labels from here, through the tool context, so
 * that replacing a string relabels every surface. The accessible name of the task checkbox,
 * `taskCheckbox`, is the one text that the engine renders; changing it remounts the engine.
 */

export interface TextEditorStrings {
  /** The default accessible name of the editing root. */
  readonly label: string;
  /** The visually hidden description of the editing root. */
  readonly instructions: string;
  /** The status while the engine loads. */
  readonly loading: string;
  /** The alert when the engine fails to mount. */
  readonly error: string;

  // Chrome
  /** The fixed toolbar. */
  readonly toolbar: string;
  /** `{count}`: the trigger of the fixed toolbar's More menu, by the number of tool groups the menu holds. */
  readonly moreTools: string;
  readonly selectionToolbar: string;
  /** The toolbar beside a block that holds the insert Button and the grip. */
  readonly gutter: string;
  readonly insertBlock: string;
  /** The grip of a block, which drags it and opens the block menu. */
  readonly grip: string;
  readonly blockMenu: string;
  readonly tableControls: string;
  /** The hint in the empty block that holds the caret. */
  readonly emptyBlockHint: string;
  /** The accessible name of the checkbox of a task item. */
  readonly taskCheckbox: string;

  // Tool labels
  readonly undo: string;
  readonly redo: string;
  readonly bold: string;
  readonly italic: string;
  readonly underline: string;
  readonly strike: string;
  readonly code: string;
  readonly superscript: string;
  readonly subscript: string;
  readonly clearFormatting: string;
  /** The highlight tool, and the highlight group of a color menu. */
  readonly highlight: string;
  readonly color: string;
  /** The link tool and the link popover. */
  readonly link: string;
  readonly align: string;
  /** The start alignment in a left-to-right editor, the end alignment in a right-to-left one. */
  readonly alignLeft: string;
  readonly alignCenter: string;
  /** The end alignment in a left-to-right editor, the start alignment in a right-to-left one. */
  readonly alignRight: string;
  readonly alignJustify: string;
  readonly more: string;
  readonly paragraph: string;
  readonly heading1: string;
  readonly heading2: string;
  readonly heading3: string;
  readonly heading4: string;
  readonly heading5: string;
  readonly heading6: string;
  readonly bulletList: string;
  readonly orderedList: string;
  readonly taskList: string;
  readonly blockquote: string;
  readonly codeBlock: string;
  readonly divider: string;
  readonly blockType: string;
  readonly listType: string;
  readonly turnInto: string;
  /** The table tool and the table size picker. */
  readonly table: string;
  /** The image tool and the image popover. */
  readonly image: string;
  /** The slash menu. */
  readonly slash: string;
  readonly duplicateBlock: string;
  readonly copyBlockLink: string;
  readonly moveBlockUp: string;
  readonly moveBlockDown: string;
  readonly nestBlock: string;
  readonly unnestBlock: string;
  readonly openBlockMenu: string;
  readonly deleteBlock: string;
  readonly toggleTask: string;
  readonly tableInsertRowBefore: string;
  readonly tableInsertRowAfter: string;
  /** Inserting a column on the left, before the column in a left-to-right editor. */
  readonly tableInsertColumnLeft: string;
  /** Inserting a column on the right, after the column in a left-to-right editor. */
  readonly tableInsertColumnRight: string;
  readonly tableMoveRowUp: string;
  readonly tableMoveRowDown: string;
  readonly tableMoveColumnLeft: string;
  readonly tableMoveColumnRight: string;
  readonly tableDuplicateRow: string;
  readonly tableDeleteRow: string;
  readonly tableDuplicateColumn: string;
  readonly tableDeleteColumn: string;
  readonly tableToggleHeaderRow: string;
  readonly tableToggleHeaderColumn: string;
  readonly tableMergeCells: string;
  readonly tableSplitCell: string;
  readonly tableCellAlign: string;
  readonly cellBackground: string;
  readonly tableClearCells: string;

  // Colors
  /** The text color group of a color menu. */
  readonly textColor: string;
  /** The cell background group of a color menu. */
  readonly background: string;
  /** The color choice that stores no color. */
  readonly colorDefault: string;
  readonly colorGray: string;
  readonly colorBrown: string;
  readonly colorOrange: string;
  readonly colorYellow: string;
  readonly colorGreen: string;
  readonly colorBlue: string;
  readonly colorPurple: string;
  readonly colorPink: string;
  readonly colorRed: string;

  // Popovers
  readonly linkPlaceholder: string;
  readonly applyLink: string;
  readonly openLink: string;
  readonly removeLink: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly insertImage: string;
  readonly rows: string;
  readonly columns: string;
  /** `{rows}` and `{columns}`: the size that the table size picker shows. */
  readonly tableSize: string;
  readonly insertTable: string;

  // Suggestions
  /** The list of a suggestion. */
  readonly suggestions: string;
  readonly noResults: string;
  readonly suggestionsLoading: string;
  readonly groupText: string;
  readonly groupLists: string;
  readonly groupInsert: string;

  // Table controls
  /** `{row}`: the row grip, by the row's number. */
  readonly tableRowGrip: string;
  /** `{column}`: the column grip, by the column's number. */
  readonly tableColumnGrip: string;
  /** The handle on the outline of a cell range. */
  readonly tableCellHandle: string;
  readonly tableAddRow: string;
  readonly tableAddColumn: string;
  /** `{column}`: the resize separator after a column, by the column's number. */
  readonly tableColumnWidth: string;

  // Announcements
  /** `{count}`: the number of blocks in the block selection. */
  readonly announceSelected: string;
  /** `{label}`: a block moved by key or from the block menu. */
  readonly announceMoved: string;
  /** `{count}`: blocks moved together. */
  readonly announceMovedMany: string;
  readonly announceDuplicated: string;
  readonly announceDeleted: string;
  /** `{label}`, `{level}` and `{place}`: a block picked up by a drag. */
  readonly announcePickedUp: string;
  /** `{label}`, `{level}` and `{place}`: where a dragged block would drop. */
  readonly announceDropTarget: string;
  readonly announceDropped: string;
  readonly announceDragCancelled: string;
  /** The `{place}` of a top-level block. */
  readonly announcePlaceTop: string;
  /** `{parent}`: the `{place}` of a block nested in a list item. */
  readonly announcePlaceIn: string;
  readonly announceLinkCopied: string;
  readonly announceLinkCopyFailed: string;
  /** `{label}`, `{position}` and `{count}`: the highlighted suggestion. */
  readonly announceSuggestionActive: string;
  readonly announceRowInserted: string;
  readonly announceColumnInserted: string;
  /** `{position}`: the row's new number. */
  readonly announceRowMoved: string;
  /** `{position}`: the column's new number. */
  readonly announceColumnMoved: string;
  /** `{count}`: the number of rows deleted. */
  readonly announceRowsDeleted: string;
  /** `{count}`: the number of columns deleted. */
  readonly announceColumnsDeleted: string;
  readonly announceCellsMerged: string;
  readonly announceCellSplit: string;
  /** `{rows}` and `{columns}`: the size of the selected cell range. */
  readonly announceCellRange: string;
}

/** The English strings of the text editor. */
export const textEditorStrings: TextEditorStrings = Object.freeze({
  label: 'Text editor',
  instructions:
    'A slash (/) opens the command list. Alt+F10 moves focus to the controls for the selection or the current block.',
  loading: 'Loading the editor',
  error: 'The editor could not be loaded.',

  toolbar: 'Formatting',
  moreTools: 'More tools, hidden groups: {count}',
  selectionToolbar: 'Selection formatting',
  gutter: 'Block actions',
  insertBlock: 'Insert block',
  grip: 'Move block or open block options',
  blockMenu: 'Block options',
  tableControls: 'Table controls',
  emptyBlockHint: 'Start writing',
  taskCheckbox: 'Done',

  undo: 'Undo',
  redo: 'Redo',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strike: 'Strikethrough',
  code: 'Inline code',
  superscript: 'Superscript',
  subscript: 'Subscript',
  clearFormatting: 'Clear formatting',
  highlight: 'Highlight',
  color: 'Color',
  link: 'Link',
  align: 'Alignment',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  alignJustify: 'Justify',
  more: 'More formatting',
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  heading4: 'Heading 4',
  heading5: 'Heading 5',
  heading6: 'Heading 6',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  taskList: 'Task list',
  blockquote: 'Quote',
  codeBlock: 'Code block',
  divider: 'Divider',
  blockType: 'Block type',
  listType: 'List type',
  turnInto: 'Turn into',
  table: 'Table',
  image: 'Image',
  slash: 'Commands',
  duplicateBlock: 'Duplicate',
  copyBlockLink: 'Copy block link',
  moveBlockUp: 'Move up',
  moveBlockDown: 'Move down',
  nestBlock: 'Indent',
  unnestBlock: 'Outdent',
  openBlockMenu: 'Open block options',
  deleteBlock: 'Delete',
  toggleTask: 'Check or uncheck task',
  tableInsertRowBefore: 'Insert row above',
  tableInsertRowAfter: 'Insert row below',
  tableInsertColumnLeft: 'Insert column left',
  tableInsertColumnRight: 'Insert column right',
  tableMoveRowUp: 'Move row up',
  tableMoveRowDown: 'Move row down',
  tableMoveColumnLeft: 'Move column left',
  tableMoveColumnRight: 'Move column right',
  tableDuplicateRow: 'Duplicate row',
  tableDeleteRow: 'Delete row',
  tableDuplicateColumn: 'Duplicate column',
  tableDeleteColumn: 'Delete column',
  tableToggleHeaderRow: 'Header row',
  tableToggleHeaderColumn: 'Header column',
  tableMergeCells: 'Merge cells',
  tableSplitCell: 'Split cell',
  tableCellAlign: 'Cell alignment',
  cellBackground: 'Cell background',
  tableClearCells: 'Clear cells',

  textColor: 'Text color',
  background: 'Background',
  colorDefault: 'Default',
  colorGray: 'Gray',
  colorBrown: 'Brown',
  colorOrange: 'Orange',
  colorYellow: 'Yellow',
  colorGreen: 'Green',
  colorBlue: 'Blue',
  colorPurple: 'Purple',
  colorPink: 'Pink',
  colorRed: 'Red',

  linkPlaceholder: 'Paste or type a link',
  applyLink: 'Apply link',
  openLink: 'Open link',
  removeLink: 'Remove link',
  imageUrl: 'Image address',
  imageAlt: 'Alternative text',
  insertImage: 'Insert image',
  rows: 'Rows',
  columns: 'Columns',
  tableSize: '{rows} × {columns}',
  insertTable: 'Insert table',

  suggestions: 'Suggestions',
  noResults: 'No results',
  suggestionsLoading: 'Loading suggestions',
  groupText: 'Text',
  groupLists: 'Lists',
  groupInsert: 'Insert',

  tableRowGrip: 'Row {row}',
  tableColumnGrip: 'Column {column}',
  tableCellHandle: 'Cell options',
  tableAddRow: 'Add row',
  tableAddColumn: 'Add column',
  tableColumnWidth: 'Width of column {column}',

  announceSelected: 'Selected blocks: {count}',
  announceMoved: 'Moved {label}',
  announceMovedMany: 'Moved blocks: {count}',
  announceDuplicated: 'Duplicated blocks: {count}',
  announceDeleted: 'Deleted blocks: {count}',
  announcePickedUp: 'Picked up {label}, level {level}, {place}.',
  announceDropTarget: '{label} at level {level}, {place}.',
  announceDropped: 'Dropped {label} at level {level}, {place}.',
  announceDragCancelled: 'Move cancelled. {label} is back at level {level}, {place}.',
  announcePlaceTop: 'at the top level',
  announcePlaceIn: 'in {parent}',
  announceLinkCopied: 'Link copied',
  announceLinkCopyFailed: 'The link could not be copied',
  announceSuggestionActive: '{label}, {position} of {count}',
  announceRowInserted: 'Row inserted',
  announceColumnInserted: 'Column inserted',
  announceRowMoved: 'Row moved to position {position}',
  announceColumnMoved: 'Column moved to position {position}',
  announceRowsDeleted: 'Rows deleted: {count}',
  announceColumnsDeleted: 'Columns deleted: {count}',
  announceCellsMerged: 'Cells merged',
  announceCellSplit: 'Cell split',
  announceCellRange: 'Selected cells: {rows} by {columns}',
});

const STRING_KEYS = Object.freeze(
  Object.keys(textEditorStrings),
) as readonly (keyof TextEditorStrings)[];

/**
 * The strings with the overrides that are strings in place of the defaults; other members, and
 * keys that the strings do not have, are ignored. Without an override the defaults come back
 * themselves. The result is frozen.
 */
export function resolveTextEditorStrings(
  overrides?: Partial<TextEditorStrings> | null,
): TextEditorStrings {
  if (!overrides) return textEditorStrings;
  let resolved: Record<keyof TextEditorStrings, string> | null = null;
  for (const key of STRING_KEYS) {
    const value = (overrides as Readonly<Record<string, unknown>>)[key];
    if (typeof value !== 'string' || value === textEditorStrings[key]) continue;
    resolved ??= { ...textEditorStrings };
    resolved[key] = value;
  }
  return resolved ? Object.freeze(resolved) : textEditorStrings;
}
