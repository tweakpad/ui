import {
  prepareMotion,
  resolvesReducedMotion,
  type MotionHandle,
  type MotionRequestOptions,
  type MotionRoleDefinition,
} from '../motion.js';
import { parseEasing } from '../motion-easing.js';
import { OwnedStyles } from '../owned-styles.js';
import { Scheduler } from '../services.js';
import type { CarouselController } from './controller.js';
import type { CarouselElements } from './input.js';
import { CarouselKinetics, type CarouselMotionTiming } from './kinetics.js';
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
  /** Jump to an equivalent position (loop compensation) without losing motion. */
  offset?(position: number): void;
  dispose(): void;
}

export type CarouselPresentPhase = 'drag' | 'animate' | 'settle';

/** What a frame presenter animates through the motion-role system. */
export interface CarouselFrameMotion {
  readonly target: HTMLElement;
  readonly role: MotionRoleDefinition;
  readonly request: MotionRequestOptions;
  readonly timing: CarouselMotionTiming;
}

/**
 * Frame-driven presentation shared by the track and effect presenters. Every transition is
 * sampled per animation frame from CarouselKinetics, so a new navigation, a drag or a release
 * continues from the presented position and velocity instead of restarting a fixed animation.
 * A claimed motion driver still replaces the built-in frames.
 */
export abstract class CarouselFramePresenter implements CarouselPresenter {
  protected readonly kinetics = new CarouselKinetics();
  protected readonly scheduler: Scheduler;
  #motion: MotionHandle | undefined;
  #stopFrames: (() => void) | undefined;
  #disposed = false;
  constructor(readonly owner: HTMLElement) {
    this.scheduler = new Scheduler(owner.ownerDocument.defaultView ?? undefined);
  }
  get position(): number {
    return this.kinetics.position;
  }
  /** True while a built-in or claimed transition is running. */
  protected get animating(): boolean {
    return !!this.#motion;
  }
  protected get disposed(): boolean {
    return this.#disposed;
  }
  /** True while a claimed external driver, not the built-in frames, runs the transition. */
  protected get driven(): boolean {
    return !!this.#motion?.claimed;
  }
  protected now(): number {
    return this.owner.ownerDocument.defaultView?.performance.now() ?? 0;
  }
  /** Write one presented position. */
  protected abstract present(position: number, phase: CarouselPresentPhase): void;
  /** The motion request for a transition from the presented position to `position`. */
  protected abstract motion(
    position: number,
    request: CarouselNavigationRequest,
  ): CarouselFrameMotion;
  /** Adjust the presented position before a transition, e.g. to cross a loop seam. */
  protected prepare?(position: number): void;
  /** A claimed external driver animates; present what it expects before it starts. */
  protected claimed?(position: number): void;
  async move(position: number, request: CarouselNavigationRequest): Promise<void> {
    if (this.#disposed) return;
    this.#stop();
    this.prepare?.(position);
    const time = this.now();
    if (
      request.speed === 0 ||
      Math.abs(this.kinetics.position - position) < 0.001 ||
      resolvesReducedMotion(this.owner)
    ) {
      // Preview frames during a gesture are tracked, so their velocity carries into the release.
      this.kinetics.place(position, time, request.reason === 'swipe' && request.speed === 0);
      this.present(position, request.reason === 'swipe' && request.speed === 0 ? 'drag' : 'settle');
      return;
    }
    const plan = this.motion(position, request);
    const motion = prepareMotion(this.owner, plan.target, plan.role, plan.request, {
      play: () => {
        let resolve!: () => void;
        const finished = new Promise<void>((done) => (resolve = done));
        const step = () => {
          const done = this.kinetics.sample(this.now());
          this.present(this.kinetics.position, done ? 'settle' : 'animate');
          if (done) {
            this.#stopFrames = undefined;
            resolve();
          } else this.#stopFrames = this.scheduler.animationFrame(step);
        };
        this.kinetics.plan(position, time, plan.timing);
        this.#stopFrames = this.scheduler.animationFrame(step);
        return {
          finished,
          cancel: () => {
            this.#stopFrames?.();
            this.#stopFrames = undefined;
            resolve();
          },
        };
      },
    });
    this.#motion = motion;
    if (motion.claimed) {
      this.kinetics.place(position, time, false);
      this.claimed?.(position);
    }
    motion.start();
    await motion.finished;
    if (this.#motion !== motion || this.#disposed) return;
    this.#motion = undefined;
    // A claimed driver or reduced motion skips frames; settle on the destination.
    if (Math.abs(this.kinetics.position - position) > 0.001 || this.kinetics.segment)
      this.kinetics.place(position, this.now(), false);
    this.present(position, 'settle');
  }
  cancel(): void {
    this.#stop();
  }
  offset(position: number): void {
    if (this.#disposed) return;
    this.kinetics.shift(position - this.kinetics.position);
    this.present(position, this.animating ? 'animate' : 'settle');
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#stop();
    this.#disposed = true;
    this.scheduler.dispose();
  }
  #stop(): void {
    const motion = this.#motion;
    // A claimed driver presents positions the kinetics never saw; read it before it stops.
    const presented = motion?.claimed ? this.position : undefined;
    this.#motion = undefined;
    this.#stopFrames?.();
    this.#stopFrames = undefined;
    if (presented === undefined) {
      // Keep the presented position and remember its velocity for an immediate retarget.
      this.kinetics.halt(this.now());
      motion?.cancel();
      return;
    }
    this.kinetics.place(presented, this.now(), false);
    motion?.cancel();
    // Cancelling the driver would otherwise expose the inline destination for a frame.
    this.present(presented, 'settle');
  }
}

/** Default presentation: translate the track, sampled per frame through the `track` role. */
export class TranslatePresenter extends CarouselFramePresenter {
  readonly #track: OwnedStyles;
  constructor(
    owner: HTMLElement,
    readonly elements: CarouselElements,
    readonly controller: () => CarouselController | null,
  ) {
    super(owner);
    this.#track = new OwnedStyles(elements.track);
  }
  /** A claimed driver animates the track itself, so read what it presents. */
  override get position(): number {
    if (!this.driven) return super.position;
    const view = this.owner.ownerDocument.defaultView;
    const transform = view?.getComputedStyle(this.elements.track).transform ?? 'none';
    if (transform === 'none') return 0;
    const controller = this.controller();
    const horizontal = controller?.configuration.orientation !== 'vertical';
    const values = transform
      .slice(transform.indexOf('(') + 1, -1)
      .split(',')
      .map(Number);
    const coordinate =
      values.length === 16 ? values[horizontal ? 12 : 13] : values[horizontal ? 4 : 5];
    return (coordinate ?? 0) * (horizontal && controller?.snapshot.direction === 'rtl' ? 1 : -1);
  }
  #transform(position: number): string {
    const controller = this.controller();
    const horizontal = controller?.configuration.orientation !== 'vertical';
    return carouselTrackTransform(
      position,
      horizontal,
      horizontal && controller?.snapshot.direction === 'rtl',
    );
  }
  protected present(position: number): void {
    this.#track.set('transform', this.#transform(position));
  }
  protected motion(position: number, request: CarouselNavigationRequest): CarouselFrameMotion {
    const timing = carouselMotionTiming(this.owner, request.speed);
    return {
      target: this.elements.track,
      role: carouselMotionRoles.track,
      request: {
        phase: 'change',
        fromState: this.#transform(this.position),
        toState: this.#transform(position),
      },
      timing: { duration: timing.duration, easing: parseEasing(timing.easing) },
    };
  }
  protected override claimed(position: number): void {
    this.present(position);
  }
  override dispose(): void {
    super.dispose();
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
