import type { CarouselSnapshot } from './types.js';

type PositionSnapshot = Pick<CarouselSnapshot, 'snapIndex' | 'snapCount'>;
type PositionFormatter = (index: number, count: number) => string;

/** Committed snap position text such as "3 of 8", localized through `messages.position`. */
export function carouselPositionText(
  position: PositionFormatter,
  snapshot: PositionSnapshot | null | undefined,
): string {
  const count = snapshot?.snapCount ?? 0;
  const index = snapshot?.snapIndex;
  return position(index === null || index === undefined || !count ? 0 : index + 1, count);
}

/** ARIA range of an interactive Carousel scrollbar, including human-readable value text. */
export function carouselScrollbarValue(
  position: PositionFormatter,
  snapshot: PositionSnapshot | null | undefined,
): { min: number; max: number; now: number; text: string } {
  return {
    min: 0,
    max: Math.max(0, (snapshot?.snapCount ?? 1) - 1),
    now: snapshot?.snapIndex ?? 0,
    text: carouselPositionText(position, snapshot),
  };
}

/** Any track movement or transition boundary is activity for a while-scrolling scrollbar.
 * The first initialized publication and relayout without movement are not activity. */
export function carouselScrollbarActivity(
  previous: Pick<CarouselSnapshot, 'initialized' | 'previewProgress' | 'animating'> | null,
  next: Pick<CarouselSnapshot, 'initialized' | 'previewProgress' | 'animating'>,
): boolean {
  if (!previous?.initialized || !next.initialized) return false;
  return (
    Math.abs(previous.previewProgress - next.previewProgress) > 0.0001 ||
    previous.animating !== next.animating
  );
}

/** A consumer renderer exception cancels that render and keeps the previous coherent
 * output (or the supplied fallback before any successful render). */
export class CarouselRenderGuard<T> {
  #rendered = false;
  #last: T | undefined;
  render(render: () => T, fallback: T, failed: (error: unknown) => void): T {
    try {
      const value = render();
      this.#last = value;
      this.#rendered = true;
      return value;
    } catch (error) {
      failed(error);
      return this.#rendered ? (this.#last as T) : fallback;
    }
  }
  reset(): void {
    this.#rendered = false;
    this.#last = undefined;
  }
}
