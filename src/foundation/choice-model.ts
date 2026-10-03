import type { ReactiveControllerHost } from 'lit';
import { createId } from './id.js';
import { PresenceController } from './presence.js';
import type { ChoiceRecord } from './choice-collection.js';
import type { ChoiceEntry, ChoiceGroup, ChoiceOption, ChoiceSeparator } from './choice-types.js';

export interface ChoiceModelRecord extends ChoiceRecord {
  id: string;
  text: string;
  option: ChoiceOption;
  indicator: HTMLElement | null;
  presence: PresenceController;
}
export type ChoiceModelNode =
  | ChoiceModelRecord
  | (ChoiceGroup & { id: string; children: ChoiceModelNode[] })
  | (ChoiceSeparator & { id: string });

const negativeZeroIdentity = Symbol('Select negative zero');

/** Stable records separate source declarations from rendered/mounted option hosts. */
export class ChoiceModel {
  #cache = new Map<unknown, ChoiceModelNode>();
  records: ChoiceModelRecord[] = [];
  nodes: ChoiceModelNode[] = [];
  constructor(private host: ReactiveControllerHost) {}
  update(
    entries: readonly ChoiceEntry[],
    text: (value: unknown) => string,
    label: (value: unknown) => unknown,
  ): void {
    const retained = new Set<unknown>();
    const records: ChoiceModelRecord[] = [];
    const rendered = new Set<string>();
    const walk = (items: readonly ChoiceEntry[], disabled = false): ChoiceModelNode[] =>
      items.map((entry) => {
        const key = Object.is(entry, -0) ? negativeZeroIdentity : entry;
        retained.add(key);
        const existing = this.#cache.get(key);
        if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'group') {
          const group = {
            ...entry,
            id: existing?.id ?? createId('tp-select-group'),
            children: walk(entry.items, disabled),
          };
          this.#cache.set(key, group);
          return group;
        }
        if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'separator') {
          const separator = { ...entry, id: existing?.id ?? createId('tp-select-separator') };
          this.#cache.set(key, separator);
          return separator;
        }
        const option: ChoiceOption =
          entry && typeof entry === 'object' && 'value' in entry ? entry : { value: entry };
        const record = existing && 'value' in existing ? existing : this.#record(option);
        record.option = option;
        record.value = option.value;
        record.label = option.label ?? label(option.value);
        record.text =
          option.text ?? (typeof option.label === 'string' ? option.label : text(option.value));
        record.disabled = disabled || !!option.disabled;
        records.push(record);
        this.#cache.set(key, record);
        return record;
      });
    const uniqueNodes = (nodes: ChoiceModelNode[]): ChoiceModelNode[] =>
      nodes.filter((node) => {
        if (rendered.has(node.id)) return false;
        rendered.add(node.id);
        if ('children' in node) node.children = uniqueNodes(node.children);
        return true;
      });
    this.nodes = uniqueNodes(walk(entries));
    this.records = records;
    for (const [key, node] of this.#cache)
      if (!retained.has(key)) {
        if ('presence' in node) node.presence.destroy();
        this.#cache.delete(key);
      }
  }
  #record(option: ChoiceOption): ChoiceModelRecord {
    const record = {
      id: createId('tp-select-option'),
      value: option.value,
      label: option.label,
      text: '',
      option,
      indicator: null,
    } as Omit<ChoiceModelRecord, 'presence'>;
    const presence = new PresenceController(this.host, {
      surface: () => record.indicator,
      keepMounted: () => !!record.option.indicatorKeepMounted,
    });
    return Object.assign(record, { presence });
  }
  destroy(): void {
    for (const node of this.#cache.values()) if ('presence' in node) node.presence.destroy();
    this.#cache.clear();
  }
}

export function nativeChoiceEntries(host: HTMLElement): ChoiceEntry[] {
  const walk = (parent: Element, inheritedDisabled = false): ChoiceEntry[] =>
    [...parent.children].flatMap((element): ChoiceEntry[] => {
      if (element.localName === 'optgroup')
        return [
          {
            type: 'group',
            label: element.getAttribute('label') ?? '',
            items: walk(element, inheritedDisabled || element.hasAttribute('disabled')),
          },
        ];
      if (element.localName === 'option')
        return [
          {
            value: element.getAttribute('value') ?? element.textContent?.trim() ?? '',
            label: element.getAttribute('label') ?? element.textContent?.trim() ?? '',
            disabled: inheritedDisabled || element.hasAttribute('disabled'),
          },
        ];
      if (element.localName === 'hr') return [{ type: 'separator' }];
      return [];
    });
  return walk(host);
}
