import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import type { TextEditorAccess } from '../../../foundation/text-editor/controller.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import {
  resolveToolMember,
  toolActive,
  toolItemGroups,
  toolLabel,
  toolVisible,
  type TextEditorRequestSurface,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolKind,
  type TextEditorToolRegistry,
} from '../../../foundation/text-editor/tools.js';
import type { IconDefinition } from '../../../icons/types.js';
import { colorGroups, type TextEditorColorGroup } from '../views/color-menu.js';

// The one view model of the toolbar surfaces (uwg-te-par-tools-1, uwg-te-tab-anatomy-r2).

/** How a toolbar presents an item. */
export type TextEditorToolbarControl =
  | 'button' // tp-button: button, link, image and table-size tools
  | 'toggle' // tp-toggle: a toggle tool, a pair member listed alone
  | 'toggle-group' // tp-toggle-group: an exclusive pair, or a radio menu shown inline
  | 'menu' // tp-button trigger, with a tp-menu for menu and radio-menu tools
  | 'custom'; // a custom tool's render(context)

/** One toolbar item, and the same item as a menu entry or as a member of its menu. */
export interface TextEditorToolbarItem {
  /** The tool identifier; for an exclusive pair, the member that the layout lists first. */
  readonly id: string;
  /** The tool's kind; an exclusive pair reports `toggle`. */
  readonly kind: TextEditorToolKind;
  readonly control: TextEditorToolbarControl;
  /** An exclusive pair (`uwg-te-req-tools-1`), whose `items` are its two Toggles. */
  readonly pair: boolean;
  /**
   * The fixed toolbar's tool that reports itself invisible in the current context: its control
   * keeps its place, unseen and inert, so that hiding it moves no other control
   * (`uwg-te-req-tools-5`, `uwg-te-req-pres-5`); a pair hides when both members do. Absent
   * elsewhere, where an invisible tool is left out.
   */
  readonly hidden?: true | undefined;
  /** The accessible name: the tool's label. */
  readonly label: string;
  /** The visible text where the display or trigger shows one: `shortLabel`, else the label. */
  readonly text: string;
  /** The tool's icon; for an `active-icon` trigger, the active item's icon, else the tool's. */
  readonly icon: IconDefinition | undefined;
  readonly display: 'icon' | 'icon-label' | 'label' | 'inline';
  /** Pressed on a Toggle, checked on a checkbox item. */
  readonly active: boolean;
  /** The active item of a radio menu, or `null`. */
  readonly value: string | null;
  /** Disabled semantics: the tool is not enabled, or the widget is disabled. */
  readonly disabled: boolean;
  /** The tool's tone: a destructive tool shows as a destructive menu item. */
  readonly tone?: 'default' | 'destructive' | undefined;
  /** False only while the widget is disabled (`uwg-te-req-prop-3`, `uwg-te-req-a11y-2`). */
  readonly focusableWhenDisabled: boolean;
  /** `dialog` for the link, image and table-size tools, whose surfaces are state-driven. */
  readonly popup: 'dialog' | null;
  /** Whether that surface is open. */
  readonly expanded: boolean;
  /** The shortcut of the binding registered for the tool (`uwg-te-req-key-2`). */
  readonly shortcut: KeyShortcut | undefined;
  /** A pair's or an inline radio menu's Toggles, or a menu's or radio menu's items. */
  readonly items: readonly TextEditorToolbarItem[];
  /** A menu item that starts a further group of its menu's items, after a separator. */
  readonly separated?: true | undefined;
  /** A color tool's menu groups, one per channel (`uwg-te-req-surfaces-5`); none otherwise. */
  readonly colors?: readonly TextEditorColorGroup[] | undefined;
  /** A custom tool's control, rendered from the tool context; otherwise undefined. */
  readonly render: (() => unknown) | undefined;
}

/** One layout group that still has an item to show. */
export interface TextEditorToolbarGroup {
  /** The index of the group in the resolved layout, which keys its DOM. */
  readonly key: string;
  readonly items: readonly TextEditorToolbarItem[];
  /** Every item of the fixed toolbar's group is `hidden`: the group keeps its place unseen. */
  readonly hidden?: true | undefined;
}

export interface TextEditorToolbarView {
  /** `strings.toolbar`, the toolbar's name (`uwg-te-req-a11y-2`). */
  readonly label: string;
  /** `strings.moreTools`, a template holding `{count}` (`ovl-count`). */
  readonly moreTools: string;
  /** The widget is disabled. */
  readonly disabled: boolean;
  /**
   * Focus is in the widget. While it is outside, no caret or selection shows what a tool would
   * act on, so every control, the More trigger included, shows disabled semantics.
   */
  readonly focused: boolean;
  /**
   * The groups with an available tool placed; a tool that reports itself invisible keeps its
   * place as a `hidden` item.
   */
  readonly groups: readonly TextEditorToolbarGroup[];
}

export interface TextEditorToolbarViewInput {
  /** The registry of the current resolution. */
  readonly registry: TextEditorToolRegistry;
  /** The resolved layout: every key present, `*` expanded, skipped identifiers removed. */
  readonly layout: TextEditorLayout;
  readonly access: TextEditorAccess;
  /** The controller's tool context for a surface. */
  readonly context: (surface: TextEditorRequestSurface) => TextEditorToolContext;
  /** The controller's enablement of a tool in a context. */
  readonly enabled: (tool: TextEditorTool, context: TextEditorToolContext) => boolean;
  /** The router's published shortcut of a tool. */
  readonly shortcut: (toolId: string) => KeyShortcut | undefined;
  /**
   * Whether the surface of a link, image or table-size tool is open; without it, every such
   * surface reports closed.
   */
  readonly expanded?: ((tool: TextEditorTool) => boolean) | undefined;
}

/** The fixed toolbar's input: the shared one and the widget's focus record. */
export interface TextEditorFixedToolbarViewInput extends TextEditorToolbarViewInput {
  /** Whether focus is in the widget: the editing root, the toolbar or one of its surfaces. */
  readonly focused: boolean;
}

/**
 * The fixed toolbar's view from the resolved layout and the normalized state, or `null` only while
 * the resolved layout's `toolbar` key holds no available tool (`uwg-te-tab-anatomy-r2`). Visibility
 * never removes a control: a tool that reports itself invisible stays in its group as a `hidden`
 * item, so that the row keeps its partition and no control moves (`uwg-te-req-pres-5`). While
 * focus is outside the widget, no tool is enabled (`uwg-te-req-tools-2`): the controls keep their
 * activity, values and labels, and stay focusable, so that Tab reaches the toolbar and enables
 * them.
 */
export function resolveToolbarView(
  input: TextEditorFixedToolbarViewInput,
): TextEditorToolbarView | null {
  const { registry, layout, focused } = input;
  const placed = layout.toolbar.flat();
  if (!placed.some((id) => registry.tools.has(id) && registry.isAvailable(id))) return null;
  const context = input.context('toolbar');
  const groups = resolveGroups(
    layout.toolbar,
    focused ? input : { ...input, enabled: () => false },
    context,
    true,
  );
  return {
    label: context.strings.toolbar,
    moreTools: context.strings.moreTools,
    disabled: input.access.disabled,
    focused,
    groups,
  };
}

/** The exclusive pairs of `uwg-te-req-tools-1`; M7's selection toolbar resolves through the same rule. */
const TEXT_EDITOR_EXCLUSIVE_PAIRS: readonly (readonly [string, string])[] = [
  ['blockquote', 'code-block'],
  ['superscript', 'subscript'],
];

const BUTTON_KINDS: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'button',
  'link',
  'image',
  'table-size',
]);

const DIALOG_KINDS: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'link',
  'table-size',
]);

/**
 * Groups of items from layout groups, with the exclusive pairs merged and empty groups dropped.
 * With `keepHidden` (the fixed toolbar), a placed tool that reports itself invisible stays as a
 * `hidden` item, a pair and a group hiding when all of theirs do; otherwise it is left out.
 */
function resolveGroups(
  layoutGroups: TextEditorLayout['toolbar'],
  input: TextEditorToolbarViewInput,
  context: TextEditorToolContext,
  keepHidden = false,
): TextEditorToolbarGroup[] {
  const placed = (id: string): TextEditorTool | null => {
    const tool = input.registry.tools.get(id);
    return tool && input.registry.isAvailable(id) && tool.kind !== 'suggestion' ? tool : null;
  };
  const shown = (id: string): TextEditorTool | null => {
    const tool = placed(id);
    return tool && toolVisible(tool, context) ? tool : null;
  };
  const kept = keepHidden ? placed : shown;
  const item = (id: string): TextEditorToolbarItem => {
    const tool = kept(id)!;
    const resolved = resolveItem(tool, input, context, shown, new Set());
    return keepHidden && !toolVisible(tool, context) ? { ...resolved, hidden: true } : resolved;
  };
  const listed = new Set(layoutGroups.flat().filter((id) => kept(id)));
  // A pair whose two members are listed renders at its first listing; the other listing is removed.
  const pairAt = new Map<string, readonly [string, string]>();
  const removed = new Set<string>();
  for (const pair of TEXT_EDITOR_EXCLUSIVE_PAIRS) {
    if (!pair.every((id) => listed.has(id))) continue;
    const first = layoutGroups.flat().find((id) => pair.includes(id))!;
    pairAt.set(first, pair);
    removed.add(first === pair[0] ? pair[1] : pair[0]);
  }
  const groups: TextEditorToolbarGroup[] = [];
  layoutGroups.forEach((ids, index) => {
    const items: TextEditorToolbarItem[] = [];
    for (const id of ids) {
      if (removed.has(id) || !listed.has(id)) continue;
      const pair = pairAt.get(id);
      items.push(pair ? pairItem(pair.map(item), id) : item(id));
    }
    if (!items.length) return;
    const key = String(index);
    groups.push(
      items.every((entry) => entry.hidden) ? { key, items, hidden: true } : { key, items },
    );
  });
  return groups;
}

function pairItem(members: readonly TextEditorToolbarItem[], id: string): TextEditorToolbarItem {
  const first = members.find((member) => member.id === id) ?? members[0]!;
  const active = members.find((member) => member.active) ?? null;
  return {
    ...first,
    hidden: members.every((member) => member.hidden) || undefined,
    kind: 'toggle',
    control: 'toggle-group',
    pair: true,
    active: active !== null,
    value: active?.id ?? null,
    disabled: members.every((member) => member.disabled),
    shortcut: undefined,
    items: members,
    render: undefined,
  };
}

function controlOf(tool: TextEditorTool): TextEditorToolbarControl {
  if (BUTTON_KINDS.has(tool.kind)) return 'button';
  if (tool.kind === 'toggle') return 'toggle';
  if (tool.kind === 'custom') return 'custom';
  if (tool.kind === 'radio-menu' && tool.display === 'inline') return 'toggle-group';
  if (tool.kind === 'radio-menu' || tool.kind === 'menu' || tool.kind === 'color') return 'menu';
  return 'button';
}

function resolveItem(
  tool: TextEditorTool,
  input: TextEditorToolbarViewInput,
  context: TextEditorToolContext,
  shown: (id: string) => TextEditorTool | null,
  visiting: ReadonlySet<string>,
): TextEditorToolbarItem {
  const label = toolLabel(tool, context);
  const own = {
    text: tool.shortLabel === undefined ? label : resolveToolMember(tool.shortLabel, context),
    icon: tool.icon === undefined ? undefined : resolveToolMember(tool.icon, context),
  };
  const nested = new Set(visiting).add(tool.id);
  // A color tool's menu holds its channel groups, not tool items.
  const items =
    tool.kind === 'menu' || tool.kind === 'radio-menu'
      ? toolItemGroups(tool, context)
          .map((group) =>
            group
              .filter((id) => !nested.has(id))
              .map(shown)
              .filter((child): child is TextEditorTool => child !== null)
              .map((child) => resolveItem(child, input, context, shown, nested)),
          )
          .filter((group) => group.length)
          .flatMap((group, index) =>
            index ? [{ ...group[0]!, separated: true as const }, ...group.slice(1)] : group,
          )
      : [];
  const activeItem = items.find((item) => item.active) ?? null;
  const showsActive = tool.trigger === 'active-icon' || tool.trigger === 'active-label';
  const shownItem = showsActive ? activeItem : null;
  // A menu that opens a submenu with no enabled item is disabled with it.
  const disabled =
    !input.enabled(tool, context) ||
    input.access.disabled ||
    ((tool.kind === 'radio-menu' || (tool.kind === 'menu' && items.length > 0)) &&
      items.every((item) => item.disabled));
  const popup = DIALOG_KINDS.has(tool.kind) ? 'dialog' : null;
  const render = tool.kind === 'custom' && tool.render ? tool.render : undefined;
  return {
    id: tool.id,
    kind: tool.kind,
    control: controlOf(tool),
    pair: false,
    label,
    text: tool.trigger === 'active-label' && shownItem ? shownItem.text : own.text,
    // The active item's icon, also for an `active-label` trigger, which shows it in place of its
    // label in a narrowed selection toolbar.
    icon: shownItem?.icon ?? own.icon,
    // A trigger that shows a label shows it in place of the icon unless the tool says otherwise.
    display:
      tool.display ??
      (tool.trigger === 'label' || tool.trigger === 'active-label' ? 'label' : 'icon'),
    active: toolActive(tool, context),
    value: tool.kind === 'radio-menu' ? (activeItem?.id ?? null) : null,
    disabled,
    tone: tool.tone ?? 'default',
    focusableWhenDisabled: !input.access.disabled,
    popup,
    expanded: popup !== null && (input.expanded?.(tool) ?? false),
    shortcut: input.shortcut(tool.id),
    items,
    ...(tool.kind === 'color' ? { colors: colorGroups(tool, context) } : {}),
    render: render ? () => render(context) : undefined,
  };
}

// Menu surfaces (M8) -----------------------------------------------------------------------------

/**
 * The groups of a menu surface, such as the block menu, from its resolved layout groups and the
 * tool context of its surface: the same items as a toolbar group, empty groups dropped.
 */
export function resolveMenuGroups(
  layoutGroups: TextEditorLayout['blockMenu'],
  input: TextEditorToolbarViewInput,
  surface: TextEditorRequestSurface,
): readonly TextEditorToolbarGroup[] {
  return resolveGroups(layoutGroups, input, input.context(surface));
}

// Selection toolbar (M7) -------------------------------------------------------------------------

/** The selection toolbar's view: its groups from the `selectionToolbar` layout key. */
export interface TextEditorSelectionToolbarView {
  /** `strings.selectionToolbar`, the toolbar's name. */
  readonly label: string;
  readonly disabled: boolean;
  readonly groups: readonly TextEditorToolbarGroup[];
}

/**
 * The selection toolbar's view from the resolved layout, or `null` while its layout places no
 * available tool, so that it never shows (`uwg-te-req-surfaces-1`).
 */
export function resolveSelectionToolbarView(
  input: TextEditorToolbarViewInput,
): TextEditorSelectionToolbarView | null {
  const { registry, layout } = input;
  const placed = layout.selectionToolbar.flat();
  if (!placed.some((id) => registry.tools.has(id) && registry.isAvailable(id))) return null;
  const context = input.context('selection-toolbar');
  return {
    label: context.strings.selectionToolbar,
    disabled: input.access.disabled,
    groups: resolveGroups(layout.selectionToolbar, input, context),
  };
}
