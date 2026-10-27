/**
 * Built-in tools of the text editor (Widgets `uwg-te-par-tools-1`, `uwg-te-tab-tools`,
 * `uwg-te-tab-tools-blocks`, `uwg-te-tab-tools-inserts`, `uwg-te-tab-tools-actions`,
 * `uwg-te-tab-tools-tables`, `uwg-te-req-tools-5`, `uwg-te-req-tables-3`,
 * `uwg-te-req-tables-5`).
 *
 * One frozen record of the built-in tools by identifier, in the order of the five tables. Labels
 * come from the strings of the tool context; a label or an icon that names a physical side follows
 * the direction of the editor. Shortcuts hold the chords of the platform on which this module
 * runs, which it reads once when it loads, so that `redo` lists Ctrl+Y only outside Apple
 * platforms. The tools that change the kind of a block hide while the selection lies in a table,
 * and alignment applies to the cells of a table.
 */
import { arrowDownIcon, arrowLeftIcon, arrowRightIcon, arrowUpIcon } from '../../icons/arrows.js';
import { copyPlusIcon } from '../../icons/copy-plus.js';
import { copyIcon } from '../../icons/copy.js';
import { ellipsisVerticalIcon } from '../../icons/ellipsis.js';
import { imageIcon } from '../../icons/image.js';
import { linkIcon } from '../../icons/link.js';
import { minusIcon } from '../../icons/minus.js';
import { redoIcon } from '../../icons/redo.js';
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
} from '../../icons/table-editing.js';
import {
  textAlignCenterIcon,
  textAlignJustifyIcon,
  textAlignLeftIcon,
  textAlignRightIcon,
} from '../../icons/text-align.js';
import {
  bulletListIcon,
  codeBlockIcon,
  heading1Icon,
  heading2Icon,
  heading3Icon,
  orderedListIcon,
  pilcrowIcon,
  quoteIcon,
  taskListIcon,
} from '../../icons/text-blocks.js';
import {
  baselineIcon,
  boldIcon,
  codeIcon,
  highlighterIcon,
  italicIcon,
  removeFormattingIcon,
  strikethroughIcon,
  subscriptIcon,
  superscriptIcon,
  underlineIcon,
} from '../../icons/text-formatting.js';
import { trashIcon } from '../../icons/trash.js';
import type { IconDefinition } from '../../icons/types.js';
import { undoIcon } from '../../icons/undo.js';
import { keyHintPlatform } from '../key-notation.js';
import type { TextEditorAction, TextEditorTableTarget } from './actions.js';
import type { TextEditorCapability } from './capabilities.js';
import type {
  TextEditorAlign,
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorHeadingLevel,
  TextEditorListKind,
  TextEditorTableCell,
  TextEditorTableModel,
  TextEditorToggleMark,
} from './model.js';
import { paletteName, type TextEditorColorChoice } from './palette.js';
import type { TextEditorStrings } from './strings.js';
import {
  blockKindIs,
  insertBlock,
  outsideTable,
  setBlockKind,
  targetBlockIds,
  targetIdsMember,
  type TextEditorColorToolValue,
  type TextEditorImageToolValue,
  type TextEditorLinkToolValue,
  type TextEditorSurface,
  type TextEditorTableSizeToolValue,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolContextual,
} from './tools.js';

/** The platform whose chords the built-in tools hold, read once when this module loads. */
const PLATFORM = keyHintPlatform('auto', globalThis.navigator);

/** A label read from the strings of the tool context. */
const text =
  (key: keyof TextEditorStrings) =>
  ({ strings }: TextEditorToolContext): string =>
    strings[key];

/** A label that names a side: the first key in a left-to-right editor, the second otherwise. */
const sided =
  (leftToRight: keyof TextEditorStrings, rightToLeft: keyof TextEditorStrings) =>
  ({ strings, direction }: TextEditorToolContext): string =>
    strings[direction === 'rtl' ? rightToLeft : leftToRight];

/** An icon that shows a side: the first in a left-to-right editor, the second otherwise. */
const sidedIcon =
  (leftToRight: IconDefinition, rightToLeft: IconDefinition) =>
  ({ direction }: TextEditorToolContext): IconDefinition =>
    direction === 'rtl' ? rightToLeft : leftToRight;

/** A label of a side of the text: by the direction of the selected text, else the widget's. */
const textSided =
  (leftToRight: keyof TextEditorStrings, rightToLeft: keyof TextEditorStrings) =>
  ({ strings, direction, textDirection }: TextEditorToolContext): string =>
    strings[(textDirection ?? direction) === 'rtl' ? rightToLeft : leftToRight];

/** An icon of a side of the text, as `textSided`. */
const textSidedIcon =
  (leftToRight: IconDefinition, rightToLeft: IconDefinition) =>
  ({ direction, textDirection }: TextEditorToolContext): IconDefinition =>
    (textDirection ?? direction) === 'rtl' ? rightToLeft : leftToRight;

/** Freezes the lists and static actions of a definition, then the definition. */
function builtin(tool: TextEditorTool): TextEditorTool {
  Object.freeze(tool.surfaces);
  Object.freeze(tool.requires);
  Object.freeze(tool.keywords);
  if (Array.isArray(tool.shortcut)) Object.freeze(tool.shortcut);
  if (Array.isArray(tool.channel)) Object.freeze(tool.channel);
  if (Array.isArray(tool.items)) {
    for (const item of tool.items as readonly (string | readonly string[])[])
      if (typeof item !== 'string') Object.freeze(item);
    Object.freeze(tool.items);
  }
  const { action } = tool;
  if (typeof action === 'object') {
    if (Array.isArray(action)) for (const item of action) Object.freeze(item);
    Object.freeze(action);
  }
  Object.freeze(tool.suggest);
  return Object.freeze(tool);
}

const BOTH_TOOLBARS: readonly TextEditorSurface[] = ['toolbar', 'selection-toolbar'];
const BLOCK_MENUS: readonly TextEditorSurface[] = ['slash', 'turn-into'];
const TABLE_MENUS: readonly TextEditorSurface[] = ['table-row', 'table-column', 'table-cell'];
const TABLE: readonly TextEditorCapability[] = ['block.table'];
const TABLE_MOVE: readonly TextEditorCapability[] = ['block.table', 'table.move'];
const TABLE_MERGE: readonly TextEditorCapability[] = ['block.table', 'table.merge'];

// Formatting tools (uwg-te-tab-tools)

function markTool(
  mark: TextEditorToggleMark,
  shortcut: string,
  surfaces: readonly TextEditorSurface[],
  icon?: IconDefinition,
): TextEditorTool {
  return builtin({
    id: mark,
    kind: 'toggle',
    label: text(mark),
    ...(icon ? { icon } : {}),
    group: 'format',
    surfaces: [...surfaces],
    shortcut,
    requires: [`mark.${mark}`],
    action: { type: 'mark.toggle', mark },
    isActive: ({ state }) => state.marks[mark] === 'on',
  });
}

function linkActions(context: TextEditorToolContext): readonly TextEditorAction[] | null {
  const value = context.value as TextEditorLinkToolValue | undefined;
  if (value === undefined) return null;
  const { selection, link } = context.state;
  const collapsed = selection.kind === 'text' && selection.empty && link === null;
  return [{ type: 'link.set', href: value.href, ...(collapsed ? { text: value.href } : {}) }];
}

// Tables (uwg-te-tab-tools-tables)

/** The table, lines and cells that a table tool acts on. */
interface TableScope {
  readonly table: string;
  /** The first and the last targeted row. */
  readonly rows: readonly [number, number];
  /** The first and the last targeted column. */
  readonly columns: readonly [number, number];
  /** The targeted cells, as `table.align` and `table.background` take them. */
  readonly cells: TextEditorTableTarget;
  /** The cell that holds the selection head. */
  readonly cell: TextEditorCellAddress;
  /** The selected cell range, or the head cell alone. */
  readonly range: TextEditorCellRange;
  readonly rowCount: number | null;
  readonly columnCount: number | null;
  /** Some cell of the table spans more than one row or column. */
  readonly merged: boolean;
  /** The cell that holds the selection head spans more than one row or column. */
  readonly cellMerged: boolean;
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
  readonly model: TextEditorTableModel | null;
}

const span = (from: number, to: number): readonly [number, number] => [
  Math.min(from, to),
  Math.max(from, to),
];

/**
 * The table that a table menu targets, or else the one that the selection lies in, with the row
 * or column of the menu, or else the selected cell range or the cell of the selection head.
 */
function tableScope(context: TextEditorToolContext): TableScope | null {
  const { target, state } = context;
  const table = target.kind === 'table' ? target.table : state.table?.id;
  if (table === undefined) return null;
  const selected = state.table?.id === table ? state.table : null;
  const model = context.table?.id === table ? context.table : null;
  const cell = selected?.cell ?? { row: 0, column: 0 };
  const range = selected?.range ?? { anchor: cell, head: cell };
  const rowCount = selected?.rows ?? model?.rows ?? null;
  const columnCount = selected?.columns ?? model?.columns ?? null;
  let rows = span(range.anchor.row, range.head.row);
  let columns = span(range.anchor.column, range.head.column);
  let cells: TextEditorTableTarget = { range };
  if (target.kind === 'table' && target.index !== undefined) {
    // A row menu targets the whole row, a column menu the whole column.
    if (target.axis === 'row') {
      rows = [target.index, target.index];
      if (columnCount !== null) columns = [0, columnCount - 1];
      cells = { row: target.index };
    } else if (target.axis === 'column') {
      columns = [target.index, target.index];
      if (rowCount !== null) rows = [0, rowCount - 1];
      cells = { column: target.index };
    }
  }
  return {
    table,
    rows,
    columns,
    cells,
    cell,
    range,
    rowCount,
    columnCount,
    merged: selected?.merged ?? model?.merged ?? false,
    cellMerged: selected?.cellMerged ?? false,
    headerRow: selected?.headerRow ?? model?.headerRow ?? false,
    headerColumn: selected?.headerColumn ?? model?.headerColumn ?? false,
    model,
  };
}

/** The actions of a table tool for its scope, or `null` outside a table. */
const scoped =
  (actions: (scope: TableScope) => readonly TextEditorAction[] | null) =>
  (context: TextEditorToolContext): readonly TextEditorAction[] | null => {
    const scope = tableScope(context);
    return scope ? actions(scope) : null;
  };

/** The single targeted line along an axis, or `null` for several. */
const line = (scope: TableScope, axis: 'row' | 'column'): number | null => {
  const [first, last] = axis === 'row' ? scope.rows : scope.columns;
  return first === last ? first : null;
};

/** Whether a cell of the model spans a line and another line along an axis. */
function spansBeyond(model: TextEditorTableModel | null, axis: 'row' | 'column', index: number) {
  if (!model) return false;
  return model.cells.some((cell) =>
    axis === 'row'
      ? cell.rowSpan > 1 && cell.row <= index && index < cell.row + cell.rowSpan
      : cell.colSpan > 1 && cell.column <= index && index < cell.column + cell.colSpan,
  );
}

/** The cells of the model that cover part of the scope's rows and columns. */
function cellsIn(scope: TableScope): readonly TextEditorTableCell[] {
  if (!scope.model) return [];
  const [top, bottom] = scope.rows;
  const [start, end] = scope.columns;
  return scope.model.cells.filter(
    (cell) =>
      cell.row <= bottom &&
      cell.row + cell.rowSpan - 1 >= top &&
      cell.column <= end &&
      cell.column + cell.colSpan - 1 >= start,
  );
}

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

// Alignment (uwg-te-tab-tools r10; uwg-te-req-tables-5)

const ALIGN_ITEMS = ['align-start', 'align-center', 'align-end', 'align-justify'] as const;

/**
 * The icon of each alignment: the start and end alignments show the side of the text's direction,
 * since a block aligns by the direction it resolves, whatever the widget's.
 */
const ALIGN_ICONS: Readonly<Record<TextEditorAlign, TextEditorToolContextual<IconDefinition>>> = {
  start: textSidedIcon(textAlignLeftIcon, textAlignRightIcon),
  center: textAlignCenterIcon,
  end: textSidedIcon(textAlignRightIcon, textAlignLeftIcon),
  justify: textAlignJustifyIcon,
};

/** The alignment that every targeted cell shares, `mixed`, or `null` without a model. */
function cellAlignment(context: TextEditorToolContext): TextEditorAlign | 'mixed' | null {
  const scope = tableScope(context);
  const cells = scope ? cellsIn(scope) : [];
  if (cells.length === 0) return null;
  const first = cells[0]!.align ?? 'start';
  return cells.every((cell) => (cell.align ?? 'start') === first) ? first : 'mixed';
}

const inTable = (context: TextEditorToolContext): boolean =>
  context.target.kind === 'table' || context.state.table !== null;

/** Aligns the selected textblocks, or the targeted cells of a table. */
function alignTool(id: (typeof ALIGN_ITEMS)[number], align: TextEditorAlign): TextEditorTool {
  const label =
    align === 'start'
      ? textSided('alignLeft', 'alignRight')
      : align === 'end'
        ? textSided('alignRight', 'alignLeft')
        : text(align === 'center' ? 'alignCenter' : 'alignJustify');
  return builtin({
    id,
    kind: 'toggle',
    label,
    icon: ALIGN_ICONS[align],
    group: 'align',
    surfaces: [],
    requires: ['align'],
    action: (context) => {
      if (!inTable(context)) return [{ type: 'block.align', align, ...targetIdsMember(context) }];
      const scope = tableScope(context);
      return scope
        ? [{ type: 'table.align', table: scope.table, target: scope.cells, align }]
        : null;
    },
    isActive: (context) => {
      const current = inTable(context) ? cellAlignment(context) : (context.state.align ?? 'start');
      return current === align;
    },
  });
}

// Blocks (uwg-te-tab-tools-blocks)

function blockKindTool(
  id: string,
  label: keyof TextEditorStrings,
  type: { readonly kind: string; readonly attrs?: { readonly level: TextEditorHeadingLevel } },
  key: string,
  options: {
    readonly surfaces: readonly TextEditorSurface[];
    readonly shortcut?: string;
    readonly requires: TextEditorCapability;
    readonly group: string;
    readonly keywords?: readonly string[];
    readonly icon?: IconDefinition | undefined;
    /** The string of the tool's description, the secondary line of its slash menu entry. */
    readonly description: keyof TextEditorStrings;
  },
): TextEditorTool {
  return builtin({
    id,
    kind: 'toggle',
    label: text(label),
    description: text(options.description),
    ...(options.icon ? { icon: options.icon } : {}),
    group: options.group,
    surfaces: [...options.surfaces],
    ...(options.keywords ? { keywords: [...options.keywords] } : {}),
    ...(options.shortcut ? { shortcut: options.shortcut } : {}),
    requires: [options.requires],
    action: (context) => setBlockKind(context, type, key),
    isActive: ({ state }) => blockKindIs(state, key),
    isVisible: outsideTable,
  });
}

/** The icons of the headings that the block menus show. */
const HEADING_ICONS: Readonly<Partial<Record<TextEditorHeadingLevel, IconDefinition>>> = {
  1: heading1Icon,
  2: heading2Icon,
  3: heading3Icon,
};

function headingTool(level: TextEditorHeadingLevel): TextEditorTool {
  const shown = level <= 3;
  return blockKindTool(
    `heading-${level}`,
    `heading${level}`,
    { kind: 'heading', attrs: { level } },
    `heading:${level}`,
    {
      surfaces: shown ? BLOCK_MENUS : [],
      ...(shown ? { shortcut: `Mod+Alt+${level}` } : {}),
      requires: 'block.heading',
      group: 'text',
      keywords: [`h${level}`],
      icon: HEADING_ICONS[level],
      description: `heading${level}Description`,
    },
  );
}

function listTool(
  id: string,
  label: 'bulletList' | 'orderedList' | 'taskList',
  kind: TextEditorListKind,
  shortcut: string,
  icon: IconDefinition,
): TextEditorTool {
  return blockKindTool(id, label, { kind }, kind, {
    surfaces: BLOCK_MENUS,
    shortcut,
    requires: `block.${kind}`,
    group: 'lists',
    icon,
    description: `${label}Description`,
  });
}

// Block actions (uwg-te-tab-tools-actions)

/** A block action on the targeted blocks, or `null` when no block is targeted. */
const onBlocks =
  (actions: (ids: readonly string[]) => readonly TextEditorAction[]) =>
  (context: TextEditorToolContext): readonly TextEditorAction[] | null => {
    const ids = targetBlockIds(context);
    return ids ? actions(ids) : null;
  };

/** The built-in tools by identifier. */
export const textEditorTools = Object.freeze({
  // Formatting tools
  undo: builtin({
    id: 'undo',
    kind: 'button',
    label: text('undo'),
    icon: undoIcon,
    group: 'history',
    surfaces: ['toolbar'],
    shortcut: 'Mod+Z',
    requires: ['history'],
    action: { type: 'history.undo' },
    isEnabled: ({ state }) => state.history.undo,
  }),
  redo: builtin({
    id: 'redo',
    kind: 'button',
    label: text('redo'),
    icon: redoIcon,
    group: 'history',
    surfaces: ['toolbar'],
    shortcut: PLATFORM === 'mac' ? 'Mod+Shift+Z' : ['Mod+Shift+Z', 'Ctrl+Y'],
    requires: ['history'],
    action: { type: 'history.redo' },
    isEnabled: ({ state }) => state.history.redo,
  }),
  bold: markTool('bold', 'Mod+B', BOTH_TOOLBARS, boldIcon),
  italic: markTool('italic', 'Mod+I', BOTH_TOOLBARS, italicIcon),
  underline: markTool('underline', 'Mod+U', BOTH_TOOLBARS, underlineIcon),
  strike: markTool('strike', 'Mod+Shift+S', BOTH_TOOLBARS, strikethroughIcon),
  code: markTool('code', 'Mod+E', BOTH_TOOLBARS, codeIcon),
  superscript: markTool('superscript', 'Mod+.', ['toolbar'], superscriptIcon),
  subscript: markTool('subscript', 'Mod+,', ['toolbar'], subscriptIcon),
  'clear-formatting': builtin({
    id: 'clear-formatting',
    kind: 'button',
    label: text('clearFormatting'),
    icon: removeFormattingIcon,
    group: 'format',
    surfaces: [],
    shortcut: 'Mod+\\',
    requires: ['mark.clear'],
    action: { type: 'mark.clear' },
  }),
  highlight: builtin({
    id: 'highlight',
    kind: 'color',
    label: text('highlight'),
    icon: highlighterIcon,
    group: 'format',
    channel: 'highlight',
    surfaces: ['toolbar'],
    // The shortcut applies yellow, an activation without a value.
    shortcut: 'Mod+Shift+H',
    requires: ['mark.highlight'],
    action: ({ value }) => [
      {
        type: 'mark.color',
        mark: 'highlight',
        color: paletteName(value === undefined ? 'yellow' : (value as TextEditorColorChoice)),
      },
    ],
  }),
  color: builtin({
    id: 'color',
    kind: 'color',
    label: text('color'),
    icon: baselineIcon,
    group: 'format',
    channel: ['text', 'highlight'],
    surfaces: ['selection-toolbar', 'block-menu'],
    requires: ['mark.text-color', 'mark.highlight'],
    action: ({ value }) => {
      if (value === undefined) return null;
      const { channel, color } = value as TextEditorColorToolValue;
      return [
        {
          type: 'mark.color',
          mark: channel === 'text' ? 'text-color' : 'highlight',
          color: paletteName(color),
        },
      ];
    },
  }),
  link: builtin({
    id: 'link',
    kind: 'link',
    label: text('link'),
    icon: linkIcon,
    group: 'format',
    surfaces: [...BOTH_TOOLBARS],
    shortcut: 'Mod+K',
    requires: ['link'],
    action: linkActions,
    isActive: ({ state }) => state.link !== null,
  }),
  align: builtin({
    id: 'align',
    kind: 'radio-menu',
    label: text('align'),
    icon: ALIGN_ICONS.start,
    display: 'inline',
    group: 'align',
    surfaces: ['toolbar'],
    requires: ['align'],
    items: [...ALIGN_ITEMS],
  }),
  'align-start': alignTool('align-start', 'start'),
  'align-center': alignTool('align-center', 'center'),
  'align-end': alignTool('align-end', 'end'),
  'align-justify': alignTool('align-justify', 'justify'),
  more: builtin({
    id: 'more',
    kind: 'menu',
    label: text('more'),
    icon: ellipsisVerticalIcon,
    group: 'format',
    surfaces: ['selection-toolbar'],
    items: [['superscript', 'subscript'], ['align'], ['clear-formatting']],
  }),

  // Block tools
  paragraph: blockKindTool('paragraph', 'paragraph', { kind: 'paragraph' }, 'paragraph', {
    surfaces: BLOCK_MENUS,
    shortcut: 'Mod+Alt+0',
    requires: 'block.paragraph',
    group: 'text',
    icon: pilcrowIcon,
    description: 'paragraphDescription',
  }),
  'heading-1': headingTool(1),
  'heading-2': headingTool(2),
  'heading-3': headingTool(3),
  'heading-4': headingTool(4),
  'heading-5': headingTool(5),
  'heading-6': headingTool(6),
  'bullet-list': listTool(
    'bullet-list',
    'bulletList',
    'list-bullet',
    'Mod+Shift+8',
    bulletListIcon,
  ),
  'ordered-list': listTool(
    'ordered-list',
    'orderedList',
    'list-ordered',
    'Mod+Shift+7',
    orderedListIcon,
  ),
  'task-list': listTool('task-list', 'taskList', 'list-task', 'Mod+Shift+9', taskListIcon),
  blockquote: blockKindTool('blockquote', 'blockquote', { kind: 'quote' }, 'quote', {
    surfaces: ['toolbar', ...BLOCK_MENUS],
    shortcut: 'Mod+Shift+B',
    requires: 'block.quote',
    group: 'text',
    icon: quoteIcon,
    description: 'blockquoteDescription',
  }),
  'code-block': blockKindTool('code-block', 'codeBlock', { kind: 'code' }, 'code', {
    surfaces: ['toolbar', ...BLOCK_MENUS],
    shortcut: 'Mod+Alt+C',
    requires: 'block.code',
    group: 'text',
    icon: codeBlockIcon,
    description: 'codeBlockDescription',
  }),
  divider: builtin({
    id: 'divider',
    kind: 'button',
    label: text('divider'),
    description: text('dividerDescription'),
    icon: minusIcon,
    group: 'insert',
    surfaces: ['slash'],
    keywords: ['hr'],
    requires: ['block.divider'],
    action: (context) => [insertBlock(context, 'divider')],
  }),
  'block-type': builtin({
    id: 'block-type',
    kind: 'radio-menu',
    label: text('blockType'),
    // The trigger shows the icon of the active item, and this one while no item is active.
    icon: pilcrowIcon,
    trigger: 'active-icon',
    group: 'text',
    surfaces: ['toolbar'],
    items: ['paragraph', 'heading-1', 'heading-2', 'heading-3'],
    isVisible: outsideTable,
  }),
  'list-type': builtin({
    id: 'list-type',
    kind: 'menu',
    label: text('listType'),
    icon: bulletListIcon,
    trigger: 'active-icon',
    group: 'lists',
    surfaces: ['toolbar'],
    items: ['bullet-list', 'ordered-list', 'task-list'],
    isVisible: outsideTable,
  }),
  'turn-into': builtin({
    id: 'turn-into',
    kind: 'radio-menu',
    label: text('turnInto'),
    trigger: 'active-label',
    group: 'text',
    surfaces: ['selection-toolbar', 'block-menu'],
    items: ({ layout }) => layout.turnInto,
    isVisible: outsideTable,
  }),

  // Insert and suggestion tools
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
  image: builtin({
    id: 'image',
    kind: 'image',
    label: text('image'),
    description: text('imageDescription'),
    icon: imageIcon,
    group: 'insert',
    surfaces: ['toolbar', 'slash'],
    requires: ['block.image'],
    action: (context) => {
      const value = context.value as TextEditorImageToolValue | undefined;
      if (value === undefined) return null;
      return [insertBlock(context, 'image', { src: value.src, alt: value.alt })];
    },
  }),
  slash: builtin({
    id: 'slash',
    kind: 'suggestion',
    label: text('slash'),
    surfaces: [],
    suggest: { trigger: '/' },
    items: ({ layout }) => layout.slash,
  }),

  // Block actions
  'duplicate-block': builtin({
    id: 'duplicate-block',
    kind: 'button',
    label: text('duplicateBlock'),
    icon: copyPlusIcon,
    group: 'block',
    surfaces: ['block-menu'],
    shortcut: 'Mod+D',
    requires: ['blocks.move'],
    action: onBlocks((ids) => [{ type: 'blocks.duplicate', ids }]),
  }),
  // Acts outside the document: its request carries no actions, and the widget copies the link
  // once the request is accepted.
  'copy-block-link': builtin({
    id: 'copy-block-link',
    kind: 'button',
    label: text('copyBlockLink'),
    icon: copyIcon,
    group: 'block',
    surfaces: ['block-menu'],
    action: [],
    isEnabled: (context) => targetBlockIds(context) !== null,
  }),
  // A move's destination comes from the block tree and the tree reorder projection, which the
  // tool context does not hold: these definitions carry the presentation, shortcut and
  // requirement, and resolve no action.
  'move-block-up': builtin({
    id: 'move-block-up',
    kind: 'button',
    label: text('moveBlockUp'),
    icon: arrowUpIcon,
    group: 'block',
    surfaces: ['block-menu'],
    shortcut: 'Mod+Shift+ArrowUp',
    requires: ['blocks.move'],
  }),
  'move-block-down': builtin({
    id: 'move-block-down',
    kind: 'button',
    label: text('moveBlockDown'),
    icon: arrowDownIcon,
    group: 'block',
    surfaces: ['block-menu'],
    shortcut: 'Mod+Shift+ArrowDown',
    requires: ['blocks.move'],
  }),
  'nest-block': builtin({
    id: 'nest-block',
    kind: 'button',
    label: text('nestBlock'),
    group: 'block',
    surfaces: [],
    shortcut: 'Mod+]',
    requires: ['blocks.nest'],
    action: (context) => [{ type: 'block.indent', ...targetIdsMember(context) }],
  }),
  'unnest-block': builtin({
    id: 'unnest-block',
    kind: 'button',
    label: text('unnestBlock'),
    group: 'block',
    surfaces: [],
    shortcut: 'Mod+[',
    requires: ['blocks.nest'],
    action: (context) => [{ type: 'block.outdent', ...targetIdsMember(context) }],
  }),
  // Opens the block menu, a surface, which the widget shows.
  'open-block-menu': builtin({
    id: 'open-block-menu',
    kind: 'button',
    label: text('openBlockMenu'),
    group: 'block',
    surfaces: [],
    shortcut: 'Mod+/',
  }),
  'delete-block': builtin({
    id: 'delete-block',
    kind: 'button',
    label: text('deleteBlock'),
    icon: trashIcon,
    tone: 'destructive',
    group: 'block',
    surfaces: ['block-menu'],
    requires: ['blocks.select'],
    action: onBlocks((ids) => [{ type: 'blocks.delete', ids }]),
  }),
  'toggle-task': builtin({
    id: 'toggle-task',
    kind: 'button',
    label: text('toggleTask'),
    group: 'block',
    surfaces: [],
    shortcut: 'Mod+Enter',
    requires: ['block.list-task'],
    action: ({ state }) => {
      const block = state.block;
      if (block?.kind !== 'list-task') return null;
      return [
        { type: 'block.set-attrs', id: block.id, attrs: { checked: block.attrs.checked !== true } },
      ];
    },
  }),

  // Table tools
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
} satisfies Readonly<Record<string, TextEditorTool>>);

/** The identifier of a built-in tool. */
export type TextEditorBuiltinToolId = keyof typeof textEditorTools;
