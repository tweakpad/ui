/**
 * Helpers of the built-in tool definitions (Widgets `uwg-te-par-tools-1`, `uwg-te-tab-tools`).
 *
 * Labels come from the strings of the tool context; a label or an icon that names a physical side
 * follows the direction of the editor. `builtin` freezes a definition. The alignment items and
 * icons are shared by the alignment tools of the core and the cell alignment of the tables.
 */
import {
  textAlignCenterIcon,
  textAlignJustifyIcon,
  textAlignLeftIcon,
  textAlignRightIcon,
} from '../../../icons/text-align.js';
import type { IconDefinition } from '../../../icons/types.js';
import type { TextEditorAlign } from '../model.js';
import type { TextEditorStrings } from '../strings.js';
import type {
  TextEditorSurface,
  TextEditorTool,
  TextEditorToolContext,
  TextEditorToolContextual,
} from '../tools.js';

/** A label read from the strings of the tool context. */
export const text =
  (key: keyof TextEditorStrings) =>
  ({ strings }: TextEditorToolContext): string =>
    strings[key];

/** A label that names a side: the first key in a left-to-right editor, the second otherwise. */
export const sided =
  (leftToRight: keyof TextEditorStrings, rightToLeft: keyof TextEditorStrings) =>
  ({ strings, direction }: TextEditorToolContext): string =>
    strings[direction === 'rtl' ? rightToLeft : leftToRight];

/** An icon that shows a side: the first in a left-to-right editor, the second otherwise. */
export const sidedIcon =
  (leftToRight: IconDefinition, rightToLeft: IconDefinition) =>
  ({ direction }: TextEditorToolContext): IconDefinition =>
    direction === 'rtl' ? rightToLeft : leftToRight;

/** A label of a side of the text: by the direction of the selected text, else the widget's. */
export const textSided =
  (leftToRight: keyof TextEditorStrings, rightToLeft: keyof TextEditorStrings) =>
  ({ strings, direction, textDirection }: TextEditorToolContext): string =>
    strings[(textDirection ?? direction) === 'rtl' ? rightToLeft : leftToRight];

/** An icon of a side of the text, as `textSided`. */
export const textSidedIcon =
  (leftToRight: IconDefinition, rightToLeft: IconDefinition) =>
  ({ direction, textDirection }: TextEditorToolContext): IconDefinition =>
    (textDirection ?? direction) === 'rtl' ? rightToLeft : leftToRight;

/** Freezes the lists and static actions of a definition, then the definition. */
export function builtin(tool: TextEditorTool): TextEditorTool {
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

export const BOTH_TOOLBARS: readonly TextEditorSurface[] = ['toolbar', 'selection-toolbar'];
export const BLOCK_MENUS: readonly TextEditorSurface[] = ['slash', 'turn-into'];

// Alignment (uwg-te-tab-tools r10; uwg-te-req-tables-5)

export const ALIGN_ITEMS = ['align-start', 'align-center', 'align-end', 'align-justify'] as const;

/**
 * The icon of each alignment: the start and end alignments show the side of the text's direction,
 * since a block aligns by the direction it resolves, whatever the widget's.
 */
export const ALIGN_ICONS: Readonly<
  Record<TextEditorAlign, TextEditorToolContextual<IconDefinition>>
> = {
  start: textSidedIcon(textAlignLeftIcon, textAlignRightIcon),
  center: textAlignCenterIcon,
  end: textSidedIcon(textAlignRightIcon, textAlignLeftIcon),
  justify: textAlignJustifyIcon,
};

/** Whether the tool context lies in a table: a table menu's target or the selection's table. */
export const inTable = (context: TextEditorToolContext): boolean =>
  context.target.kind === 'table' || context.state.table !== null;
