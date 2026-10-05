import type { ReactiveControllerHost } from 'lit';
import { ControllableState } from '../controllable-state.js';
import { TpValueCommitEvent } from '../events.js';
import { ObservableStore } from '../store.js';
import { Scheduler } from '../services.js';
import type { ChangeReason, Direction } from '../types.js';
import { CarouselAutoplay } from './autoplay.js';
import {
  resolveCarouselConfiguration,
  matchCarouselBreakpoint,
  type CarouselConfiguration,
} from './configuration.js';
import {
  carouselLayout,
  carouselSnapForIndex,
  carouselVisible,
  closestCarouselSnap,
  type CarouselLayout,
  type CarouselMeasuredItem,
} from './layout.js';
import { carouselLoopPlan, type CarouselLoopPlan } from './loop.js';
import { carouselVirtualRange } from './virtual.js';
import type {
  CarouselItem,
  CarouselOptions,
  CarouselRootOptions,
  CarouselSnapshot,
  CarouselId,
  CarouselMeasurement,
  CarouselNavigationRequest,
  CarouselNavigationResult,
  CarouselEventName,
} from './types.js';

export interface CarouselInput extends Partial<CarouselRootOptions> {
  readonly options?: CarouselOptions;
  readonly value?: number;
  readonly defaultValue?: number;
  readonly index?: number;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly direction?: Direction;
  readonly items: readonly CarouselItem[];
}
export interface CarouselGeometry extends CarouselMeasurement {
  readonly items: readonly CarouselMeasuredItem[];
  readonly breakpointWidth?: number;
  readonly breakpointHeight?: number;
  readonly source?: 'observed' | 'override';
}
export interface CarouselProjection {
  readonly layout: CarouselLayout;
  readonly items: readonly CarouselItem[];
  readonly position: number;
  readonly loop: CarouselLoopPlan;
  readonly generation: number;
}
export interface CarouselAdapter {
  readonly host: ReactiveControllerHost & EventTarget;
  read(): CarouselInput;
  measure(configuration: CarouselConfiguration): CarouselGeometry;
  render(snapshot: CarouselSnapshot, projection: CarouselProjection): void | Promise<void>;
  move(
    position: number,
    request: CarouselNavigationRequest,
    generation: number,
  ): void | Promise<void>;
  cancel(): void;
  /** Current rendered logical position, including an in-flight transition. */
  readPosition?(): number;
  diagnose?(message: string, error?: unknown): void;
  validateOption?(group: string, value: unknown): boolean;
  bind?(controller: CarouselController): () => void;
  focusedId?(): CarouselId | null;
  readonly owner?: Window;
}
const initial: CarouselSnapshot = Object.freeze({
  initialized: false,
  measured: false,
  measurementSource: 'unmeasured',
  selectedIndex: null,
  selectedId: null,
  snapIndex: null,
  snapCount: 0,
  itemCount: 0,
  visibleIds: Object.freeze([]),
  progress: 0,
  previewProgress: 0,
  canScrollPrevious: false,
  canScrollNext: false,
  locked: true,
  animating: false,
  orientation: 'horizontal',
  direction: 'ltr',
  loopMode: 'finite',
  virtual: null,
  autoplayRunning: false,
  autoplayPaused: false,
});
const validIndex = (index: unknown): index is number =>
  typeof index === 'number' && Number.isInteger(index) && Number.isFinite(index);

/** Input category carried by Carousel value-change and value-commit metadata. */
export type CarouselInputKind =
  | 'mouse'
  | 'touch'
  | 'pen'
  | 'pointer'
  | 'keyboard'
  | 'wheel'
  | 'scroll'
  | 'focus'
  | 'timer'
  | 'lifecycle'
  | 'programmatic';
/** Name of the synthetic originating event supplied for built-in timer proposals. */
export const carouselTimerEventType = 'tp-carousel-autoplay-timer';
/** Classifies the originating input from the real source event, then the registered reason. */
export function carouselInputKind(reason: ChangeReason, sourceEvent?: Event): CarouselInputKind {
  if (reason === 'automatic-advance' || sourceEvent?.type === carouselTimerEventType)
    return 'timer';
  if (sourceEvent) {
    const pointerType = (sourceEvent as Partial<PointerEvent>).pointerType;
    if (pointerType === 'mouse' || pointerType === 'touch' || pointerType === 'pen')
      return pointerType;
    const type = sourceEvent.type;
    if (type.startsWith('key')) return 'keyboard';
    if (type === 'wheel') return 'wheel';
    if (type === 'scroll' || type === 'scrollend') return 'scroll';
    if (type.startsWith('focus')) return 'focus';
    // Keyboard activation of a native button produces a click with zero detail.
    if (type === 'click') return (sourceEvent as MouseEvent).detail === 0 ? 'keyboard' : 'pointer';
    if (type.startsWith('pointer') || type.startsWith('mouse') || type.startsWith('touch'))
      return 'pointer';
  }
  if (reason === 'keyboard') return 'keyboard';
  if (reason === 'wheel') return 'wheel';
  // Native scroll transport settles a user scroll without a single originating DOM event.
  if (reason === 'swipe') return 'scroll';
  if (reason === 'missing' || reason === 'disabled' || reason === 'window-resize')
    return 'lifecycle';
  return 'programmatic';
}

/** Reusable renderer-adapted owner. Physical preview never publishes its own selection. */
export class CarouselController {
  readonly #store = new ObservableStore<CarouselSnapshot>(initial);
  readonly #state: ControllableState<number>;
  readonly #listeners = new Map<CarouselEventName, Set<(snapshot: CarouselSnapshot) => void>>();
  #config = resolveCarouselConfiguration();
  #input: CarouselInput;
  #layout = carouselLayout([], 0, this.#config);
  #geometry: CarouselGeometry = { width: 0, height: 0, items: [] };
  #loop: CarouselLoopPlan = {
    mode: 'finite',
    buffer: 0,
    group: 1,
    bothDirections: false,
    visible: 0,
    fillers: 0,
    reason: null,
  };
  #initialized = false;
  #destroyed = false;
  #released = false;
  #generation = 0;
  #position = 0;
  #acceptedId: CarouselId | null = null;
  #unresolved = false;
  #proposing = false;
  #queued: Array<() => void> = [];
  #unbind: (() => void) | undefined;
  #ownerValue: number | undefined;
  #breakpoint: string | null = null;
  #sourceEvent: Event | undefined;
  #cancelOperation: (() => void) | undefined;
  #animating = false;
  #autoplayInterval = 0;
  readonly #scheduler: Scheduler;
  #progressFrame: (() => void) | undefined;
  #lastReason: ChangeReason = 'initial';
  #previewGeneration = 0;
  readonly autoplay: CarouselAutoplay;

  constructor(private readonly adapter: CarouselAdapter) {
    if (
      !adapter ||
      !adapter.host ||
      typeof adapter.host.dispatchEvent !== 'function' ||
      typeof adapter.host.requestUpdate !== 'function' ||
      ['read', 'measure', 'render', 'move', 'cancel'].some(
        (key) => typeof adapter[key as keyof CarouselAdapter] !== 'function',
      )
    )
      throw new TypeError('Carousel requires a complete host/renderer adapter.');
    this.#input = adapter.read();
    this.#scheduler = new Scheduler(adapter.owner);
    // Explicit lifecycle avoids the host invoking state initialization before measurement.
    const stateHost = {
      addController() {},
      removeController() {},
      requestUpdate: () => adapter.host.requestUpdate(),
      get updateComplete() {
        return adapter.host.updateComplete;
      },
      dispatchEvent: (event: Event) => adapter.host.dispatchEvent(event),
      addEventListener: adapter.host.addEventListener.bind(adapter.host),
      removeEventListener: adapter.host.removeEventListener.bind(adapter.host),
    } satisfies ReactiveControllerHost & EventTarget;
    this.#state = new ControllableState({
      host: stateHost,
      initialValue: 0,
      readControlledValue: () => this.adapter.read().value,
      readDefaultValue: () => this.#initialIndex(),
      hasDefaultValue: () => this.#input.defaultValue !== undefined,
      diagnostic: (message) => this.#diagnose(message),
      onCommit: (value, previous, reason) => {
        const previousId = this.#acceptedId;
        const snap = carouselSnapForIndex(this.#layout, value);
        const item = this.#input.items.find(
          (item) => item.index === value && !item.disabled && !item.hidden,
        );
        this.#acceptedId = item?.id ?? null;
        this.#unresolved = !item && this.#input.items.length > 0;
        if (snap !== null) this.#position = this.#layout.snaps[snap]!.position;
        this.#publish(reason);
        this.adapter.host.dispatchEvent(
          new TpValueCommitEvent(value, previous, reason, this.#sourceEvent, {
            metadata: this.#metadata(previousId, value, snap, reason, this.#sourceEvent),
          }),
        );
      },
    });
    this.autoplay = new CarouselAutoplay({
      ...(adapter.owner ? { owner: adapter.owner } : {}),
      delay: () =>
        this.#input.items.find((item) => item.id === this.#acceptedId)?.autoplayDelay ??
        this.#config.autoplay,
      available: () =>
        !this.#destroyed &&
        this.#initialized &&
        !this.#unresolved &&
        this.snapshot.measured &&
        this.snapshot.snapCount > 1 &&
        !this.#input.disabled &&
        !this.#input.readOnly,
      advance: () => {
        // Timer proposals carry a synthetic originating event, never the programmatic fallback.
        const request = {
          reason: 'automatic-advance' as const,
          sourceEvent: new Event(carouselTimerEventType),
        };
        return this.#config.autoplayOptions.reverse ? this.previous(request) : this.next(request);
      },
      changed: () => {
        if (this.#initialized) {
          this.#publish();
          this.#emit('autoplay-state-change');
        }
      },
    });
  }
  get snapshot(): CarouselSnapshot {
    return this.#store.value;
  }
  get configuration(): CarouselConfiguration {
    return this.#config;
  }
  get projection(): CarouselProjection {
    return Object.freeze({
      layout: this.#layout,
      items: this.#input.items,
      position: this.#position,
      loop: this.#loop,
      generation: this.#generation,
    });
  }
  get index(): number {
    return this.#state.value;
  }
  get disposed(): boolean {
    return this.#destroyed || this.#released;
  }
  get lastReason(): ChangeReason {
    return this.#lastReason;
  }
  subscribe(listener: (snapshot: CarouselSnapshot) => void): () => void {
    return this.#store.subscribe((change) => listener(change.value), true);
  }
  on(event: CarouselEventName, listener: (snapshot: CarouselSnapshot) => void): () => void {
    let listeners = this.#listeners.get(event);
    if (!listeners) this.#listeners.set(event, (listeners = new Set()));
    listeners.add(listener);
    return () => this.off(event, listener);
  }
  off(event: CarouselEventName, listener: (snapshot: CarouselSnapshot) => void): void {
    this.#listeners.get(event)?.delete(listener);
  }

  async initialize(): Promise<void> {
    if (this.#released || (this.#initialized && !this.#destroyed)) return;
    this.#destroyed = false;
    await this.update();
  }
  async update(ownerPublication = false): Promise<void> {
    if (this.#released || this.#destroyed) return;
    // A synchronous controlled acknowledgement was already consumed by the
    // selection transaction. Its later Lit update must not reset that motion.
    if (
      ownerPublication &&
      this.#initialized &&
      !this.#unresolved &&
      Object.is(this.adapter.read().value, this.#ownerValue)
    )
      return;
    this.#cancel();
    this.#unbind?.();
    this.#unbind = undefined;
    const generation = ++this.#generation;
    const wasInitialized = this.#initialized;
    const priorId = this.#acceptedId;
    const coherent = {
      input: this.#input,
      config: this.#config,
      geometry: this.#geometry,
      layout: this.#layout,
      loop: this.#loop,
    };
    let selectionReached = false;
    try {
      this.#input = this.adapter.read();
      const root: Partial<CarouselRootOptions> = {};
      for (const key of ['orientation', 'loop', 'itemsPerMovement', 'autoplay'] as const)
        if (this.#input[key] !== undefined) Object.assign(root, { [key]: this.#input[key] });
      const base = resolveCarouselConfiguration(
        this.#input.options,
        root,
        null,
        wasInitialized ? this.#config : undefined,
        (message) => this.#diagnose(message),
        (group, value) => this.adapter.validateOption?.(group, value) ?? true,
      );
      let geometry = this.adapter.measure(base);
      const breakpoint = matchCarouselBreakpoint(
        base.breakpoints,
        geometry.breakpointWidth ?? geometry.width,
        geometry.breakpointHeight ?? geometry.height,
      );
      this.#config = resolveCarouselConfiguration(
        this.#input.options,
        root,
        breakpoint,
        wasInitialized ? this.#config : undefined,
        (message) => this.#diagnose(message),
        (group, value) => this.adapter.validateOption?.(group, value) ?? true,
      );
      if (breakpoint !== null) geometry = this.adapter.measure(this.#config);
      this.#geometry = geometry;
      const viewport = this.#viewport();
      this.#layout = carouselLayout(geometry.items, viewport, this.#config, geometry);
      this.#loop = carouselLoopPlan(this.#layout, this.#config, viewport);
      selectionReached = true;
      if (this.#loop.reason) this.#diagnose(`Carousel uses rewind: ${this.#loop.reason}.`);
      if (!wasInitialized) {
        this.#state.initialize();
        if (
          this.#input.value !== undefined &&
          this.#input.index !== undefined &&
          this.#input.index !== this.#input.value
        )
          this.#diagnose('Controlled Carousel value overrides its initial index.');
        this.#resolveOwner();
      } else if (ownerPublication || !Object.is(this.#input.value, this.#ownerValue)) {
        this.#state.sync();
        this.#resolveOwner();
        this.autoplay.setReason('unacknowledged', false);
      } else {
        const prior = this.#input.items.find((item) => item.id === priorId);
        const retained = prior && !prior.hidden && !prior.disabled ? prior : undefined;
        const snap = carouselSnapForIndex(this.#layout, retained?.index ?? this.#state.value);
        const destination = snap === null ? null : this.#layout.snaps[snap]!.index;
        if (destination !== null && destination !== this.#state.value) {
          // A still-present selection that became disabled reports the registered disabled reason.
          const lifecycle = retained
            ? 'window-resize'
            : prior && !prior.hidden && prior.disabled
              ? 'disabled'
              : 'missing';
          this.#state.set(destination, lifecycle, undefined, {
            metadata: this.#metadata(priorId, destination, snap, lifecycle),
          });
          this.#unresolved = this.#state.value !== destination;
          if (this.#unresolved) {
            this.#acceptedId = priorId;
            this.#diagnose('Carousel controlled membership reconciliation was not acknowledged.');
          } else
            this.#acceptedId =
              this.#input.items.find((item) => item.index === destination)?.id ?? null;
        } else if (
          !retained &&
          priorId !== null &&
          destination !== null &&
          this.#state.controlled
        ) {
          this.#unresolved = true;
          this.#diagnose('Carousel controlled membership requires an explicit owner selection.');
        } else if (destination === null) {
          this.#acceptedId = null;
          this.#unresolved = false;
        } else if (!retained) this.#resolveOwner();
      }
      this.#ownerValue = this.#input.value;
      this.#initialized = true;
      const snap = this.#selectedSnap();
      this.#position = snap === null ? 0 : this.#layout.snaps[snap]!.position;
      this.#publish();
      await this.adapter.render(this.snapshot, this.projection);
      if (generation !== this.#generation || this.disposed) return;
      await this.adapter.move(this.#position, { speed: 0, reason: 'window-resize' }, generation);
      if (generation !== this.#generation || this.disposed) return;
      this.#unbind = this.adapter.bind?.(this);
      if (!wasInitialized) this.#emit('initialized');
      if (breakpoint !== this.#breakpoint) {
        this.#breakpoint = breakpoint;
        this.#emit('breakpoint-change');
      }
      if (this.#config.virtual) this.#emit('virtual-update');
      this.autoplay.setReason(
        'unmeasured-or-locked',
        !this.snapshot.measured || this.snapshot.snapCount <= 1,
      );
      this.autoplay.setReason('disabled', !!this.#input.disabled || !!this.#input.readOnly);
      this.autoplay.setReason('unresolved', this.#unresolved);
      this.autoplay.setReason('transition', false);
      if (this.#config.autoplay !== this.#autoplayInterval) {
        this.#autoplayInterval = this.#config.autoplay;
        if (this.#config.autoplay > 0) this.autoplay.start();
        else this.autoplay.stop();
      } else this.autoplay.refresh();
    } catch (error) {
      if (!selectionReached) {
        this.#input = coherent.input;
        this.#config = coherent.config;
        this.#geometry = coherent.geometry;
        this.#layout = coherent.layout;
        this.#loop = coherent.loop;
      }
      this.#diagnose('Carousel update failed; pending work was canceled.', error);
      this.#cancel();
      if (wasInitialized && !this.disposed) this.#unbind = this.adapter.bind?.(this);
    }
  }
  async reinitialize(): Promise<void> {
    if (this.#released) return;
    this.#destroyed = false;
    await this.update();
    if (!this.disposed) this.#emit('reinitialized');
  }
  previous(request: CarouselNavigationRequest = {}): Promise<CarouselNavigationResult> {
    return this.#step(-1, request);
  }
  next(request: CarouselNavigationRequest = {}): Promise<CarouselNavigationResult> {
    return this.#step(1, request);
  }
  scrollToId(
    id: CarouselId,
    request: CarouselNavigationRequest = {},
  ): Promise<CarouselNavigationResult> {
    const item = this.#input.items.find((item) => item.id === id);
    return item ? this.scrollToIndex(item.index, request) : this.#reject('missing-id');
  }
  scrollToIndex(
    index: number,
    request: CarouselNavigationRequest = {},
  ): Promise<CarouselNavigationResult> {
    if (this.#proposing)
      return new Promise((resolve) =>
        this.#queued.push(() => {
          void this.scrollToIndex(index, request).then(resolve);
        }),
      );
    if (
      !validIndex(index) ||
      (request.speed !== undefined && (!Number.isFinite(request.speed) || request.speed < 0))
    ) {
      this.#diagnose(
        'Carousel navigation requires an integer index and a finite nonnegative speed.',
      );
      return this.#reject('invalid-request');
    }
    const snap = carouselSnapForIndex(this.#layout, index);
    if (
      this.disposed ||
      !this.#initialized ||
      this.#input.disabled ||
      this.#input.readOnly ||
      this.adapter.read().disabled ||
      this.adapter.read().readOnly ||
      this.#unresolved ||
      !this.#layout.measured ||
      snap === null
    )
      return this.#reject('unavailable');
    const current = this.#selectedSnap();
    if (
      current !== null &&
      ((snap < current && !this.#config.interaction.allowPrevious) ||
        (snap > current && !this.#config.interaction.allowNext))
    )
      return this.#reject('direction-locked');
    if (
      this.#animating &&
      (this.#config.interaction.preventInteractionOnTransition ||
        (this.#loop.mode === 'continuous' && this.#config.loopOptions.preventDuringTransition))
    )
      return this.#reject('transition-locked');
    return this.#navigate(snap, request);
  }
  /** Swiper's first-move getTranslate/setTransition(0) handoff. */
  interruptPreview(): number {
    const position = this.adapter.readPosition?.() ?? this.#position;
    this.#cancel();
    this.#generation++;
    this.#position = position;
    this.autoplay.setReason('transition', false);
    this.#publish('swipe');
    return position;
  }
  preview(position: number, reason: ChangeReason = 'swipe', write = true): Promise<void> {
    if (this.disposed || this.#unresolved || !Number.isFinite(position)) return Promise.resolve();
    this.#position = position;
    this.#publish(reason);
    if (!this.#progressFrame) {
      const emit = () => {
        this.#progressFrame = undefined;
        if (!this.disposed) this.#emit('progress');
      };
      this.#progressFrame = this.adapter.owner?.requestAnimationFrame
        ? this.#scheduler.animationFrame(emit)
        : this.#scheduler.microtask(emit);
    }
    const previewGeneration = ++this.#previewGeneration;
    const generation = this.#generation;
    const project = this.#loop.mode === 'continuous' || !!this.#config.virtual;
    return (async () => {
      if (project) await this.adapter.render(this.snapshot, this.projection);
      if (
        previewGeneration !== this.#previewGeneration ||
        generation !== this.#generation ||
        this.disposed
      )
        return;
      if (write) await this.adapter.move(position, { speed: 0, reason }, generation);
      if (project && this.#config.virtual) this.#emit('virtual-update');
    })().catch((error) => this.#diagnose('Carousel preview failed.', error));
  }
  settlePreview(request: CarouselNavigationRequest = {}): Promise<CarouselNavigationResult> {
    const snap = closestCarouselSnap(this.#layout, this.#normalizedPosition());
    return snap === null
      ? this.#reject('unavailable')
      : this.scrollToIndex(this.#layout.snaps[snap]!.index, request);
  }
  async restorePreview(): Promise<void> {
    const snap = this.#selectedSnap();
    if (snap === null) return;
    const previewGeneration = ++this.#previewGeneration;
    const generation = this.#generation;
    this.#position = this.#layout.snaps[snap]!.position;
    this.#publish();
    if (this.#loop.mode === 'continuous' || this.#config.virtual)
      await this.adapter.render(this.snapshot, this.projection);
    if (
      this.disposed ||
      generation !== this.#generation ||
      previewGeneration !== this.#previewGeneration
    )
      return;
    await this.adapter.move(this.#position, { speed: 0 }, generation);
  }
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#generation++;
    this.#cancel();
    try {
      this.#unbind?.();
    } finally {
      this.#unbind = undefined;
      this.autoplay.stop();
      this.#publish();
    }
  }
  /** Host disconnect is terminal, unlike an explicit public destroy/reinitialize pair. */
  release(): void {
    this.destroy();
    this.#released = true;
    this.autoplay.dispose();
    this.#scheduler.dispose();
    this.#listeners.clear();
  }

  #initialIndex(): number {
    const supplied = this.#input.defaultValue ?? this.#input.index;
    if (supplied !== undefined && (!validIndex(supplied) || supplied < 0))
      this.#diagnose('Invalid Carousel default/index; using the first eligible group.');
    const snap = carouselSnapForIndex(
      this.#layout,
      validIndex(supplied) && supplied >= 0 ? supplied : 0,
    );
    if (snap !== null) return this.#layout.snaps[snap]!.index;
    const eligible = this.#input.items.filter((item) => !item.hidden && !item.disabled);
    return (
      eligible.reduce<CarouselItem | undefined>(
        (nearest, item) =>
          !nearest ||
          Math.abs(item.index - (supplied ?? 0)) < Math.abs(nearest.index - (supplied ?? 0))
            ? item
            : nearest,
        undefined,
      )?.index ?? 0
    );
  }
  #resolveOwner(): void {
    const value = this.#state.value;
    const item =
      validIndex(value) && value >= 0
        ? this.#input.items.find((item) => item.index === value && !item.disabled && !item.hidden)
        : undefined;
    this.#acceptedId = item?.id ?? null;
    this.#unresolved = this.#input.items.length > 0 && !item;
    if (this.#unresolved)
      this.#diagnose('Invalid controlled Carousel selection; navigation remains unavailable.');
  }
  /** Shared proposal/commit metadata: identities, snap, input kind and operation generation. */
  #metadata(
    previousId: CarouselId | null,
    value: number,
    snap: number | null,
    reason: ChangeReason,
    sourceEvent?: Event,
  ): Record<string, unknown> {
    return {
      previousId,
      nextId: this.#input.items.find((item) => item.index === value)?.id ?? null,
      snap,
      generation: this.#generation,
      inputKind: carouselInputKind(reason, sourceEvent),
    };
  }
  #selectedSnap(): number | null {
    return this.#unresolved || this.#acceptedId === null
      ? null
      : carouselSnapForIndex(this.#layout, this.#state.value);
  }
  #viewport(): number {
    return this.#config.orientation === 'horizontal' ? this.#geometry.width : this.#geometry.height;
  }
  #normalizedPosition(): number {
    const cycle = this.#layout.sizes.reduce((sum, size) => sum + size + this.#layout.gap, 0);
    const first = this.#layout.snaps[0]?.position ?? 0;
    return this.#loop.mode === 'continuous' && cycle > 0
      ? ((((this.#position - first) % cycle) + cycle) % cycle) + first
      : this.#position;
  }
  #step(delta: number, request: CarouselNavigationRequest): Promise<CarouselNavigationResult> {
    const current = this.#selectedSnap();
    if (current === null) return this.#reject('unavailable');
    if (
      (delta < 0 && !this.#config.interaction.allowPrevious) ||
      (delta > 0 && !this.#config.interaction.allowNext)
    )
      return this.#reject('direction-locked');
    let target = current + delta;
    if (this.#loop.mode !== 'finite')
      target = (target + this.#layout.snaps.length) % this.#layout.snaps.length;
    target = Math.max(0, Math.min(this.#layout.snaps.length - 1, target));
    return this.scrollToIndex(this.#layout.snaps[target]!.index, request);
  }
  async #navigate(
    snap: number,
    request: CarouselNavigationRequest,
  ): Promise<CarouselNavigationResult> {
    const destination = this.#layout.snaps[snap]!.index;
    const previous = this.#state.value;
    const reason = request.reason ?? 'imperative-action';
    const previousPosition = this.adapter.readPosition?.() ?? this.#position;
    this.#lastReason = reason;
    this.#cancel();
    const generation = ++this.#generation;
    let canceled = false;
    const cancelled = new Promise<void>((resolve) => {
      this.#cancelOperation = () => {
        canceled = true;
        resolve();
      };
    });
    let status: CarouselNavigationResult['status'] = 'unchanged';
    try {
      this.#proposing = true;
      this.#sourceEvent = request.sourceEvent;
      if (destination !== previous) {
        const accepted = this.#state.set(destination, reason, request.sourceEvent, {
          metadata: this.#metadata(
            this.#acceptedId,
            destination,
            snap,
            reason,
            request.sourceEvent,
          ),
        });
        status =
          accepted && this.#state.value !== previous && !this.#unresolved ? 'accepted' : 'rejected';
      }
    } catch (error) {
      this.#diagnose('Carousel change callback failed.', error);
      status = 'rejected';
    } finally {
      this.#proposing = false;
      this.#sourceEvent = undefined;
      this.#ownerValue = this.adapter.read().value;
    }
    const selected = this.#selectedSnap();
    if (selected === null) status = 'rejected';
    const position = selected === null ? 0 : this.#layout.snaps[selected]!.position;
    this.#position = position;
    this.#animating = request.speed !== 0 && Math.abs(position - previousPosition) > 0.001;
    this.autoplay.setReason('transition', this.#animating);
    if (reason !== 'automatic-advance' && this.#config.autoplayOptions.stopAfterInteraction)
      this.autoplay.stop();
    this.#publish(reason);
    const work = async () => {
      await this.adapter.render(this.snapshot, this.projection);
      if (canceled || generation !== this.#generation) return;
      await this.adapter.move(position, request, generation);
    };
    // Reentrant requests start after the synchronous publication, with their own lifetime.
    queueMicrotask(() => {
      for (const queued of this.#queued.splice(0)) queued();
    });
    try {
      await Promise.race([work(), cancelled]);
    } catch (error) {
      this.#diagnose('Carousel presentation failed.', error);
      if (status !== 'accepted') status = 'rejected';
    }
    if (canceled || generation !== this.#generation || this.disposed)
      return this.#result('cancelled', 'superseded');
    this.#cancelOperation = undefined;
    this.#animating = false;
    this.#publish(reason);
    try {
      this.#emit('settled');
    } finally {
      this.autoplay.setReason('transition', false);
      this.autoplay.refresh();
    }
    return this.#result(status, status === 'rejected' ? 'not-acknowledged' : reason);
  }
  #publish(reason: ChangeReason = 'programmatic'): void {
    const snap = this.#selectedSnap();
    const first = this.#layout.snaps[0]?.position ?? 0,
      last = this.#layout.snaps.at(-1)?.position ?? first;
    const range = last - first;
    const committed = snap === null ? first : this.#layout.snaps[snap]!.position;
    const visibleIndices = carouselVisible(
      this.#layout,
      this.#position,
      this.#viewport(),
      false,
      this.#loop.mode === 'continuous',
    );
    const visibleIds = Object.freeze(
      this.#input.items
        .filter((item) => visibleIndices.includes(item.index))
        .map((item) => item.id),
    );
    const movable =
      this.#initialized &&
      !this.disposed &&
      !this.#input.disabled &&
      !this.#input.readOnly &&
      !this.#unresolved &&
      this.#layout.snaps.length > 1;
    const snapshot: CarouselSnapshot = Object.freeze({
      initialized: this.#initialized && !this.disposed,
      measured: this.#layout.measured,
      measurementSource: this.#layout.measured
        ? (this.#geometry.source ?? 'observed')
        : 'unmeasured',
      selectedIndex: this.#unresolved || this.#acceptedId === null ? null : this.#state.value,
      selectedId: this.#unresolved ? null : this.#acceptedId,
      snapIndex: snap,
      snapCount: this.#layout.snaps.length,
      itemCount: this.#input.items.length,
      visibleIds,
      progress: range ? (committed - first) / range : 0,
      previewProgress: range ? (this.#position - first) / range : 0,
      canScrollPrevious:
        movable &&
        this.#config.interaction.allowPrevious &&
        (this.#loop.mode !== 'finite' || (snap !== null && snap > 0)),
      canScrollNext:
        movable &&
        this.#config.interaction.allowNext &&
        (this.#loop.mode !== 'finite' || (snap !== null && snap < this.#layout.snaps.length - 1)),
      locked: this.#config.layout.watchOverflow && this.#layout.snaps.length <= 1,
      animating: this.#animating,
      orientation: this.#config.orientation,
      direction: this.#input.direction ?? 'ltr',
      loopMode: this.#loop.mode,
      virtual: this.#config.virtual
        ? carouselVirtualRange(
            this.#input.items,
            Math.max(
              0,
              this.#input.items.findIndex(
                (item) =>
                  item.index ===
                  this.#layout.snaps[
                    closestCarouselSnap(this.#layout, this.#normalizedPosition()) ?? 0
                  ]?.index,
              ),
            ),
            this.#viewport(),
            this.#layout,
            this.#config,
            this.#loop.mode === 'continuous',
            visibleIds,
            this.adapter.focusedId?.() ?? null,
          )
        : null,
      autoplayRunning: this.autoplay?.running ?? false,
      autoplayPaused: this.autoplay?.paused ?? false,
    });
    const wasLocked = this.snapshot.locked;
    try {
      this.#store.set(snapshot, reason);
    } catch (error) {
      this.#diagnose('Carousel snapshot observer failed.', error);
    }
    if (this.#initialized && wasLocked !== snapshot.locked) this.#emit('lock-change');
    this.adapter.host.requestUpdate();
  }
  #emit(event: CarouselEventName): void {
    for (const listener of [...(this.#listeners.get(event) ?? [])]) {
      try {
        listener(this.snapshot);
      } catch (error) {
        this.#diagnose(`Carousel ${event} observer failed.`, error);
      }
    }
    this.adapter.host.dispatchEvent(
      new CustomEvent(`tp-carousel-${event}`, {
        bubbles: true,
        composed: true,
        detail: this.snapshot,
      }),
    );
  }
  async #reject(reason: string): Promise<CarouselNavigationResult> {
    if (!this.disposed && this.#selectedSnap() !== null) {
      try {
        await this.restorePreview();
      } catch (error) {
        this.#diagnose('Carousel rejected preview restoration failed.', error);
      }
    }
    return this.#result('rejected', reason);
  }
  #result(status: CarouselNavigationResult['status'], reason: string): CarouselNavigationResult {
    return Object.freeze({
      status,
      index: this.snapshot.selectedIndex,
      id: this.snapshot.selectedId,
      reason,
    });
  }
  #cancel(): void {
    this.#previewGeneration++;
    this.#cancelOperation?.();
    this.#cancelOperation = undefined;
    this.#progressFrame?.();
    this.#progressFrame = undefined;
    this.adapter.cancel();
    this.#animating = false;
  }
  #diagnose(message: string, error?: unknown): void {
    try {
      this.adapter.diagnose?.(message, error);
    } catch {
      /* Diagnostic consumers cannot prevent mandatory cleanup. */
    }
  }
}
