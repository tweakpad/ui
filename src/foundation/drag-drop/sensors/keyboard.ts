import { CleanupScope } from '../../services.js';
import { closestCorners, sortCollisions } from '../collision.js';
import { measureElement } from '../dom-geometry.js';
import type { Draggable } from '../entities.js';
import { Rectangle, validCoordinates, type Coordinates } from '../geometry.js';
import type { DragDropManager } from '../manager.js';
import { revealElement, visibleRectangle } from '../scrolling.js';
import { isSortable } from '../sortable.js';
import type { Sensor, SensorFactory } from '../types.js';

export interface KeyboardCodes {
  start: readonly string[];
  end: readonly string[];
  cancel: readonly string[];
  up: readonly string[];
  down: readonly string[];
  left: readonly string[];
  right: readonly string[];
}
export interface KeyboardSensorOptions {
  offset?: number | Coordinates;
  keyboardCodes?: Partial<KeyboardCodes>;
  preventActivation?: (event: KeyboardEvent, source: Draggable) => boolean;
}
export const defaultKeyboardCodes: KeyboardCodes = {
  start: ['Space', 'Enter'],
  end: ['Space', 'Enter', 'Tab'],
  cancel: ['Escape'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
};
export function normalizeKey(key: string): string {
  if (key === ' ' || key.toLowerCase() === 'spacebar') return 'space';
  if (/^Key[A-Z]$/.test(key)) return key.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(key)) return key.slice(5);
  return key.toLowerCase();
}
export function isKeyboardKey(
  event: Pick<KeyboardEvent, 'key'>,
  codes: readonly string[],
): boolean {
  return codes.some((key) => normalizeKey(key) === normalizeKey(event.key));
}

export class KeyboardSensor implements Sensor {
  #disabled = false;
  #active: CleanupScope | undefined;
  readonly #scope = new CleanupScope();
  readonly codes: KeyboardCodes;
  readonly offset: Coordinates;
  #moving = false;
  constructor(
    readonly manager: DragDropManager,
    readonly options: KeyboardSensorOptions = {},
  ) {
    this.codes = { ...defaultKeyboardCodes, ...options.keyboardCodes };
    const offset = options.offset ?? 10;
    this.offset = typeof offset === 'number' ? { x: offset, y: offset } : { ...offset };
    if (!validCoordinates(this.offset) || this.offset.x < 0 || this.offset.y < 0)
      throw new RangeError('Keyboard offset must be finite and nonnegative.');
    for (const codes of Object.values(this.codes))
      if (!Array.isArray(codes) || !codes.every((key) => typeof key === 'string'))
        throw new TypeError('Keyboard codes must be arrays of key names.');
  }
  static configure(options: KeyboardSensorOptions = {}): SensorFactory {
    return (manager) => new KeyboardSensor(manager, options);
  }
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    this.#disabled = value;
    if (value && this.#active) {
      this.#active.dispose();
      this.#active = undefined;
      void this.manager.actions.stop({ canceled: true });
    }
  }
  bind(source: Draggable): () => void {
    const scope = new CleanupScope();
    this.#scope.add(() => scope.dispose());
    const target = source.handle ?? source.element;
    if (target)
      scope.listen(target, 'keydown', (event) => {
        if (
          this.disabled ||
          event.defaultPrevented ||
          event.repeat ||
          source.disabled ||
          !source.registered ||
          this.manager.dragOperation.status !== 'idle' ||
          !isKeyboardKey(event, this.codes.start)
        )
          return;
        const effective = event.composedPath()[0];
        // A custom element handle can delegate focus to its own native button.
        const actualHandle =
          effective === target ||
          (source.handle === target &&
            target.shadowRoot?.contains(effective as Node) &&
            (effective as Element).matches('button'));
        if (!actualHandle) return;
        try {
          if (this.options.preventActivation?.(event, source)) return;
        } catch (error) {
          this.manager.reportError(error);
          return;
        }
        const element = source.element;
        if (!element) return;
        revealElement(element);
        const shape = measureElement(element);
        if (!shape) return;
        event.preventDefault();
        event.stopPropagation();
        try {
          const controller = this.manager.actions.start({
            source,
            event,
            coordinates: shape.center,
            input: 'keyboard',
          });
          if (controller.signal.aborted) return;
          const active = (this.#active = new CleanupScope());
          controller.signal.addEventListener(
            'abort',
            () => {
              active.dispose();
              if (this.#active === active) this.#active = undefined;
            },
            { once: true },
          );
          active.listen(element.ownerDocument, 'keydown', (key) => this.#key(key), {
            capture: true,
          });
        } catch (error) {
          this.manager.fail(error);
        }
      });
    return () => scope.dispose();
  }
  #key(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    if (isKeyboardKey(event, [...this.codes.cancel, ...this.codes.end])) {
      const tab = normalizeKey(event.key) === 'tab';
      if (!tab) event.preventDefault();
      const id = this.manager.dragOperation.source?.id;
      const generation = this.manager.dragOperation.id;
      const release = this.manager.monitor.addEventListener('settled', () => {
        release();
        if (tab || id === undefined) return;
        void this.manager.renderer.rendering
          .then(() => {
            if (
              this.manager.destroyed ||
              this.manager.dragOperation.id !== generation ||
              this.manager.dragOperation.status !== 'idle'
            )
              return;
            const source = this.manager.registry.draggables.get(id),
              handle = source?.handle ?? source?.element;
            if (handle?.isConnected && 'focus' in handle)
              (handle as HTMLElement).focus({ preventScroll: true });
          })
          .catch((error) => this.manager.reportError(error));
      });
      void this.manager.actions.stop({ event, canceled: isKeyboardKey(event, this.codes.cancel) });
      return;
    }
    const direction = (['up', 'down', 'left', 'right'] as const).find((key) =>
      isKeyboardKey(event, this.codes[key]),
    );
    if (!direction) return;
    event.preventDefault();
    const factor = event.shiftKey ? 5 : 1;
    const by = {
      x:
        direction === 'left'
          ? -this.offset.x * factor
          : direction === 'right'
            ? this.offset.x * factor
            : 0,
      y:
        direction === 'up'
          ? -this.offset.y * factor
          : direction === 'down'
            ? this.offset.y * factor
            : 0,
    };
    if (isSortable(this.manager.dragOperation.source)) void this.#sort(direction, by, event);
    else this.manager.actions.move({ by, event });
  }
  async #sort(
    direction: 'up' | 'down' | 'left' | 'right',
    by: Coordinates,
    event: KeyboardEvent,
  ): Promise<void> {
    if (this.#moving) return;
    const operation = this.manager.dragOperation,
      source = operation.source,
      generation = operation.id;
    if (!isSortable(source) || !operation.shape || operation.status !== 'dragging') return;
    // Notification precedes the sorting response, so applications can veto it.
    const move = this.manager.dispatch('dragmove', { by }, true, event);
    if (move.defaultPrevented) return;
    move.preventDefault();
    this.#moving = true;
    const release = this.manager.collisionObserver.suppress();
    try {
      const center = operation.shape.current.center;
      const candidates = [];
      for (const target of this.manager.registry.droppables) {
        if (
          target.disabled ||
          !target.accepts(source) ||
          !target.element ||
          (target === operation.target && isSortable(target))
        )
          continue;
        const shape = visibleRectangle(target.element, 0.2);
        if (!shape) continue;
        if (!(
          (direction === 'down' && center.y + 10 < shape.center.y) ||
          (direction === 'up' && center.y - 10 > shape.center.y) ||
          (direction === 'left' && center.x - 10 > shape.center.x) ||
          (direction === 'right' && center.x + 10 < shape.center.x)
        ))
          continue;
        const collision = closestCorners({
          dragOperation: operation,
          droppable: { id: target.id, shape },
        });
        if (collision)
          candidates.push({
            ...collision,
            priority: target.collisionPriority ?? collision.priority,
          });
      }
      const candidate = candidates.sort(sortCollisions)[0];
      if (!candidate) return;
      const { index, group } = source.sortable;
      const result = await this.manager.actions.setDropTarget(candidate.id);
      await this.manager.renderer.rendering;
      if (
        this.manager.destroyed ||
        operation.id !== generation ||
        operation.status !== 'dragging' ||
        result.prevented ||
        operation.source?.id !== source.id
      )
        return;
      const current = operation.source;
      if (!isSortable(current)) return;
      const updated = index !== current.sortable.index || group !== current.sortable.group;
      const element = updated
        ? (current.sortable.droppable.proxy ?? current.sortable.target)
        : (operation.target?.proxy ?? operation.target?.element);
      if (!element) return;
      revealElement(element);
      const shape = measureElement(element);
      if (!shape || !operation.shape) return;
      this.manager.actions.move({
        by: Rectangle.delta(shape, operation.shape.current, current.alignment),
        propagate: false,
      });
      if (updated) await this.manager.actions.setDropTarget(current.id);
    } catch (error) {
      if (operation.id === generation) this.manager.fail(error);
    } finally {
      release();
      this.#moving = false;
    }
  }
  destroy(): void {
    this.disabled = true;
    this.#active?.dispose();
    this.#scope.dispose();
  }
}
