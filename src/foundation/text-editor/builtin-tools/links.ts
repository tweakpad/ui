/**
 * Built-in tools of the links feature (Widgets `uwg-te-tab-tools`, `uwg-te-req-surfaces-3`): the
 * link tool, whose kind opens the link popover of the widget.
 */
import { linkIcon } from '../../../icons/link.js';
import type { TextEditorAction } from '../actions.js';
import type { TextEditorLinkToolValue, TextEditorTool, TextEditorToolContext } from '../tools.js';
import type { BuiltinToolIdOf } from './ids.js';
import { BOTH_TOOLBARS, builtin, text } from './shared.js';

function linkActions(context: TextEditorToolContext): readonly TextEditorAction[] | null {
  const value = context.value as TextEditorLinkToolValue | undefined;
  if (value === undefined) return null;
  const { selection, link } = context.state;
  const collapsed = selection.kind === 'text' && selection.empty && link === null;
  return [{ type: 'link.set', href: value.href, ...(collapsed ? { text: value.href } : {}) }];
}

/** The built-in tools of the links feature by identifier. */
export const textEditorLinkTools = Object.freeze({
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
} satisfies Readonly<Record<BuiltinToolIdOf<'links'>, TextEditorTool>>);
