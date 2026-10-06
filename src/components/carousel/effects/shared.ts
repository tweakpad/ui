import { OwnedStyles } from '../../../foundation/owned-styles.js';
import type { CarouselEffectItem } from '../../../foundation/carousel/effect.js';

/** Timing every effect factory accepts. */
export interface CarouselEffectTiming {
  /** Transition duration in milliseconds when a navigation does not set a speed. */
  duration?: number;
  /** CSS easing for those transitions. */
  easing?: string;
}

export const easings = {
  /** Smooth start and end for stacked transitions. */
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  /** Fast start, long settle for moving tracks. */
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/** Inline styles an effect writes, restored exactly when the effect detaches. */
export class EffectStyles {
  readonly #styles = new Map<HTMLElement | SVGElement, OwnedStyles>();
  set(element: HTMLElement | SVGElement, property: string, value: string): void {
    let styles = this.#styles.get(element);
    if (!styles) this.#styles.set(element, (styles = new OwnedStyles(element)));
    styles.set(property, value);
  }
  dispose(): void {
    for (const styles of this.#styles.values()) styles.dispose();
    this.#styles.clear();
  }
}

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** The element marked `data-carousel-media` within an item, or null. */
export function carouselItemMedia(item: CarouselEffectItem): HTMLElement | null {
  const content = item.content;
  if (content.matches('[data-carousel-media]')) return content;
  return (
    content.querySelector<HTMLElement>('[data-carousel-media]') ??
    (content.shadowRoot?.querySelector<HTMLElement>('[data-carousel-media]') || null)
  );
}

/** Ordered `data-carousel-layer` elements within an item; the attribute value sets order. */
export function carouselItemLayers(item: CarouselEffectItem): HTMLElement[] {
  return [...item.content.querySelectorAll<HTMLElement>('[data-carousel-layer]')].sort(
    (a, b) => Number(a.dataset.carouselLayer || 0) - Number(b.dataset.carouselLayer || 0),
  );
}
