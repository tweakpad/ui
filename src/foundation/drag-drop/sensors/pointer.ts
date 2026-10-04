import { CleanupScope, Scheduler } from '../../services.js';
import { composedContains } from '../../focus.js';
import { leaseStyle } from '../../owned-styles.js';
import { frameCoordinates, sameOriginDocuments } from '../dom-geometry.js';
import { validCoordinates, type Coordinates } from '../geometry.js';
import type { DragDropManager } from '../manager.js';
import type { Draggable } from '../entities.js';
import type { Sensor, SensorFactory } from '../types.js';
import {
  DelayConstraint,
  DistanceConstraint,
  type ActivationBranch,
  ActivationController,
  type ActivationConstraint,
  type ActivationDescriptor,
  type ActivationConstraintInput,
} from './activation.js';

export interface PointerSensorOptions {
  activationConstraints?:
    | readonly ActivationConstraintInput[]
    | ((
        event: PointerEvent,
        source: Draggable,
      ) => readonly ActivationConstraintInput[] | undefined);
  activatorElements?:
    | readonly (Element | null | undefined)[]
    | ((source: Draggable) => readonly (Element | null | undefined)[]);
  preventActivation?: (event: PointerEvent, source: Draggable) => boolean;
}
const claimed = new WeakSet<Event>();
const touchLeases = new WeakMap<Window, { count: number; release: () => void }>();
function touchLease(view: Window): () => void {
  let lease = touchLeases.get(view);
  if (!lease) {
    const listener = () => {};
    view.addEventListener('touchmove', listener, { passive: false });
    touchLeases.set(
      view,
      (lease = { count: 0, release: () => view.removeEventListener('touchmove', listener) }),
    );
  }
  lease.count++;
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (!--lease.count) {
      lease.release();
      touchLeases.delete(view);
    }
  };
}
function effectiveTarget(event: Event): Element | null {
  const node = event.composedPath()[0] as Node | undefined;
  return node?.nodeType === 1 ? (node as Element) : null;
}
function interactive(event: Event, source: Draggable): boolean {
  const target = effectiveTarget(event);
  if (!target) return true;
  if (
    target === source.element ||
    target === source.handle ||
    (source.handle && composedContains(source.handle, target))
  )
    return false;
  for (const node of event.composedPath()) {
    if (node === source.element) return false;
    if (
      (node as Node).nodeType === 1 &&
      (node as Element).matches(
        'button,input,select,textarea,a[href],summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="textbox"]',
      )
    )
      return true;
  }
  return false;
}
function defaults(event: PointerEvent, source: Draggable): readonly ActivationConstraintInput[] {
  const target = effectiveTarget(event);
  if (
    event.pointerType === 'mouse' &&
    source.handle &&
    target &&
    composedContains(source.handle, target)
  )
    return [];
  if (event.pointerType === 'touch') return [new DelayConstraint({ value: 250, tolerance: 5 })];
  if (target?.matches('input,textarea,[contenteditable="true"]'))
    return [new DelayConstraint({ value: 200, tolerance: 0 })];
  return [new DelayConstraint({ value: 200, tolerance: 10 }), new DistanceConstraint({ value: 5 })];
}

export class PointerSensor implements Sensor {
  #disabled = false;
  readonly #scope = new CleanupScope();
  #gesture: { source: Draggable; active: boolean; cancel(): void } | undefined;
  constructor(
    readonly manager: DragDropManager,
    readonly options: PointerSensorOptions = {},
  ) {}
  static configure(options: PointerSensorOptions = {}): SensorFactory {
    return (manager) => new PointerSensor(manager, options);
  }
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    this.#disabled = value;
    if (value) this.#gesture?.cancel();
  }
  bind(source: Draggable): () => void {
    const scope = new CleanupScope();
    this.#scope.add(() => scope.dispose());
    const targets =
      this.options.activatorElements === undefined
        ? [source.handle ?? source.element]
        : typeof this.options.activatorElements === 'function'
          ? this.options.activatorElements(source)
          : this.options.activatorElements;
    const views = new Set<Window>();
    for (const target of new Set(targets)) {
      if (!target) continue;
      const view = target.ownerDocument.defaultView;
      if (view && !views.has(view)) {
        views.add(view);
        scope.add(touchLease(view));
      }
      scope.listen(target, 'pointerdown', (event) => this.#down(event, source));
    }
    return () => {
      scope.dispose();
      if (this.#gesture?.source === source && !this.#gesture.active) this.#gesture.cancel();
    };
  }
  #down(event: PointerEvent, source: Draggable): void {
    if (
      this.disabled ||
      source.disabled ||
      !source.registered ||
      event.defaultPrevented ||
      !event.isPrimary ||
      event.button !== 0 ||
      !effectiveTarget(event) ||
      claimed.has(event) ||
      this.manager.dragOperation.status !== 'idle' ||
      this.#gesture
    )
      return;
    let constraints: readonly ActivationConstraintInput[];
    try {
      if ((this.options.preventActivation ?? interactive)(event, source)) return;
      const input = this.options.activationConstraints;
      constraints =
        input === undefined
          ? defaults(event, source)
          : ((typeof input === 'function' ? input(event, source) : input) ?? []);
      // Factories run before event ownership or listener/timer acquisition.
      constraints = constraints.map((constraint) =>
        typeof constraint === 'function' ? constraint() : constraint,
      );
    } catch (error) {
      this.manager.reportError(error);
      return;
    }
    const element = source.element,
      view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    const initial = frameCoordinates(element, { x: event.clientX, y: event.clientY });
    if (!validCoordinates(initial)) return;
    const scope = new CleanupScope((error) => this.manager.reportError(error)),
      activation = new CleanupScope(),
      scheduler = new Scheduler(view);
    scope.add(() => scheduler.dispose());
    scope.add(() => activation.dispose());
    let controller: AbortController | undefined,
      latest: { coordinates: Coordinates; event: PointerEvent } | undefined,
      cancelFrame: (() => void) | undefined,
      ended = false;
    const pointerId = event.pointerId,
      capture = element.ownerDocument.body;
    const gesture = { source, active: false, cancel: () => end(true) };
    this.#gesture = gesture;
    const cleanup = () => {
      if (ended) return;
      ended = true;
      this.#gesture = undefined;
      scope.dispose();
      try {
        if (capture.hasPointerCapture(pointerId)) capture.releasePointerCapture(pointerId);
      } catch {
        /* The owner realm may have disappeared. */
      }
    };
    const flush = () => {
      cancelFrame?.();
      cancelFrame = undefined;
      const sample = latest;
      latest = undefined;
      if (sample && this.manager.dragOperation.status === 'dragging')
        this.manager.actions.move({ to: sample.coordinates, event: sample.event });
    };
    const end = (canceled: boolean, nativeEvent?: PointerEvent) => {
      if (ended) return;
      if (gesture.active) {
        if (!canceled) flush();
        if (!canceled) {
          const clickScope = new CleanupScope();
          this.#scope.add(() => clickScope.dispose());
          clickScope.listen(
            element.ownerDocument,
            'click',
            (click) => {
              if (
                (click as PointerEvent).pointerId === pointerId ||
                event
                  .composedPath()
                  .some((node) => click.composedPath().includes(node) && node === element)
              ) {
                click.preventDefault();
                click.stopImmediatePropagation();
                clickScope.dispose();
              }
            },
            { capture: true },
          );
          view.setTimeout(() => clickScope.dispose(), 0);
        }
        cleanup();
        void this.manager.actions.stop({
          canceled,
          ...(nativeEvent ? { event: nativeEvent } : {}),
        });
      } else cleanup();
    };
    const activate = () => {
      if (
        ended ||
        gesture.active ||
        this.disabled ||
        source.disabled ||
        !element.isConnected ||
        this.manager.dragOperation.status !== 'idle'
      ) {
        if (!gesture.active) cleanup();
        return;
      }
      activation.dispose();
      gesture.active = true;
      try {
        controller = this.manager.actions.start({
          source,
          coordinates: initial,
          event,
          input: 'pointer',
        });
        if (controller.signal.aborted) {
          cleanup();
          return;
        }
        event.preventDefault();
        capture.setPointerCapture(pointerId);
        scope.add(leaseStyle(element.ownerDocument.documentElement, 'user-select', 'none'));
        scope.add(leaseStyle(element.ownerDocument.documentElement, 'cursor', 'grabbing'));
        scope.add(this.manager.ownInputFlush(flush));
        controller.signal.addEventListener('abort', cleanup, { once: true });
        scope.add(this.manager.monitor.addEventListener('dragstart', () => flush()));
      } catch (error) {
        this.manager.reportError(error);
        end(true);
      }
    };
    const branches: ActivationBranch[] = [];
    const custom = constraints.filter(
      (constraint): constraint is ActivationConstraint<PointerEvent> =>
        typeof constraint !== 'function' && !('create' in constraint),
    );
    const customController = new ActivationController(custom, activate);
    activation.add(() => customController.abort());
    try {
      for (const constraint of constraints) {
        const branch =
          'create' in constraint
            ? (constraint as ActivationDescriptor).create({
                initial,
                scheduler,
                activate,
              })
            : {
                move: (_point: Coordinates, move?: PointerEvent) => {
                  if (move) (constraint as ActivationConstraint<PointerEvent>).onEvent(move);
                },
                dispose() {},
              };
        branches.push(branch);
        activation.add(() => branch.dispose());
      }
    } catch (error) {
      this.manager.reportError(error);
      cleanup();
      return;
    }
    claimed.add(event);
    for (const document of sameOriginDocuments(element)) {
      scope.listen(
        document,
        'pointermove',
        (move) => {
          if (move.pointerId !== pointerId || ended) return;
          const coordinates = frameCoordinates(document.documentElement, {
            x: move.clientX,
            y: move.clientY,
          });
          if (!validCoordinates(coordinates)) return;
          latest = { coordinates, event: move };
          if (!gesture.active) {
            try {
              for (const branch of branches) {
                if (gesture.active || ended) break;
                branch.move(coordinates, move);
              }
            } catch (error) {
              this.manager.reportError(error);
              end(true, move);
              return;
            }
          }
          if (gesture.active) {
            move.preventDefault();
            if (!cancelFrame)
              cancelFrame = scheduler.animationFrame(() => {
                cancelFrame = undefined;
                flush();
              });
          }
        },
        { capture: true, passive: false },
      );
      scope.listen(
        document,
        'pointerup',
        (up) => {
          if (up.pointerId === pointerId) end(false, up);
        },
        { capture: true },
      );
      scope.listen(
        document,
        'pointercancel',
        (cancel) => {
          if (cancel.pointerId === pointerId) end(true, cancel);
        },
        { capture: true },
      );
    }
    scope.listen(capture, 'lostpointercapture', (lost) => {
      if (lost.pointerId === pointerId && !ended) end(true, lost);
    });
    scope.listen(
      element.ownerDocument,
      'keydown',
      (key) => {
        if (key.key === 'Escape') end(true);
      },
      { capture: true },
    );
    scope.listen(
      element.ownerDocument,
      'dragstart',
      (drag) => {
        if (!drag.composedPath().includes(element)) return;
        if (element.getAttribute('draggable') === 'true') end(true);
        else drag.preventDefault();
      },
      { capture: true },
    );
    scope.listen(
      element.ownerDocument,
      'contextmenu',
      (menu) => {
        if (gesture.active) menu.preventDefault();
      },
      { capture: true },
    );
    scope.listen(
      element.ownerDocument,
      'selectstart',
      (select) => {
        if (gesture.active) select.preventDefault();
      },
      { capture: true },
    );
    scope.listen(view, 'blur', () => end(true));
    if (custom.length) {
      try {
        customController.onEvent(event);
      } catch (error) {
        this.manager.reportError(error);
        cleanup();
      }
    }
    if (!constraints.length) activate();
  }
  destroy(): void {
    this.#gesture?.cancel();
    this.#scope.dispose();
  }
}
