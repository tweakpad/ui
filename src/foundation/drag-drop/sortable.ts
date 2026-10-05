import { validateTransition, type DragMotionMembership } from './motion.js';
import { Draggable, Droppable } from './entities.js';
import type { DragDropManager } from './manager.js';
import { reportDragDropDiagnostic, type UniqueIdentifier } from './sorting.js';
import type { DraggableInput, DroppableInput, SortTransition } from './types.js';
import { validIdentifier } from './registry.js';

export interface SortableInput
  extends Omit<DraggableInput, 'disabled'>, Omit<DroppableInput, 'disabled'> {
  index: number;
  group?: UniqueIdentifier;
  source?: Element | null;
  target?: Element | null;
  disabled?: boolean | { draggable?: boolean; droppable?: boolean };
  transition?: SortTransition | null;
}
export class SortableDraggable extends Draggable {
  constructor(
    input: DraggableInput,
    manager: DragDropManager | undefined,
    readonly sortable: Sortable,
  ) {
    super(input, manager);
  }
}
export class SortableDroppable extends Droppable {
  constructor(
    input: DroppableInput,
    manager: DragDropManager | undefined,
    readonly sortable: Sortable,
  ) {
    super(input, manager);
  }
}
export function isSortable(entity: unknown): entity is SortableDraggable | SortableDroppable {
  return entity instanceof SortableDraggable || entity instanceof SortableDroppable;
}
/** Sortable source membership from drag start to its current projected position. */
export function sortableMembership(entity: unknown): DragMotionMembership {
  if (!isSortable(entity)) return {};
  const sortable = entity.sortable;
  return {
    sourceGroup: sortable.initialGroup,
    targetGroup: sortable.group,
    fromIndex: sortable.initialIndex,
    toIndex: sortable.index,
  };
}
export function isSortableOperation<T extends { source: unknown; target: unknown }>(
  operation: T,
): operation is T & {
  source: SortableDraggable | SortableDroppable;
  target: SortableDraggable | SortableDroppable;
} {
  return isSortable(operation.source) && isSortable(operation.target);
}

export class Sortable {
  readonly draggable: SortableDraggable;
  readonly droppable: SortableDroppable;
  #element: Element | null;
  #index: number;
  #group: UniqueIdentifier | undefined;
  #transition: Required<SortTransition> | null;
  #destroyed = false;
  constructor(input: SortableInput, manager?: DragDropManager) {
    Sortable.validate(input.index, input.group, input.transition);
    this.#index = input.index;
    this.#group = input.group;
    this.#element = input.element ?? null;
    this.#transition =
      input.transition === null
        ? null
        : {
            duration: 250,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            idle: false,
            ...input.transition,
          };
    const disabled =
      typeof input.disabled === 'boolean'
        ? { draggable: input.disabled, droppable: input.disabled }
        : (input.disabled ?? {});
    this.draggable = new SortableDraggable(
      {
        ...input,
        register: false,
        disabled: disabled.draggable ?? false,
        element: input.source === undefined ? this.#element : input.source,
      },
      manager,
      this,
    );
    this.droppable = new SortableDroppable(
      {
        ...input,
        register: false,
        disabled: disabled.droppable ?? false,
        element: input.target === undefined ? this.#element : input.target,
      },
      manager,
      this,
    );
    if (input.register !== false)
      queueMicrotask(() => {
        if (!this.#destroyed) this.register();
      });
  }
  static validate(
    index: number,
    group?: UniqueIdentifier,
    transition?: SortTransition | null,
  ): void {
    if (!Number.isInteger(index) || index < 0)
      throw new RangeError('Sortable index must be a finite nonnegative integer.');
    if (group !== undefined && !validIdentifier(group))
      throw new TypeError('Invalid sortable group.');
    validateTransition(transition);
    if (transition?.idle !== undefined && typeof transition.idle !== 'boolean')
      throw new TypeError('Transition idle must be boolean.');
  }
  get id(): UniqueIdentifier {
    return this.draggable.id;
  }
  set id(value: UniqueIdentifier) {
    this.draggable.id = value;
    this.droppable.id = value;
  }
  get manager(): DragDropManager | undefined {
    return this.draggable.manager;
  }
  set manager(value: DragDropManager | undefined) {
    const previous = this.manager;
    if (
      value &&
      (value.destroyed ||
        (value.registry.draggables.has(this.id) &&
          value.registry.draggables.get(this.id) !== this.draggable) ||
        (value.registry.droppables.has(this.id) &&
          value.registry.droppables.get(this.id) !== this.droppable))
    ) {
      reportDragDropDiagnostic(
        'manager',
        'Manager replacement rejected; both sortable lanes retain their previous owner.',
      );
      return;
    }
    const change = () => {
      this.draggable.manager = value;
      this.droppable.manager = value;
    };
    if (previous)
      previous.registry.coordinator.batch(() =>
        value ? value.registry.coordinator.batch(change) : change(),
      );
    else if (value) value.registry.coordinator.batch(change);
    else change();
  }
  get index(): number {
    return this.#index;
  }
  set index(value: number) {
    this.setMembership(value, this.group);
  }
  get group(): UniqueIdentifier | undefined {
    return this.#group;
  }
  set group(value: UniqueIdentifier | undefined) {
    this.setMembership(this.index, value);
  }
  setMembership(index: number, group: UniqueIdentifier | undefined): void {
    try {
      Sortable.validate(index, group);
    } catch (error) {
      reportDragDropDiagnostic(
        'membership',
        'Invalid sortable membership retained the previous value.',
        error,
      );
      return;
    }
    if (index === this.#index && group === this.#group) return;
    this.#index = index;
    this.#group = group;
    this.draggable.version++;
    this.droppable.version++;
    this.manager?.registry.coordinator.changed();
  }
  get initialIndex(): number {
    return this.manager?.dragOperation.initialMembership.get(this.id)?.index ?? this.index;
  }
  get initialGroup(): UniqueIdentifier | undefined {
    const initial = this.manager?.dragOperation.initialMembership.get(this.id);
    return initial ? initial.group : this.group;
  }
  get element(): Element | null {
    return this.#element;
  }
  set element(value: Element | null) {
    const old = this.#element;
    this.#element = value;
    const update = () => {
      if (this.source === old) this.source = value;
      if (this.target === old) this.target = value;
    };
    if (this.manager) this.manager.registry.coordinator.batch(update);
    else update();
  }
  get source(): Element | null {
    return this.draggable.element;
  }
  set source(value: Element | null) {
    this.draggable.element = value;
  }
  get target(): Element | null {
    return this.droppable.element;
  }
  set target(value: Element | null) {
    this.droppable.element = value;
  }
  get handle(): Element | null {
    return this.draggable.handle;
  }
  set handle(value: Element | null) {
    this.draggable.handle = value;
  }
  get disabled(): { draggable: boolean; droppable: boolean } {
    return { draggable: this.draggable.disabled, droppable: this.droppable.disabled };
  }
  set disabled(value: boolean | { draggable?: boolean; droppable?: boolean }) {
    const options = typeof value === 'boolean' ? { draggable: value, droppable: value } : value;
    const update = () => {
      this.draggable.disabled = options.draggable ?? false;
      this.droppable.disabled = options.droppable ?? false;
    };
    if (this.manager) this.manager.registry.coordinator.batch(update);
    else update();
  }
  get transition(): Required<SortTransition> | null {
    return this.#transition;
  }
  set transition(value: SortTransition | null | undefined) {
    try {
      Sortable.validate(this.index, this.group, value);
      this.#transition =
        value === null
          ? null
          : { duration: 250, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', idle: false, ...value };
    } catch (error) {
      reportDragDropDiagnostic(
        'transition',
        'Invalid sortable transition retained the previous value.',
        error,
      );
    }
  }
  get data() {
    return this.draggable.data;
  }
  set data(value: Draggable['data']) {
    this.draggable.data = value;
    this.droppable.data = value;
  }
  get type() {
    return this.draggable.type;
  }
  set type(value: Draggable['type']) {
    this.draggable.type = value;
    this.droppable.type = value;
  }
  get sensors() {
    return this.draggable.sensors;
  }
  set sensors(value: Draggable['sensors']) {
    this.draggable.sensors = value;
  }
  get modifiers() {
    return this.draggable.modifiers;
  }
  set modifiers(value: Draggable['modifiers']) {
    this.draggable.modifiers = value;
  }
  get alignment() {
    return this.draggable.alignment;
  }
  set alignment(value: Draggable['alignment']) {
    this.draggable.alignment = value;
  }
  get accept() {
    return this.droppable.accept;
  }
  set accept(value: Droppable['accept']) {
    this.droppable.accept = value;
  }
  get collisionDetector() {
    return this.droppable.collisionDetector;
  }
  set collisionDetector(value: Droppable['collisionDetector']) {
    this.droppable.collisionDetector = value;
  }
  get collisionPriority() {
    return this.droppable.collisionPriority;
  }
  set collisionPriority(value: Droppable['collisionPriority']) {
    this.droppable.collisionPriority = value;
  }
  get status() {
    return this.draggable.status;
  }
  get isDragSource() {
    return this.draggable.isDragSource;
  }
  get isDragging() {
    return this.draggable.isDragging;
  }
  get isDropping() {
    return this.draggable.isDropping;
  }
  get isDropTarget() {
    return this.droppable.isDropTarget;
  }
  accepts(source: Draggable): boolean {
    return this.droppable.accepts(source);
  }
  refreshShape() {
    return this.droppable.refreshShape();
  }
  register(): () => void {
    const register = () => {
      this.draggable.register();
      this.droppable.register();
      if (!this.draggable.registered || !this.droppable.registered) {
        this.draggable.unregister();
        this.droppable.unregister();
      }
    };
    if (this.manager) this.manager.registry.coordinator.batch(register);
    else register();
    return () => this.unregister();
  }
  unregister(): void {
    const remove = () => {
      this.draggable.unregister();
      this.droppable.unregister();
    };
    if (this.manager) this.manager.registry.coordinator.batch(remove);
    else remove();
  }
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.unregister();
    this.draggable.destroy();
    this.droppable.destroy();
  }
}
