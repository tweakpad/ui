import { CleanupScope, Scheduler } from '../services.js';
import { componentHandlingPrevented } from '../part.js';
import type { CarouselController } from './controller.js';
import type { CarouselTarget } from './types.js';

export interface CarouselElements {
  root: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
}
export function carouselTarget(
  target: CarouselTarget | null,
  root: HTMLElement,
): HTMLElement | null {
  if (target === null) return null;
  if (typeof target === 'function') return target();
  if (typeof target !== 'string') return target;
  if (target === 'root') return root;
  const tree = root.getRootNode();
  const owner = tree.nodeType === 11 && 'host' in tree ? (tree as ShadowRoot).host : null;
  return (
    root.querySelector<HTMLElement>(target) ??
    root.shadowRoot?.querySelector<HTMLElement>(target) ??
    owner?.querySelector<HTMLElement>(target) ??
    null
  );
}
export function carouselInteractive(event: Event, root: HTMLElement): boolean {
  for (const node of event.composedPath()) {
    if (node === root) break;
    if (
      (node as Node).nodeType === 1 &&
      (node as Element).matches(
        'input,textarea,select,button,a[href],[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="spinbutton"],[role="textbox"],[role="combobox"],[role="scrollbar"],tp-button,tp-input,tp-number-field,tp-select,tp-slider,tp-text-area',
      )
    )
      return true;
  }
  return false;
}
const hideOnClickInteractive =
  'summary,label,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="radio"],[role="tab"],[role="menuitem"],[role="option"],[role="listbox"],[role="searchbox"]';
/** Hide-on-click ignores descendant controls, interactive slide content and the
 * indicator/scrollbar/autoplay regions supplied by the binding. */
export function carouselHideOnClickIgnored(
  event: Event,
  root: HTMLElement,
  regions: readonly (Element | null | undefined)[] = [],
): boolean {
  if (event.defaultPrevented || carouselInteractive(event, root)) return true;
  for (const node of event.composedPath()) {
    if (node === root) break;
    if (regions.includes(node as Element)) return true;
    if ((node as Node).nodeType === 1 && (node as Element).matches(hideOnClickInteractive))
      return true;
  }
  return false;
}
export function carouselPathMatches(event: Event, selector: string, root: HTMLElement): boolean {
  for (const node of event.composedPath()) {
    if ((node as Node).nodeType === 1 && (node as Element).matches(selector)) return true;
    if (node === root) break;
  }
  return false;
}

export function bindCarouselKeyboard(
  controller: CarouselController,
  elements: CarouselElements,
  scope: CleanupScope,
): void {
  scope.listen(elements.root, 'keydown', (event) => {
    const keyboard = controller.configuration.keyboard;
    if (
      !keyboard ||
      !keyboard.enabled ||
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      carouselInteractive(event, elements.root)
    )
      return;
    // The nearest Carousel in the composed path owns local navigation.
    const nearest = event
      .composedPath()
      .find((node) => (node as Element).getAttribute?.('aria-roledescription') === 'carousel');
    if (nearest && nearest !== elements.root) return;
    const state = controller.snapshot;
    const previous =
      state.orientation === 'vertical'
        ? 'ArrowUp'
        : state.direction === 'rtl'
          ? 'ArrowRight'
          : 'ArrowLeft';
    const next =
      state.orientation === 'vertical'
        ? 'ArrowDown'
        : state.direction === 'rtl'
          ? 'ArrowLeft'
          : 'ArrowRight';
    const request = { reason: 'keyboard' as const, sourceEvent: event };
    if (
      (event.key === previous || (keyboard.pageKeys && event.key === 'PageUp')) &&
      state.canScrollPrevious
    ) {
      event.preventDefault();
      void controller.previous(request);
    } else if (
      (event.key === next || (keyboard.pageKeys && event.key === 'PageDown')) &&
      state.canScrollNext
    ) {
      event.preventDefault();
      void controller.next(request);
    } else if (keyboard.homeEnd && event.key === 'Home' && state.canScrollPrevious) {
      event.preventDefault();
      void controller.scrollToIndex(0, request);
    } else if (keyboard.homeEnd && event.key === 'End' && state.canScrollNext) {
      event.preventDefault();
      void controller.scrollToIndex(Number.MAX_SAFE_INTEGER, request);
    }
  });
}

export interface CarouselWheelSample {
  deltaX?: number;
  deltaY?: number;
  deltaMode?: number;
  shiftKey?: boolean;
  detail?: number;
  wheelDelta?: number;
  wheelDeltaX?: number;
  wheelDeltaY?: number;
}
export function normalizeCarouselWheel(event: CarouselWheelSample): { x: number; y: number } {
  let x = (event.wheelDeltaX === undefined ? 0 : -event.wheelDeltaX / 120) * 10;
  let y =
    (event.wheelDeltaY !== undefined
      ? -event.wheelDeltaY / 120
      : event.wheelDelta !== undefined
        ? -event.wheelDelta / 120
        : (event.detail ?? 0)) * 10;
  if (event.deltaX !== undefined) x = event.deltaX;
  if (event.deltaY !== undefined) y = event.deltaY;
  if (event.shiftKey && !x) {
    x = y;
    y = 0;
  }
  const unit = event.deltaMode === 1 ? 40 : event.deltaMode ? 800 : 1;
  return { x: x * unit, y: y * unit };
}
export function bindCarouselWheel(
  controller: CarouselController,
  elements: CarouselElements,
  scope: CleanupScope,
): void {
  const options = controller.configuration.mousewheel;
  if (!options || !options.enabled) return;
  const target = carouselTarget(options.target, elements.root);
  if (!target) return;
  let previous: { magnitude: number; direction: number; time: number } | undefined;
  let lastNavigation = -Infinity;
  let ownedUntil = -Infinity;
  scope.listen(
    target,
    'wheel',
    (event) => {
      if (
        event.defaultPrevented ||
        componentHandlingPrevented(event) ||
        event.ctrlKey ||
        controller.disposed ||
        carouselPathMatches(event, options.ignoreSelector, elements.root)
      )
        return;
      const { x, y } = normalizeCarouselWheel(event);
      const horizontal = controller.snapshot.orientation === 'horizontal';
      if (
        options.forceToAxis &&
        (horizontal ? Math.abs(y) > Math.abs(x) : Math.abs(x) > Math.abs(y))
      )
        return;
      let delta = horizontal
        ? options.forceToAxis
          ? x
          : Math.abs(x) > Math.abs(y)
            ? x
            : y
        : options.forceToAxis
          ? y
          : Math.abs(y) >= Math.abs(x)
            ? y
            : x;
      if (horizontal && controller.snapshot.direction === 'rtl') delta *= -1;
      if (options.invert) delta *= -1;
      delta *= options.sensitivity;
      if (!Number.isFinite(delta) || delta === 0) return;
      const now = event.timeStamp;
      const sample = { magnitude: Math.abs(delta), direction: Math.sign(delta), time: now };
      const canMove =
        delta > 0 ? controller.snapshot.canScrollNext : controller.snapshot.canScrollPrevious;
      if (!canMove && options.releaseOnEdges && controller.snapshot.loopMode === 'finite') {
        ownedUntil = -Infinity;
        previous = sample;
        return;
      }
      const newImpulse =
        !previous ||
        sample.direction !== previous.direction ||
        sample.magnitude > previous.magnitude ||
        now - previous.time > 150;
      previous = sample;
      const threshold =
        (options.thresholdDelta === null || sample.magnitude >= options.thresholdDelta) &&
        (options.thresholdTime === null || now - lastNavigation >= options.thresholdTime) &&
        !(sample.magnitude >= 6 && now - lastNavigation < 60);
      if (newImpulse && threshold && canMove) {
        event.preventDefault();
        ownedUntil = now + 150;
        lastNavigation = now;
        void (delta > 0
          ? controller.next({ reason: 'wheel', sourceEvent: event })
          : controller.previous({ reason: 'wheel', sourceEvent: event }));
      } else if (now <= ownedUntil) {
        event.preventDefault();
        ownedUntil = now + 150;
      }
    },
    { passive: false },
  );
}

interface GestureOwner {
  controller: CarouselController;
  elements: CarouselElements;
  changed?: (dragging: boolean) => void;
}
interface Gesture {
  owner: GestureOwner;
  pointer: number;
  originX: number;
  originY: number;
  start: number;
  position: number;
  started: number;
  threshold: boolean;
  moved: boolean;
  direction: number;
  scope: CleanupScope;
  capture: HTMLElement;
}
const coordinators = new WeakMap<Document, CarouselGestures>();
const originalEvents = new WeakMap<Event, Event>();
const originalEvent = (event: Event): Event => originalEvents.get(event) ?? event;
function touchSample(event: TouchEvent, touch: Touch, type: string): PointerEvent {
  const values: Record<PropertyKey, unknown> = {
    type,
    pointerType: 'touch',
    pointerId: touch.identifier,
    isPrimary: true,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.pageX,
    pageY: touch.pageY,
    button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
  };
  const sample = new Proxy(event, {
    get(target, key) {
      if (Object.hasOwn(values, key)) return values[key];
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as unknown as PointerEvent;
  originalEvents.set(sample, event);
  return sample;
}

/** One composed-path coordinator per document makes nesting independent of listener order. */
class CarouselGestures {
  readonly owners = new Map<HTMLElement, GestureOwner>();
  readonly scope = new CleanupScope();
  readonly scheduler: Scheduler;
  gesture: Gesture | undefined;
  candidates: GestureOwner[] = [];
  suppressClick = false;
  frame: (() => void) | undefined;
  constructor(readonly document: Document) {
    this.scheduler = new Scheduler(document.defaultView ?? undefined);
    this.scope.listen(document, 'pointerdown', (event) => this.start(event));
    if (!document.defaultView?.PointerEvent)
      this.scope.listen(
        document,
        'touchstart',
        (event) => {
          if (event.touches.length !== 1) {
            this.cancel();
            return;
          }
          const touch = event.changedTouches[0];
          if (touch) this.start(touchSample(event, touch, 'pointerdown'));
        },
        { passive: false },
      );
    this.scope.listen(
      document,
      'click',
      (event) => {
        if (!this.suppressClick) return;
        const owner = event
          .composedPath()
          .map((node) => this.owners.get(node as HTMLElement))
          .find(Boolean);
        if (!owner) return;
        const interaction = owner.controller.configuration.interaction;
        if (interaction.preventClicks) event.preventDefault();
        if (interaction.preventClickPropagation) event.stopPropagation();
      },
      { capture: true },
    );
  }
  start(event: PointerEvent): void {
    if (this.gesture && event.pointerType === 'touch' && event.pointerId !== this.gesture.pointer) {
      this.cancel();
      return;
    }
    if (
      this.gesture ||
      event.defaultPrevented ||
      componentHandlingPrevented(originalEvent(event)) ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    this.candidates = event
      .composedPath()
      .map((node) => this.owners.get(node as HTMLElement))
      .filter((owner): owner is GestureOwner => !!owner)
      .filter((owner) => {
        const { controller, elements } = owner;
        const config = controller.configuration,
          interaction = config.interaction,
          state = controller.snapshot;
        if (
          config.transport === 'scroll' ||
          !interaction.enabled ||
          (!state.canScrollNext && !state.canScrollPrevious) ||
          (event.pointerType === 'mouse' && !interaction.simulateMouse) ||
          carouselInteractive(event, elements.root)
        )
          return false;
        if (
          state.animating &&
          (interaction.preventInteractionOnTransition ||
            (state.loopMode === 'continuous' && config.loopOptions.preventDuringTransition))
        )
          return false;
        const target =
          interaction.target === 'track'
            ? elements.track
            : carouselTarget(interaction.target, elements.root);
        if (!target || !event.composedPath().includes(target)) return false;
        if (
          interaction.noSwipe &&
          carouselPathMatches(event, interaction.noSwipeSelector, elements.root)
        )
          return false;
        const handle = carouselTarget(interaction.handle, elements.root);
        if (interaction.handle !== null && (!handle || !event.composedPath().includes(handle)))
          return false;
        if (interaction.preventActivation?.(originalEvent(event), state)) return false;
        const width = elements.root.ownerDocument.defaultView?.innerWidth ?? 0;
        if (
          interaction.edgeSwipeDetection &&
          (event.clientX <= interaction.edgeSwipeThreshold ||
            event.clientX >= width - interaction.edgeSwipeThreshold)
        ) {
          if (interaction.edgeSwipeDetection === true) return false;
          event.preventDefault();
        }
        return true;
      });
    const owner = this.candidates[0];
    if (!owner) return;
    const scope = new CleanupScope();
    this.gesture = {
      owner,
      pointer: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      start: owner.controller.projection.position,
      position: owner.controller.projection.position,
      started: event.timeStamp,
      threshold: false,
      moved: false,
      direction: 0,
      scope,
      capture: owner.elements.track,
    };
    scope.listen(this.document, 'pointermove', (move) => this.move(move), { passive: false });
    scope.listen(this.document, 'pointerup', (end) => this.end(end, false));
    scope.listen(this.document, 'pointercancel', (end) => this.end(end, true));
    if (!this.document.defaultView?.PointerEvent) {
      scope.listen(
        this.document,
        'touchmove',
        (move) => {
          if (move.touches.length !== 1) {
            this.cancel();
            return;
          }
          const touch = [...move.changedTouches].find(
            (touch) => touch.identifier === this.gesture?.pointer,
          );
          if (touch) this.move(touchSample(move, touch, 'pointermove'));
        },
        { passive: false },
      );
      for (const type of ['touchend', 'touchcancel'] as const)
        scope.listen(this.document, type, (end) => {
          const touch = [...end.changedTouches].find(
            (touch) => touch.identifier === this.gesture?.pointer,
          );
          if (touch)
            this.end(
              touchSample(end, touch, type === 'touchend' ? 'pointerup' : 'pointercancel'),
              type === 'touchcancel',
            );
        });
    }
    scope.listen(this.document, 'keydown', (key) => {
      if (key.key === 'Escape' && !key.defaultPrevented) {
        key.preventDefault();
        this.cancel();
      }
    });
    scope.listen(this.document, 'lostpointercapture', (end) => {
      if (end.composedPath()[0] !== this.gesture?.capture) return;
      // Chrome can release mouse capture before delivering the final move/up.
      // With the button already up, pointerup still owns normal settlement.
      if (end.pointerType === 'mouse' && end.buttons === 0) return;
      this.end(end, true);
    });
    scope.listen(this.document.defaultView ?? this.document, 'blur', () => this.cancel());
    const interaction = owner.controller.configuration.interaction;
    if (
      interaction.forcePreventStartDefault ||
      (interaction.preventStartDefault && event.pointerType === 'mouse')
    )
      event.preventDefault();
    this.suppressClick = false;
  }
  move(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointer) return;
    // As in Swiper onTouchMove, keep the last sample even if buttons is already
    // zero. Treating that pre-pointerup sample as cancellation snaps back.
    const dx = event.clientX - gesture.originX,
      dy = event.clientY - gesture.originY;
    let { owner } = gesture;
    let interaction = owner.controller.configuration.interaction;
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) < interaction.threshold) return;
      if (dx * dx + dy * dy >= 25 || dx === 0 || dy === 0) {
        const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
        const candidate = this.candidates.find((candidate) =>
          candidate.controller.snapshot.orientation === 'horizontal'
            ? angle <= candidate.controller.configuration.interaction.angle
            : 90 - angle <= candidate.controller.configuration.interaction.angle,
        );
        if (!candidate) {
          this.cancel();
          return;
        }
        if (candidate !== owner) {
          owner = gesture.owner = candidate;
          interaction = owner.controller.configuration.interaction;
          gesture.capture = owner.elements.track;
          gesture.start = gesture.position = owner.controller.projection.position;
        }
      } else return;
    }
    const horizontal = owner.controller.snapshot.orientation === 'horizontal';
    let delta =
      (horizontal ? dx : dy) *
      interaction.ratio *
      (horizontal && owner.controller.snapshot.direction === 'rtl' ? 1 : -1);
    if (interaction.oneWay) delta = Math.abs(delta);
    if (!gesture.threshold && interaction.threshold > 0) {
      if (Math.abs(delta) <= interaction.threshold) return;
      gesture.threshold = true;
      gesture.originX = event.clientX;
      gesture.originY = event.clientY;
      delta = 0;
    }
    if (!gesture.moved) gesture.start = gesture.position = owner.controller.interruptPreview();
    const snaps = owner.controller.projection.layout.snaps;
    const first = snaps[0]?.position ?? 0,
      last = snaps.at(-1)?.position ?? first;
    let position = gesture.start + delta;
    if (
      interaction.releaseOnEdges &&
      owner.controller.snapshot.loopMode === 'finite' &&
      (position < first || position > last)
    ) {
      const outer = this.candidates[this.candidates.indexOf(owner) + 1];
      if (outer) {
        const previousCapture = gesture.capture;
        gesture.capture = outer.elements.track;
        if (previousCapture.hasPointerCapture?.(gesture.pointer))
          previousCapture.releasePointerCapture(gesture.pointer);
        owner.controller.autoplay.setReason('gesture', false);
        void owner.controller.restorePreview();
        owner.changed?.(false);
        this.candidates = this.candidates.slice(this.candidates.indexOf(outer));
        gesture.owner = outer;
        gesture.start = gesture.position = outer.controller.projection.position;
        gesture.originX = event.clientX;
        gesture.originY = event.clientY;
        gesture.moved = false;
        gesture.threshold = false;
      } else this.cancel();
      return;
    }
    if (!gesture.moved) {
      try {
        gesture.capture.setPointerCapture(event.pointerId);
      } catch {
        // A capture exception cancels safely: discard the preview and release once.
        this.cancel();
        return;
      }
      gesture.moved = true;
      owner.controller.autoplay.setReason('gesture', true);
      owner.changed?.(true);
    }
    if (interaction.resistance && owner.controller.snapshot.loopMode === 'finite') {
      if (position < first)
        position = first + 1 - Math.pow(first - position, interaction.resistanceRatio);
      else if (position > last)
        position = last - 1 + Math.pow(position - last, interaction.resistanceRatio);
    }
    if (
      (!interaction.allowNext && position > gesture.start) ||
      (!interaction.allowPrevious && position < gesture.start)
    )
      position = gesture.start;
    // Release uses overall swipe direction, not the most recent pointer jitter.
    gesture.direction = Math.sign(position - gesture.start);
    gesture.position = position;
    event.preventDefault();
    if (interaction.stopMovePropagation) event.stopPropagation();
    this.frame?.();
    this.frame = this.scheduler.animationFrame(() => {
      this.frame = undefined;
      if (this.gesture === gesture && interaction.followPointer)
        owner.controller.preview(gesture.position);
    });
  }
  end(event: PointerEvent, cancelled: boolean): void {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointer) return;
    if (!cancelled) this.move(event);
    if (this.gesture !== gesture) return;
    this.gesture = undefined;
    this.frame?.();
    this.frame = undefined;
    gesture.scope.dispose();
    try {
      if (gesture.capture.hasPointerCapture(gesture.pointer))
        gesture.capture.releasePointerCapture(gesture.pointer);
    } catch {
      /* Detached capture target. */
    }
    const controller = gesture.owner.controller;
    gesture.owner.changed?.(false);
    this.suppressClick = gesture.moved;
    this.scheduler.timeout(() => {
      this.suppressClick = false;
    }, 0);
    const finish = () => controller.autoplay.setReason('gesture', false);
    if (!gesture.moved) {
      finish();
      return;
    }
    if (cancelled) {
      void controller.restorePreview().finally(finish);
      return;
    }
    const target = carouselReleaseSnap(
      controller.projection.layout.snaps.map((snap) => snap.position),
      gesture.position,
      gesture.direction || Math.sign(gesture.position - gesture.start),
      event.timeStamp - gesture.started,
      controller.configuration.interaction,
      controller.snapshot.snapIndex ?? 0,
      controller.snapshot.loopMode !== 'finite',
      controller.projection.layout.sizes.reduce(
        (sum, size) => sum + size + controller.projection.layout.gap,
        0,
      ),
    );
    const snap = controller.projection.layout.snaps[target];
    if (snap) {
      const generation = controller.projection.generation;
      void (async () => {
        // Flush the final sample, including an asynchronous virtual/loop render,
        // before slideTo begins its transition from that exact translation.
        if (controller.configuration.interaction.followPointer)
          await controller.preview(gesture.position);
        if (controller.disposed || controller.projection.generation !== generation) return;
        await controller.scrollToIndex(snap.index, {
          reason: 'swipe',
          sourceEvent: originalEvent(event),
        });
      })().finally(finish);
    } else finish();
  }
  cancel(): void {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = undefined;
    gesture.scope.dispose();
    this.frame?.();
    this.frame = undefined;
    try {
      if (gesture.capture.hasPointerCapture(gesture.pointer))
        gesture.capture.releasePointerCapture(gesture.pointer);
    } catch {
      /* Detached capture target. */
    }
    gesture.owner.changed?.(false);
    gesture.owner.controller.autoplay.setReason('gesture', false);
    void gesture.owner.controller.restorePreview();
  }
  dispose(): void {
    this.cancel();
    this.scope.dispose();
    this.scheduler.dispose();
  }
}
export function bindCarouselGesture(
  controller: CarouselController,
  elements: CarouselElements,
  scope: CleanupScope,
  changed?: (dragging: boolean) => void,
): void {
  const document = elements.root.ownerDocument;
  let coordinator = coordinators.get(document);
  if (!coordinator) {
    coordinator = new CarouselGestures(document);
    coordinators.set(document, coordinator);
  }
  const owner = { controller, elements, ...(changed ? { changed } : {}) };
  coordinator.owners.set(elements.root, owner);
  scope.add(() => {
    if (coordinator.gesture?.owner === owner) coordinator.cancel();
    coordinator.owners.delete(elements.root);
    if (!coordinator.owners.size) {
      coordinator.dispose();
      coordinators.delete(document);
    }
  });
}

export function carouselReleaseSnap(
  snaps: readonly number[],
  position: number,
  direction: number,
  duration: number,
  interaction: CarouselController['configuration']['interaction'],
  accepted: number,
  loop = false,
  cycle = 0,
): number {
  if (snaps.length < 2) return 0;
  if (loop && cycle > 0) {
    const first = snaps[0]!;
    const normalized = ((((position - first) % cycle) + cycle) % cycle) + first;
    return (
      carouselReleaseSnap(
        [...snaps, first + cycle],
        normalized,
        direction,
        duration,
        interaction,
        accepted,
      ) % snaps.length
    );
  }
  let start = 0;
  for (let index = 0; index < snaps.length - 1; index++)
    if (position >= snaps[index]!) start = index;
  const end = Math.min(start + 1, snaps.length - 1);
  const size = snaps[end]! - snaps[start]!;
  const ratio = size ? (position - snaps[start]!) / size : 0;
  if (duration > interaction.longSwipeMs) {
    if (!interaction.longSwipes) return accepted;
    return direction > 0
      ? ratio >= interaction.longSwipeRatio
        ? end
        : start
      : ratio > 1 - interaction.longSwipeRatio
        ? end
        : start;
  }
  if (!interaction.shortSwipes) return accepted;
  return direction > 0 ? end : start;
}
