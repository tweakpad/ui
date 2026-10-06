import { prepareMotion, resolvesReducedMotion, type MotionHandle } from '../motion.js';
import { parseEasing } from '../motion-easing.js';
import { OwnedStyles } from '../owned-styles.js';
import { Scheduler } from '../services.js';
import type { CarouselController, CarouselInput } from './controller.js';
import type { CarouselLayout } from './layout.js';
import { carouselTrackTransform, type CarouselPresenter } from './presenter.js';
import { carouselMotionRoles, carouselMotionTiming } from './timing.js';
import type { CarouselId, CarouselNavigationRequest, CarouselOptions } from './types.js';

/**
 * `track` effects keep the moving track and decorate items; `stack` effects keep every item at
 * the viewport origin and present the logical position themselves.
 */
export type CarouselEffectLayout = 'track' | 'stack';
export type CarouselEffectPhase = 'drag' | 'animate' | 'settle';

export interface CarouselEffectItem {
  readonly id: CarouselId;
  readonly index: number;
  /** The carousel-owned item shell. */
  readonly shell: HTMLElement;
  /** Authored element, or the shell for data-rendered items. */
  readonly content: HTMLElement;
  /**
   * Signed distance from the item's alignment position in item pitches. 0 = aligned,
   * positive = upcoming in reading order, negative = passed. Loop-wrapped.
   */
  readonly progress: number;
}

export interface CarouselEffectFrame {
  readonly phase: CarouselEffectPhase;
  /** Logical position in layout pixels. */
  readonly position: number;
  /** Smoothed velocity in item pitches per second; positive moves forward. */
  readonly velocity: number;
  /** 1 when the latest movement advanced, -1 when it went back. */
  readonly direction: 1 | -1;
  readonly reducedMotion: boolean;
  readonly items: readonly CarouselEffectItem[];
  /** Item at or just passed the alignment point, and the amount it has been left behind. */
  readonly current: CarouselEffectItem | null;
  /** Upcoming item while between two alignment points; null at rest. */
  readonly next: CarouselEffectItem | null;
  /** 0 when `current` is aligned, approaching 1 as `next` arrives. */
  readonly amount: number;
}

export interface CarouselEffectContext {
  readonly owner: HTMLElement;
  readonly viewport: HTMLElement;
  readonly track: HTMLElement;
  /** Effect layer above the track inside the viewport; aria-hidden, no pointer events. */
  readonly surface: HTMLElement;
  readonly orientation: 'horizontal' | 'vertical';
  readonly direction: 'ltr' | 'rtl';
  /** Request a fresh frame at the current position, e.g. after media becomes ready. */
  invalidate(): void;
  diagnose(message: string, error?: unknown): void;
}

export interface CarouselEffectInstance {
  /** Called for every presented position: drag, each animation frame and settle. */
  frame(frame: CarouselEffectFrame): void;
  /** Layout or item membership changed; a frame follows. */
  update?(): void;
  /** Restore every element the effect changed. */
  detach(): void;
}

/** A presentation extension for TpCarousel. Create one with an effect factory. */
export interface CarouselEffect {
  readonly name: string;
  readonly layout: CarouselEffectLayout;
  /** Transition duration in milliseconds when a navigation does not specify a speed. */
  readonly duration?: number;
  /** CSS easing for effect transitions when a navigation does not specify a speed. */
  readonly easing?: string;
  /** Adjust the carousel input the effect requires, such as one item per view. */
  constrain?(input: CarouselInput, diagnose: (message: string) => void): CarouselInput;
  attach(context: CarouselEffectContext): CarouselEffectInstance;
}

/** Carousel surface an EffectPresenter drives. TpCarousel implements it. */
export interface CarouselEffectHost {
  readonly owner: HTMLElement;
  readonly viewport: HTMLElement;
  readonly track: HTMLElement;
  controller(): CarouselController | null;
  surface(): HTMLElement;
  /** Physical offset between DOM order and the logical lane in continuous loops. */
  logicalOffset(): number;
  items(): readonly Omit<CarouselEffectItem, 'progress'>[];
  dragging(): boolean;
  diagnose(message: string, error?: unknown): void;
}

/** Signed loop-wrapped item progress in item pitches; 0 when the item is aligned. */
export function carouselItemProgress(
  layout: CarouselLayout,
  ordinal: number,
  position: number,
  loop: boolean,
): number {
  const aligned = layout.positions[ordinal];
  const size = layout.sizes[ordinal];
  if (aligned === undefined || size === undefined) return 0;
  const pitch = size + layout.gap || 1;
  let distance = aligned - position;
  if (loop) {
    const cycle = layout.sizes.reduce((sum, value) => sum + value + layout.gap, 0);
    if (cycle > 0) distance = ((((distance + cycle / 2) % cycle) + cycle) % cycle) - cycle / 2;
  }
  // Normalize -0 so aligned items report exactly 0.
  return distance / pitch || 0;
}

/** Merge partial option groups one level deep, as effect constraints require. */
export function mergeCarouselOptions(
  base: CarouselOptions,
  patch: CarouselOptions,
): CarouselOptions {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const previous = merged[key];
    merged[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      previous &&
      typeof previous === 'object'
        ? { ...(previous as object), ...(value as object) }
        : value;
  }
  return merged as CarouselOptions;
}

/** Constraint shared by stack effects: one full-size item per view and per movement. */
export function stackEffectConstraint(name: string) {
  return (input: CarouselInput, diagnose: (message: string) => void): CarouselInput => {
    const layout = input.options?.layout;
    if (
      (layout?.itemsPerView !== undefined && layout.itemsPerView !== 1) ||
      layout?.centered ||
      (input.itemsPerMovement !== undefined && input.itemsPerMovement !== 1)
    )
      diagnose(
        `Carousel ${name} effect presents one item per view; layout options were overridden.`,
      );
    return {
      ...input,
      itemsPerMovement: 1,
      options: mergeCarouselOptions(input.options ?? {}, {
        layout: {
          itemsPerView: 1,
          gap: 0,
          centered: false,
          centeredBounds: false,
          groupSkip: 0,
          groupAuto: false,
          offsetBefore: 0,
          offsetAfter: 0,
        },
      }),
    };
  };
}

const smoothing = 0.35;

/** Frame-driven presenter: owns the logical position so effects can render any value. */
export class EffectPresenter implements CarouselPresenter {
  readonly #track: OwnedStyles;
  readonly #scheduler: Scheduler;
  readonly #instance: CarouselEffectInstance;
  readonly #shellStyles = new Map<HTMLElement, OwnedStyles>();
  #position = 0;
  #velocity = 0;
  #direction: 1 | -1 = 1;
  #sampleTime = 0;
  #motion: MotionHandle | undefined;
  #stopFrames: (() => void) | undefined;
  #pendingFrame: (() => void) | undefined;
  #disposed = false;
  constructor(
    readonly effect: CarouselEffect,
    readonly host: CarouselEffectHost,
  ) {
    this.#track = new OwnedStyles(host.track);
    this.#scheduler = new Scheduler(host.owner.ownerDocument.defaultView ?? undefined);
    const controller = host.controller();
    const horizontal = controller?.configuration.orientation !== 'vertical';
    this.#instance = effect.attach({
      owner: host.owner,
      viewport: host.viewport,
      track: host.track,
      surface: host.surface(),
      orientation: horizontal ? 'horizontal' : 'vertical',
      direction: controller?.snapshot.direction === 'rtl' ? 'rtl' : 'ltr',
      invalidate: () => this.#invalidate(),
      diagnose: (message, error) => host.diagnose(message, error),
    });
  }
  get position(): number {
    return this.#position;
  }
  async move(position: number, request: CarouselNavigationRequest): Promise<void> {
    if (this.#disposed) return;
    this.#stop();
    const start = this.#position;
    if (
      request.speed === 0 ||
      Math.abs(start - position) < 0.001 ||
      resolvesReducedMotion(this.host.owner)
    ) {
      this.#present(position, this.host.dragging() ? 'drag' : 'settle');
      return;
    }
    const timing = carouselMotionTiming(this.host.owner, request.speed ?? this.effect.duration);
    const easing = parseEasing(
      request.speed === undefined && this.effect.easing ? this.effect.easing : timing.easing,
    );
    const motion = prepareMotion(
      this.host.owner,
      this.host.viewport,
      carouselMotionRoles.transition,
      {
        phase: 'change',
        fromState: start,
        toState: position,
        context: { effect: this.effect.name, duration: timing.duration },
      },
      {
        play: () => {
          let begin: number | undefined;
          let resolve!: () => void;
          const finished = new Promise<void>((done) => (resolve = done));
          const step = (time: number) => {
            begin ??= time;
            const progress = timing.duration > 0 ? (time - begin) / timing.duration : 1;
            this.#present(start + (position - start) * easing(Math.min(1, progress)), 'animate');
            if (progress >= 1) {
              this.#stopFrames = undefined;
              resolve();
            } else this.#stopFrames = this.#scheduler.animationFrame(step);
          };
          this.#stopFrames = this.#scheduler.animationFrame(step);
          return {
            finished,
            cancel: () => {
              this.#stopFrames?.();
              this.#stopFrames = undefined;
              resolve();
            },
          };
        },
      },
    );
    this.#motion = motion;
    motion.start();
    await motion.finished;
    if (this.#motion !== motion || this.#disposed) return;
    this.#motion = undefined;
    // A claimed external driver or reduced motion skips frames; settle on the destination.
    this.#present(position, 'settle');
  }
  cancel(): void {
    this.#stop();
  }
  /** Re-present the current position after layout or membership changes. */
  refresh(): void {
    this.#instance.update?.();
    if (this.#motion) return;
    this.#present(this.#position, this.host.dragging() ? 'drag' : 'settle');
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#stop();
    this.#pendingFrame?.();
    this.#disposed = true;
    try {
      this.#instance.detach();
    } catch (error) {
      this.host.diagnose('Carousel effect failed to detach.', error);
    }
    for (const styles of this.#shellStyles.values()) styles.dispose();
    this.#shellStyles.clear();
    for (const item of this.host.items()) item.shell.removeAttribute('data-effect-role');
    this.#track.dispose();
    this.#scheduler.dispose();
  }
  #stop(): void {
    const motion = this.#motion;
    this.#motion = undefined;
    this.#stopFrames?.();
    this.#stopFrames = undefined;
    motion?.cancel();
  }
  #invalidate(): void {
    if (this.#pendingFrame || this.#disposed) return;
    this.#pendingFrame = this.#scheduler.animationFrame(() => {
      this.#pendingFrame = undefined;
      if (!this.#motion) this.#present(this.#position, this.host.dragging() ? 'drag' : 'settle');
    });
  }
  #present(physical: number, phase: CarouselEffectPhase): void {
    if (this.#disposed) return;
    const controller = this.host.controller();
    const now = this.host.owner.ownerDocument.defaultView?.performance.now() ?? 0;
    const previous = this.#position;
    this.#position = physical;
    const horizontal = controller?.configuration.orientation !== 'vertical';
    const rtl = horizontal && controller?.snapshot.direction === 'rtl';
    this.#track.set(
      'transform',
      this.effect.layout === 'stack' ? 'none' : carouselTrackTransform(physical, horizontal, rtl),
    );
    const projection = controller?.projection;
    const layout = projection?.layout;
    if (!controller || !projection || !layout?.measured) return;
    const pitch = (layout.sizes[0] ?? 0) + layout.gap || 1;
    const delta = (physical - previous) / pitch;
    const elapsed = Math.max(1, now - this.#sampleTime) / 1000;
    if (Math.abs(delta) > 1e-6) this.#direction = delta > 0 ? 1 : -1;
    this.#velocity =
      phase === 'settle' ? 0 : this.#velocity + (delta / elapsed - this.#velocity) * smoothing;
    this.#sampleTime = now;
    const logical = physical - this.host.logicalOffset();
    const loop = projection.loop.mode === 'continuous';
    const items = this.host.items().map((item) => {
      const ordinal = layout.indices.indexOf(item.index);
      return Object.freeze({
        ...item,
        progress: ordinal < 0 ? 0 : carouselItemProgress(layout, ordinal, logical, loop),
      });
    });
    let current: CarouselEffectItem | null = null,
      next: CarouselEffectItem | null = null;
    for (const item of items) {
      if (item.progress <= 1e-6 && item.progress > -1 + 1e-6) {
        if (!current || item.progress > current.progress) current = item;
      } else if (item.progress > 1e-6 && item.progress < 1 - 1e-6) {
        if (!next || item.progress < next.progress) next = item;
      }
    }
    if (!current && next) [current, next] = [next, null];
    const amount = current && next ? Math.min(1, Math.max(0, -current.progress)) : 0;
    for (const item of items) {
      let styles = this.#shellStyles.get(item.shell);
      if (!styles) this.#shellStyles.set(item.shell, (styles = new OwnedStyles(item.shell)));
      styles.set('--tp-carousel-item-progress', String(Math.round(item.progress * 10000) / 10000));
      const role =
        item === current ? (next ? 'outgoing' : 'current') : item === next ? 'incoming' : null;
      if (role) item.shell.setAttribute('data-effect-role', role);
      else item.shell.removeAttribute('data-effect-role');
      if (this.effect.layout === 'stack') styles.set('visibility', role ? 'visible' : 'hidden');
    }
    try {
      this.#instance.frame(
        Object.freeze({
          phase,
          position: logical,
          velocity: this.#velocity,
          direction: this.#direction,
          reducedMotion: resolvesReducedMotion(this.host.owner),
          items: Object.freeze(items),
          current,
          next,
          amount,
        }),
      );
    } catch (error) {
      this.host.diagnose(`Carousel ${this.effect.name} effect failed to render a frame.`, error);
    }
  }
}
