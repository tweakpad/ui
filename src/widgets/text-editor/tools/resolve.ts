import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import type { TextEditorAccess } from '../../../foundation/text-editor/controller.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import {
  resolveToolMember,
  toolActive,
  toolItemIds,
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
}

export interface TextEditorToolbarView {
  /** `strings.toolbar`, the toolbar's name (`uwg-te-req-a11y-2`). */
  readonly label: string;
  /** `strings.moreTools`, a template holding `{count}` (`ovl-count`). */
  readonly moreTools: string;
  /** The widget is disabled. */
  readonly disabled: boolean;
  /** The groups with an item to show; empty while visibility hides every placed tool. */
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

/**
 * The fixed toolbar's view from the resolved layout and the normalized state, or `null` only while
 * the resolved layout's `toolbar` key holds no available tool (`uwg-te-tab-anatomy-r2`). Visibility
 * never removes the toolbar: a view whose placed tools are all hidden has no groups.
 */
export function resolveToolbarView(
  input: TextEditorToolbarViewInput,
): TextEditorToolbarView | null {
  const { registry, layout } = input;
  const placed = layout.toolbar.flat();
  if (!placed.some((id) => registry.tools.has(id) && registry.isAvailable(id))) return null;
  const context = input.context('toolbar');
  const groups = resolveGroups(layout.toolbar, input, context);
  return {
    label: context.strings.toolbar,
    moreTools: context.strings.moreTools,
    disabled: input.access.disabled,
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
  'image',
  'table-size',
]);

/** Groups of items from layout groups, with the exclusive pairs merged and empty groups dropped. */
function resolveGroups(
  layoutGroups: TextEditorLayout['toolbar'],
  input: TextEditorToolbarViewInput,
  context: TextEditorToolContext,
): TextEditorToolbarGroup[] {
  const shown = (id: string): TextEditorTool | null => {
    const tool = input.registry.tools.get(id);
    return tool &&
      input.registry.isAvailable(id) &&
      tool.kind !== 'suggestion' &&
      toolVisible(tool, context)
      ? tool
      : null;
  };
  const listed = new Set(layoutGroups.flat().filter((id) => shown(id)));
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
      items.push(
        pair
          ? pairItem(
              pair.map((member) => resolveItem(shown(member)!, input, context, shown, new Set())),
              id,
            )
          : resolveItem(shown(id)!, input, context, shown, new Set()),
      );
    }
    if (items.length) groups.push({ key: String(index), items });
  });
  return groups;
}

function pairItem(members: readonly TextEditorToolbarItem[], id: string): TextEditorToolbarItem {
  const first = members.find((member) => member.id === id) ?? members[0]!;
  const active = members.find((member) => member.active) ?? null;
  return {
    ...first,
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
      ? toolItemIds(tool, context)
          .filter((id) => !nested.has(id))
          .map(shown)
          .filter((child): child is TextEditorTool => child !== null)
          .map((child) => resolveItem(child, input, context, shown, nested))
      : [];
  const activeItem = items.find((item) => item.active) ?? null;
  const showsActive = tool.trigger === 'active-icon' || tool.trigger === 'active-label';
  const shownItem = showsActive ? activeItem : null;
  const disabled = !input.enabled(tool, context) || input.access.disabled;
  const popup = DIALOG_KINDS.has(tool.kind) ? 'dialog' : null;
  const render = tool.kind === 'custom' && tool.render ? tool.render : undefined;
  return {
    id: tool.id,
    kind: tool.kind,
    control: controlOf(tool),
    pair: false,
    label,
    text: tool.trigger === 'active-label' && shownItem ? shownItem.text : own.text,
    icon: tool.trigger === 'active-icon' && shownItem?.icon ? shownItem.icon : own.icon,
    display: tool.display ?? 'icon',
    active: toolActive(tool, context),
    value: tool.kind === 'radio-menu' ? (activeItem?.id ?? null) : null,
    disabled,
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
