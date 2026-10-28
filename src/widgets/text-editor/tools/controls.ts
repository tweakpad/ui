import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { shortcutAria } from '../../../components/key-hint/shortcut-hint.js';
import type { TpMenu } from '../../../components/menu/menu.js';
import type { TpToggle } from '../../../components/toggle/toggle.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { surfaceInteraction, type SurfaceInteraction } from '../../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import type { TextEditorRequestSurface } from '../../../foundation/text-editor/tools.js';
import { chevronDownIcon } from '../../../icons/chevron-down.js';
import { activationMovesFocus } from '../focus.js';
import { renderToolMenuContent } from './menu-items.js';
import type { TextEditorToolbarItem } from './resolve.js';
import { stableRecord, stableValue } from './stable.js';

/** One tool activation from a toolbar control or a toolbar menu item. */
export interface TextEditorToolActivation {
  readonly tool: string;
  /** The value of a tool that takes one: the chosen item of a radio menu. */
  readonly value?: unknown;
  readonly reason: 'trigger-press' | 'item-press';
  /** The surface that placed the control. */
  readonly surface: TextEditorRequestSurface;
  readonly sourceEvent: Event;
  /** The control or menu item that issued it: the request's `trigger`. */
  readonly trigger: Element;
  /**
   * Whether applying moves focus into the editing root, as the focus policy answers for the
   * source: false for a trigger press by keyboard or pointer (`uwg-te-req-a11y-2`,
   * `uwg-te-req-key-8`), true for an item press (`uwg-te-req-a11y-6`).
   */
  readonly focus: boolean;
}

/** What the renderers call; the toolbar view implements it per instance. */
export interface TextEditorToolHandlers {
  activate(activation: TextEditorToolActivation): void;
  /** `tp-open-change` of a top-level toolbar menu, open and close proposals (nested menus excluded). */
  menuOpenChange(menu: TpMenu, event: TpSurfaceOpenChangeEvent): void;
  /**
   * The host's menu close focus, a stable reference bound unchanged on every top-level toolbar
   * Menu; nested menus keep their default (`uwg-te-req-a11y-6`).
   */
  readonly finalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean;
  /** The surface whose requests the controls issue; default `toolbar`. */
  readonly surface?: TextEditorRequestSurface | undefined;
  /** The size of icon controls; default `icon` (the fixed toolbar), `icon-sm` on the selection toolbar. */
  readonly iconSize?: 'icon' | 'icon-sm' | undefined;
}

/**
 * The DOM key of each item of a toolbar group: its tool identifier, with the occurrence appended
 * for a further listing of the same tool. Keyed controls keep their elements, and so focus, when
 * a layout or state change adds or removes items around them.
 */
export function toolControlKeys(items: readonly TextEditorToolbarItem[]): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const count = seen.get(item.id) ?? 0;
    seen.set(item.id, count + 1);
    return count ? `${item.id}\u0000${count}` : item.id;
  });
}

/** A toolbar group's items as their controls, keyed by tool (`toolControlKeys`). */
export function renderToolControls(
  items: readonly TextEditorToolbarItem[],
  handlers: TextEditorToolHandlers,
): unknown {
  const keys = toolControlKeys(items);
  return repeat(
    items,
    (_item, index) => keys[index],
    (item) => renderToolControl(item, handlers),
  );
}

/**
 * A toolbar item as its control, at the sizes of its toolbar. A `hidden` item's control keeps its
 * place, marked `data-tool-hidden` (unseen through the widget's styles) and inert, so that it is
 * out of the Toolbar's navigation and the accessibility tree (`uwg-te-req-pres-5`).
 */
export function renderToolControl(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
): TemplateResult {
  switch (item.control) {
    case 'toggle': {
      const tool = item.id;
      return renderToggle(item, handlers, `toggle\u0000${tool}`, (toggle, event) =>
        press(tool, handlers, toggle, event.detail.sourceEvent),
      );
    }
    case 'toggle-group':
      return renderToggleGroup(item, handlers);
    case 'menu':
      return item.items.length || item.colors?.length
        ? renderMenu(item, handlers)
        : renderMenuTrigger(item, handlers);
    case 'custom':
      return html`<span
        class="toolbar-custom"
        data-tool=${item.id}
        ?data-tool-hidden=${!!item.hidden}
        ?inert=${!!item.hidden}
        >${item.render?.()}</span
      >`;
    default:
      return renderButton(item, handlers);
  }
}

/** One `trigger-press` activation of a tool on the toolbar surface, its focus from the shared policy. */
function press(
  tool: string,
  handlers: TextEditorToolHandlers,
  trigger: Element,
  sourceEvent: Event,
  value?: string,
): void {
  const modality = surfaceInteraction(sourceEvent) === 'keyboard' ? 'keyboard' : 'pointer';
  handlers.activate({
    tool,
    ...(value === undefined ? {} : { value }),
    reason: 'trigger-press',
    surface: handlers.surface ?? 'toolbar',
    sourceEvent,
    trigger,
    focus: activationMovesFocus({ reason: 'trigger-press', modality }),
  });
}

/** The size of a control that shows text or a chevron: one step down beside small icon controls. */
function textSize(handlers: TextEditorToolHandlers): 'default' | 'sm' {
  return handlers.iconSize === 'icon-sm' ? 'sm' : 'default';
}

/** The host properties that publish a control's shortcut and its dialog popup. */
function hostProperties(item: TextEditorToolbarItem): Record<string, unknown> {
  return {
    'aria-keyshortcuts': shortcutAria(item.shortcut),
    ...(item.popup ? { 'aria-haspopup': item.popup, 'aria-expanded': String(item.expanded) } : {}),
  };
}

/** The part contract of a control's `part`, one stable record per content (`stableRecord`). */
function partContracts(part: 'button' | 'toggle', item: TextEditorToolbarItem) {
  return stableRecord({ [part]: { hostProperties: hostProperties(item) } });
}

function renderButton(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  return html`<tp-button
    variant="ghost"
    size=${item.display === 'icon' ? (handlers.iconSize ?? 'icon') : textSize(handlers)}
    type="button"
    data-tool=${item.id}
    .icon=${item.display === 'label' ? undefined : item.icon}
    .disabled=${item.disabled}
    .partContracts=${partContracts('button', item)}
    @click=${(event: Event) => press(item.id, handlers, event.currentTarget as Element, event)}
    ?data-tool-hidden=${!!item.hidden}
    ?inert=${!!item.hidden}
    >${item.text}</tp-button
  >`;
}

/**
 * A Toggle whose own proposal is vetoed; `onPress` issues the request (`uwg-te-req-evt-6`). Its
 * callback is kept per `handlers` under `key`, which names everything `onPress` closes over.
 */
function renderToggle(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
  key: string,
  onPress: (toggle: TpToggle, event: TpValueChangeEvent<boolean>) => void,
  member = false,
) {
  // The Toggle calls its callback as its own method, so `this` is the control.
  const onPressedChange = stableValue(
    handlers,
    key,
    () =>
      function (this: TpToggle, event: TpValueChangeEvent<boolean>) {
        event.preventDefault();
        onPress(this, event);
      },
  );
  return html`<tp-toggle
    variant=${member ? nothing : 'ghost'}
    size=${member ? nothing : (handlers.iconSize ?? 'icon')}
    value=${member ? item.id : nothing}
    data-tool=${item.id}
    .pressed=${member ? undefined : item.active}
    .ariaLabel=${item.label}
    .disabled=${item.disabled}
    .partContracts=${partContracts('toggle', item)}
    .onPressedChange=${onPressedChange}
    ?data-tool-hidden=${!!item.hidden}
    ?inert=${!!item.hidden}
    ><tp-icon .icon=${item.icon}></tp-icon
  ></tp-toggle>`;
}

/**
 * An exclusive pair, or a radio menu shown inline, as one single-selection Toggle group. The group
 * registers its own members with the toolbar (`uwg-te-toggle-group-req-toolbar`).
 */
function renderToggleGroup(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  const { id: tool, pair } = item;
  const members = item.items.map((member) => {
    const id = member.id;
    return renderToggle(
      member,
      handlers,
      `member\u0000${tool}\u0000${id}\u0000${pair}`,
      (toggle, event) => {
        const source = event.detail.sourceEvent;
        if (pair) press(id, handlers, toggle, source);
        // An inline radio menu keeps its value: releasing the pressed member does nothing.
        else if (event.detail.value) press(tool, handlers, toggle, source, id);
      },
      true,
    );
  });
  return html`<tp-toggle-group
    variant="ghost"
    size=${handlers.iconSize ?? 'icon'}
    data-tool=${item.id}
    label=${item.pair ? nothing : item.label}
    .value=${stableRecord(item.value ? [item.value] : [])}
    .disabled=${!item.focusableWhenDisabled}
    ?data-tool-hidden=${!!item.hidden}
    ?inert=${!!item.hidden}
    >${members}</tp-toggle-group
  >`;
}

/**
 * The trigger of a menu tool, named by `aria-label`: its icon, its text (the active item's label
 * for an `active-label` trigger) or both, as its display says, and a chevron.
 */
function triggerContent(item: TextEditorToolbarItem) {
  const icon =
    item.display === 'label'
      ? nothing
      : html`<tp-icon slot="icon-start" .icon=${item.icon}></tp-icon>`;
  const text = item.display === 'label' || item.display === 'icon-label' ? item.text : nothing;
  return html`${icon}${text}<tp-icon slot="icon-end" .icon=${chevronDownIcon}></tp-icon>`;
}

/** A menu tool with no menu yet (color at M6): its trigger activates the tool with no value. */
function renderMenuTrigger(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  return html`<tp-button
    variant="ghost"
    size=${textSize(handlers)}
    type="button"
    data-tool=${item.id}
    .ariaLabel=${item.label}
    .disabled=${item.disabled}
    .partContracts=${partContracts('button', item)}
    @click=${(event: Event) => press(item.id, handlers, event.currentTarget as Element, event)}
    ?data-tool-hidden=${!!item.hidden}
    ?inert=${!!item.hidden}
    >${triggerContent(item)}</tp-button
  >`;
}

function renderMenu(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  const openChange = (event: TpSurfaceOpenChangeEvent) => {
    if (event.target === event.currentTarget)
      handlers.menuOpenChange(event.currentTarget as TpMenu, event);
  };
  return html`<tp-menu
    .portal=${false}
    .modal=${false}
    label=${item.label}
    .finalFocus=${handlers.finalFocus}
    @tp-open-change=${openChange}
    ?data-tool-hidden=${!!item.hidden}
    ?inert=${!!item.hidden}
    ><tp-button
      slot="trigger"
      variant="ghost"
      size=${textSize(handlers)}
      data-tool=${item.id}
      .ariaLabel=${item.label}
      .disabled=${item.disabled}
      .partContracts=${partContracts('button', item)}
      >${triggerContent(item)}</tp-button
    >${renderToolMenuContent(item, handlers)}</tp-menu
  >`;
}
