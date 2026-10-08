/**
 * Viewport entry for reveals (Foundation §18.18 `vr-signals`): near, in view and out, observed
 * through the shared intersection service. Used by coordinators and by standalone revealing
 * components, so every reveal enters, repeats and resets the same way.
 */
import { canObserveIntersection, observeIntersection } from './observation.js';

/** Where preparation (loading) starts: within 25% of the visible area and scroll containers. */
export const REVEAL_NEAR_MARGIN = '25%';
/** Where a repeating reveal enters: 10% inside the viewport's block edges. */
export const REVEAL_ENTRY_INSET = '-10% 0px -10% 0px';

export interface ViewportTriggerOptions {
  /** Whether the reveal repeats: enter on the inset, reset on out. */
  repeat(): boolean;
  /** Also observe the near margin. */
  near?: boolean;
  /** Reflect `data-in-view` on the element while observed. */
  marker?: boolean;
  /** Any signal changed. */
  changed(): void;
  /** The element left the view entirely. */
  left?(): void;
}

export class ViewportTrigger {
  #near = false;
  #inView = false;
  #releases: (() => void)[] = [];
  #observedRepeat: boolean | undefined;

  constructor(
    private readonly element: Element,
    private readonly options: ViewportTriggerOptions,
  ) {}

  /** Within the preparation margin (always true without intersection support). */
  get near(): boolean {
    return this.#near;
  }

  /** Entered: intersecting, or inside the entry inset for a repeating reveal. */
  get inView(): boolean {
    return this.#inView;
  }

  /** Observes while `active`, re-subscribing when the repeat mode changes. */
  sync(active: boolean): void {
    if (!active) {
      this.release();
      return;
    }
    const repeat = this.options.repeat();
    if (this.#releases.length && repeat === this.#observedRepeat) return;
    this.#unsubscribe();
    this.#observedRepeat = repeat;
    if (!canObserveIntersection(this.element)) {
      this.#near = this.#inView = true;
      this.#releases.push(() => {});
      return;
    }
    if (this.options.near)
      this.#releases.push(
        observeIntersection(
          this.element,
          (entry) => {
            this.#near = entry.isIntersecting;
            this.options.changed();
          },
          { rootMargin: REVEAL_NEAR_MARGIN, scrollMargin: REVEAL_NEAR_MARGIN },
        ),
      );
    this.#releases.push(
      observeIntersection(this.element, (entry) => {
        if (this.options.marker)
          this.element.setAttribute('data-in-view', String(entry.isIntersecting));
        // Fully out of view: a repeating reveal returns to its start state.
        if (!repeat) this.#inView = entry.isIntersecting;
        else if (!entry.isIntersecting) {
          this.#inView = false;
          this.options.left?.();
        }
        this.options.changed();
      }),
    );
    if (repeat)
      this.#releases.push(
        observeIntersection(
          this.element,
          (entry) => {
            if (entry.isIntersecting) this.#inView = true;
            this.options.changed();
          },
          { rootMargin: REVEAL_ENTRY_INSET },
        ),
      );
  }

  /** Stops observing synchronously; signals return to false until observed again. */
  release(): void {
    this.#unsubscribe();
    this.#observedRepeat = undefined;
    this.#near = this.#inView = false;
    if (this.options.marker) this.element.removeAttribute('data-in-view');
  }

  #unsubscribe(): void {
    for (const release of this.#releases) release();
    this.#releases = [];
  }
}
