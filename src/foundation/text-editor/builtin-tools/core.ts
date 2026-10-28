/**
 * Core built-in tools (Widgets `uwg-te-par-tools-1`, `uwg-te-tab-tools`,
 * `uwg-te-tab-tools-blocks`, `uwg-te-tab-tools-inserts`, `uwg-te-tab-tools-actions`,
 * `uwg-te-req-tools-5`, `uwg-te-req-tables-5`).
 *
 * The tools that the widget always holds: history, marks, colors, alignment, the kinds of a
 * block, the block menus of the fixed toolbar and the shortcut-only block actions. Shortcuts hold
 * the chords of the platform on which this module runs, which it reads once when it loads, so
 * that `redo` lists Ctrl+Y only outside Apple platforms. The tools that change the kind of a
 * block hide while the selection lies in a table, and alignment applies to the cells of a table.
 */
import { ellipsisVerticalIcon } from '../../../icons/ellipsis.js';
import { minusIcon } from '../../../icons/minus.js';
import { redoIcon } from '../../../icons/redo.js';
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
} from '../../../icons/text-blocks.js';
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
} from '../../../icons/text-formatting.js';
import type { IconDefinition } from '../../../icons/types.js';
import { undoIcon } from '../../../icons/undo.js';
import { keyHintPlatform } from '../../key-notation.js';
import type { TextEditorCapability } from '../capabilities.js';
import type {
  TextEditorAlign,
  TextEditorHeadingLevel,
  TextEditorListKind,
  TextEditorToggleMark,
} from '../model.js';
import { paletteName, type TextEditorColorChoice } from '../palette.js';
import type { TextEditorStrings } from '../strings.js';
import {
  blockKindIs,
  insertBlock,
  outsideTable,
  setBlockKind,
  targetIdsMember,
  type TextEditorColorToolValue,
  type TextEditorSurface,
  type TextEditorTool,
} from '../tools.js';
import type { BuiltinToolIdOf } from './ids.js';
import {
  ALIGN_ICONS,
  ALIGN_ITEMS,
  BLOCK_MENUS,
  BOTH_TOOLBARS,
  builtin,
  inTable,
  text,
  textSided,
} from './shared.js';
import { cellAlignment, tableScope } from './table-scope.js';

/** The platform whose chords the built-in tools hold, read once when this module loads. */
const PLATFORM = keyHintPlatform('auto', globalThis.navigator);

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

// Alignment (uwg-te-tab-tools r10; uwg-te-req-tables-5)

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

/** The core built-in tools by identifier. */
export const textEditorCoreTools = Object.freeze({
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

  // Block actions that need no block surface: shortcuts over the selection
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
} satisfies Readonly<Record<BuiltinToolIdOf<'core'>, TextEditorTool>>);
