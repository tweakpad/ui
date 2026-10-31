import { html, nothing, type TemplateResult } from 'lit';
import { renderShortcutHint } from '../../../components/kbd/shortcut-hint.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { activationMovesFocus } from '../focus.js';
import type { TextEditorToolHandlers } from './controls.js';
import {
  colorToolValue,
  renderColorMenuContent,
  type TextEditorColorMenuHandlers,
} from '../views/color-menu.js';
import type { TextEditorToolbarItem } from './resolve.js';
import { stableValue } from './stable.js';

/** One `item-press` activation of a tool on the toolbar surface, which moves focus into the editing root. */
function itemPress(
  tool: string,
  handlers: TextEditorToolHandlers,
  trigger: Element,
  sourceEvent: Event,
  value?: unknown,
): void {
  handlers.activate({
    tool,
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
  const tool = item.id;
  // The item calls its callback as its own method, so `this` is the entry. One callback per tool
  // and handlers keeps the item unchanged across renders (`stableValue`).
  const onCheckedChange = stableValue(
    handlers,
    `checked\u0000${tool}`,
    () =>
      function (this: Element, event: TpValueChangeEvent<boolean>) {
        event.preventDefault();
        itemPress(tool, handlers, this, event.detail.sourceEvent);
      },
  );
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

/**
 * The icon of a nested menu's trigger: the tool's own, else for a radio menu the checked item's,
 * so that the trigger lines up with the entries that show icons.
 */
export function submenuIcon(item: TextEditorToolbarItem): TextEditorToolbarItem['icon'] {
  if (item.icon || item.kind !== 'radio-menu') return item.icon;
  return item.items.find((child) => child.id === item.value)?.icon;
}

/** A nested menu: unportaled and non-modal, with its default final focus and no open-change report. */
function submenu(item: TextEditorToolbarItem, handlers: TextEditorToolHandlers) {
  const icon = submenuIcon(item);
  return html`<tp-menu .portal=${false} .modal=${false} label=${item.label}
    ><tp-button slot="trigger" variant="ghost" data-tool=${item.id} .disabled=${item.disabled}
      >${
        icon ? html`<tp-icon slot="icon-start" .icon=${icon}></tp-icon>` : nothing
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
  const tool = item.id;
  const onClick = stableValue(
    handlers,
    `click\u0000${tool}`,
    () =>
      function (this: Element, event: Event) {
        itemPress(tool, handlers, this, event);
      },
  );
  return html`<tp-menu-item
    value=${item.id}
    data-tool=${item.id}
    variant=${item.tone === 'destructive' ? 'destructive' : nothing}
    ?inset=${!item.icon}
    ?disabled=${item.disabled}
    .closeOnClick=${true}
    .onClick=${onClick}
    >${entryContent(item)}</tp-menu-item
  >`;
}

/**
 * Toolbar items as menu entries, for the More menu's mirror of omitted groups and a menu tool's
 * own menu, whose further item groups each follow a separator.
 */
export function renderToolMenuItems(
  items: readonly TextEditorToolbarItem[],
  handlers: TextEditorToolHandlers,
): TemplateResult {
  return html`${items.map(
    (item) =>
      html`${item.separated ? html`<tp-separator></tp-separator>` : nothing}${entry(item, handlers)}`,
  )}`;
}

/** The content of a `menu` item's own menu: a radio group for a radio menu, entries otherwise. */
export function renderToolMenuContent(
  item: TextEditorToolbarItem,
  handlers: TextEditorToolHandlers,
): TemplateResult {
  const tool = item.id;
  if (item.kind === 'color' && item.colors?.length) {
    const groups = item.colors;
    // One chooser per tool and channel count (all `colorToolValue` reads of the groups), so the
    // color groups keep their callbacks across renders.
    const colorHandlers = stableValue(
      handlers,
      `color\u0000${tool}\u0000${groups.length > 1}`,
      (): TextEditorColorMenuHandlers => ({
        choose: (channel, color, trigger, sourceEvent) =>
          itemPress(tool, handlers, trigger, sourceEvent, colorToolValue(groups, channel, color)),
      }),
    );
    return renderColorMenuContent(groups, colorHandlers, item.disabled);
  }
  if (item.kind !== 'radio-menu') return renderToolMenuItems(item.items, handlers);
  // The group calls its callback as its own method, so `this` is the group.
  const onValueChange = stableValue(
    handlers,
    `radio\u0000${tool}`,
    () =>
      function (this: Element, event: TpValueChangeEvent<unknown>) {
        event.preventDefault();
        const value = event.detail.value;
        if (typeof value === 'string')
          itemPress(tool, handlers, this, event.detail.sourceEvent, value);
      },
  );
  return html`<tp-menu-radio-group
    .label=${item.label}
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
