import { html, nothing, type TemplateResult } from 'lit';
import type { ComponentPartContract } from '../../foundation/part.js';
import { renderShortcutHint } from '../key-hint/shortcut-hint.js';
import type { CommandItem } from './model.js';

/** The text of a command item: its `text`, else a string label, else its value. */
export function commandItemText(item: CommandItem): string {
  return item.text ?? (typeof item.label === 'string' ? item.label : String(item.value));
}

/**
 * The row content of a command item: its icon, its label (`label`, which a caller may mark with
 * match ranges), its description as a secondary line after the label, and its shortcut hint.
 */
export function renderCommandItemContent(item: CommandItem, label: unknown): TemplateResult {
  return html`${
    item.icon
      ? html`<tp-icon
          .icon=${item.icon}
          size="var(--tp-icon-size-sm)"
          aria-hidden="true"
        ></tp-icon>`
      : nothing
  }<span>${label}${
    item.description
      ? html`<span part="command-palette-item-description">${item.description}</span>`
      : nothing
  }</span>${renderShortcutHint(item.shortcut, 'palette')}`;
}

/**
 * The option contract of a command item: its description, when it has one, is the option's
 * accessible description, so the accessible name stays the label.
 */
function itemContract(item: CommandItem): ComponentPartContract | undefined {
  if (!item.description) return item.partContract;
  const own = item.partContract;
  return {
    ...own,
    hostProperties: { ...own?.hostProperties, 'aria-description': item.description },
  };
}

/**
 * Projects a command item into a Select option of a command list, in place on `target` when one
 * is given so that its identity stays: the item's members, its `text`, the row content as
 * `label`, and its description as the option's accessible description.
 */
export function projectCommandItem(
  item: CommandItem,
  label: unknown = item.label ?? String(item.value),
  target?: CommandItem,
): CommandItem {
  const projected = target ?? ({ value: item.value } as CommandItem);
  for (const key of Object.keys(projected))
    if (!(key in item)) delete (projected as unknown as Record<string, unknown>)[key];
  const contract = itemContract(item);
  Object.assign(projected, item, {
    text: commandItemText(item),
    label: renderCommandItemContent(item, label),
  });
  if (contract) projected.partContract = contract;
  return projected;
}
