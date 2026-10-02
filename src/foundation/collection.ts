import type { Direction, Orientation } from './types.js';

export interface CollectionItem {
  element: HTMLElement;
  disabled?: boolean;
  value?: string;
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
    return this.items.filter((item) => !item.disabled && !item.element.hasAttribute('disabled'));
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
    let next = index < 0 ? 0 : index + delta;
    if (loop) next = (next + enabled.length) % enabled.length;
    else next = Math.max(0, Math.min(enabled.length - 1, next));
    return enabled[next]?.element ?? null;
  }

  handleArrowKey(
    event: KeyboardEvent,
    current: HTMLElement | null,
    orientation: Orientation,
    direction: Direction,
    options: { loop?: boolean; includeDisabled?: boolean } = {},
  ): HTMLElement | null {
    const previous =
      orientation === 'vertical' ? 'ArrowUp' : direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const next =
      orientation === 'vertical' ? 'ArrowDown' : direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
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
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
  }
}
