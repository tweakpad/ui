/** Source-derived dnd-kit abstract/modifiers and dom/modifiers; MIT, see LICENSE.dnd-kit. */
import { CleanupScope, Scheduler } from '../services.js';
import {
  Rectangle,
  validCoordinates,
  validRectangle,
  type BoundingRectangle,
  type Coordinates,
} from './geometry.js';
import { measureElement, viewportRectangle } from './dom-geometry.js';

export interface ModifierOperation {
  transform: Coordinates;
  shape: { initial: Rectangle; current: Rectangle } | null;
  source: { element?: Element | null } | null;
}
export interface Modifier {
  disabled?: boolean;
  apply(operation: ModifierOperation): Coordinates;
  end?(): void;
  destroy?(): void;
}
export type ModifierFactory = () => Modifier;
export type ModifierInput = Modifier | ModifierFactory;
export type ModifierConfiguration =
  readonly ModifierInput[] | ((defaults: readonly ModifierInput[]) => readonly ModifierInput[]);

export class AxisModifier implements Modifier {
  disabled = false;
  readonly axis: 'x' | 'y';
  readonly value: number;
  constructor(options: { axis: 'x' | 'y'; value?: number }) {
    if (!['x', 'y'].includes(options.axis) || !Number.isFinite(options.value ?? 0))
      throw new TypeError('AxisModifier requires x or y and a finite value.');
    this.axis = options.axis;
    this.value = options.value ?? 0;
  }
  apply({ transform }: ModifierOperation): Coordinates {
    return this.disabled ? transform : { ...transform, [this.axis]: this.value };
  }
}
export class RestrictToVerticalAxis extends AxisModifier {
  constructor() {
    super({ axis: 'x' });
  }
}
export class RestrictToHorizontalAxis extends AxisModifier {
  constructor() {
    super({ axis: 'y' });
  }
}

export class SnapModifier implements Modifier {
  disabled = false;
  readonly size: Coordinates;
  constructor(options: { size?: number | Coordinates } = {}) {
    const size = options.size ?? 20;
    this.size = typeof size === 'number' ? { x: size, y: size } : { ...size };
    if (!validCoordinates(this.size) || this.size.x <= 0 || this.size.y <= 0)
      throw new RangeError('SnapModifier sizes must be positive and finite.');
  }
  apply({ transform }: ModifierOperation): Coordinates {
    return this.disabled
      ? transform
      : {
          x: Math.ceil(transform.x / this.size.x) * this.size.x,
          y: Math.ceil(transform.y / this.size.y) * this.size.y,
        };
  }
}

export function restrictShapeToBoundingRectangle(
  shape: Rectangle,
  transform: Coordinates,
  bounds: BoundingRectangle,
): Coordinates {
  if (!validCoordinates(transform) || !validRectangle(bounds))
    throw new TypeError('Restriction requires finite bounds and transform.');
  const value = { ...transform };
  if (shape.top + transform.y <= bounds.top) value.y = bounds.top - shape.top;
  else if (shape.bottom + transform.y >= bounds.top + bounds.height)
    value.y = bounds.top + bounds.height - shape.bottom;
  if (shape.left + transform.x <= bounds.left) value.x = bounds.left - shape.left;
  else if (shape.right + transform.x >= bounds.left + bounds.width)
    value.x = bounds.left + bounds.width - shape.right;
  return value;
}

function restrict(
  operation: ModifierOperation,
  bounds: BoundingRectangle | undefined,
): Coordinates {
  if (!operation.shape || !bounds) return operation.transform;
  const { initial, current } = operation.shape;
  return restrictShapeToBoundingRectangle(
    new Rectangle(
      initial.center.x - current.width / 2,
      initial.center.y - current.height / 2,
      current.width,
      current.height,
    ),
    operation.transform,
    bounds,
  );
}

/** Acquires observers only after an operation has a measurable shape. */
export class RestrictToElement implements Modifier {
  disabled = false;
  #element: Element | null = null;
  #bounds: Rectangle | undefined;
  #scope: CleanupScope | undefined;
  constructor(
    readonly options: {
      element?: Element | null | ((operation: ModifierOperation) => Element | null);
    } = {},
  ) {}
  apply(operation: ModifierOperation): Coordinates {
    if (this.disabled || !operation.shape) {
      this.end();
      return operation.transform;
    }
    const element =
      (typeof this.options.element === 'function'
        ? this.options.element(operation)
        : this.options.element) ?? null;
    if (element !== this.#element) {
      this.end();
      this.#element = element;
      const view = element?.ownerDocument.defaultView;
      if (element && view) {
        const scope = (this.#scope = new CleanupScope()),
          scheduler = new Scheduler(view);
        scope.add(() => scheduler.dispose());
        const update = () => {
          this.#bounds = measureElement(element);
        };
        update();
        if (view.ResizeObserver) {
          const observer = new view.ResizeObserver(update);
          observer.observe(element);
          scope.add(() => observer.disconnect());
        }
        let pending = false;
        scope.listen(
          element.ownerDocument,
          'scroll',
          () => {
            if (pending) return;
            pending = true;
            scheduler.timeout(() => {
              pending = false;
              update();
            }, 25);
          },
          { capture: true, passive: true },
        );
      }
    }
    if (!element?.isConnected) this.#bounds = undefined;
    return restrict(operation, this.#bounds);
  }
  end(): void {
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#element = null;
    this.#bounds = undefined;
  }
  destroy(): void {
    this.end();
  }
}

export class RestrictToWindow implements Modifier {
  disabled = false;
  #element: Element | null = null;
  #bounds: Rectangle | undefined;
  #scope: CleanupScope | undefined;
  apply(operation: ModifierOperation): Coordinates {
    if (this.disabled || !operation.shape) {
      this.end();
      return operation.transform;
    }
    const element = operation.source?.element ?? null;
    if (element !== this.#element) {
      this.end();
      this.#element = element;
      const view = element?.ownerDocument.defaultView;
      if (element && view) {
        const scope = (this.#scope = new CleanupScope());
        const update = () => {
          this.#bounds = viewportRectangle(element);
        };
        update();
        scope.listen(view, 'resize', update);
        if (view.visualViewport) {
          scope.listen(view.visualViewport, 'resize', update);
          scope.listen(view.visualViewport, 'scroll', update);
        }
      }
    }
    return restrict(operation, this.#bounds);
  }
  end(): void {
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#element = null;
    this.#bounds = undefined;
  }
  destroy(): void {
    this.end();
  }
}

export function applyModifiers(
  operation: ModifierOperation,
  modifiers: readonly Modifier[],
): Coordinates {
  let transform = operation.transform;
  for (const modifier of modifiers) {
    if (modifier.disabled) continue;
    transform = modifier.apply({ ...operation, transform: { ...transform } });
    if (!validCoordinates(transform))
      throw new TypeError('A drag modifier returned non-finite coordinates.');
  }
  return transform;
}
