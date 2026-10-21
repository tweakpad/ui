import { html, nothing, type TemplateResult } from 'lit';
import { renderShortcutHint } from '../../../components/key-hint/shortcut-hint.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { activationMovesFocus } from '../focus.js';
import type { TextEditorToolHandlers } from './controls.js';
import { colorToolValue, renderColorMenuContent } from '../views/color-menu.js';
import type { TextEditorToolbarItem } from './resolve.js';

/** One `item-press` activation on the toolbar surface, which moves focus into the editing root. */
function itemPress(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
  trigger: Element,
  sourceEvent: Event,
  value?: unknown,
): void {
  handlers.activate({
    tool: item.id,
    ...(value === undefined ? {} : { value }),
    reason: 'item-press',
    surface: handlers.surface ?? 'toolbar',
    sourceEvent,
    trigger,
    focus: activationMovesFocus({ reason: 'item-press' }),
  });
}

/** The leading icon, the label and the menu shortcut hint of an entry (`ucl20-menu-q3`). */
function entryContent(item: TextEditorToolbarItem) {
  return html`${item.icon ? html`<tp-icon .icon=${item.icon}></tp-icon>` : nothing}${item.label}${renderShortcutHint(item.shortcut, 'menu')}`;
}

function checkboxItem(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  // The item calls its callback as its own method, so `this` is the entry.
  const onCheckedChange = function (this: Element, event: TpValueChangeEvent<boolean>) {
    event.preventDefault();
    itemPress(item, handlers, this, event.detail.sourceEvent);
  };
  return html`<tp-menu-checkbox-item
    value=${item.id}
    data-tool=${item.id}
    ?inset=${!item.icon}
    ?disabled=${item.disabled}
    .checked=${item.active}
    .closeOnClick=${true}
    .onCheckedChange=${onCheckedChange}
    >${entryContent(item)}</tp-menu-checkbox-item
  >`;
}

/** A nested menu: unportaled and non-modal, with its default final focus and no open-change report. */
function submenu(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  return html`<tp-menu .portal=${false} .modal=${false} label=${item.label}
    ><tp-button slot="trigger" variant="ghost" data-tool=${item.id} .disabled=${item.disabled}
      >${
        item.icon ? html`<tp-icon slot="icon-start" .icon=${item.icon}></tp-icon>` : nothing
      }${item.label}</tp-button
    >${renderToolMenuContent(item, handlers)}</tp-menu
  >`;
}

function entry(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers): unknown {
  if (item.pair) return item.items.map((member) => checkboxItem(member, handlers));
  if (
    item.kind === 'radio-menu' ||
    (item.kind === 'menu' && item.items.length) ||
    (item.kind === 'color' && item.colors?.length)
  )
    return submenu(item, handlers);
  if (item.kind === 'toggle') return checkboxItem(item, handlers);
  const onClick = function (this: Element, event: Event) {
    itemPress(item, handlers, this, event);
  };
  return html`<tp-menu-item
    value=${item.id}
    data-tool=${item.id}
    ?inset=${!item.icon}
    ?disabled=${item.disabled}
    .closeOnClick=${true}
    .onClick=${onClick}
    >${entryContent(item)}</tp-menu-item
  >`;
}

/** Toolbar items as menu entries, for the More menu's mirror of omitted groups. */
export function renderToolMenuItems(
  items: readonly TextEditorToolbarItem[],
  handlers: TextEditorToolHandlers,
): TemplateResult {
  return html`${items.map((item) => entry(item, handlers))}`;
}

/** The content of a `menu` item's own menu: a radio group for a radio menu, entries otherwise. */
export function renderToolMenuContent(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
): TemplateResult {
  if (item.kind === 'color' && item.colors?.length) {
    const groups = item.colors;
    return renderColorMenuContent(
      groups,
      {
        choose: (channel, color, trigger, sourceEvent) =>
          itemPress(item, handlers, trigger, sourceEvent, colorToolValue(groups, channel, color)),
      },
      item.disabled,
    );
  }
  if (item.kind !== 'radio-menu') return renderToolMenuItems(item.items, handlers);
  // The group calls its callback as its own method, so `this` is the group.
  const onValueChange = function (this: Element, event: TpValueChangeEvent<unknown>) {
    event.preventDefault();
    const value = event.detail.value;
    if (typeof value === 'string') itemPress(item, handlers, this, event.detail.sourceEvent, value);
  };
  return html`<tp-menu-radio-group
    aria-label=${item.label}
    .value=${item.value}
    .onValueChange=${onValueChange}
    >${item.items.map(
      (child) =>
        html`<tp-menu-radio-item
          value=${child.id}
          data-tool=${child.id}
          ?inset=${!child.icon}
          ?disabled=${child.disabled}
          >${entryContent(child)}</tp-menu-radio-item
        >`,
    )}</tp-menu-radio-group
  >`;
}
