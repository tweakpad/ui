import { prepareMotion, resolvesReducedMotion, type MotionHandle } from '../motion.js';
import { OwnedStyles } from '../owned-styles.js';
import { CleanupScope, Scheduler } from '../services.js';
import type { CarouselController } from './controller.js';
import type { CarouselElements } from './input.js';
import type { CarouselNavigationRequest } from './types.js';

export const carouselMotionRoles = {
  track: { name: 'track', kind: 'state', phases: ['change'], completion: 'non-blocking' },
  autoHeight: {
    name: 'auto-height',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  scrollbarVisibility: {
    name: 'scrollbar-visibility',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const;

export function carouselMotionTiming(
  owner: HTMLElement,
  explicit?: number,
): { duration: number; easing: string } {
  const style = owner.ownerDocument.defaultView?.getComputedStyle(owner);
  const token = style?.getPropertyValue('--tp-duration-normal').trim() ?? '';
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(token);
  const duration = explicit ?? (match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : 300);
  const scale = Number(style?.getPropertyValue('--tp-motion-scale').trim() || 1);
  return {
    duration: Math.max(0, duration * (Number.isFinite(scale) ? scale : 1)),
    easing: style?.getPropertyValue('--tp-easing-standard').trim() || 'ease',
  };
}

export class CarouselTransport {
  readonly #track: OwnedStyles;
  readonly #viewport: OwnedStyles;
  readonly #scheduler: Scheduler;
  #motion: MotionHandle | undefined;
  #heightMotion: MotionHandle | undefined;
  #nativeCancel: (() => void) | undefined;
  #echo = 0;
  #echoPosition: number | undefined;
  #settleTimer: (() => void) | undefined;
  #scrollFrame: (() => void) | undefined;
  #userScrolling = false;
  #compensating = false;
  constructor(
    readonly owner: HTMLElement,
    readonly elements: CarouselElements,
    readonly controller: () => CarouselController | null,
    readonly logicalOffset: () => number = () => 0,
  ) {
    this.#track = new OwnedStyles(elements.track);
    this.#viewport = new OwnedStyles(elements.viewport);
    this.#scheduler = new Scheduler(owner.ownerDocument.defaultView ?? undefined);
  }
  get position(): number {
    const controller = this.controller();
    if (controller?.configuration.transport === 'scroll') return this.read();
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
    const config = controller.configuration,
      horizontal = config.orientation === 'horizontal';
    const rtl = horizontal && controller.snapshot.direction === 'rtl';
    if (config.transport === 'scroll') {
      if (!this.#compensating) {
        this.#userScrolling = false;
        this.#settleTimer?.();
        this.#settleTimer = undefined;
        controller.autoplay.setReason('native-scroll', false);
      }
      this.#track.set('transform', 'none');
      const minimum = controller.projection.layout.snaps[0]?.position ?? 0;
      const destination = (position - minimum) * (rtl ? -1 : 1);
      this.#viewport.set(
        'scroll-padding-inline-start',
        horizontal && !config.layout.centered ? `${Math.max(0, -minimum)}px` : '0px',
      );
      this.#viewport.set(
        'scroll-padding-top',
        !horizontal && !config.layout.centered ? `${Math.max(0, -minimum)}px` : '0px',
      );
      const viewport = this.elements.viewport;
      this.#echoPosition = position;
      if (request.speed === 0 || resolvesReducedMotion(this.owner) || !viewport.scrollTo) {
        this.#echo++;
        if (horizontal) viewport.scrollLeft = destination;
        else viewport.scrollTop = destination;
        this.#scheduler.animationFrame(() => {
          this.#echo = Math.max(0, this.#echo - 1);
        });
        return;
      }
      this.#nativeCancel?.();
      await new Promise<void>((resolve) => {
        const scope = new CleanupScope();
        let finished = false,
          last = this.read(),
          stable = 0;
        const finish = () => {
          if (finished) return;
          finished = true;
          scope.dispose();
          this.#nativeCancel = undefined;
          resolve();
        };
        this.#nativeCancel = finish;
        this.#echo++;
        scope.add(() => {
          this.#echo = Math.max(0, this.#echo - 1);
        });
        scope.listen(viewport, 'scrollend', (event) => {
          if (event.target === viewport) finish();
        });
        scope.add(this.#scheduler.timeout(finish, 2000));
        const poll = () => {
          const current = this.read();
          stable = Math.abs(current - last) < 0.25 ? stable + 1 : 0;
          last = current;
          if (stable >= 4 && Math.abs(current - position) < 1) finish();
          else scope.add(this.#scheduler.animationFrame(poll));
        };
        scope.add(this.#scheduler.animationFrame(poll));
        viewport.scrollTo({
          ...(horizontal ? { left: destination } : { top: destination }),
          behavior: 'smooth',
        });
      });
      return;
    }
    const previousPosition = this.position;
    const before =
      this.owner.ownerDocument.defaultView?.getComputedStyle(this.elements.track).transform ??
      'none';
    const transform = horizontal
      ? `translate3d(${rtl ? position : -position}px,0,0)`
      : `translate3d(0,${-position}px,0)`;
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
  read(): number {
    const state = this.controller()?.snapshot;
    const position =
      state?.orientation === 'vertical'
        ? this.elements.viewport.scrollTop
        : this.elements.viewport.scrollLeft * (state?.direction === 'rtl' ? -1 : 1);
    return position + (this.controller()?.projection.layout.snaps[0]?.position ?? 0);
  }
  async compensate(position: number): Promise<void> {
    this.#compensating = true;
    try {
      await this.move(position, { speed: 0 });
    } finally {
      this.#compensating = false;
    }
  }
  bind(scope: CleanupScope): void {
    scope.listen(
      this.elements.viewport,
      'scroll',
      () => {
        if (this.controller()?.configuration.transport !== 'scroll' || this.#echo > 0) return;
        const position = this.read();
        if (this.#echoPosition !== undefined && Math.abs(position - this.#echoPosition) < 1) {
          this.#echoPosition = undefined;
          return;
        }
        this.#userScrolling = true;
        this.controller()?.autoplay.setReason('native-scroll', true);
        this.#scrollFrame?.();
        this.#scrollFrame = this.#scheduler.animationFrame(() => {
          this.#scrollFrame = undefined;
          this.controller()?.preview(this.read() - this.logicalOffset(), 'swipe', false);
        });
        this.#settleTimer?.();
        this.#settleTimer = this.#scheduler.timeout(() => this.#settle(), 120);
      },
      { passive: true },
    );
    scope.listen(this.elements.viewport, 'scrollend', (event) => {
      if (!this.#echo && event.target === this.elements.viewport) this.#settle();
    });
    scope.add(() => {
      this.#settleTimer?.();
      this.#scrollFrame?.();
    });
  }
  #settle(): void {
    this.#settleTimer?.();
    this.#settleTimer = undefined;
    const controller = this.controller();
    if (
      !controller ||
      this.#echo ||
      !this.#userScrolling ||
      controller.configuration.transport !== 'scroll'
    )
      return;
    this.#userScrolling = false;
    this.#scrollFrame?.();
    this.#scrollFrame = undefined;
    controller.preview(this.read() - this.logicalOffset(), 'swipe', false);
    void controller
      .settlePreview({ reason: 'swipe' })
      .finally(() => controller.autoplay.setReason('native-scroll', false));
  }
  async autoHeight(height: number): Promise<void> {
    if (!Number.isFinite(height) || height <= 0) return;
    const previous = this.elements.viewport.getBoundingClientRect().height;
    this.#heightMotion?.cancel();
    this.#viewport.set('height', `${height}px`);
    if (Math.abs(previous - height) < 0.5 || resolvesReducedMotion(this.owner)) return;
    const motion = prepareMotion(
      this.owner,
      this.elements.viewport,
      carouselMotionRoles.autoHeight,
      { phase: 'change', fromState: previous, toState: height },
      {
        play: () => {
          const animation = this.elements.viewport.animate(
            [{ height: `${previous}px` }, { height: `${height}px` }],
            carouselMotionTiming(this.owner),
          );
          return {
            finished: animation.finished.then(() => undefined),
            cancel: () => animation.cancel(),
          };
        },
      },
    );
    this.#heightMotion = motion;
    motion.start();
    await motion.finished;
    if (this.#heightMotion === motion) this.#heightMotion = undefined;
  }
  cancel(): void {
    this.#scrollFrame?.();
    this.#scrollFrame = undefined;
    this.#userScrolling = false;
    this.#settleTimer?.();
    this.#settleTimer = undefined;
    this.controller()?.autoplay.setReason('native-scroll', false);
    this.#motion?.cancel();
    this.#motion = undefined;
    this.#nativeCancel?.();
    this.#heightMotion?.cancel();
    this.#heightMotion = undefined;
  }
  dispose(): void {
    this.cancel();
    this.#scheduler.dispose();
    this.#track.dispose();
    this.#viewport.dispose();
  }
}
