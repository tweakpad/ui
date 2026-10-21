import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { renderShortcutHint } from '../../../components/key-hint/shortcut-hint.js';
import type { TpMenu } from '../../../components/menu/menu.js';
import type { TpOverflowList } from '../../../components/overflow-list/overflow-list.js';
import { TooltipProvider } from '../../../components/tooltip/handle.js';
import type { TpTooltip } from '../../../components/tooltip/tooltip.js';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import { surfaceInteraction, type SurfaceInteraction } from '../../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import { fillTemplate } from '../../../foundation/template.js';
import {
  setToolbarDisabledMode,
  ToolbarController,
  type ToolbarItemOptions,
  type ToolbarRegistration,
} from '../../../foundation/toolbar.js';
import { ellipsisVerticalIcon } from '../../../icons/ellipsis.js';
import type { TextEditorMenuModality } from '../focus.js';
import {
  renderToolControl,
  type TextEditorToolActivation,
  type TextEditorToolHandlers,
} from '../tools/controls.js';
import { renderToolMenuItems } from '../tools/menu-items.js';
import type {
  TextEditorToolbarGroup,
  TextEditorToolbarItem,
  TextEditorToolbarView,
} from '../tools/resolve.js';

/** What the element gives the toolbar; the three menu members reach the widget's focus record. */
export interface TextEditorToolbarHandlers {
  /** Runs the activation as a request, `focus` included, and ignores its rejection. */
  activate(activation: TextEditorToolActivation): void;
  /**
   * How a top-level toolbar menu opened and what had focus before (`uwg-te-req-a11y-6`). Called
   * from the open proposal; skipped while the Menu has no trigger element.
   */
  menuOpened(trigger: HTMLElement, modality: TextEditorMenuModality): void;
  /**
   * A top-level toolbar menu closes; `changed` when one of its items issued a request. Called
   * synchronously from the close proposal, which the Menu dispatches before it resolves
   * `finalFocus`.
   */
  menuClosed(changed: boolean): void;
  /**
   * A top-level toolbar menu opened or closed, for the widget's one transient surface
   * (`uwg-te-req-surfaces-6`): opening one closes any other surface of the widget through `close`.
   */
  transientOpened?(owner: object, close: () => void): void;
  transientClosed?(owner: object): void;
  /** A stable reference: the `finalFocus` of every top-level toolbar Menu (`uwg-te-req-a11y-6`). */
  readonly finalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean;
}

export interface TextEditorToolbarHost {
  /** The widget's shadow root, holding the toolbar part. */
  readonly renderRoot: ShadowRoot;
  /** The toolbar's view over the current resolution and state, or `null` with no toolbar. */
  toolbarView(): TextEditorToolbarView | null;
  readonly handlers: TextEditorToolbarHandlers;
  /** Re-renders the element, after the Overflow list's partition changes. */
  requestUpdate(): void;
}

/** What a tooltip shows for a control: its label and its shortcut's key hint. */
interface TooltipPayload {
  readonly label: string;
  readonly shortcut: KeyShortcut | undefined;
}

interface TooltipRecord {
  readonly key: string;
  readonly release: () => void;
}

const MORE_TOOL = 'more';

/**
 * What a toolbar's one Tooltip shows for a control: its label and its shortcut's key hint. The
 * Tooltip renders before any control is active, without a payload: then nothing.
 */
export function toolbarTooltipContent(payload: unknown): TemplateResult | typeof nothing {
  if (typeof payload !== 'object' || payload === null) return nothing;
  const { label, shortcut } = payload as TooltipPayload;
  return html`${label}${renderShortcutHint(shortcut, 'tooltip')}`;
}

/** Focusable controls a custom tool may render, and their Toolbar kinds (`uwg-te-req-a11y-2`). */
const CUSTOM_CONTROLS =
  'tp-button, tp-toggle, button, input, tp-input, textarea, tp-text-area, a[href]';
const INPUT_TAGS: ReadonlySet<string> = new Set(['input', 'tp-input', 'textarea', 'tp-text-area']);

function itemKind(element: Element): ToolbarItemOptions['kind'] {
  if (INPUT_TAGS.has(element.localName)) return 'input';
  if (
    element.localName === 'a' ||
    (element.localName === 'tp-button' && element.hasAttribute('href'))
  )
    return 'link';
  return 'button';
}

/**
 * Whether a control is a toolbar item: not a Toggle group member (the group registers its own),
 * not inside a surface's content, and, inside a Menu, only the top-level Menu's own trigger.
 */
function rowControl(element: Element, root: Element): boolean {
  // A toolbar may itself be a top-layer surface: only surfaces inside it count.
  const nested = element.closest('tp-toggle-group, [popover], dialog');
  if (nested && nested !== root) return false;
  const menu = element.closest('tp-menu');
  if (!menu) return true;
  return (
    element.parentElement === menu &&
    element.getAttribute('slot') === 'trigger' &&
    !menu.parentElement?.closest('tp-menu')
  );
}

/** Every item of a view by tool identifier, the members of Toggle groups included. */
function itemsById(groups: readonly TextEditorToolbarGroup[]): Map<string, TextEditorToolbarItem> {
  const items = new Map<string, TextEditorToolbarItem>();
  const visit = (item: TextEditorToolbarItem) => {
    if (item.control === 'toggle-group') item.items.forEach(visit);
    // A pair carries its first member's identifier; its Toggles keep their own entries.
    if (!item.pair) items.set(item.id, item);
  };
  for (const group of groups) group.items.forEach(visit);
  return items;
}

/** The fixed toolbar (`uwg-te-tab-anatomy-r2`, `uwg-te-req-a11y-2`). */
export class TextEditorToolbar {
  readonly #host: TextEditorToolbarHost;
  readonly #provider = new TooltipProvider();
  #view: TextEditorToolbarView | null = null;
  #root: HTMLElement | null = null;
  #controller: ToolbarController | null = null;
  readonly #controls = new TextEditorToolbarControls();
  #hiddenGroups: ReadonlySet<string> = new Set();
  #hiddenCount = 0;
  /** The open top-level toolbar menu: one at a time (`uwg-te-req-surfaces-6`). */
  #openMenu: TpMenu | null = null;
  /** Whether an item of the open menu issued a request. */
  #changed = false;

  readonly #handlers: TextEditorToolHandlers;

  readonly #tooltipContent = toolbarTooltipContent;

  constructor(host: TextEditorToolbarHost) {
    this.#host = host;
    this.#handlers = {
      activate: (activation) => this.#activate(activation),
      menuOpenChange: (menu, event) => this.#menuOpenChange(menu, event),
      finalFocus: host.handlers.finalFocus,
    };
  }

  /**
   * The `text-editor-toolbar` part, or nothing while the host's view is `null` (no available tool
   * placed). A view with no groups still renders the part and its empty row.
   */
  render(): TemplateResult | typeof nothing {
    const view = this.#host.toolbarView();
    this.#view = view;
    if (!view) return nothing;
    const handlers = this.#handlers;
    const moreLabel = fillTemplate(view.moreTools, { count: this.#hiddenCount });
    const hidden = view.groups.filter((group) => this.#hiddenGroups.has(group.key));
    return html`<div part="text-editor-toolbar" aria-label=${view.label}>
      <tp-overflow-list class="toolbar-row" max-rows="1" @tp-overflow-change=${this.#onOverflow}
        >${repeat(
          view.groups,
          (group) => group.key,
          (group, index) =>
            html`<span class="toolbar-group" data-group=${group.key}
              >${
                index
                  ? html`<tp-separator
                      class="toolbar-separator"
                      orientation="vertical"
                    ></tp-separator>`
                  : nothing
              }<tp-button-group class="toolbar-buttons" .joined=${false}
                >${group.items.map((item) => renderToolControl(item, handlers))}</tp-button-group
              ></span
            >`,
        )}<span class="toolbar-more" slot="count"
          ><tp-menu
            class="toolbar-more-menu"
            .portal=${false}
            .modal=${false}
            label=${moreLabel}
            .finalFocus=${handlers.finalFocus}
            @tp-open-change=${this.#onMoreOpenChange}
            ><tp-button
              class="toolbar-more-trigger"
              slot="trigger"
              variant="ghost"
              size="icon"
              .icon=${ellipsisVerticalIcon}
              >${moreLabel}</tp-button
            >${hidden.map(
              (group, index) =>
                html`${index ? html`<tp-separator></tp-separator>` : nothing}${renderToolMenuItems(
                  group.items,
                  handlers,
                )}`,
            )}</tp-menu
          ></span
        ></tp-overflow-list
      >
      <tp-tooltip
        class="toolbar-tooltip"
        describes="none"
        .provider=${this.#provider}
        .content=${this.#tooltipContent}
      ></tp-tooltip>
    </div>`;
  }

  connected(): void {
    // A disposed controller is never reused: the next update builds a fresh one.
    this.#root = null;
  }

  disconnected(): void {
    this.#teardown();
  }

  /** Syncs the controller, registrations, tooltip triggers and menus with the rendered DOM. */
  updated(): void {
    const view = this.#view;
    const root = this.#host.renderRoot.querySelector<HTMLElement>('[part~="text-editor-toolbar"]');
    if (!view || !root) {
      this.#teardown();
      return;
    }
    if (root !== this.#root || !this.#controller) {
      this.#teardown();
      this.#root = root;
      this.#controller = new ToolbarController(root, {
        loopFocus: true,
        preserveFocusOnPress: true,
      });
      setToolbarDisabledMode(this.#controller, 'fully');
    }
    const controller = this.#controller;
    controller.update({ disabled: view.disabled });
    if (view.disabled && this.#openMenu?.open) this.#openMenu.setOpen(false, 'disabled');
    this.#controls.sync(controller, root, view.groups, view.disabled, () => {
      const more = root.querySelector<HTMLElement>('.toolbar-more-trigger');
      return more
        ? [
            [
              more,
              {
                identifier: MORE_TOOL,
                payload: {
                  label: fillTemplate(view.moreTools, { count: this.#hiddenCount }),
                  shortcut: undefined,
                },
              },
            ],
          ]
        : [];
    });
  }

  #activate(activation: TextEditorToolActivation): void {
    if (activation.reason === 'item-press' && this.#openMenu) this.#changed = true;
    this.#host.handlers.activate(activation);
  }

  /**
   * The open and close proposals of a top-level toolbar menu. Opening one closes the other first,
   * so the closed menu's record precedes the opened one's (`uwg-te-req-surfaces-6`).
   */
  #menuOpenChange(menu: TpMenu, event: TpSurfaceOpenChangeEvent): void {
    const { value, reason, sourceEvent } = event.detail;
    if (!value) {
      if (menu !== this.#openMenu) return;
      const changed = this.#changed;
      this.#openMenu = null;
      this.#changed = false;
      this.#host.handlers.transientClosed?.(menu);
      this.#host.handlers.menuClosed(changed);
      return;
    }
    this.#host.handlers.transientOpened?.(menu, () => {
      if (menu.open) menu.setOpen(false, 'programmatic');
    });
    const other = this.#openMenu;
    if (other && other !== menu) {
      other.setOpen(false, reason, sourceEvent);
      // A close that the other menu did not propose still ends its record.
      if (this.#openMenu === other) {
        const changed = this.#changed;
        this.#openMenu = null;
        this.#changed = false;
        this.#host.handlers.menuClosed(changed);
      }
    }
    this.#openMenu = menu;
    this.#changed = false;
    const trigger = menu.triggerElement;
    if (!trigger) return;
    const modality: TextEditorMenuModality =
      surfaceInteraction(sourceEvent) === 'keyboard' ? 'keyboard' : 'pointer';
    this.#host.handlers.menuOpened(trigger, modality);
  }

  readonly #onMoreOpenChange = (event: TpSurfaceOpenChangeEvent): void => {
    if (event.target === event.currentTarget)
      this.#menuOpenChange(event.currentTarget as TpMenu, event);
  };

  readonly #onOverflow = (event: Event): void => {
    if (event.target !== event.currentTarget) return;
    const list = event.currentTarget as TpOverflowList;
    this.#hiddenGroups = new Set(
      list.hiddenItems.map((item) => item.getAttribute('data-group') ?? ''),
    );
    this.#hiddenCount = list.hiddenCount;
    this.#controller?.refresh();
    this.#host.requestUpdate();
  };

  #teardown(): void {
    this.#controls.clear();
    this.#controller?.dispose();
    this.#controller = null;
    this.#root = null;
    this.#openMenu = null;
    this.#changed = false;
  }
}

/** A tooltip trigger: the identifier and payload it registers with. */
interface TooltipTarget {
  readonly identifier: string;
  readonly payload: TooltipPayload;
}

/**
 * The registrations of a toolbar's rendered controls (`uwg-te-req-a11y-2`): its items, Button
 * groups and separators with its `ToolbarController`, and its row controls with its one Tooltip,
 * synced with the rendered DOM. The fixed and the selection toolbar each own one.
 */
export class TextEditorToolbarControls {
  readonly #items = new Map<
    HTMLElement,
    { kind: ToolbarItemOptions['kind']; registration: ToolbarRegistration<ToolbarItemOptions> }
  >();
  readonly #groups = new Map<HTMLElement, ToolbarRegistration<{ disabled?: boolean }>>();
  readonly #pendingGroups = new Set<HTMLElement>();
  readonly #separators = new Map<HTMLElement, ToolbarRegistration<unknown>>();
  #controller: ToolbarController | null = null;
  #tooltip: TpTooltip | null = null;
  readonly #triggers = new Map<HTMLElement, TooltipRecord>();

  /**
   * Syncs the registrations under `root` with `controller`, and the Tooltip in `root` with its
   * triggers; `extra` adds tooltip triggers that are not tool controls.
   */
  sync(
    controller: ToolbarController,
    root: HTMLElement,
    groups: readonly TextEditorToolbarGroup[],
    disabled: boolean,
    extra: () => Iterable<readonly [HTMLElement, TooltipTarget]> = () => [],
  ): void {
    if (controller !== this.#controller) {
      this.clear();
      this.#controller = controller;
    }
    this.#syncItems(controller, root, disabled);
    this.#syncGroups(controller, root);
    this.#syncTooltips(root, groups, disabled, extra);
  }

  /** Disposes every registration and releases every tooltip trigger. */
  clear(): void {
    for (const { registration } of this.#items.values()) registration.dispose();
    for (const registration of this.#groups.values()) registration.dispose();
    for (const registration of this.#separators.values()) registration.dispose();
    this.#items.clear();
    this.#groups.clear();
    this.#pendingGroups.clear();
    this.#separators.clear();
    this.#releaseTriggers();
    this.#tooltip = null;
    this.#controller = null;
  }

  #syncItems(controller: ToolbarController, root: HTMLElement, disabled: boolean): void {
    const present = new Set<HTMLElement>();
    const controls = [
      ...root.querySelectorAll<HTMLElement>('tp-button[data-tool], tp-toggle[data-tool]'),
      ...root.querySelectorAll<HTMLElement>('.toolbar-more-trigger'),
    ].filter((element) => rowControl(element, root));
    const custom = [...root.querySelectorAll<HTMLElement>('.toolbar-custom')].flatMap((span) =>
      [...span.querySelectorAll<HTMLElement>(CUSTOM_CONTROLS)].filter((element) =>
        rowControl(element, root),
      ),
    );
    const focusableWhenDisabled = !disabled;
    for (const element of [...controls, ...custom]) {
      if (present.has(element)) continue;
      present.add(element);
      const kind = itemKind(element);
      const known = this.#items.get(element);
      if (known?.kind === kind) {
        known.registration.update({ focusableWhenDisabled });
        continue;
      }
      known?.registration.dispose();
      this.#items.set(element, {
        kind,
        registration: controller.registerItem(element, { kind, focusableWhenDisabled }),
      });
    }
    for (const [element, { registration }] of this.#items)
      if (!present.has(element)) {
        registration.dispose();
        this.#items.delete(element);
      }
  }

  #syncGroups(controller: ToolbarController, root: HTMLElement): void {
    const groups = new Set(root.querySelectorAll<HTMLElement>('tp-button-group.toolbar-buttons'));
    for (const group of groups) {
      if (this.#groups.has(group) || this.#pendingGroups.has(group)) continue;
      this.#pendingGroups.add(group);
      const ready = (group as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
      void Promise.resolve(ready).then(() => {
        this.#pendingGroups.delete(group);
        if (this.#controller !== controller || !group.isConnected || this.#groups.has(group))
          return;
        const part = group.shadowRoot?.querySelector<HTMLElement>('[part~="button-group"]');
        if (part) this.#groups.set(group, controller.registerGroup(part));
      });
    }
    for (const [group, registration] of this.#groups)
      if (!groups.has(group)) {
        registration.dispose();
        this.#groups.delete(group);
      }
    const separators = new Set(root.querySelectorAll<HTMLElement>('.toolbar-separator'));
    for (const separator of separators)
      if (!this.#separators.has(separator))
        this.#separators.set(separator, controller.registerSeparator(separator));
    for (const [separator, registration] of this.#separators)
      if (!separators.has(separator)) {
        registration.dispose();
        this.#separators.delete(separator);
      }
  }

  /**
   * Registers every row control, Toggle group member and the More trigger with the one tooltip,
   * again whenever its label, key hint or the widget's disabled state changes (`uwg-te-req-prop-3`).
   */
  #syncTooltips(
    root: HTMLElement,
    groups: readonly TextEditorToolbarGroup[],
    disabled: boolean,
    extra: () => Iterable<readonly [HTMLElement, TooltipTarget]>,
  ): void {
    const tooltip = root.querySelector<TpTooltip>('tp-tooltip.toolbar-tooltip');
    if (tooltip !== this.#tooltip) {
      this.#releaseTriggers();
      this.#tooltip = tooltip;
    }
    if (!tooltip || typeof tooltip.registerTrigger !== 'function') return;
    const items = itemsById(groups);
    const targets = new Map<HTMLElement, TooltipTarget>();
    for (const element of root.querySelectorAll<HTMLElement>(
      'tp-button[data-tool], tp-toggle[data-tool]',
    )) {
      const id = element.dataset['tool'] ?? '';
      const item = items.get(id);
      if (!item || element.closest('.toolbar-custom, .toolbar-more')) continue;
      if (element.closest('tp-menu') && !rowControl(element, root)) continue;
      targets.set(element, {
        identifier: id,
        payload: { label: item.label, shortcut: item.shortcut },
      });
    }
    for (const [element, target] of extra()) targets.set(element, target);
    for (const [element, { identifier, payload }] of targets) {
      const key = `${payload.label}\u0000${payload.shortcut?.display ?? ''}\u0000${String(disabled)}`;
      const known = this.#triggers.get(element);
      if (known?.key === key) continue;
      // Registering an element again is ignored, so a changed trigger is released first.
      known?.release();
      const release = tooltip.registerTrigger(element, {
        identifier,
        payload,
        disabled: disabled,
      });
      this.#triggers.set(element, { key, release });
    }
    for (const [element, { release }] of this.#triggers)
      if (!targets.has(element)) {
        release();
        this.#triggers.delete(element);
      }
  }

  #releaseTriggers(): void {
    for (const { release } of this.#triggers.values()) release();
    this.#triggers.clear();
  }
}
