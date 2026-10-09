import { Scheduler } from '../../services.js';
import type { Coordinates } from '../geometry.js';

export type Distance = number | { x?: number; y?: number };
export interface ActivationContext {
  initial: Coordinates;
  scheduler: Scheduler;
  activate(): void;
}
export interface ActivationBranch {
  move(point: Coordinates, event?: PointerEvent): void;
  dispose(): void;
}
export interface ActivationDescriptor {
  create(context: ActivationContext): ActivationBranch;
}
/** Source-compatible operation controller for custom constraint instances. */
export class ActivationController<E extends Event = PointerEvent> extends AbortController {
  activated = false;
  constructor(
    readonly constraints: readonly ActivationConstraint<E>[],
    private readonly onActivate: (event: E) => void,
  ) {
    super();
    for (const constraint of constraints) constraint.controller = this;
  }
  onEvent(event: E): void {
    if (this.activated || this.signal.aborted) return;
    if (!this.constraints.length) this.activate(event);
    else
      for (const constraint of this.constraints) {
        if (this.activated || this.signal.aborted) break;
        constraint.onEvent(event);
      }
  }
  activate(event: E): void {
    if (this.activated || this.signal.aborted) return;
    this.activated = true;
    this.onActivate(event);
  }
  override abort(event?: E): void {
    if (this.signal.aborted) return;
    super.abort(event);
    const errors: unknown[] = [];
    for (const constraint of this.constraints) {
      try {
        constraint.abort(event);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Activation constraint cleanup failed.');
  }
}
export abstract class ActivationConstraint<E extends Event = PointerEvent, O = unknown> {
  controller: ActivationController<E> | undefined;
  constructor(protected readonly configuration: O) {}
  activate(event: E): void {
    this.controller?.activate(event);
  }
  abstract onEvent(event: E): void;
  abstract abort(event?: E): void;
}
export type ActivationConstraintFactory = () =>
  ActivationDescriptor | ActivationConstraint<PointerEvent>;
export type ActivationConstraintInput =
  ActivationDescriptor | ActivationConstraint<PointerEvent> | ActivationConstraintFactory;

abstract class PointerConstraint<O>
  extends ActivationConstraint<PointerEvent, O>
  implements ActivationDescriptor
{
  #branch: ActivationBranch | undefined;
  #scheduler: Scheduler | undefined;
  abstract create(context: ActivationContext): ActivationBranch;
  onEvent(event: PointerEvent): void {
    if (event.type === 'pointerdown') {
      this.abort();
      this.#scheduler = new Scheduler(event.view ?? undefined);
      this.#branch = this.create({
        initial: { x: event.clientX, y: event.clientY },
        scheduler: this.#scheduler,
        activate: () => this.activate(event),
      });
    } else if (event.type === 'pointermove')
      this.#branch?.move({ x: event.clientX, y: event.clientY }, event);
    else if (event.type === 'pointerup' || event.type === 'pointercancel') this.abort(event);
  }
  abort(_event?: PointerEvent): void {
    void _event;
    this.#branch?.dispose();
    this.#branch = undefined;
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
  }
}
export function validateDistance(value: Distance): void {
  const entries =
    typeof value === 'number' ? [value] : [value.x, value.y].filter((n) => n !== undefined);
  if (!entries.length || !entries.every((n) => Number.isFinite(n) && n >= 0))
    throw new RangeError('Activation distances must be finite and nonnegative.');
}
export function exceedsDistance(delta: Coordinates, value: Distance): boolean {
  if (typeof value === 'number') return Math.hypot(delta.x, delta.y) > value;
  return (
    (value.x === undefined || Math.abs(delta.x) > value.x) &&
    (value.y === undefined || Math.abs(delta.y) > value.y)
  );
}
export class DistanceConstraint extends PointerConstraint<{
  value: Distance;
  tolerance?: Distance;
}> {
  constructor(readonly options: { value: Distance; tolerance?: Distance }) {
    super(options);
    validateDistance(options.value);
    if (options.tolerance !== undefined) validateDistance(options.tolerance);
  }
  create({ initial, activate }: ActivationContext): ActivationBranch {
    let active = true;
    return {
      move: (point) => {
        if (!active) return;
        const delta = { x: point.x - initial.x, y: point.y - initial.y };
        if (
          this.options.tolerance !== undefined &&
          exceedsDistance(delta, this.options.tolerance)
        ) {
          active = false;
          return;
        }
        if (exceedsDistance(delta, this.options.value)) {
          active = false;
          activate();
        }
      },
      dispose: () => {
        active = false;
      },
    };
  }
}
export class DelayConstraint extends PointerConstraint<{ value: number; tolerance: Distance }> {
  constructor(readonly options: { value: number; tolerance: Distance }) {
    super(options);
    validateDistance(options.value);
    validateDistance(options.tolerance);
  }
  create({ initial, scheduler, activate }: ActivationContext): ActivationBranch {
    let active = true;
    const cancel = scheduler.timeout(() => {
      if (active) {
        active = false;
        activate();
      }
    }, this.options.value);
    const dispose = () => {
      active = false;
      cancel();
    };
    return {
      move: (point) => {
        if (
          active &&
          exceedsDistance(
            { x: point.x - initial.x, y: point.y - initial.y },
            this.options.tolerance,
          )
        )
          dispose();
      },
      dispose,
    };
  }
}
