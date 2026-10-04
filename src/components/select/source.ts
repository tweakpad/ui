import type { ChoiceEntry, ChoiceOption } from '../../foundation/choice-types.js';
import type { SelectItemsData, SelectItemCollection } from './items.js';
import { isSelectItemCollection } from './items.js';
import type { SelectOptionConfiguration } from './query-types.js';

/** Application records retain identity; projection wrappers are stable across query renders. */
export class SelectSource {
  readonly #options = new Map<unknown, ChoiceOption>();
  readonly #groups = new Map<object, Extract<ChoiceEntry, { type: 'group' }>>();
  readonly sources = new Map<ChoiceOption, unknown>();
  normalize(
    source: SelectItemsData<unknown> | SelectItemCollection<unknown> | undefined,
    registered: readonly Element[],
  ): ChoiceEntry[] {
    const collection = isSelectItemCollection(source) ? source : undefined;
    const data = collection ? collection.data : (source as SelectItemsData<unknown> | undefined);
    const retained = new Set<unknown>();
    const retainedGroups = new Set<object>();
    const option = (item: unknown, native = false): ChoiceOption => {
      retained.add(item);
      const configuration = native
        ? this.#native(item as Element)
        : item && typeof item === 'object'
          ? (item as SelectOptionConfiguration)
          : {};
      let wrapper = this.#options.get(item);
      if (!wrapper) this.#options.set(item, (wrapper = { value: item }));
      for (const key of [
        'disabled',
        'nativeAction',
        'index',
        'indicatorKeepMounted',
        'partContract',
        'textContract',
        'indicatorContract',
      ] as const)
        delete wrapper[key];
      Object.assign(wrapper, {
        ...Object.fromEntries(
          [
            'label',
            'disabled',
            'nativeAction',
            'index',
            'row',
            'row',
            'indicatorKeepMounted',
            'partContract',
            'textContract',
            'indicatorContract',
          ]
            .filter((key) => key in configuration)
            .map((key) => [key, configuration[key as keyof SelectOptionConfiguration]]),
        ),
        value:
          native && (item as Element).localName === 'tp-select-option'
            ? (item as Element & { value?: unknown }).value
            : native
              ? ((item as Element & { value?: unknown }).value ??
                (item as Element).getAttribute('value') ??
                '')
              : collection
                ? collection.value(item)
                : item,
        label: native
          ? configuration.label
          : collection
            ? collection.itemLabel(item)
            : configuration.label,
      });
      this.sources.set(wrapper, item);
      if (configuration.onClick) {
        const authored = wrapper.partContract?.hostProperties?.['@click'];
        wrapper.partContract = {
          ...wrapper.partContract,
          hostProperties: {
            ...wrapper.partContract?.hostProperties,
            '@click': (event: MouseEvent) => {
              configuration.onClick!(event);
              if (typeof authored === 'function') authored(event);
            },
          },
        };
      }
      return wrapper;
    };
    const walk = (entries: readonly unknown[], native = false): ChoiceEntry[] =>
      entries.flatMap((item): ChoiceEntry[] => {
        if (item == null) return [];
        if (native && (item as Element).localName === 'hr') return [{ type: 'separator' }];
        if (native && (item as Element).localName === 'optgroup') {
          const element = item as Element;
          retainedGroups.add(element);
          const children = walk([...element.children], true);
          if (element.hasAttribute('disabled'))
            for (const child of children)
              if (child && typeof child === 'object' && 'value' in child) child.disabled = true;
          let group = this.#groups.get(element);
          if (!group) this.#groups.set(element, (group = { type: 'group', items: [] }));
          Object.assign(group, { label: element.getAttribute('label') ?? '', items: children });
          return [group];
        }
        if (!native && typeof item === 'object' && 'items' in item && Array.isArray(item.items)) {
          retainedGroups.add(item);
          let group = this.#groups.get(item);
          if (!group) this.#groups.set(item, (group = { type: 'group', items: [] }));
          Object.assign(group, item, { type: 'group', items: walk(item.items) });
          return [group];
        }
        return [option(item, native)];
      });
    const result = data === undefined ? walk(registered, true) : walk(data);
    for (const [key, wrapper] of this.#options)
      if (!retained.has(key)) {
        this.#options.delete(key);
        this.sources.delete(wrapper);
      }
    for (const key of this.#groups.keys()) if (!retainedGroups.has(key)) this.#groups.delete(key);
    return result;
  }
  #native(element: Element): SelectOptionConfiguration {
    const configured = element as Element & SelectOptionConfiguration;
    return {
      ...('partContracts' in configured
        ? {
            partContract: (configured.partContracts as Record<string, ComponentPartContract>)[
              'select-option'
            ],
          }
        : {}),
      label: configured.label ?? element.getAttribute('label') ?? element.textContent?.trim() ?? '',
      disabled: configured.disabled ?? element.hasAttribute('disabled'),
      nativeAction: configured.nativeAction ?? element.getAttribute('native-action') === 'true',
      ...(configured.index !== undefined ? { index: configured.index } : {}),
      ...(configured.row !== undefined ? { row: configured.row } : {}),
      ...(configured.onClick ? { onClick: configured.onClick } : {}),
      ...(configured.textContract ? { textContract: configured.textContract } : {}),
      ...(configured.indicatorKeepMounted !== undefined
        ? { indicatorKeepMounted: configured.indicatorKeepMounted }
        : {}),
      ...(configured.indicatorContract ? { indicatorContract: configured.indicatorContract } : {}),
      ...(configured.partContract ? { partContract: configured.partContract } : {}),
    };
  }
}
import type { ComponentPartContract } from '../../foundation/part.js';
