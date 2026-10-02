import type { ReactiveControllerHost } from 'lit';
import { createId } from '../../foundation/id.js';
import { PresenceController } from '../../foundation/presence.js';
import type { ChoiceRecord } from '../../foundation/choice-collection.js';
import type { SelectEntry, SelectGroup, SelectOption, SelectSeparator } from './types.js';

export interface SelectRecord extends ChoiceRecord {
  id: string;
  text: string;
  option: SelectOption;
  indicator: HTMLElement | null;
  presence: PresenceController;
}
export type SelectNode =
  | SelectRecord
  | (SelectGroup & { id: string; children: SelectNode[] })
  | (SelectSeparator & { id: string });

const negativeZeroIdentity = Symbol('Select negative zero');

/** Stable records separate source declarations from rendered/mounted option hosts. */
export class SelectModel {
  #cache = new Map<unknown, SelectNode>();
  records: SelectRecord[] = [];
  nodes: SelectNode[] = [];
  constructor(private host: ReactiveControllerHost) {}
  update(
    entries: readonly SelectEntry[],
    text: (value: unknown) => string,
    label: (value: unknown) => unknown,
  ): void {
    const retained = new Set<unknown>();
    const records: SelectRecord[] = [];
    const rendered = new Set<string>();
    const walk = (items: readonly SelectEntry[], disabled = false): SelectNode[] =>
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
        const option: SelectOption =
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
    const uniqueNodes = (nodes: SelectNode[]): SelectNode[] =>
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
  #record(option: SelectOption): SelectRecord {
    const record = {
      id: createId('tp-select-option'),
      value: option.value,
      label: option.label,
      text: '',
      option,
      indicator: null,
    } as Omit<SelectRecord, 'presence'>;
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

export function nativeSelectEntries(host: HTMLElement): SelectEntry[] {
  const walk = (parent: Element, inheritedDisabled = false): SelectEntry[] =>
    [...parent.children].flatMap((element): SelectEntry[] => {
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
