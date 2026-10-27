import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { imageProtocols, linkProtocols } from '../markdown/url.js';
import { textEditorBlockTools } from './builtin-tools/blocks.js';
import { textEditorCoreTools } from './builtin-tools/core.js';
import { BUILTIN_TOOL_FEATURES, type TextEditorToolFeature } from './builtin-tools/ids.js';
import { textEditorImageTools } from './builtin-tools/images.js';
import { textEditorTools } from './builtin-tools/index.js';
import { textEditorLinkTools } from './builtin-tools/links.js';
import { textEditorSuggestionTools } from './builtin-tools/suggestions.js';
import { textEditorTableTools } from './builtin-tools/tables.js';
import {
  BASE_CAPABILITIES,
  OPTIONAL_CAPABILITIES,
  type TextEditorCapability,
} from './capabilities.js';
import type { TextEditorEngineState, TextEditorTableModel } from './model.js';
import {
  defaultTextEditorLayout,
  resolveTextEditorLayout,
  type TextEditorLayout,
} from './layout.js';
import { defineTextEditorBlock, defineTextEditorInline } from './nodes.js';
import { textEditorStrings } from './strings.js';
import {
  checkToolValue,
  defineTextEditorTool,
  resolveTextEditorCapabilities,
  resolveTextEditorTools,
  resolveToolMember,
  toolActions,
  toolActive,
  toolEnabled,
  toolLabel,
  toolVisible,
  type TextEditorSurface,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolKind,
  type TextEditorToolRegistry,
} from './tools.js';

const MARKS_OFF = Object.freeze({
  bold: 'off',
  italic: 'off',
  underline: 'off',
  strike: 'off',
  code: 'off',
  superscript: 'off',
  subscript: 'off',
  textColor: null,
  highlight: null,
} as const);

function state(members: Partial<TextEditorEngineState> = {}): TextEditorEngineState {
  return {
    version: 1,
    contentVersion: 1,
    editable: true,
    focused: true,
    composing: false,
    empty: false,
    selection: { kind: 'none' },
    marks: MARKS_OFF,
    block: null,
    blockKinds: [],
    align: null,
    link: null,
    table: null,
    caret: null,
    emptyBlock: null,
    history: { undo: false, redo: false },
    ...members,
  };
}

function context(members: Partial<TextEditorToolContext> = {}): TextEditorToolContext {
  return {
    state: state(),
    imageUpload: true,
    strings: textEditorStrings,
    surface: 'api',
    target: { kind: 'selection' },
    direction: 'ltr',
    layout: defaultTextEditorLayout,
    table: null,
    ...members,
  };
}

/** A caret at the end of a paragraph `b1` holding `text`. */
const caretAfter = (text: string, members: Partial<TextEditorEngineState> = {}) =>
  state({
    selection: {
      kind: 'text',
      anchor: { block: 'b1', offset: text.length },
      head: { block: 'b1', offset: text.length },
      empty: true,
    },
    block: { id: 'b1', kind: 'paragraph', attrs: {}, depth: 0 },
    blockKinds: ['paragraph'],
    caret: { point: { block: 'b1', offset: text.length }, textBefore: text, inCode: false },
    ...members,
  });

const WITH_TABLES = new Set<TextEditorCapability>([...BASE_CAPABILITIES, ...OPTIONAL_CAPABILITIES]);
const URLS = { links: linkProtocols(null), images: imageProtocols(null) };

function registry(
  input: {
    tools?: readonly TextEditorTool[];
    nodes?: Parameters<typeof resolveTextEditorTools>[0]['nodes'];
    capabilities?: ReadonlySet<TextEditorCapability>;
  } = {},
): TextEditorToolRegistry {
  return resolveTextEditorTools({
    builtins: textEditorTools,
    capabilities: BASE_CAPABILITIES,
    ...input,
  });
}

const builtin = (id: string): TextEditorTool => {
  const tool = (textEditorTools as Readonly<Record<string, TextEditorTool>>)[id];
  if (!tool) throw new Error(`no built-in tool ${id}`);
  return tool;
};
const shortcuts = (tool: TextEditorTool): readonly string[] =>
  tool.shortcut === undefined
    ? []
    : typeof tool.shortcut === 'string'
      ? [tool.shortcut]
      : tool.shortcut;

/** The surface identities of `uwg-te-par-tools-1`. */
const SURFACES: readonly TextEditorSurface[] = [
  'toolbar',
  'selection-toolbar',
  'slash',
  'turn-into',
  'block-menu',
  'table-row',
  'table-column',
  'table-cell',
];

interface Row {
  /** The table row of the spec that gives the entry. */
  readonly row: string;
  readonly kind: TextEditorToolKind;
  readonly surfaces: readonly TextEditorSurface[];
  /** In the pattern syntax of the key-binding owner: `Mod+Shift+Up` is `Mod+Shift+ArrowUp`. */
  readonly shortcut: readonly string[];
  readonly requires: readonly TextEditorCapability[];
}

const NON_APPLE_REDO = ['Mod+Shift+Z', 'Ctrl+Y'];

/**
 * One entry per tool of `uwg-te-tab-tools`, `uwg-te-tab-tools-blocks`, `uwg-te-tab-tools-inserts`
 * and `uwg-te-tab-tools-actions`, transcribed from the spec cells.
 */
const TABLE_ROWS: Readonly<Record<string, Row>> = {
  undo: {
    row: 'tools-r1',
    kind: 'button',
    surfaces: ['toolbar'],
    shortcut: ['Mod+Z'],
    requires: ['history'],
  },
  redo: {
    row: 'tools-r1',
    kind: 'button',
    surfaces: ['toolbar'],
    shortcut: NON_APPLE_REDO,
    requires: ['history'],
  },
  bold: {
    row: 'tools-r2',
    kind: 'toggle',
    surfaces: ['toolbar', 'selection-toolbar'],
    shortcut: ['Mod+B'],
    requires: ['mark.bold'],
  },
  italic: {
    row: 'tools-r2',
    kind: 'toggle',
    surfaces: ['toolbar', 'selection-toolbar'],
    shortcut: ['Mod+I'],
    requires: ['mark.italic'],
  },
  underline: {
    row: 'tools-r2',
    kind: 'toggle',
    surfaces: ['toolbar', 'selection-toolbar'],
    shortcut: ['Mod+U'],
    requires: ['mark.underline'],
  },
  strike: {
    row: 'tools-r3',
    kind: 'toggle',
    surfaces: ['toolbar', 'selection-toolbar'],
    shortcut: ['Mod+Shift+S'],
    requires: ['mark.strike'],
  },
  code: {
    row: 'tools-r4',
    kind: 'toggle',
    surfaces: ['toolbar', 'selection-toolbar'],
    shortcut: ['Mod+E'],
    requires: ['mark.code'],
  },
  superscript: {
    row: 'tools-r5',
    kind: 'toggle',
    surfaces: ['toolbar'],
    shortcut: ['Mod+.'],
    requires: ['mark.superscript'],
  },
  subscript: {
    row: 'tools-r5',
    kind: 'toggle',
    surfaces: ['toolbar'],
    shortcut: ['Mod+,'],
    requires: ['mark.subscript'],
  },
  'clear-formatting': {
    row: 'tools-r6',
    kind: 'button',
    surfaces: [],
    shortcut: ['Mod+\\'],
    requires: ['mark.clear'],
  },
  highlight: {
    row: 'tools-r7',
    kind: 'color',
    surfaces: ['toolbar'],
    shortcut: ['Mod+Shift+H'],
    requires: ['mark.highlight'],
  },
  color: {
    row: 'tools-r8',
    kind: 'color',
    surfaces: ['selection-toolbar', 'block-menu'],
    shortcut: [],
    requires: ['mark.text-color', 'mark.highlight'],
  },
  link: {
    row: 'tools-r9',
    kind: 'link',
    surfaces: ['toolbar', 'selection-toolbar'],
    shortcut: ['Mod+K'],
    requires: ['link'],
  },
  align: {
    row: 'tools-r10',
    kind: 'radio-menu',
    surfaces: ['toolbar'],
    shortcut: [],
    requires: ['align'],
  },
  'align-start': {
    row: 'tools-r10',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['align'],
  },
  'align-center': {
    row: 'tools-r10',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['align'],
  },
  'align-end': {
    row: 'tools-r10',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['align'],
  },
  'align-justify': {
    row: 'tools-r10',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['align'],
  },
  more: {
    row: 'tools-r11',
    kind: 'menu',
    surfaces: ['selection-toolbar'],
    shortcut: [],
    requires: [],
  },
  paragraph: {
    row: 'tools-blocks-r1',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Alt+0'],
    requires: ['block.paragraph'],
  },
  'heading-1': {
    row: 'tools-blocks-r2',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Alt+1'],
    requires: ['block.heading'],
  },
  'heading-2': {
    row: 'tools-blocks-r2',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Alt+2'],
    requires: ['block.heading'],
  },
  'heading-3': {
    row: 'tools-blocks-r2',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Alt+3'],
    requires: ['block.heading'],
  },
  'heading-4': {
    row: 'tools-blocks-r2',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['block.heading'],
  },
  'heading-5': {
    row: 'tools-blocks-r2',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['block.heading'],
  },
  'heading-6': {
    row: 'tools-blocks-r2',
    kind: 'toggle',
    surfaces: [],
    shortcut: [],
    requires: ['block.heading'],
  },
  'bullet-list': {
    row: 'tools-blocks-r3',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Shift+8'],
    requires: ['block.list-bullet'],
  },
  'ordered-list': {
    row: 'tools-blocks-r3',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Shift+7'],
    requires: ['block.list-ordered'],
  },
  'task-list': {
    row: 'tools-blocks-r3',
    kind: 'toggle',
    surfaces: ['slash', 'turn-into'],
    shortcut: ['Mod+Shift+9'],
    requires: ['block.list-task'],
  },
  blockquote: {
    row: 'tools-blocks-r4',
    kind: 'toggle',
    surfaces: ['toolbar', 'slash', 'turn-into'],
    shortcut: ['Mod+Shift+B'],
    requires: ['block.quote'],
  },
  'code-block': {
    row: 'tools-blocks-r5',
    kind: 'toggle',
    surfaces: ['toolbar', 'slash', 'turn-into'],
    shortcut: ['Mod+Alt+C'],
    requires: ['block.code'],
  },
  divider: {
    row: 'tools-blocks-r6',
    kind: 'button',
    surfaces: ['slash'],
    shortcut: [],
    requires: ['block.divider'],
  },
  'block-type': {
    row: 'tools-blocks-r7',
    kind: 'radio-menu',
    surfaces: ['toolbar'],
    shortcut: [],
    requires: [],
  },
  'list-type': {
    row: 'tools-blocks-r8',
    kind: 'menu',
    surfaces: ['toolbar'],
    shortcut: [],
    requires: [],
  },
  'turn-into': {
    row: 'tools-blocks-r9',
    kind: 'radio-menu',
    surfaces: ['selection-toolbar', 'block-menu'],
    shortcut: [],
    requires: [],
  },
  table: {
    row: 'tools-inserts-r1',
    kind: 'table-size',
    surfaces: ['toolbar', 'slash'],
    shortcut: [],
    requires: ['block.table'],
  },
  image: {
    row: 'tools-inserts-r2',
    kind: 'image',
    surfaces: ['toolbar', 'slash'],
    shortcut: [],
    requires: ['block.image'],
  },
  slash: { row: 'tools-inserts-r3', kind: 'suggestion', surfaces: [], shortcut: [], requires: [] },
  'duplicate-block': {
    row: 'tools-actions-r1',
    kind: 'button',
    surfaces: ['block-menu'],
    shortcut: ['Mod+D'],
    requires: ['blocks.move'],
  },
  'copy-block-link': {
    row: 'tools-actions-r2',
    kind: 'button',
    surfaces: ['block-menu'],
    shortcut: [],
    requires: [],
  },
  'move-block-up': {
    row: 'tools-actions-r3',
    kind: 'button',
    surfaces: ['block-menu'],
    shortcut: ['Mod+Shift+ArrowUp'],
    requires: ['blocks.move'],
  },
  'move-block-down': {
    row: 'tools-actions-r3',
    kind: 'button',
    surfaces: ['block-menu'],
    shortcut: ['Mod+Shift+ArrowDown'],
    requires: ['blocks.move'],
  },
  'nest-block': {
    row: 'tools-actions-r4',
    kind: 'button',
    surfaces: [],
    shortcut: ['Mod+]'],
    requires: ['blocks.nest'],
  },
  'unnest-block': {
    row: 'tools-actions-r4',
    kind: 'button',
    surfaces: [],
    shortcut: ['Mod+['],
    requires: ['blocks.nest'],
  },
  'open-block-menu': {
    row: 'tools-actions-r5',
    kind: 'button',
    surfaces: [],
    shortcut: ['Mod+/'],
    requires: [],
  },
  'delete-block': {
    row: 'tools-actions-r6',
    kind: 'button',
    surfaces: ['block-menu'],
    shortcut: [],
    requires: ['blocks.select'],
  },
  'toggle-task': {
    row: 'tools-actions-r7',
    kind: 'button',
    surfaces: [],
    shortcut: ['Mod+Enter'],
    requires: ['block.list-task'],
  },
};

interface TableRow {
  readonly row: string;
  readonly kind: TextEditorToolKind;
  readonly surfaces: readonly TextEditorSurface[];
  readonly tone: 'default' | 'destructive';
  /** The capability of the Requires column. */
  readonly requires: TextEditorCapability;
}

/** One entry per tool of `uwg-te-tab-tools-tables` r1–r11. */
const TABLE_TOOL_ROWS: Readonly<Record<string, TableRow>> = {
  'table-insert-row-before': {
    row: 'r1',
    kind: 'button',
    surfaces: ['table-row'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-insert-row-after': {
    row: 'r1',
    kind: 'button',
    surfaces: ['table-row'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-insert-column-before': {
    row: 'r2',
    kind: 'button',
    surfaces: ['table-column'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-insert-column-after': {
    row: 'r2',
    kind: 'button',
    surfaces: ['table-column'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-move-row-up': {
    row: 'r3',
    kind: 'button',
    surfaces: ['table-row'],
    tone: 'default',
    requires: 'table.move',
  },
  'table-move-row-down': {
    row: 'r3',
    kind: 'button',
    surfaces: ['table-row'],
    tone: 'default',
    requires: 'table.move',
  },
  'table-move-column-before': {
    row: 'r4',
    kind: 'button',
    surfaces: ['table-column'],
    tone: 'default',
    requires: 'table.move',
  },
  'table-move-column-after': {
    row: 'r4',
    kind: 'button',
    surfaces: ['table-column'],
    tone: 'default',
    requires: 'table.move',
  },
  'table-duplicate-row': {
    row: 'r5',
    kind: 'button',
    surfaces: ['table-row'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-delete-row': {
    row: 'r5',
    kind: 'button',
    surfaces: ['table-row'],
    tone: 'destructive',
    requires: 'block.table',
  },
  'table-duplicate-column': {
    row: 'r6',
    kind: 'button',
    surfaces: ['table-column'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-delete-column': {
    row: 'r6',
    kind: 'button',
    surfaces: ['table-column'],
    tone: 'destructive',
    requires: 'block.table',
  },
  'table-toggle-header-row': {
    row: 'r7',
    kind: 'toggle',
    surfaces: ['table-row'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-toggle-header-column': {
    row: 'r7',
    kind: 'toggle',
    surfaces: ['table-column'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-merge-cells': {
    row: 'r8',
    kind: 'button',
    surfaces: ['table-cell'],
    tone: 'default',
    requires: 'table.merge',
  },
  'table-split-cell': {
    row: 'r8',
    kind: 'button',
    surfaces: ['table-cell'],
    tone: 'default',
    requires: 'table.merge',
  },
  'table-cell-align': {
    row: 'r9',
    kind: 'radio-menu',
    surfaces: ['table-row', 'table-column', 'table-cell'],
    tone: 'default',
    requires: 'block.table',
  },
  'cell-background': {
    row: 'r10',
    kind: 'color',
    surfaces: ['table-row', 'table-column', 'table-cell'],
    tone: 'default',
    requires: 'block.table',
  },
  'table-clear-cells': {
    row: 'r11',
    kind: 'button',
    surfaces: ['table-cell'],
    tone: 'default',
    requires: 'block.table',
  },
};

/** The Default column of `uwg-te-tab-layout` r1–r10, as the spec writes it. */
const LAYOUT_ROWS: Readonly<Record<keyof TextEditorLayout, string>> = {
  toolbar:
    'undo, redo; block-type, list-type, blockquote, code-block; bold, italic, strike, code, underline, highlight, link; superscript, subscript; align; table, image',
  selectionToolbar: 'turn-into; bold, italic, underline, strike, code; link; color; more',
  slash:
    'paragraph, heading-1, heading-2, heading-3, blockquote, code-block; bullet-list, ordered-list, task-list; table, image, divider; `*`',
  turnInto:
    'paragraph, heading-1, heading-2, heading-3, bullet-list, ordered-list, task-list, blockquote, code-block, `*`',
  blockMenu:
    'turn-into, color; duplicate-block, copy-block-link; move-block-up, move-block-down; `*`; delete-block',
  tableRow:
    'table-move-row-up, table-move-row-down; table-insert-row-before, table-insert-row-after; cell-background, table-cell-align; table-toggle-header-row; table-duplicate-row, table-delete-row',
  tableColumn:
    'table-move-column-before, table-move-column-after; table-insert-column-before, table-insert-column-after; cell-background, table-cell-align; table-toggle-header-column; table-duplicate-column, table-delete-column',
  tableCell:
    'table-merge-cells, table-split-cell; cell-background, table-cell-align; table-clear-cells',
  suggestions: 'slash',
  gutter: 'true',
};

/** Semicolons separate the groups and commas the identifiers; `*` is quoted as code. */
const parseGroups = (cell: string) =>
  cell.split('; ').map((group) => group.split(', ').map((id) => id.replaceAll('`', '')));

const isCapability = (id: TextEditorCapability) =>
  BASE_CAPABILITIES.has(id) ||
  OPTIONAL_CAPABILITIES.has(id) ||
  /^(?:block|inline)\.[a-z][a-z0-9-]*$/u.test(id);

describe('built-in tools (uwg-te-par-tools-1)', () => {
  it('V-155: every built-in matches its table row', () => {
    const tables = { ...TABLE_ROWS, ...TABLE_TOOL_ROWS };
    expect(Object.keys(textEditorTools).sort()).toEqual(Object.keys(tables).sort());
    expect(Object.keys(textEditorTools)).toHaveLength(66);
    const redo =
      keyHintPlatform('auto', globalThis.navigator) === 'mac' ? ['Mod+Shift+Z'] : NON_APPLE_REDO;
    for (const [id, row] of Object.entries(TABLE_ROWS)) {
      const tool = builtin(id);
      expect(tool.id, id).toBe(id);
      expect(tool.kind, `${id} kind (${row.row})`).toBe(row.kind);
      expect(tool.surfaces ?? [], `${id} surfaces (${row.row})`).toEqual(row.surfaces);
      expect(shortcuts(tool), `${id} shortcut (${row.row})`).toEqual(
        id === 'redo' ? redo : row.shortcut,
      );
      expect(tool.requires ?? [], `${id} requires (${row.row})`).toEqual(row.requires);
    }
    // Every built-in: surfaces only from the eight identities, requires only capability ids,
    // and a label from the strings.
    for (const tool of Object.values(textEditorTools) as TextEditorTool[]) {
      for (const surface of tool.surfaces ?? []) expect(SURFACES, tool.id).toContain(surface);
      for (const capability of tool.requires ?? [])
        expect(isCapability(capability), capability).toBe(true);
      const label = typeof tool.label === 'function' ? tool.label(context()) : tool.label;
      expect(label, tool.id).toMatch(/\S/u);
    }
  });

  it('V-155: the members the tables state beyond the columns', () => {
    expect(builtin('highlight').channel).toBe('highlight');
    expect(builtin('color').channel).toEqual(['text', 'highlight']);
    expect(builtin('cell-background').channel).toBe('background');
    expect(builtin('align').display).toBe('inline');
    expect(builtin('align').items).toEqual([
      'align-start',
      'align-center',
      'align-end',
      'align-justify',
    ]);
    expect(builtin('more').items).toEqual([
      ['superscript', 'subscript'],
      ['align'],
      ['clear-formatting'],
    ]);
    expect(builtin('block-type').items).toEqual([
      'paragraph',
      'heading-1',
      'heading-2',
      'heading-3',
    ]);
    expect(builtin('block-type').trigger).toBe('active-icon');
    expect(builtin('list-type').items).toEqual(['bullet-list', 'ordered-list', 'task-list']);
    expect(builtin('list-type').trigger).toBe('active-icon');
    expect(builtin('turn-into').trigger).toBe('active-label');
    expect(builtin('delete-block').tone).toBe('destructive');
    expect(builtin('slash').suggest?.trigger).toBe('/');
    // The turn-into and slash items are their layouts.
    const custom: TextEditorLayout = {
      ...defaultTextEditorLayout,
      turnInto: [['paragraph', 'callout']],
      slash: [['divider'], ['image']],
    };
    const items = (id: string) => {
      const tool = builtin(id);
      return typeof tool.items === 'function'
        ? tool.items(context({ layout: custom }))
        : tool.items;
    };
    expect(items('turn-into')).toEqual([['paragraph', 'callout']]);
    expect(items('slash')).toEqual([['divider'], ['image']]);
  });

  it('V-155: defineTextEditorTool returns its argument; the built-ins and layouts are frozen', () => {
    const share = {
      id: 'share-block',
      kind: 'button',
      label: 'Share',
      surfaces: ['block-menu'],
    } as const;
    expect(defineTextEditorTool(share)).toBe(share);
    expect(Object.isFrozen(share)).toBe(false);

    expect(Object.isFrozen(textEditorTools)).toBe(true);
    for (const tool of Object.values(textEditorTools) as TextEditorTool[]) {
      expect(Object.isFrozen(tool), tool.id).toBe(true);
      for (const member of [tool.surfaces, tool.requires, tool.keywords, tool.suggest])
        if (member !== undefined) expect(Object.isFrozen(member), tool.id).toBe(true);
      for (const member of [tool.shortcut, tool.channel, tool.items, tool.action])
        if (typeof member === 'object') expect(Object.isFrozen(member), tool.id).toBe(true);
      if (Array.isArray(tool.items))
        for (const item of tool.items) expect(Object.isFrozen(item), tool.id).toBe(true);
      if (typeof tool.action === 'object' && Array.isArray(tool.action))
        for (const action of tool.action) expect(Object.isFrozen(action), tool.id).toBe(true);
    }
    expect(() => {
      (textEditorTools as unknown as Record<string, unknown>).bold = null;
    }).toThrow(TypeError);

    expect(Object.isFrozen(defaultTextEditorLayout)).toBe(true);
    expect(Object.isFrozen(defaultTextEditorLayout.suggestions)).toBe(true);
    for (const value of Object.values(defaultTextEditorLayout))
      if (Array.isArray(value)) {
        expect(Object.isFrozen(value)).toBe(true);
        for (const group of value) expect(Object.isFrozen(group)).toBe(true);
      }
  });

  it('V-443: table tools match uwg-te-tab-tools-tables', () => {
    for (const [id, row] of Object.entries(TABLE_TOOL_ROWS)) {
      const tool = builtin(id);
      expect(tool.id, id).toBe(id);
      expect(tool.kind, `${id} kind (${row.row})`).toBe(row.kind);
      expect(tool.surfaces, `${id} surfaces (${row.row})`).toEqual(row.surfaces);
      expect(tool.tone ?? 'default', `${id} tone (${row.row})`).toBe(row.tone);
      expect(tool.requires, `${id} requires (${row.row})`).toContain(row.requires);
      // Every table tool needs tables, whatever further capability its row names.
      expect(tool.requires, id).toContain('block.table');
      expect(tool.shortcut, `${id} shortcut`).toBeUndefined();
    }
    expect(builtin('table-cell-align').items).toEqual([
      'align-start',
      'align-center',
      'align-end',
      'align-justify',
    ]);
    for (const key of ['tableRow', 'tableColumn', 'tableCell'] as const)
      expect(defaultTextEditorLayout[key], key).toEqual(parseGroups(LAYOUT_ROWS[key]));

    const tableTools = Object.keys(TABLE_TOOL_ROWS);
    const available = (capabilities: Iterable<TextEditorCapability>) => {
      const tools = registry({ capabilities: new Set(capabilities) });
      return tableTools.filter((id) => tools.isAvailable(id));
    };
    expect(available(BASE_CAPABILITIES)).toEqual([]);
    expect(available([...BASE_CAPABILITIES, 'table.merge', 'table.move'])).toEqual([]);
    const moves = [
      'table-move-row-up',
      'table-move-row-down',
      'table-move-column-before',
      'table-move-column-after',
    ];
    const merges = ['table-merge-cells', 'table-split-cell'];
    expect(available([...BASE_CAPABILITIES, 'block.table'])).toEqual(
      tableTools.filter((id) => !moves.includes(id) && !merges.includes(id)),
    );
    expect(available([...BASE_CAPABILITIES, 'block.table', 'table.move'])).toEqual(
      tableTools.filter((id) => !merges.includes(id)),
    );
    expect(available([...BASE_CAPABILITIES, 'block.table', 'table.merge'])).toEqual(
      tableTools.filter((id) => !moves.includes(id)),
    );
    expect(available(WITH_TABLES)).toEqual(tableTools);
  });
});

describe('built-in tools on each platform (uwg-te-par-tools-1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('V-155: redo lists Ctrl+Y only outside Apple platforms', async () => {
    const platforms: [Pick<Navigator, 'platform' | 'userAgent'> | undefined, readonly string[]][] =
      [
        [
          { platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' },
          ['Mod+Shift+Z'],
        ],
        [
          { platform: 'iPad', userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' },
          ['Mod+Shift+Z'],
        ],
        [
          { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          NON_APPLE_REDO,
        ],
        [
          { platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
          NON_APPLE_REDO,
        ],
        [undefined, NON_APPLE_REDO],
      ];
    for (const [navigator, redo] of platforms) {
      vi.stubGlobal('navigator', navigator);
      vi.resetModules();
      const { textEditorCoreTools: tools } = await import('./builtin-tools/core.js');
      expect(shortcuts(tools.redo), navigator?.platform ?? 'no navigator').toEqual(redo);
      expect(shortcuts(tools.undo)).toEqual(['Mod+Z']);
    }
  });
});

/**
 * The icon of each built-in tool in a left-to-right editor, or `undefined` for a tool that no
 * surface shows as a control or a menu item with an icon.
 */
const TOOL_ICONS: Readonly<Record<string, IconDefinition | undefined>> = {
  undo: undoIcon,
  redo: redoIcon,
  bold: boldIcon,
  italic: italicIcon,
  underline: underlineIcon,
  strike: strikethroughIcon,
  code: codeIcon,
  superscript: superscriptIcon,
  subscript: subscriptIcon,
  'clear-formatting': removeFormattingIcon,
  highlight: highlighterIcon,
  color: baselineIcon,
  link: linkIcon,
  align: textAlignLeftIcon,
  'align-start': textAlignLeftIcon,
  'align-center': textAlignCenterIcon,
  'align-end': textAlignRightIcon,
  'align-justify': textAlignJustifyIcon,
  more: ellipsisVerticalIcon,
  paragraph: pilcrowIcon,
  'heading-1': heading1Icon,
  'heading-2': heading2Icon,
  'heading-3': heading3Icon,
  'heading-4': undefined,
  'heading-5': undefined,
  'heading-6': undefined,
  'bullet-list': bulletListIcon,
  'ordered-list': orderedListIcon,
  'task-list': taskListIcon,
  blockquote: quoteIcon,
  'code-block': codeBlockIcon,
  divider: minusIcon,
  'block-type': pilcrowIcon,
  'list-type': bulletListIcon,
  'turn-into': undefined,
  table: tableIcon,
  image: imageIcon,
  slash: undefined,
  'duplicate-block': copyPlusIcon,
  'copy-block-link': copyIcon,
  'move-block-up': arrowUpIcon,
  'move-block-down': arrowDownIcon,
  'nest-block': undefined,
  'unnest-block': undefined,
  'open-block-menu': undefined,
  'delete-block': trashIcon,
  'toggle-task': undefined,
  'table-insert-row-before': insertRowAboveIcon,
  'table-insert-row-after': insertRowBelowIcon,
  'table-insert-column-before': insertColumnLeftIcon,
  'table-insert-column-after': insertColumnRightIcon,
  'table-move-row-up': arrowUpIcon,
  'table-move-row-down': arrowDownIcon,
  'table-move-column-before': arrowLeftIcon,
  'table-move-column-after': arrowRightIcon,
  'table-duplicate-row': copyPlusIcon,
  'table-delete-row': trashIcon,
  'table-duplicate-column': copyPlusIcon,
  'table-delete-column': trashIcon,
  'table-toggle-header-row': headerRowIcon,
  'table-toggle-header-column': headerColumnIcon,
  'table-merge-cells': mergeCellsIcon,
  'table-split-cell': splitCellIcon,
  'table-cell-align': textAlignLeftIcon,
  'cell-background': paintBucketIcon,
  'table-clear-cells': clearCellsIcon,
};

describe('built-in tool icons (uwg-te-par-tools-1, uwg-te-req-ana-1)', () => {
  it('built-in tools carry the icon of their control or menu item (uwg-te-par-tools-1, uwg-te-req-ana-1)', () => {
    expect(Object.keys(TOOL_ICONS)).toEqual(Object.keys(textEditorTools));
    for (const [id, icon] of Object.entries(TOOL_ICONS))
      expect(resolveToolMember(builtin(id).icon, context()), id).toBe(icon);
  });

  it('an icon that shows a side follows the editor direction, as its label does (uwg-te-par-tools-1)', () => {
    const strings = textEditorStrings;
    const iconOfLabel = new Map<string, IconDefinition>([
      [strings.alignLeft, textAlignLeftIcon],
      [strings.alignRight, textAlignRightIcon],
      [strings.tableInsertColumnLeft, insertColumnLeftIcon],
      [strings.tableInsertColumnRight, insertColumnRightIcon],
      [strings.tableMoveColumnLeft, arrowLeftIcon],
      [strings.tableMoveColumnRight, arrowRightIcon],
    ]);
    const labelled = [
      'align-start',
      'align-end',
      'table-insert-column-before',
      'table-insert-column-after',
      'table-move-column-before',
      'table-move-column-after',
    ];
    const menus = ['align', 'table-cell-align'];
    const icon = (id: string, direction: 'ltr' | 'rtl') =>
      resolveToolMember(builtin(id).icon, context({ direction }));
    for (const direction of ['ltr', 'rtl'] as const) {
      for (const id of labelled) {
        const label = toolLabel(builtin(id), context({ direction }));
        expect(iconOfLabel.has(label), `${id} ${direction}: ${label}`).toBe(true);
        expect(icon(id, direction), `${id} ${direction}`).toBe(iconOfLabel.get(label));
      }
      // A menu of alignments shows the start alignment of the direction.
      for (const id of menus)
        expect(icon(id, direction), `${id} ${direction}`).toBe(icon('align-start', direction));
      // Its label names no side, so the header column keeps one icon.
      expect(icon('table-toggle-header-column', direction)).toBe(headerColumnIcon);
    }
    for (const id of [...labelled, ...menus]) expect(icon(id, 'rtl'), id).not.toBe(icon(id, 'ltr'));
  });
});

describe('default layouts (uwg-te-tab-layout, uwg-te-par-tools-2)', () => {
  it('V-181: deep-equals the ten rows', () => {
    const keys = Object.keys(LAYOUT_ROWS) as (keyof TextEditorLayout)[];
    expect(Object.keys(defaultTextEditorLayout)).toEqual(keys);
    for (const key of keys) {
      if (key === 'suggestions') expect(defaultTextEditorLayout.suggestions).toEqual(['slash']);
      else if (key === 'gutter') expect(defaultTextEditorLayout.gutter).toBe(true);
      else expect(defaultTextEditorLayout[key], key).toEqual(parseGroups(LAYOUT_ROWS[key]));
    }
  });

  it('every identifier of the default layouts is a built-in tool or `*`', () => {
    for (const [key, value] of Object.entries(defaultTextEditorLayout))
      if (Array.isArray(value))
        for (const id of (value as readonly (string | readonly string[])[]).flat())
          expect(id === '*' || Object.hasOwn(textEditorTools, id), `${key}: ${id}`).toBe(true);
  });

  it('resolves to the default with the base capabilities, leaving the tables out silently', () => {
    const { layout, diagnostics } = resolveTextEditorLayout(undefined, registry());
    expect(diagnostics).toEqual([]);
    expect(layout.toolbar.at(-1)).toEqual(['image']);
    expect(layout.slash).toEqual([
      ['paragraph', 'heading-1', 'heading-2', 'heading-3', 'blockquote', 'code-block'],
      ['bullet-list', 'ordered-list', 'task-list'],
      ['image', 'divider'],
    ]);
    expect(layout.tableRow).toEqual([]);
    expect(layout.tableColumn).toEqual([]);
    expect(layout.tableCell).toEqual([]);
    expect(layout.blockMenu).toEqual([
      ['turn-into', 'color'],
      ['duplicate-block', 'copy-block-link'],
      ['move-block-up', 'move-block-down'],
      ['delete-block'],
    ]);
    expect(layout.suggestions).toEqual(['slash']);
    expect(layout.gutter).toBe(true);

    const tables = resolveTextEditorLayout(undefined, registry({ capabilities: WITH_TABLES }));
    expect(tables.diagnostics).toEqual([]);
    for (const key of [
      'toolbar',
      'selectionToolbar',
      'tableRow',
      'tableColumn',
      'tableCell',
    ] as const)
      expect(tables.layout[key], key).toEqual(defaultTextEditorLayout[key]);
    // `*` adds nothing when every tool of the surface is listed.
    expect(tables.layout.turnInto).toEqual([
      defaultTextEditorLayout.turnInto[0]!.filter((id) => id !== '*'),
    ]);
    expect(tables.layout.slash).toEqual(defaultTextEditorLayout.slash.slice(0, 3));
    expect(Object.isFrozen(tables.layout)).toBe(true);
    expect(Object.isFrozen(tables.layout.toolbar)).toBe(true);
    expect(Object.isFrozen(tables.layout.toolbar[0])).toBe(true);
  });
});

/** Custom nodes of each kind, local to the tests. */
const callout = defineTextEditorBlock({
  name: 'callout',
  content: 'inline',
  element: 'aside',
  attrs: { tone: { type: 'enum', values: ['note', 'tip'], default: 'note' } },
  tool: { label: 'Callout', keywords: ['aside'] },
});
const embed = defineTextEditorBlock({
  name: 'embed',
  content: 'none',
  element: 'figure',
  attrs: { url: { type: 'string', default: null } },
  tool: { label: 'Embed' },
});
const tag = defineTextEditorInline({
  name: 'tag',
  element: 'span',
  attrs: { label: { type: 'string', default: 'tag' } },
  text: (attrs) => `#${attrs.label ?? ''}`,
  tool: { label: 'Tag' },
});
interface Person {
  readonly id: string;
  readonly name: string;
}
const crew: readonly Person[] = [
  { id: 'p1', name: 'Mara Quill' },
  { id: 'p2', name: 'Ostin Reef' },
];
const mention = defineTextEditorInline({
  name: 'mention',
  element: 'span',
  attrs: { id: { type: 'string', default: null }, label: { type: 'string', default: null } },
  text: (attrs) => `@${attrs.label ?? ''}`,
  suggest: {
    trigger: '@',
    source: ({ query }) => crew.filter((person) => person.name.toLowerCase().includes(query)),
    label: (person: Person) => person.name,
    description: (person: Person) => person.id,
    attrs: (person: Person) => ({ id: person.id, label: person.name }),
  },
});
const NODES = [callout, embed, tag, mention];
const allNodes = { capabilities: new Set(BASE_CAPABILITIES), supportsNode: () => true };

describe('tool registry (uwg-te-req-tools-1, uwg-te-req-tools-2)', () => {
  it('V-177: an application tool replaces the built-in with its identifier, in place', () => {
    const strike = { ...builtin('strike'), shortcut: 'Mod+Shift+X' };
    const tools = registry({ tools: [strike] });
    expect(tools.tools.get('strike')).toBe(strike);
    expect(tools.order).toEqual(Object.keys(textEditorTools));
    expect(tools.diagnostics).toEqual([]);
  });

  it('V-177: the last duplicate wins with one diagnostic', () => {
    const share = (label: string): TextEditorTool => ({
      id: 'share-block',
      kind: 'button',
      label,
      surfaces: ['block-menu'],
      action: [],
    });
    const [first, second, third] = [share('One'), share('Two'), share('Three')];
    const tools = registry({ tools: [first, builtin('bold'), second, third] });
    expect(tools.tools.get('share-block')).toBe(third);
    expect(tools.order.indexOf('share-block')).toBe(Object.keys(textEditorTools).length);
    expect(tools.diagnostics).toEqual([
      { code: 'text-editor-tool-duplicate', message: expect.stringContaining('"share-block"') },
    ]);
    // Replacing a built-in once is no duplicate.
    expect(registry({ tools: [first] }).diagnostics).toEqual([]);
  });

  it('V-177: add, remove and reorder groups; an empty list turns a surface off', () => {
    const share: TextEditorTool = {
      id: 'share-block',
      kind: 'button',
      label: 'Share',
      surfaces: ['block-menu', 'toolbar'],
      action: [],
    };
    const tools = registry({ tools: [share] });
    const { layout, diagnostics } = resolveTextEditorLayout(
      {
        toolbar: [['redo', 'undo'], ['share-block', 'bold'], [], ['italic']],
        selectionToolbar: [],
      },
      tools,
    );
    expect(diagnostics).toEqual([]);
    expect(layout.toolbar).toEqual([['redo', 'undo'], ['share-block', 'bold'], ['italic']]);
    expect(layout.selectionToolbar).toEqual([]);
    // Keys left out keep their defaults; the application's block tool reaches the block menu
    // through `*`.
    expect(layout.turnInto).toEqual([
      defaultTextEditorLayout.turnInto[0]!.filter((id) => id !== '*'),
    ]);
    expect(layout.blockMenu).toEqual([
      ['turn-into', 'color'],
      ['duplicate-block', 'copy-block-link'],
      ['move-block-up', 'move-block-down'],
      ['share-block'],
      ['delete-block'],
    ]);
  });

  it('V-177: `*` adds the remaining tools of the surface by group, never a suggestion tool', () => {
    const custom = (id: string, group?: string): TextEditorTool => ({
      id,
      kind: 'button',
      label: id,
      surfaces: ['slash', 'turn-into'],
      ...(group ? { group } : {}),
      action: [],
    });
    const hashtag: TextEditorTool = {
      id: 'hashtag',
      kind: 'suggestion',
      label: 'Hashtags',
      surfaces: ['slash'],
      suggest: { trigger: '#' },
      source: () => [],
    };
    const tools = registry({
      tools: [
        custom('chart', 'media'),
        custom('poll', 'forms'),
        custom('video', 'media'),
        custom('stamp'),
        custom('quiz', 'forms'),
        hashtag,
      ],
    });
    const { layout, diagnostics } = resolveTextEditorLayout(undefined, tools);
    expect(diagnostics).toEqual([]);
    expect(layout.slash.slice(3)).toEqual([['chart', 'video'], ['poll', 'quiz'], ['stamp']]);
    // Among other identifiers `*` inserts the tools in place, in registration order.
    expect(layout.turnInto).toEqual([
      [
        ...defaultTextEditorLayout.turnInto[0]!.filter((id) => id !== '*'),
        'chart',
        'poll',
        'video',
        'stamp',
        'quiz',
      ],
    ]);
    // A tool listed elsewhere in the surface is not added again, and `*` expands once.
    const listed = resolveTextEditorLayout(
      { slash: [['poll', 'paragraph'], ['*'], ['divider', '*']] },
      tools,
    ).layout;
    expect(listed.slash).toEqual([
      ['poll', 'paragraph'],
      ['heading-1', 'heading-2', 'heading-3', 'blockquote', 'code-block'],
      ['bullet-list', 'ordered-list', 'task-list'],
      ['image'],
      ['chart', 'video'],
      ['quiz'],
      ['stamp'],
      ['divider'],
    ]);
    expect(listed.slash.flat()).not.toContain('hashtag');
  });

  it('V-177: an unknown identifier, or a suggestion tool on a surface, is skipped with a diagnostic', () => {
    const { layout, diagnostics } = resolveTextEditorLayout(
      { toolbar: [['bold', 'sparkle'], ['slash']], suggestions: ['slash', 'bold', 'ghost'] },
      registry(),
    );
    expect(layout.toolbar).toEqual([['bold']]);
    expect(layout.suggestions).toEqual(['slash']);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'text-editor-layout-unknown',
      'text-editor-layout-unknown',
      'text-editor-layout-unknown',
      'text-editor-layout-unknown',
    ]);
    expect(diagnostics[0]!.message).toContain('"sparkle"');
    expect(diagnostics[1]!.message).toContain('"slash"');
    expect(diagnostics[2]!.message).toContain('"bold"');
    expect(diagnostics[3]!.message).toContain('"ghost"');
    // A member that is no identifier is skipped as an unknown one.
    const odd = resolveTextEditorLayout(
      { toolbar: [['bold', 7 as unknown as string]], suggestions: [null as unknown as string] },
      registry(),
    );
    expect(odd.layout.toolbar).toEqual([['bold']]);
    expect(odd.layout.suggestions).toEqual([]);
    expect(odd.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'text-editor-layout-unknown',
      'text-editor-layout-unknown',
    ]);
  });

  it('V-177: tools needing absent capabilities are unavailable, reported only when placed explicitly', () => {
    const tools = registry();
    expect(tools.isAvailable('table')).toBe(false);
    expect(tools.isAvailable('table-merge-cells')).toBe(false);
    expect(tools.isAvailable('bold')).toBe(true);
    expect(tools.isAvailable('sparkle')).toBe(false);
    // The default layout places `table` without a report.
    expect(resolveTextEditorLayout(undefined, tools).diagnostics).toEqual([]);
    const placed = resolveTextEditorLayout(
      { toolbar: [['bold', 'table']], slash: [['table', 'divider']] },
      tools,
    );
    expect(placed.layout.toolbar).toEqual([['bold']]);
    expect(placed.layout.slash).toEqual([['divider']]);
    expect(placed.diagnostics).toEqual([
      { code: 'text-editor-tool-unavailable', message: expect.stringContaining('"table"') },
    ]);
  });

  it('V-177: with no engine the base set applies; an engine only adds tools', () => {
    expect(resolveTextEditorCapabilities(null)).toBe(BASE_CAPABILITIES);
    expect(resolveTextEditorCapabilities(undefined, NODES)).toBe(BASE_CAPABILITIES);
    const engine = { capabilities: WITH_TABLES, supportsNode: () => false };
    expect(resolveTextEditorCapabilities(engine, NODES)).toBe(WITH_TABLES);
    const base = registry({
      capabilities: resolveTextEditorCapabilities(null, NODES),
      nodes: NODES,
    });
    const assigned = registry({
      capabilities: resolveTextEditorCapabilities(engine, NODES),
      nodes: NODES,
    });
    const ids = (tools: TextEditorToolRegistry) =>
      tools.order.filter((id) => tools.isAvailable(id));
    expect(ids(base).every((id) => assigned.isAvailable(id))).toBe(true);
    expect(ids(assigned).length).toBeGreaterThan(ids(base).length);
    for (const node of NODES) expect(base.isAvailable(node.name), node.name).toBe(false);
  });

  it('V-177: derived node tools by kind, available exactly when the engine supports the node', () => {
    const engine = { ...allNodes, supportsNode: (node: { name: string }) => node.name !== 'embed' };
    const capabilities = resolveTextEditorCapabilities(engine, NODES);
    expect([...capabilities].filter((id) => !BASE_CAPABILITIES.has(id))).toEqual([
      'block.callout',
      'inline.tag',
      'inline.mention',
    ]);
    const tools = registry({ capabilities, nodes: NODES });
    const shape = (id: string) => {
      const tool = tools.tools.get(id)!;
      return {
        kind: tool.kind,
        surfaces: tool.surfaces,
        requires: tool.requires,
        label: tool.label,
      };
    };
    expect(shape('callout')).toEqual({
      kind: 'toggle',
      surfaces: ['slash', 'turn-into'],
      requires: ['block.callout'],
      label: 'Callout',
    });
    expect(tools.tools.get('callout')!.keywords).toEqual(['aside']);
    expect(shape('embed')).toEqual({
      kind: 'button',
      surfaces: ['slash'],
      requires: ['block.embed'],
      label: 'Embed',
    });
    expect(shape('tag')).toEqual({
      kind: 'button',
      surfaces: ['slash'],
      requires: ['inline.tag'],
      label: 'Tag',
    });
    expect(shape('mention')).toEqual({
      kind: 'suggestion',
      surfaces: [],
      requires: ['inline.mention'],
      label: 'mention',
    });
    expect(tools.order.slice(-4)).toEqual(['callout', 'embed', 'tag', 'mention']);
    expect(tools.isAvailable('embed')).toBe(false);

    const { layout } = resolveTextEditorLayout(undefined, tools);
    expect(layout.slash.at(-1)).toEqual(['callout', 'tag']);
    expect(layout.turnInto[0]!.at(-1)).toBe('callout');
    expect(layout.blockMenu.flat()).not.toContain('callout');

    // A textblock turns the selection into its kind, and back into paragraphs when it has it.
    const textblock = tools.tools.get('callout')!;
    expect(toolActions(textblock, context({ state: caretAfter('Tide') }), tools)).toEqual([
      { type: 'block.set-type', kind: 'callout' },
    ]);
    const inCallout = context({ state: caretAfter('Tide', { blockKinds: ['callout'] }) });
    expect(toolActive(textblock, inCallout)).toBe(true);
    expect(toolActions(textblock, inCallout, tools)).toEqual([
      { type: 'block.set-type', kind: 'paragraph' },
    ]);
    expect(
      toolVisible(textblock, context({ state: caretAfter('a', { table: tableState() }) })),
    ).toBe(false);
    // An atom inserts its block, an inline node inserts itself with its defaults.
    expect(toolActions(tools.tools.get('embed')!, context(), tools)).toEqual([
      { type: 'blocks.insert', kind: 'embed' },
    ]);
    expect(toolActions(tools.tools.get('tag')!, context(), tools)).toEqual([
      { type: 'inline.insert', kind: 'tag', attrs: { label: 'tag' } },
    ]);
  });

  it('V-177: enablement follows ready, disabled, editable and can', () => {
    const tools = registry({ capabilities: WITH_TABLES });
    const input = {
      ready: true,
      disabled: false,
      editable: true,
      registry: tools,
      can: () => true,
    };
    const bold = builtin('bold');
    const at = context({ state: caretAfter('Tide') });
    expect(toolEnabled(bold, at, input)).toBe(true);
    expect(toolEnabled(bold, at, { ...input, ready: false })).toBe(false);
    expect(toolEnabled(bold, at, { ...input, disabled: true })).toBe(false);
    expect(toolEnabled(bold, at, { ...input, editable: false })).toBe(false);
    expect(toolEnabled(bold, at, { ...input, can: () => false })).toBe(false);
    const seen: unknown[] = [];
    toolEnabled(bold, at, { ...input, can: (action) => (seen.push(action), true) });
    expect(seen).toEqual([{ type: 'mark.toggle', mark: 'bold' }]);
    // A tool acting outside the document stays enabled while read-only; a menu opens either way.
    const link = builtin('copy-block-link');
    expect(toolEnabled(link, at, { ...input, editable: false })).toBe(true);
    expect(toolEnabled(link, context(), input)).toBe(false);
    expect(toolEnabled(builtin('more'), at, { ...input, editable: false })).toBe(true);
    expect(toolEnabled(builtin('more'), at, { ...input, disabled: true })).toBe(false);
    // Tools that take a value change the document.
    expect(toolEnabled(builtin('link'), at, input)).toBe(true);
    expect(toolEnabled(builtin('link'), at, { ...input, editable: false })).toBe(false);
    // Once a value resolves such a tool to actions, can must accept them; without one, nothing
    // resolves but the highlight's yellow.
    const sized = context({ state: caretAfter('Tide'), value: { rows: 2, columns: 3 } });
    expect(toolEnabled(builtin('table'), sized, input)).toBe(true);
    expect(toolEnabled(builtin('table'), sized, { ...input, can: () => false })).toBe(false);
    expect(toolEnabled(builtin('table'), at, { ...input, can: () => false })).toBe(true);
    const yellow: unknown[] = [];
    toolEnabled(builtin('highlight'), at, {
      ...input,
      can: (action) => (yellow.push(action), true),
    });
    expect(yellow).toEqual([{ type: 'mark.color', mark: 'highlight', color: 'yellow' }]);
    expect(toolEnabled(builtin('highlight'), at, { ...input, can: () => false })).toBe(false);
    // isEnabled refines: undo needs history.
    expect(toolEnabled(builtin('undo'), at, input)).toBe(false);
    const undoable = context({
      state: caretAfter('Tide', { history: { undo: true, redo: false } }),
    });
    expect(toolEnabled(builtin('undo'), undoable, input)).toBe(true);
    // An unavailable tool is never enabled.
    expect(toolEnabled(builtin('table'), at, { ...input, registry: registry() })).toBe(false);
    expect(toolEnabled(builtin('table'), at, input)).toBe(true);
  });

  it('visibility and activity derive from the state', () => {
    const inTable = context({ state: caretAfter('a', { table: tableState() }) });
    for (const id of [
      'paragraph',
      'heading-1',
      'heading-6',
      'bullet-list',
      'ordered-list',
      'task-list',
      'blockquote',
      'code-block',
      'block-type',
      'list-type',
      'turn-into',
    ])
      expect([id, toolVisible(builtin(id), inTable)]).toEqual([id, false]);
    for (const id of ['bold', 'link', 'image', 'divider', 'table-merge-cells'])
      expect([id, toolVisible(builtin(id), inTable)]).toEqual([id, true]);
    expect(toolVisible(builtin('paragraph'), context())).toBe(true);

    const bolded = context({
      state: caretAfter('a', { marks: { ...MARKS_OFF, bold: 'on', italic: 'mixed' } }),
    });
    expect(toolActive(builtin('bold'), bolded)).toBe(true);
    expect(toolActive(builtin('italic'), bolded)).toBe(false);
    const heading = context({
      state: caretAfter('a', {
        block: { id: 'b1', kind: 'heading', attrs: { level: 2 }, depth: 0 },
        blockKinds: ['heading:2'],
      }),
    });
    expect(toolActive(builtin('heading-2'), heading)).toBe(true);
    expect(toolActive(builtin('heading-1'), heading)).toBe(false);
    const mixed = context({ state: caretAfter('a', { blockKinds: ['heading:2', 'paragraph'] }) });
    expect(toolActive(builtin('heading-2'), mixed)).toBe(false);
    expect(toolActive(builtin('align-start'), context())).toBe(true);
    expect(
      toolActive(builtin('align-center'), context({ state: state({ align: 'center' }) })),
    ).toBe(true);
    expect(toolActive(builtin('align-start'), context({ state: state({ align: 'mixed' }) }))).toBe(
      false,
    );
  });

  it('V-484: derives the mention suggestion tool; slash is built in with /', async () => {
    const tools = registry({
      capabilities: resolveTextEditorCapabilities(allNodes, NODES),
      nodes: NODES,
    });
    const tool = tools.tools.get('mention')!;
    expect(tool.kind).toBe('suggestion');
    expect(tool.suggest?.trigger).toBe('@');
    expect(tool.surfaces).toEqual([]);
    expect(tools.isAvailable('mention')).toBe(true);
    expect(textEditorTools.slash.kind).toBe('suggestion');
    expect(textEditorTools.slash.suggest?.trigger).toBe('/');

    // Active only while the suggestions layout key lists it.
    expect(resolveTextEditorLayout(undefined, tools).layout.suggestions).toEqual(['slash']);
    const listed = resolveTextEditorLayout({ suggestions: ['slash', 'mention'] }, tools);
    expect(listed.layout.suggestions).toEqual(['slash', 'mention']);
    expect(listed.diagnostics).toEqual([]);
    expect(resolveTextEditorLayout({ suggestions: ['mention'] }, tools).layout.suggestions).toEqual(
      ['mention'],
    );
    // It takes no place on a surface and `*` never adds it.
    const placed = resolveTextEditorLayout({ toolbar: [['mention']] }, tools);
    expect(placed.layout.toolbar).toEqual([]);
    expect(placed.diagnostics[0]?.code).toBe('text-editor-layout-unknown');
    expect(resolveTextEditorLayout(undefined, tools).layout.slash.flat()).not.toContain('mention');
    // Unavailable without its capability, which an explicit suggestions key reports.
    const without = registry({ nodes: NODES });
    const missing = resolveTextEditorLayout({ suggestions: ['slash', 'mention'] }, without);
    expect(missing.layout.suggestions).toEqual(['slash']);
    expect(missing.diagnostics).toEqual([
      { code: 'text-editor-tool-unavailable', message: expect.stringContaining('"mention"') },
    ]);

    // The definition supplies the items and their entries.
    const controller = new AbortController();
    const items = (await tool.source!({ query: 'mara', signal: controller.signal })) as Person[];
    expect(items).toEqual([crew[0]]);
    expect(tool.suggest?.label?.(crew[0])).toBe('Mara Quill');
    expect(tool.suggest?.description?.(crew[0])).toBe('p1');
    // The chosen item replaces the trigger and the query with the node.
    const typed = context({ state: caretAfter('Ask @mar'), value: crew[0] });
    expect(toolActions(tool, typed, tools)).toEqual([
      {
        type: 'inline.insert',
        kind: 'mention',
        attrs: { id: 'p1', label: 'Mara Quill' },
        range: { block: 'b1', from: 4, to: 8 },
      },
    ]);
    expect(
      toolActions(tool, context({ state: caretAfter('Ask mar'), value: crew[0] }), tools),
    ).toBeNull();
    expect(toolActions(tool, context({ state: caretAfter('Ask @mar') }), tools)).toBeNull();
  });
});

describe('tool values (uwg-te-req-tools-4)', () => {
  const check = (id: string, value: unknown, members: Partial<TextEditorToolContext> = {}) =>
    checkToolValue(builtin(id), value, URLS, context(members));
  const kindOf = (error: Error | null) =>
    error === null ? null : error instanceof RangeError ? 'RangeError' : error.constructor.name;

  it('accepts no value for any kind', () => {
    for (const id of Object.keys(textEditorTools)) expect(check(id, undefined), id).toBeNull();
  });

  it('rejects any value given to a button, toggle or menu tool with a TypeError', () => {
    for (const id of [
      'undo',
      'clear-formatting',
      'divider',
      'copy-block-link',
      'bold',
      'heading-1',
      'table-toggle-header-row',
      'more',
      'list-type',
    ])
      for (const value of [true, false, null, 0, '', 'bold', {}, []])
        expect([id, value, kindOf(check(id, value))]).toEqual([id, value, 'TypeError']);
  });

  it('takes the identifier of an item for a radio menu', () => {
    expect(check('align', 'align-center')).toBeNull();
    expect(check('block-type', 'heading-3')).toBeNull();
    expect(check('table-cell-align', 'align-justify')).toBeNull();
    for (const value of ['align-left', 'center', 3, null, { id: 'align-center' }])
      expect(kindOf(check('align', value))).toBe('TypeError');
    expect(kindOf(check('block-type', 'heading-4'))).toBe('TypeError');
    // The turn-into items are its layout.
    expect(check('turn-into', 'task-list')).toBeNull();
    expect(kindOf(check('turn-into', 'divider'))).toBe('TypeError');
    const layout = { ...defaultTextEditorLayout, turnInto: [['paragraph', 'callout']] };
    expect(check('turn-into', 'callout', { layout })).toBeNull();
    expect(kindOf(check('turn-into', 'task-list', { layout }))).toBe('TypeError');
  });

  it('takes a palette name or default for one channel, { channel, color } for several', () => {
    for (const value of ['yellow', 'red', 'gray', 'default']) {
      expect(check('highlight', value)).toBeNull();
      expect(check('cell-background', value)).toBeNull();
    }
    for (const value of ['teal', 'Yellow', '', null, 1, { channel: 'highlight', color: 'red' }])
      expect([value, kindOf(check('highlight', value))]).toEqual([value, 'TypeError']);
    expect(check('color', { channel: 'text', color: 'blue' })).toBeNull();
    expect(check('color', { channel: 'highlight', color: 'default' })).toBeNull();
    for (const value of [
      'blue',
      { channel: 'background', color: 'blue' },
      { channel: 'text', color: 'teal' },
      { channel: 'text' },
      { color: 'blue' },
      null,
    ])
      expect([value, kindOf(check('color', value))]).toEqual([value, 'TypeError']);
  });

  it('takes a link and an image source that the policies allow', () => {
    for (const href of [
      'https://example.org/tides',
      'mailto:crew@example.org',
      '#log',
      'notes/today',
    ])
      expect(check('link', { href })).toBeNull();
    for (const value of [
      { href: 'javascript:alert(1)' },
      { href: 'data:text/html,x' },
      { href: '' },
      { href: '  ' },
      { href: 7 },
      'https://example.org',
      null,
    ])
      expect([value, kindOf(check('link', value))]).toEqual([value, 'TypeError']);
    const strict = { links: ['https:'], images: ['https:'] };
    expect(
      checkToolValue(builtin('link'), { href: 'mailto:crew@example.org' }, strict, context()),
    ).toBeInstanceOf(TypeError);
    expect(check('image', { src: 'https://example.org/reef.png', alt: 'Reef at dawn' })).toBeNull();
    expect(check('image', { src: 'images/reef.png', alt: '' })).toBeNull();
    for (const value of [
      { src: 'data:image/png;base64,AAAA', alt: '' },
      { src: 'mailto:crew@example.org', alt: '' },
      { src: 'https://example.org/reef.png' },
      { src: '', alt: 'x' },
      'https://example.org/reef.png',
    ])
      expect([value, kindOf(check('image', value))]).toEqual([value, 'TypeError']);
  });

  it('rejects rows or columns outside the picker ranges with a RangeError', () => {
    for (const value of [
      { rows: 1, columns: 1 },
      { rows: 2, columns: 3 },
      { rows: 100, columns: 20 },
    ])
      expect(check('table', value)).toBeNull();
    for (const value of [
      { rows: 0, columns: 2 },
      { rows: 101, columns: 2 },
      { rows: 2, columns: 0 },
      { rows: 2, columns: 21 },
      { rows: 2.5, columns: 2 },
      { rows: '2', columns: 2 },
      { rows: Number.NaN, columns: 2 },
      { columns: 2 },
      {},
    ])
      expect([value, kindOf(check('table', value))]).toEqual([value, 'RangeError']);
    for (const value of ['2x3', null, 6, [2, 3]])
      expect([value, kindOf(check('table', value))]).toEqual([value, 'TypeError']);
  });

  it('takes the chosen item for a suggestion; a custom tool value is the application’s', () => {
    expect(check('slash', 'heading-1')).toBeNull();
    expect(kindOf(check('slash', 'heading-5'))).toBe('TypeError');
    const tools = registry({
      capabilities: resolveTextEditorCapabilities(allNodes, NODES),
      nodes: NODES,
    });
    expect(checkToolValue(tools.tools.get('mention')!, crew[1], URLS, context())).toBeNull();
    const custom: TextEditorTool = {
      id: 'stamp',
      kind: 'custom',
      label: 'Stamp',
      action: ({ value }) => (value ? [] : null),
    };
    for (const value of [1, 'x', null, { any: true }])
      expect(checkToolValue(custom, value, URLS, context())).toBeNull();
  });
});

/** The state of a caret in cell (row, column) of table `t1`, a 3 by 4 table with a header row. */
function tableState(
  members: Partial<NonNullable<TextEditorEngineState['table']>> = {},
): NonNullable<TextEditorEngineState['table']> {
  return {
    id: 't1',
    cell: { row: 1, column: 1 },
    range: null,
    rows: 3,
    columns: 4,
    headerRow: true,
    headerColumn: false,
    merged: false,
    cellMerged: false,
    ...members,
  };
}

/** A 3 by 4 model with a centered header row, whose cell (1, 2) spans two rows when `merged`. */
function tableModel(merged = false): TextEditorTableModel {
  const cells: TextEditorTableModel['cells'][number][] = [];
  const grid: number[][] = [[], [], []];
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 4; column++) {
      if (merged && row === 2 && column === 2) {
        grid[row]![column] = grid[1]![2]!;
        continue;
      }
      grid[row]![column] = cells.length;
      cells.push({
        row,
        column,
        rowSpan: merged && row === 1 && column === 2 ? 2 : 1,
        colSpan: 1,
        header: row === 0,
        background: null,
        align: row === 0 ? 'center' : null,
        empty: true,
      });
    }
  return {
    id: 't1',
    rows: 3,
    columns: 4,
    cells,
    grid,
    headerRow: true,
    headerColumn: false,
    widths: null,
    merged,
  };
}

describe('tool actions (uwg-te-req-tools-3, uwg-te-req-surfaces-2)', () => {
  const tools = registry({ capabilities: WITH_TABLES });
  const actions = (id: string, members: Partial<TextEditorToolContext> = {}) =>
    toolActions(builtin(id), context(members), tools);

  it('formatting tools', () => {
    expect(actions('bold')).toEqual([{ type: 'mark.toggle', mark: 'bold' }]);
    expect(actions('clear-formatting')).toEqual([{ type: 'mark.clear' }]);
    expect(actions('undo')).toEqual([{ type: 'history.undo' }]);
    expect(actions('redo')).toEqual([{ type: 'history.redo' }]);
    // The highlight shortcut, an activation without a value, applies yellow.
    expect(actions('highlight')).toEqual([
      { type: 'mark.color', mark: 'highlight', color: 'yellow' },
    ]);
    expect(actions('highlight', { value: 'default' })).toEqual([
      { type: 'mark.color', mark: 'highlight', color: null },
    ]);
    expect(actions('color', { value: { channel: 'text', color: 'blue' } })).toEqual([
      { type: 'mark.color', mark: 'text-color', color: 'blue' },
    ]);
    expect(actions('color')).toBeNull();
    // A link over a caret outside a link inserts its URL as linked text.
    const caret = caretAfter('Tide');
    expect(actions('link', { state: caret, value: { href: 'https://example.org' } })).toEqual([
      { type: 'link.set', href: 'https://example.org', text: 'https://example.org' },
    ]);
    const selected = state({
      selection: {
        kind: 'text',
        anchor: { block: 'b1', offset: 0 },
        head: { block: 'b1', offset: 4 },
        empty: false,
      },
    });
    expect(actions('link', { state: selected, value: { href: 'https://example.org' } })).toEqual([
      { type: 'link.set', href: 'https://example.org' },
    ]);
    expect(Object.isFrozen(actions('bold'))).toBe(true);
  });

  it('radio menus run the chosen item, and the active item changes nothing', () => {
    const paragraph = context({ state: caretAfter('Tide') });
    expect(toolActions(builtin('block-type'), { ...paragraph, value: 'heading-2' }, tools)).toEqual(
      [{ type: 'block.set-type', kind: 'heading', attrs: { level: 2 } }],
    );
    expect(
      toolActions(builtin('block-type'), { ...paragraph, value: 'paragraph' }, tools),
    ).toBeNull();
    expect(toolActions(builtin('turn-into'), { ...paragraph, value: 'task-list' }, tools)).toEqual([
      { type: 'block.set-type', kind: 'list-task' },
    ]);
    expect(toolActions(builtin('align'), { ...paragraph, value: 'align-center' }, tools)).toEqual([
      { type: 'block.align', align: 'center' },
    ]);
    expect(toolActions(builtin('align'), { ...paragraph, value: 'align-start' }, tools)).toBeNull();
    expect(toolActions(builtin('align'), paragraph, tools)).toBeNull();
    // Turn into from the block menu acts on the targeted blocks.
    const blocks = context({
      state: caretAfter('a'),
      target: { kind: 'blocks', ids: ['b1', 'b2'] },
    });
    expect(toolActions(builtin('turn-into'), { ...blocks, value: 'heading-1' }, tools)).toEqual([
      { type: 'block.set-type', kind: 'heading', attrs: { level: 1 }, ids: ['b1', 'b2'] },
    ]);
  });

  it('block tools turn the selection into a kind, or back into paragraphs', () => {
    expect(actions('heading-1', { state: caretAfter('a') })).toEqual([
      { type: 'block.set-type', kind: 'heading', attrs: { level: 1 } },
    ]);
    expect(actions('heading-1', { state: caretAfter('a', { blockKinds: ['heading:1'] }) })).toEqual(
      [{ type: 'block.set-type', kind: 'paragraph' }],
    );
    expect(actions('blockquote', { state: caretAfter('a', { blockKinds: ['quote'] }) })).toEqual([
      { type: 'block.set-type', kind: 'paragraph' },
    ]);
    expect(actions('bullet-list', { state: caretAfter('a') })).toEqual([
      { type: 'block.set-type', kind: 'list-bullet' },
    ]);
    expect(actions('paragraph', { state: caretAfter('a') })).toEqual([
      { type: 'block.set-type', kind: 'paragraph' },
    ]);
  });

  it('insert tools insert at the point of insertion, or after the targeted blocks', () => {
    expect(actions('divider')).toEqual([{ type: 'blocks.insert', kind: 'divider' }]);
    expect(actions('divider', { target: { kind: 'blocks', ids: ['b1', 'b4'] } })).toEqual([
      { type: 'blocks.insert', kind: 'divider', at: { after: 'b4' } },
    ]);
    expect(actions('table', { value: { rows: 2, columns: 3 } })).toEqual([
      {
        type: 'blocks.insert',
        kind: 'table',
        attrs: { rows: 2, columns: 3, headerRow: true, headerColumn: false },
        select: 'start',
      },
    ]);
    expect(actions('table')).toBeNull();
    expect(
      actions('image', { value: { src: 'https://example.org/reef.png', alt: 'Reef' } }),
    ).toEqual([
      {
        type: 'blocks.insert',
        kind: 'image',
        attrs: { src: 'https://example.org/reef.png', alt: 'Reef' },
      },
    ]);
  });

  it('the slash menu removes the trigger and the query and runs the entry', () => {
    const typed = caretAfter('Plan /hea');
    expect(actions('slash', { state: typed, value: 'heading-1' })).toEqual([
      { type: 'text.delete', range: { block: 'b1', from: 5, to: 9 } },
      { type: 'block.set-type', kind: 'heading', attrs: { level: 1 } },
    ]);
    // An entry that opens a surface only removes the trigger and the query.
    expect(actions('slash', { state: typed, value: 'table' })).toEqual([
      { type: 'text.delete', range: { block: 'b1', from: 5, to: 9 } },
    ]);
    // The image entry acts at once: it removes the trigger and inserts a pending image.
    expect(actions('slash', { state: typed, value: 'image' })).toEqual([
      { type: 'text.delete', range: { block: 'b1', from: 5, to: 9 } },
      { type: 'blocks.insert', kind: 'image', attrs: { src: '', alt: '' } },
    ]);
    // The caret text may be cut to its last 64 units: offsets stay in the block's own content.
    const long = `${'w'.repeat(70)} /div`;
    const cut = state({
      ...caretAfter(long),
      caret: {
        point: { block: 'b1', offset: long.length },
        textBefore: long.slice(-64),
        inCode: false,
      },
    });
    expect(actions('slash', { state: cut, value: 'divider' })).toEqual([
      { type: 'text.delete', range: { block: 'b1', from: 71, to: 75 } },
      { type: 'blocks.insert', kind: 'divider' },
    ]);
    // No trigger before the caret, no entry, or an entry the slash layout lacks: nothing to do.
    expect(actions('slash', { state: caretAfter('Plan hea'), value: 'heading-1' })).toBeNull();
    expect(actions('slash', { state: typed })).toBeNull();
    expect(actions('slash', { state: typed, value: 'heading-5' })).toBeNull();
  });

  it('block actions act on the targeted blocks', () => {
    const target = { kind: 'blocks', ids: ['b2', 'b3'] } as const;
    expect(actions('duplicate-block', { target })).toEqual([
      { type: 'blocks.duplicate', ids: ['b2', 'b3'] },
    ]);
    expect(actions('delete-block', { target })).toEqual([
      { type: 'blocks.delete', ids: ['b2', 'b3'] },
    ]);
    expect(actions('nest-block', { target })).toEqual([
      { type: 'block.indent', ids: ['b2', 'b3'] },
    ]);
    expect(actions('unnest-block')).toEqual([{ type: 'block.outdent' }]);
    // A caret or a selection in one block targets that block, a cell range its table.
    expect(actions('duplicate-block', { state: caretAfter('a') })).toEqual([
      { type: 'blocks.duplicate', ids: ['b1'] },
    ]);
    const cells = state({
      selection: {
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
      },
    });
    expect(actions('delete-block', { state: cells })).toEqual([
      { type: 'blocks.delete', ids: ['t1'] },
    ]);
    const across = state({
      selection: {
        kind: 'text',
        anchor: { block: 'b1', offset: 0 },
        head: { block: 'b3', offset: 2 },
        empty: false,
      },
    });
    expect(actions('delete-block', { state: across })).toBeNull();
    // Copying a link acts outside the document: its request carries no actions.
    expect(actions('copy-block-link', { target })).toEqual([]);
    // Mod+Enter toggles the task item holding the caret, and nothing elsewhere.
    const task = caretAfter('Buy rope', {
      block: { id: 'b1', kind: 'list-task', attrs: { checked: false }, depth: 0 },
      blockKinds: ['list-task'],
    });
    expect(actions('toggle-task', { state: task })).toEqual([
      { type: 'block.set-attrs', id: 'b1', attrs: { checked: true } },
    ]);
    expect(actions('toggle-task', { state: caretAfter('Buy rope') })).toBeNull();
  });

  it('table tools act on the row, the column or the cells they target', () => {
    const input = {
      ready: true,
      disabled: false,
      editable: true,
      registry: tools,
      can: () => true,
    };
    const enabled = (id: string, members: Partial<TextEditorToolContext>) =>
      toolEnabled(builtin(id), context(members), input);
    const caret = { state: caretAfter('a', { table: tableState() }), table: tableModel() };
    expect(actions('table-insert-row-before', caret)).toEqual([
      { type: 'table.insert-row', table: 't1', index: 1 },
    ]);
    expect(actions('table-insert-row-after', caret)).toEqual([
      { type: 'table.insert-row', table: 't1', index: 2 },
    ]);
    expect(actions('table-insert-column-after', caret)).toEqual([
      { type: 'table.insert-column', table: 't1', index: 2 },
    ]);
    expect(actions('table-move-row-up', caret)).toEqual([
      { type: 'table.move-row', table: 't1', from: 1, to: 0 },
    ]);
    expect(actions('table-move-column-after', caret)).toEqual([
      { type: 'table.move-column', table: 't1', from: 1, to: 2 },
    ]);
    expect(actions('table-duplicate-row', caret)).toEqual([
      { type: 'table.duplicate-row', table: 't1', index: 1 },
    ]);
    expect(actions('table-delete-column', caret)).toEqual([
      { type: 'table.delete-columns', table: 't1', from: 1, to: 1 },
    ]);
    expect(actions('table-toggle-header-row', caret)).toEqual([
      { type: 'table.set-header', table: 't1', row: false },
    ]);
    expect(toolActive(builtin('table-toggle-header-row'), context(caret))).toBe(true);
    expect(actions('table-toggle-header-column', caret)).toEqual([
      { type: 'table.set-header', table: 't1', column: true },
    ]);
    expect(actions('table-clear-cells', caret)).toEqual([
      {
        type: 'table.clear-cells',
        table: 't1',
        range: { anchor: { row: 1, column: 1 }, head: { row: 1, column: 1 } },
      },
    ]);
    expect(actions('table-merge-cells', caret)).toBeNull();
    expect(actions('table-split-cell', caret)).toBeNull();

    // A row menu targets its row, a column menu its column, as the cells of alignment and color.
    const row = {
      ...caret,
      target: { kind: 'table', table: 't1', axis: 'row', index: 2 },
    } as const;
    expect(actions('table-delete-row', row)).toEqual([
      { type: 'table.delete-rows', table: 't1', from: 2, to: 2 },
    ]);
    expect(actions('cell-background', { ...row, value: 'blue' })).toEqual([
      { type: 'table.background', table: 't1', target: { row: 2 }, color: 'blue' },
    ]);
    expect(actions('table-cell-align', { ...row, value: 'align-end' })).toEqual([
      { type: 'table.align', table: 't1', target: { row: 2 }, align: 'end' },
    ]);
    const column = {
      ...caret,
      target: { kind: 'table', table: 't1', axis: 'column', index: 3 },
    } as const;
    expect(actions('cell-background', { ...column, value: 'default' })).toEqual([
      { type: 'table.background', table: 't1', target: { column: 3 }, color: null },
    ]);
    expect(actions('table-move-column-after', column)).toBeNull();
    expect(enabled('table-move-column-after', column)).toBe(false);
    expect(enabled('table-move-column-before', column)).toBe(true);
    // The header row is centered: choosing its alignment again changes nothing.
    const header = {
      ...caret,
      target: { kind: 'table', table: 't1', axis: 'row', index: 0 },
    } as const;
    expect(actions('table-cell-align', { ...header, value: 'align-center' })).toBeNull();
    expect(actions('table-move-row-up', header)).toBeNull();
    expect(enabled('table-move-row-up', header)).toBe(false);

    // A cell range: alignment, merging and the lines it spans.
    const range = { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } };
    const ranged = {
      state: caretAfter('a', { table: tableState({ range }) }),
      table: tableModel(),
    };
    expect(actions('table-merge-cells', ranged)).toEqual([
      { type: 'table.merge-cells', table: 't1', range },
    ]);
    expect(actions('table-delete-row', ranged)).toEqual([
      { type: 'table.delete-rows', table: 't1', from: 1, to: 2 },
    ]);
    expect(actions('table-insert-row-after', ranged)).toEqual([
      { type: 'table.insert-row', table: 't1', index: 3 },
    ]);
    expect(actions('align-center', ranged)).toEqual([
      { type: 'table.align', table: 't1', target: { range }, align: 'center' },
    ]);
    expect(actions('table-move-row-up', ranged)).toBeNull();

    // Merged cells disable moves and a duplicate of a line that a merged cell spans with another.
    const merged = {
      state: caretAfter('a', { table: tableState({ merged: true }) }),
      table: tableModel(true),
    };
    expect(enabled('table-move-row-down', merged)).toBe(false);
    expect(enabled('table-move-column-before', merged)).toBe(false);
    const rowOf = (index: number) =>
      ({ ...merged, target: { kind: 'table', table: 't1', axis: 'row', index } }) as const;
    const columnOf = (index: number) =>
      ({ ...merged, target: { kind: 'table', table: 't1', axis: 'column', index } }) as const;
    expect(enabled('table-duplicate-row', rowOf(0))).toBe(true);
    expect(enabled('table-duplicate-row', rowOf(1))).toBe(false);
    expect(enabled('table-duplicate-row', rowOf(2))).toBe(false);
    // The cell spans rows only, so every column can be duplicated with it.
    expect(enabled('table-duplicate-column', columnOf(2))).toBe(true);
    const cellRange = { anchor: { row: 1, column: 1 }, head: { row: 2, column: 2 } };
    const withMerged = {
      ...merged,
      state: caretAfter('a', { table: tableState({ merged: true, range: cellRange }) }),
    };
    expect(actions('table-split-cell', withMerged)).toEqual([
      { type: 'table.split-cell', table: 't1', cell: { row: 1, column: 2 } },
    ]);
    // Outside a table the table tools have nothing to do.
    expect(actions('table-insert-row-before')).toBeNull();
    expect(enabled('table-insert-row-before', {})).toBe(false);
  });
});

describe('built-in tool sets (uwg-te-par-tools-1)', () => {
  const sets: Readonly<Record<TextEditorToolFeature, Readonly<Record<string, TextEditorTool>>>> = {
    core: textEditorCoreTools,
    links: textEditorLinkTools,
    tables: textEditorTableTools,
    images: textEditorImageTools,
    suggestions: textEditorSuggestionTools,
    blocks: textEditorBlockTools,
  };

  it('the feature sets partition the built-in tools, in the order of the tables', () => {
    expect(Object.keys(textEditorTools)).toEqual(Object.keys(BUILTIN_TOOL_FEATURES));
    const seen = new Set<string>();
    for (const [feature, set] of Object.entries(sets)) {
      for (const [id, tool] of Object.entries(set)) {
        expect(BUILTIN_TOOL_FEATURES[id as keyof typeof BUILTIN_TOOL_FEATURES], id).toBe(feature);
        expect(tool.id).toBe(id);
        expect(textEditorTools[id as keyof typeof textEditorTools]).toBe(tool);
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
    }
    expect(seen.size).toBe(Object.keys(textEditorTools).length);
  });

  const core = () =>
    resolveTextEditorTools({ builtins: textEditorCoreTools, capabilities: BASE_CAPABILITIES });

  it('the default layouts resolve over the core set without a diagnostic', () => {
    const { layout, diagnostics } = resolveTextEditorLayout(undefined, core());
    expect(diagnostics).toEqual([]);
    expect(layout.toolbar).toEqual([
      ['undo', 'redo'],
      ['block-type', 'list-type', 'blockquote', 'code-block'],
      ['bold', 'italic', 'strike', 'code', 'underline', 'highlight'],
      ['superscript', 'subscript'],
      ['align'],
    ]);
    expect(layout.selectionToolbar).toEqual([
      ['turn-into'],
      ['bold', 'italic', 'underline', 'strike', 'code'],
      ['color'],
      ['more'],
    ]);
    expect(layout.slash.flat()).not.toContain('table');
    expect(layout.slash.flat()).not.toContain('image');
    expect(layout.blockMenu).toEqual([['turn-into', 'color']]);
    expect(layout.tableRow).toEqual([]);
    expect(layout.tableColumn).toEqual([]);
    expect(layout.tableCell).toEqual([]);
    expect(layout.suggestions).toEqual([]);
  });

  it("a placed tool of a feature the editor does not include is reported with the feature's name", () => {
    const { layout, diagnostics } = resolveTextEditorLayout(
      { toolbar: [['bold', 'table']], suggestions: ['slash'] },
      core(),
    );
    expect(layout.toolbar).toEqual([['bold']]);
    expect(layout.suggestions).toEqual([]);
    expect(diagnostics).toEqual([
      {
        code: 'text-editor-layout-unknown',
        message:
          'The toolbar layout lists "table", a tool of the tables feature, which the editor does not include; it is skipped.',
      },
      {
        code: 'text-editor-layout-unknown',
        message:
          'The suggestions layout lists "slash", a tool of the suggestions feature, which the editor does not include; it is skipped.',
      },
    ]);
  });

  it("an application tool with a feature tool's identifier is placed over the core set", () => {
    const table: TextEditorTool = {
      id: 'table',
      kind: 'button',
      label: 'Table',
      surfaces: ['toolbar'],
      action: [],
    };
    const tools = resolveTextEditorTools({
      builtins: textEditorCoreTools,
      tools: [table],
      capabilities: BASE_CAPABILITIES,
    });
    const { layout, diagnostics } = resolveTextEditorLayout({ toolbar: [['table']] }, tools);
    expect(diagnostics).toEqual([]);
    expect(layout.toolbar).toEqual([['table']]);
  });
});
