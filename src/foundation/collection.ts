import type { Direction, Orientation } from './types.js';

/**
 * The index `delta` steps from `index` among `length` items: wrapping past either end when `loop`,
 * held at the ends otherwise; -1 for an empty list.
 */
export function stepIndex(index: number, delta: number, length: number, loop: boolean): number {
  if (length <= 0) return -1;
  const next = index + delta;
  return loop ? ((next % length) + length) % length : Math.max(0, Math.min(length - 1, next));
}

/** The arrow keys that move to the previous and next item along `orientation` in `direction`. */
export function arrowKeys(
  orientation: Orientation,
  direction: Direction,
): { readonly previous: string; readonly next: string } {
  if (orientation === 'vertical') return { previous: 'ArrowUp', next: 'ArrowDown' };
  return direction === 'rtl'
    ? { previous: 'ArrowRight', next: 'ArrowLeft' }
    : { previous: 'ArrowLeft', next: 'ArrowRight' };
}

export interface CollectionItem {
  element: HTMLElement;
  disabled?: boolean;
  value?: string;
  /** Explicit composite policy, including focusable disabled entries. */
  eligible?: () => boolean;
  /** Flattened-tree order for composites spanning multiple shadow roots. */
  order?: () => number;
}

export class CollectionRegistry {
  #items: CollectionItem[] = [];

  register(item: CollectionItem): () => void {
    this.#items.push(item);
    this.#sort();
    return () => {
      const index = this.#items.indexOf(item);
      if (index >= 0) this.#items.splice(index, 1);
    };
  }

  get items(): readonly CollectionItem[] {
    this.#sort();
    return this.#items;
  }

  enabled(): CollectionItem[] {
    return this.items.filter(
      (item) => item.eligible?.() ?? (!item.disabled && !item.element.hasAttribute('disabled')),
    );
  }

  move(
    current: HTMLElement | null,
    delta: number,
    loop = true,
    includeDisabled = false,
  ): HTMLElement | null {
    const enabled = this.navigable(includeDisabled);
    if (enabled.length === 0) return null;
    const index = enabled.findIndex((item) => item.element === current);
    const next = index < 0 ? 0 : stepIndex(index, delta, enabled.length, loop);
    return enabled[next]?.element ?? null;
  }

  handleArrowKey(
    event: KeyboardEvent,
    current: HTMLElement | null,
    orientation: Orientation,
    direction: Direction,
    options: { loop?: boolean; includeDisabled?: boolean } = {},
  ): HTMLElement | null {
    const { previous, next } = arrowKeys(orientation, direction);
    let target: HTMLElement | null = null;
    if (event.key === previous)
      target = this.move(current, -1, options.loop ?? true, options.includeDisabled);
    else if (event.key === next)
      target = this.move(current, 1, options.loop ?? true, options.includeDisabled);
    else if (event.key === 'Home')
      target = this.navigable(options.includeDisabled)[0]?.element ?? null;
    else if (event.key === 'End')
      target = this.navigable(options.includeDisabled).at(-1)?.element ?? null;
    if (target) {
      event.preventDefault();
      target.focus();
    }
    return target;
  }

  private navigable(includeDisabled = false): readonly CollectionItem[] {
    // aria-disabled tabs may be explored; native disabled controls cannot receive focus.
    return includeDisabled
      ? this.items.filter((item) => !item.element.matches(':disabled'))
      : this.enabled();
  }

  #sort(): void {
    this.#items.sort((a, b) => {
      if (a.element === b.element) return 0;
      if (a.order && b.order) return a.order() - b.order();
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
  }
}
