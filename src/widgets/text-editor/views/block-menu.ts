/**
 * The block menu (`uwg-te-req-blocks-3`, `uwg-te-tab-layout-r5`): a Menu with the gutter's grip
 * as its detached trigger, built from `layout.blockMenu` for the block selection. Its items are
 * resolved and rendered into it when it opens, a render root of the view's own, and frozen while
 * it is open: a closed menu resolves no tool, so typing does not dry-run its block actions. It
 * opens from a grip click, Mod+/ and, in block mode or on a focused grip, Shift+F10 and the
 * ContextMenu key; closing it returns focus to the editing root.
 */
import { html, nothing, render, type TemplateResult } from 'lit';
import type { TpMenu } from '../../../components/menu/menu.js';
import type { SurfaceInteraction } from '../../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorToolActivation, TextEditorToolHandlers } from '../tools/controls.js';
import { renderToolMenuItems } from '../tools/menu-items.js';
import type { TextEditorToolbarGroup, TextEditorToolbarItem } from '../tools/resolve.js';

/** Block-menu tools that the widget performs itself instead of a plain tool request. */
export type TextEditorBlockMenuAction = 'move-block-up' | 'move-block-down' | 'copy-block-link';

const OWN_ACTIONS: ReadonlySet<string> = new Set<TextEditorBlockMenuAction>([
  'move-block-up',
  'move-block-down',
  'copy-block-link',
]);

/**
 * The grip's trigger identifier, the menu's default trigger: a menu opened by a key, with no
 * trigger pressed, anchors to the grip.
 */
const GRIP_TRIGGER = 'text-editor-grip';

/** Whether the widget performs a block-menu tool itself. */
export function ownBlockMenuAction(id: string): id is TextEditorBlockMenuAction {
  return OWN_ACTIONS.has(id);
}

/**
 * An activation from a block-menu item as the block menu issues it: `surface: 'block-menu'`, the
 * reason and focus of an item press kept.
 */
export function blockMenuActivation(
  activation: TextEditorToolActivation,
): TextEditorToolActivation {
  return { ...activation, surface: 'block-menu' };
}

/** The groups the menu shows: a color item only with its channel groups to offer. */
export function blockMenuGroups(
  groups: readonly TextEditorToolbarGroup[],
): readonly TextEditorToolbarGroup[] {
  const shown = (item: TextEditorToolbarItem) => item.kind !== 'color' || !!item.colors?.length;
  if (groups.every((group) => group.items.every(shown))) return groups;
  return groups
    .map((group) => ({ ...group, items: group.items.filter(shown) }))
    .filter((group) => group.items.length > 0);
}

/** What the block menu needs from the element. */
export interface TextEditorBlockMenuHost {
  strings(): TextEditorStrings;
  /** The menu's groups for the current block selection, resolved for the `block-menu` surface. */
  groups(): readonly TextEditorToolbarGroup[];
  /** Runs an item's tool as a request on the block selection. */
  activate(activation: TextEditorToolActivation): void;
  /** Performs a widget-owned block action (move, copy link). */
  perform(action: TextEditorBlockMenuAction, sourceEvent: Event): void;
  /** Where focus goes when the menu closes: the editing root with its selection. */
  readonly finalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean;
  /** The menu opened or closed; the gutter stays pinned while it is open. */
  openChanged(open: boolean): void;
  requestUpdate(): void;
}

/** The block menu: its template, its frozen items and its detached grip trigger. */
export class TextEditorBlockMenu {
  readonly #host: TextEditorBlockMenuHost;
  #menu: TpMenu | null = null;
  #grip: HTMLElement | null = null;
  #unregister: (() => void) | null = null;
  /** The items shown while the menu is open. */
  #frozen: readonly TextEditorToolbarGroup[] | null = null;
  readonly #handlers: TextEditorToolHandlers;

  constructor(host: TextEditorBlockMenuHost) {
    this.#host = host;
    this.#handlers = {
      activate: (activation) => {
        if (ownBlockMenuAction(activation.tool))
          host.perform(activation.tool, activation.sourceEvent);
        else host.activate(blockMenuActivation(activation));
      },
      // Nested menus report nothing; the top-level menu listens itself.
      menuOpenChange: () => undefined,
      finalFocus: host.finalFocus,
    };
  }

  get open(): boolean {
    return this.#menu?.open ?? false;
  }

  get element(): TpMenu | null {
    return this.#menu;
  }

  /**
   * The Menu, whose items the view renders into it when it opens (`#renderItems`); nothing while
   * the gutter cannot show.
   */
  render(enabled: boolean): TemplateResult | typeof nothing {
    if (!enabled) return nothing;
    return html`<tp-menu
      class="block-menu"
      .portal=${false}
      .modal=${false}
      label=${this.#host.strings().blockMenu}
      default-trigger-identifier=${GRIP_TRIGGER}
      .finalFocus=${this.#host.finalFocus}
      @tp-open-change=${this.#onOpenChange}
    ></tp-menu>`;
  }

  /**
   * Renders the frozen items into the menu, a render root of the view's own, so that they exist
   * from the open request on, before the popup shows and moves focus to the first one.
   */
  #renderItems(menu: TpMenu, groups: readonly TextEditorToolbarGroup[]): void {
    const handlers = this.#handlers;
    // Listeners run with the element as `this`, as in the element's own template.
    const root = menu.getRootNode() as Partial<ShadowRoot>;
    render(
      groups.map(
        (group, index) =>
          html`${index ? html`<tp-separator></tp-separator>` : nothing}${renderToolMenuItems(
            group.items,
            handlers,
          )}`,
      ),
      menu,
      { host: root.host ?? menu },
    );
  }

  /** Registers the grip as the menu's detached trigger after each render. */
  updated(renderRoot: ShadowRoot, grip: HTMLElement | null): void {
    const menu = renderRoot.querySelector<TpMenu>('tp-menu.block-menu');
    if (menu === this.#menu && grip === this.#grip) return;
    this.#unregister?.();
    this.#unregister = null;
    this.#menu = menu;
    this.#grip = grip;
    if (menu && grip && typeof menu.registerTrigger === 'function')
      this.#unregister = menu.registerTrigger(grip, { identifier: GRIP_TRIGGER });
  }

  /** Opens the menu from a key, with the grip as its trigger; whether it opened. */
  openFromKey(event: KeyboardEvent): boolean {
    const menu = this.#menu;
    if (!menu || !this.#grip) return false;
    if (menu.open) return true;
    return menu.setOpen(true, 'hotkey', event);
  }

  close(): void {
    if (this.#menu?.open) this.#menu.setOpen(false, 'programmatic');
  }

  disconnected(): void {
    this.#unregister?.();
    this.#unregister = null;
    this.#menu = null;
    this.#grip = null;
    this.#frozen = null;
  }

  readonly #onOpenChange = (event: TpSurfaceOpenChangeEvent): void => {
    if (event.target !== event.currentTarget) return;
    const open = event.detail.value;
    // The view model is resolved and frozen at opening and released at closing; the items of a
    // closed menu stay as they were, hidden, until the next opening renders new ones.
    this.#frozen = open ? blockMenuGroups(this.#host.groups()) : null;
    if (this.#frozen) this.#renderItems(event.currentTarget as TpMenu, this.#frozen);
    this.#host.openChanged(open);
    this.#host.requestUpdate();
  };
}
