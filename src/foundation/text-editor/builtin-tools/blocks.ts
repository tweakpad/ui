/**
 * Built-in tools of the blocks feature (Widgets `uwg-te-tab-tools-actions`): the actions of the
 * block menu and the gutter. A move's destination comes from the block tree and the tree reorder
 * projection, which the tool context does not hold: those definitions carry the presentation,
 * shortcut and requirement, and resolve no action.
 */
import { arrowDownIcon, arrowUpIcon } from '../../../icons/arrows.js';
import { copyPlusIcon } from '../../../icons/copy-plus.js';
import { copyIcon } from '../../../icons/copy.js';
import { trashIcon } from '../../../icons/trash.js';
import type { TextEditorAction } from '../actions.js';
import { targetBlockIds, type TextEditorTool, type TextEditorToolContext } from '../tools.js';
import type { BuiltinToolIdOf } from './ids.js';
import { builtin, text } from './shared.js';

/** A block action on the targeted blocks, or `null` when no block is targeted. */
const onBlocks =
  (actions: (ids: readonly string[]) => readonly TextEditorAction[]) =>
  (context: TextEditorToolContext): readonly TextEditorAction[] | null => {
    const ids = targetBlockIds(context);
    return ids ? actions(ids) : null;
  };

/** The built-in tools of the blocks feature by identifier. */
export const textEditorBlockTools = Object.freeze({
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
} satisfies Readonly<Record<BuiltinToolIdOf<'blocks'>, TextEditorTool>>);
