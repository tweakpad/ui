import { prepareMotion, resolvesReducedMotion, type MotionHandle } from '../motion.js';
import { OwnedStyles } from '../owned-styles.js';
import type { CarouselController } from './controller.js';
import type { CarouselElements } from './input.js';
import { carouselMotionRoles, carouselMotionTiming } from './timing.js';
import type { CarouselNavigationRequest } from './types.js';

/**
 * Presents the physical transform-transport position. The native scroll transport stays
 * in CarouselTransport; every transform-model presentation implements this interface.
 */
export interface CarouselPresenter {
  /** Current presented physical position, including an in-flight transition. */
  readonly position: number;
  move(position: number, request: CarouselNavigationRequest): Promise<void>;
  /** Freeze at the current presented position and stop any transition. */
  cancel(): void;
  dispose(): void;
}

/** Default presentation: translate the track, animated through the `track` motion role. */
export class TranslatePresenter implements CarouselPresenter {
  readonly #track: OwnedStyles;
  #motion: MotionHandle | undefined;
  constructor(
    readonly owner: HTMLElement,
    readonly elements: CarouselElements,
    readonly controller: () => CarouselController | null,
  ) {
    this.#track = new OwnedStyles(elements.track);
  }
  get position(): number {
    const controller = this.controller();
    const view = this.owner.ownerDocument.defaultView;
    if (!view) return 0;
    const transform = view.getComputedStyle(this.elements.track).transform;
    if (transform === 'none') return 0;
    const values = transform
      .slice(transform.indexOf('(') + 1, -1)
      .split(',')
      .map(Number);
    const horizontal = controller?.snapshot.orientation !== 'vertical';
    const coordinate =
      values.length === 16 ? values[horizontal ? 12 : 13] : values[horizontal ? 4 : 5];
    return (coordinate ?? 0) * (horizontal && controller?.snapshot.direction === 'rtl' ? 1 : -1);
  }
  async move(position: number, request: CarouselNavigationRequest): Promise<void> {
    const controller = this.controller();
    if (!controller) return;
    const horizontal = controller.configuration.orientation === 'horizontal';
    const rtl = horizontal && controller.snapshot.direction === 'rtl';
    const previousPosition = this.position;
    const before =
      this.owner.ownerDocument.defaultView?.getComputedStyle(this.elements.track).transform ??
      'none';
    const transform = carouselTrackTransform(position, horizontal, rtl);
    this.#motion?.cancel();
    this.#track.set('transform', transform);
    if (
      request.speed === 0 ||
      Math.abs(previousPosition - position) < 0.001 ||
      before === transform ||
      resolvesReducedMotion(this.owner)
    )
      return;
    const motion = prepareMotion(
      this.owner,
      this.elements.track,
      carouselMotionRoles.track,
      { phase: 'change', fromState: before, toState: transform },
      {
        play: () => {
          const animation = this.elements.track.animate([{ transform: before }, { transform }], {
            ...carouselMotionTiming(this.owner, request.speed),
          });
          return {
            finished: animation.finished.then(() => undefined),
            cancel: () => animation.cancel(),
          };
        },
      },
    );
    this.#motion = motion;
    motion.start();
    await motion.finished;
    if (this.#motion === motion) this.#motion = undefined;
  }
  cancel(): void {
    if (this.#motion) {
      // Cancelling WAAPI otherwise exposes the inline destination for a frame.
      // Preserve the current translate, as Swiper does before interrupting.
      const transform = this.owner.ownerDocument.defaultView?.getComputedStyle(
        this.elements.track,
      ).transform;
      if (transform) this.#track.set('transform', transform);
      this.#motion.cancel();
    }
    this.#motion = undefined;
  }
  dispose(): void {
    this.cancel();
    this.#track.dispose();
  }
}

export function carouselTrackTransform(
  position: number,
  horizontal: boolean,
  rtl: boolean,
): string {
  return horizontal
    ? `translate3d(${rtl ? position : -position}px,0,0)`
    : `translate3d(0,${-position}px,0)`;
}
