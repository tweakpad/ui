import { CollectionRegistry, stepIndex } from './collection.js';
import { TypeaheadController } from './typeahead.js';

export interface ChoiceRecord<T = unknown> {
  value: T;
  label: unknown;
  text?: string;
  disabled?: boolean;
  element?: HTMLElement;
}

export interface ChoiceCollectionOptions<T> {
  equals?: (a: T, b: T) => boolean;
  /** Whether `equals` currently reduces to `Object.is`, so duplicates are found through a set. */
  identity?: () => boolean;
  diagnostic?: (message: string) => void;
  locale?: () => string | undefined;
}

// Object.is tells -0 from 0; a set does not.
const negativeZero = Symbol('negative zero');

/** The common finite-choice owner. Editing/filter policy stays with searchable Select. */
export class ChoiceCollectionController<T, R extends ChoiceRecord<T> = ChoiceRecord<T>> {
  readonly registry = new CollectionRegistry();
  readonly typeahead: TypeaheadController;
  #source: readonly R[] = [];
  #members = new Set<R>();
  #visible: readonly R[] = [];
  #filter: (record: R) => boolean = () => true;
  #visibleOrder: readonly R[] | undefined;
  #highlight: R | undefined;
  #unregister: Array<() => void> = [];
  #mounted = new Map<R, HTMLElement>();
  constructor(private options: ChoiceCollectionOptions<T> = {}) {
    this.typeahead = new TypeaheadController(undefined, options.locale);
  }

  equal(a: T, b: T): boolean {
    return this.options.equals?.(a, b) ?? Object.is(a, b);
  }
  get source(): readonly R[] {
    return this.#source;
  }
  get visible(): readonly R[] {
    return this.#visible;
  }
  get highlighted(): R | undefined {
    return this.#highlight;
  }
  get activeIndex(): number {
    return this.#highlight ? this.#visible.indexOf(this.#highlight) : -1;
  }
  set activeIndex(index: number) {
    const record = this.#visible[index];
    this.#highlight = record && !record.disabled ? record : undefined;
  }
  setSource(records: readonly R[]): void {
    const unique: R[] = [];
    // Identity-compared values dedupe through a set; a custom equality compares pairs.
    const seen = !this.options.equals || this.options.identity?.() ? new Set<unknown>() : undefined;
    for (const record of records) {
      const key = Object.is(record.value, -0) ? negativeZero : record.value;
      if (
        seen ? seen.has(key) : unique.some((existing) => this.equal(existing.value, record.value))
      ) {
        this.options.diagnostic?.(
          'Duplicate choice values are excluded from navigation and selection.',
        );
      } else {
        unique.push(record);
        seen?.add(key);
      }
    }
    this.#source = unique;
    this.#members = new Set(unique);
    this.#refresh();
  }
  setFilter(filter: (record: R) => boolean, order?: readonly R[]): void {
    this.#filter = filter;
    this.#visibleOrder = order;
    this.#refresh();
  }
  mount(record: R, element: HTMLElement | null): void {
    if (element) this.#mounted.set(record, element);
    else this.#mounted.delete(record);
    this.#register();
  }
  element(record: R | undefined): HTMLElement | null {
    return record ? (this.#mounted.get(record) ?? record.element ?? null) : null;
  }
  selected(value: T): R | undefined {
    return this.#source.find((record) => this.equal(record.value, value));
  }
  openAt(values: readonly T[], last = false): R | undefined {
    this.typeahead.reset();
    this.#highlight =
      this.#visible.find(
        (record) => !record.disabled && values.some((value) => this.equal(value, record.value)),
      ) ??
      (last
        ? this.#visible.filter((record) => !record.disabled).at(-1)
        : this.#visible.find((record) => !record.disabled));
    return this.#highlight;
  }
  move(delta: number, loop = true): R | undefined {
    const enabled = this.#visible.filter((record) => !record.disabled);
    if (!enabled.length) return (this.#highlight = undefined);
    if (!this.#highlight)
      // Nothing highlighted (a list opened by a pointer): the first record forward, the last one
      // backward, mounted or not.
      this.#highlight = delta < 0 ? enabled.at(-1) : enabled[0];
    else if (enabled.every((record) => this.element(record))) {
      const target = this.registry.move(this.element(this.#highlight), delta, loop);
      this.#highlight = enabled.find((record) => this.element(record) === target);
    } else {
      // Source records may exist before their option hosts are mounted.
      const current = this.#highlight ? enabled.indexOf(this.#highlight) : -1;
      const index =
        current < 0
          ? delta < 0
            ? enabled.length - 1
            : 0
          : stepIndex(current, delta, enabled.length, loop);
      this.#highlight = enabled[index];
    }
    return this.#highlight;
  }
  boundary(last = false): R | undefined {
    const enabled = this.#visible.filter((record) => !record.disabled);
    return (this.#highlight = last ? enabled.at(-1) : enabled[0]);
  }
  search(key: string): R | undefined {
    const index = this.typeahead.search(
      this.#visible.map((record, index) => ({
        value: String(index),
        label: record.text ?? String(record.label ?? record.value),
        disabled: !!record.disabled,
      })),
      key,
      this.activeIndex,
    );
    if (index >= 0) this.activeIndex = index;
    return index >= 0 ? this.#highlight : undefined;
  }
  toggle(values: readonly T[], value: T): T[] {
    return values.some((item) => this.equal(item, value))
      ? values.filter((item) => !this.equal(item, value))
      : [...values, value];
  }
  normalize(values: readonly T[]): T[] {
    return values.filter(
      (value, index) => values.findIndex((item) => this.equal(item, value)) === index,
    );
  }
  disconnect(): void {
    this.typeahead.reset();
    this.#unregister.splice(0).forEach((release) => release());
    this.#mounted.clear();
  }
  #refresh(): void {
    const previous = this.#highlight;
    this.#visible = (this.#visibleOrder ?? this.#source).filter(
      (record) => this.#members.has(record) && this.#filter(record),
    );
    this.#highlight = previous
      ? (this.#visible.find(
          (record) => !record.disabled && this.equal(record.value, previous.value),
        ) ?? this.#visible.find((record) => !record.disabled))
      : undefined;
    for (const record of this.#mounted.keys())
      if (!this.#members.has(record)) this.#mounted.delete(record);
    this.#register();
  }
  #register(): void {
    this.#unregister.splice(0).forEach((release) => release());
    // The visible order is the navigation order: the controls of records often sit in different
    // shadow roots (a menu item's own control, a submenu's trigger), where document position
    // cannot order them.
    this.#visible.forEach((record, index) => {
      const element = this.element(record);
      if (element)
        this.#unregister.push(
          this.registry.register({ element, disabled: !!record.disabled, order: () => index }),
        );
    });
  }
}
