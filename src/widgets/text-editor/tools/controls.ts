import { html, nothing, type TemplateResult } from 'lit';
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

/** A toolbar item as its control, at the sizes of its toolbar. */
export function renderToolControl(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
): TemplateResult {
  switch (item.control) {
    case 'toggle':
      return renderToggle(item, handlers, (toggle, event) =>
        press(item, handlers, toggle, event.detail.sourceEvent),
      );
    case 'toggle-group':
      return renderToggleGroup(item, handlers);
    case 'menu':
      return item.items.length || item.colors?.length
        ? renderMenu(item, handlers)
        : renderMenuTrigger(item, handlers);
    case 'custom':
      return html`<span class="toolbar-custom" data-tool=${item.id}>${item.render?.()}</span>`;
    default:
      return renderButton(item, handlers);
  }
}

/** One `trigger-press` activation on the toolbar surface, its focus from the shared policy. */
function press(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
  trigger: Element,
  sourceEvent: Event,
  value?: string,
): void {
  const modality = surfaceInteraction(sourceEvent) === 'keyboard' ? 'keyboard' : 'pointer';
  handlers.activate({
    tool: item.id,
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

function renderButton(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  return html`<tp-button
    variant="ghost"
    size=${item.display === 'icon' ? (handlers.iconSize ?? 'icon') : textSize(handlers)}
    type="button"
    data-tool=${item.id}
    .icon=${item.display === 'label' ? undefined : item.icon}
    .disabled=${item.disabled}
    .partContracts=${{ button: { hostProperties: hostProperties(item) } }}
    @click=${(event: Event) => press(item, handlers, event.currentTarget as Element, event)}
    >${item.text}</tp-button
  >`;
}

/** A Toggle whose own proposal is vetoed; `onPress` issues the request (`uwg-te-req-evt-6`). */
function renderToggle(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
  onPress: (toggle: TpToggle, event: TpValueChangeEvent<boolean>) => void,
  member = false,
) {
  void handlers;
  // The Toggle calls its callback as its own method, so `this` is the control.
  const onPressedChange = function (this: TpToggle, event: TpValueChangeEvent<boolean>) {
    event.preventDefault();
    onPress(this, event);
  };
  return html`<tp-toggle
    variant=${member ? nothing : 'ghost'}
    size=${member ? nothing : (handlers.iconSize ?? 'icon')}
    value=${member ? item.id : nothing}
    data-tool=${item.id}
    .pressed=${member ? undefined : item.active}
    .ariaLabel=${item.label}
    .disabled=${item.disabled}
    .partContracts=${{ toggle: { hostProperties: hostProperties(item) } }}
    .onPressedChange=${onPressedChange}
    ><tp-icon .icon=${item.icon}></tp-icon
  ></tp-toggle>`;
}

/**
 * An exclusive pair, or a radio menu shown inline, as one single-selection Toggle group. The group
 * registers its own members with the toolbar (`uwg-te-toggle-group-req-toolbar`).
 */
function renderToggleGroup(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  const members = item.items.map((member) =>
    renderToggle(
      member,
      handlers,
      (toggle, event) => {
        const source = event.detail.sourceEvent;
        if (item.pair) press(member, handlers, toggle, source);
        // An inline radio menu keeps its value: releasing the pressed member does nothing.
        else if (event.detail.value) press(item, handlers, toggle, source, member.id);
      },
      true,
    ),
  );
  return html`<tp-toggle-group
    variant="ghost"
    size=${handlers.iconSize ?? 'icon'}
    data-tool=${item.id}
    label=${item.pair ? nothing : item.label}
    .value=${item.value ? [item.value] : []}
    .disabled=${!item.focusableWhenDisabled}
    >${members}</tp-toggle-group
  >`;
}

/** The trigger of a menu tool: the tool icon and a chevron, named by `aria-label`. */
function triggerContent(item: TextEditorToolbarItem) {
  return html`<tp-icon slot="icon-start" .icon=${item.icon}></tp-icon
    ><tp-icon slot="icon-end" .icon=${chevronDownIcon}></tp-icon>`;
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
    .partContracts=${{ button: { hostProperties: hostProperties(item) } }}
    @click=${(event: Event) => press(item, handlers, event.currentTarget as Element, event)}
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
    ><tp-button
      slot="trigger"
      variant="ghost"
      size=${textSize(handlers)}
      data-tool=${item.id}
      .ariaLabel=${item.label}
      .disabled=${item.disabled}
      .partContracts=${{ button: { hostProperties: hostProperties(item) } }}
      >${triggerContent(item)}</tp-button
    >${renderToolMenuContent(item, handlers)}</tp-menu
  >`;
}
