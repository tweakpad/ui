import { validateConfiguration } from './configuration.js';
import { CleanupScope } from '../services.js';
import { defaultCollisionDetection, type CollisionDetector } from './collision.js';
import { measureElement } from './dom-geometry.js';
import type { Alignment, Rectangle } from './geometry.js';
import type { DragDropManager } from './manager.js';
import type { ModifierConfiguration } from './modifiers.js';
import { assertIdentifier, validIdentifier, type EntityRegistry } from './registry.js';
import { reportDragDropDiagnostic, type UniqueIdentifier } from './sorting.js';
import type {
  Accept,
  Data,
  DraggableInput,
  DroppableInput,
  EntityInput,
  EntityType,
  FeedbackOptions,
  SensorConfiguration,
  ManagerOptions,
} from './types.js';

function validate(input: EntityInput): void {
  assertIdentifier(input.id);
  if (input.type !== undefined && !['string', 'number', 'symbol'].includes(typeof input.type))
    throw new TypeError('Entity type must be a string, number or symbol.');
  if (typeof input.type === 'number' && !Number.isFinite(input.type))
    throw new TypeError('Numeric entity types must be finite.');
  if (input.element != null && input.element.nodeType !== 1)
    throw new TypeError('Entity element must be an Element or null.');
  if (input.disabled !== undefined && typeof input.disabled !== 'boolean')
    throw new TypeError('Entity disabled must be boolean.');
}

abstract class Entity {
  #id: UniqueIdentifier;
  #manager: DragDropManager | undefined;
  #scope: CleanupScope | undefined;
  #destroyed = false;
  #wanted: boolean;
  protected options: EntityInput;
  version = 0;
  constructor(
    readonly kind: 'draggable' | 'droppable',
    input: EntityInput,
    manager?: DragDropManager,
  ) {
    validate(input);
    this.#id = input.id;
    this.options = { ...input };
    this.#manager = manager;
    this.#wanted = input.register !== false;
  }
  protected deferRegistration(): void {
    queueMicrotask(() => {
      if (this.#wanted && !this.#destroyed) this.register();
    });
  }
  get destroyed(): boolean {
    return this.#destroyed;
  }
  get registered(): boolean {
    return this.kind === 'draggable'
      ? (this.#manager?.registry.draggables.contains(this as unknown as Draggable) ?? false)
      : (this.#manager?.registry.droppables.contains(this as unknown as Droppable) ?? false);
  }
  get id(): UniqueIdentifier {
    return this.#id;
  }
  set id(value: UniqueIdentifier) {
    if (!validIdentifier(value)) {
      reportDragDropDiagnostic('identity', 'Invalid rekey; retaining the registered ID.', value);
      return;
    }
    if (this.#destroyed) return;
    if (!this.#manager) {
      this.#id = value; this.options.id = value;
      this.version++;
      return;
    }
    const registry =
      this.kind === 'draggable'
        ? this.#manager.registry.draggables
        : this.#manager.registry.droppables;
    this.#manager.registry.coordinator.rekey(
      registry as EntityRegistry<Entity>,
      this,
      value,
      () => {
        this.#id = value;
        this.options.id = value;
        this.version++;
      },
    );
  }
  get manager(): DragDropManager | undefined {
    return this.#manager;
  }
  set manager(value: DragDropManager | undefined) {
    if (value === this.#manager || this.#destroyed) return;
    const wanted = this.#wanted;
    this.unregister();
    this.#manager = value;
    this.#wanted = wanted;
    if (wanted) this.register();
  }
  get data(): Data {
    return this.options.data ?? (this.options.data = {});
  }
  set data(value: Data) {
    this.update({ data: value });
  }
  get type(): EntityType | undefined {
    return this.options.type;
  }
  set type(value: EntityType | undefined) {
    const next = { ...this.options };
    if (value === undefined) delete next.type;
    else next.type = value;
    this.replace(next);
  }
  get element(): Element | null {
    return this.options.element ?? null;
  }
  set element(value: Element | null) {
    this.update({ element: value });
  }
  get disabled(): boolean {
    return this.options.disabled ?? false;
  }
  set disabled(value: boolean) {
    this.update({ disabled: value });
  }
  update(input: Partial<EntityInput>): void {
    this.replace({ ...this.options, ...input });
  }
  protected replace(input: EntityInput): void {
    if (
      Object.keys({ ...this.options, ...input }).every((key) =>
        Object.is(this.options[key as keyof EntityInput], input[key as keyof EntityInput]),
      )
    )
      return;
    try {
      validate(input);
      this.validateOptions(input);
    } catch (error) {
      reportDragDropDiagnostic(
        'configuration',
        'Invalid entity configuration; retaining the previous configuration.',
        error,
      );
      return;
    }
    const requestedId = input.id;
    this.options = { ...input, id: this.id };
    this.version++;
    if (requestedId !== this.id) this.id = requestedId;
    this.#manager?.entityChanged(this as unknown as Draggable | Droppable);
  }
  protected validateOptions(input: EntityInput): void {
    void input;
  }
  register(): () => void {
    this.#wanted = true;
    if (this.#destroyed || this.#manager?.destroyed || !this.#manager) return () => {};
    const entity = this as unknown as Draggable | Droppable;
    if (!this.registered && this.#manager.registerEntity(entity)) {
      const scope = (this.#scope = new CleanupScope((error) => this.#manager?.reportError(error)));
      try {
        for (const effect of this.options.effects?.() ?? []) {
          const cleanup = effect();
          if (cleanup) scope.add(cleanup);
        }
      } catch (error) {
        this.#manager.reportError(error);
        this.unregister();
      }
    }
    const manager = this.#manager;
    return () => {
      if (this.#manager === manager && this.registered) this.unregister();
    };
  }
  unregister(): void {
    this.#wanted = false;
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#manager?.unregisterEntity(this as unknown as Draggable | Droppable);
  }
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.unregister();
  }
}

export class Draggable extends Entity {
  declare protected options: DraggableInput;
  constructor(input: DraggableInput, manager?: DragDropManager) {
    super('draggable', input, manager);
    this.validateOptions(input);
    this.deferRegistration();
  }
  protected override validateOptions(input: DraggableInput): void {
    validateConfiguration(input, input.element ?? undefined);
    if (input.handle != null && input.handle.nodeType !== 1)
      throw new TypeError('Drag handle must be an Element.');
    if (
      input.alignment &&
      !(
        ['start', 'center', 'end'].includes(input.alignment.x) &&
        ['start', 'center', 'end'].includes(input.alignment.y)
      )
    )
      throw new TypeError('Invalid drag alignment.');
  }
  override update(input: Partial<DraggableInput>): void {
    this.replace({ ...this.options, ...input });
  }
  get handle(): Element | null {
    return this.options.handle ?? null;
  }
  set handle(value: Element | null) {
    this.update({ handle: value });
  }
  get sensors(): SensorConfiguration | undefined {
    return this.options.sensors;
  }
  set sensors(value: SensorConfiguration | undefined) {
    const next = { ...this.options };
    if (value === undefined) delete next.sensors;
    else next.sensors = value;
    this.replace(next);
  }
  get modifiers(): ModifierConfiguration | undefined {
    return this.options.modifiers;
  }
  set modifiers(value: ModifierConfiguration | undefined) {
    const next = { ...this.options };
    if (value === undefined) delete next.modifiers;
    else next.modifiers = value;
    this.replace(next);
  }
  get alignment(): Alignment | undefined {
    return this.options.alignment;
  }
  set alignment(value: Alignment | undefined) {
    const next = { ...this.options };
    if (value === undefined) delete next.alignment;
    else next.alignment = value;
    this.replace(next);
  }
  get feedbackOptions(): FeedbackOptions {
    return this.options;
  }
  get serviceOptions(): ManagerOptions {
    return this.options;
  }
  get isDragSource(): boolean {
    return this.registered && this.manager?.dragOperation.source === this;
  }
  get status(): 'idle' | 'dragging' | 'dropping' {
    return !this.isDragSource
      ? 'idle'
      : this.manager?.dragOperation.status === 'dropped'
        ? 'dropping'
        : 'dragging';
  }
  get isDragging(): boolean {
    return this.status === 'dragging';
  }
  get isDropping(): boolean {
    return this.status === 'dropping';
  }
}

export class Droppable extends Entity {
  declare protected options: DroppableInput;
  #shape: Rectangle | undefined;
  #proxy: Element | null = null;
  constructor(input: DroppableInput, manager?: DragDropManager) {
    super('droppable', input, manager);
    this.validateOptions(input);
    this.deferRegistration();
  }
  protected override validateOptions(input: DroppableInput): void {
    if (input.collisionPriority !== undefined && !Number.isFinite(input.collisionPriority))
      throw new TypeError('Collision priority must be finite.');
    if (input.collisionDetector !== undefined && typeof input.collisionDetector !== 'function')
      throw new TypeError('Collision detector must be a function.');
    const accept = input.accept;
    if (accept !== undefined && typeof accept !== 'function') {
      for (const type of Array.isArray(accept) ? accept : [accept])
        if (
          !['string', 'number', 'symbol'].includes(typeof type) ||
          (typeof type === 'number' && !Number.isFinite(type))
        )
          throw new TypeError('Invalid acceptance type.');
    }
  }
  override update(input: Partial<DroppableInput>): void {
    this.replace({ ...this.options, ...input });
  }
  get accept(): Accept {
    return this.options.accept;
  }
  set accept(value: Accept) {
    const next = { ...this.options };
    if (value === undefined) delete next.accept;
    else next.accept = value;
    this.replace(next);
  }
  get collisionDetector(): CollisionDetector {
    return this.options.collisionDetector ?? defaultCollisionDetection;
  }
  set collisionDetector(value: CollisionDetector) {
    this.update({ collisionDetector: value });
  }
  get collisionPriority(): number | undefined {
    return this.options.collisionPriority;
  }
  set collisionPriority(value: number | undefined) {
    const next = { ...this.options };
    if (value === undefined) delete next.collisionPriority;
    else next.collisionPriority = value;
    this.replace(next);
  }
  get shape(): Rectangle | undefined {
    return this.#shape;
  }
  get proxy(): Element | null {
    return this.#proxy;
  }
  set proxy(value: Element | null) {
    this.#proxy = value;
    this.refreshShape();
    this.manager?.collisionObserver.forceUpdate();
  }
  get isDropTarget(): boolean {
    return this.manager?.dragOperation.target === this;
  }
  accepts(source: Draggable): boolean {
    const accept = this.accept;
    return accept === undefined
      ? true
      : typeof accept === 'function'
        ? accept(source)
        : Array.isArray(accept)
          ? accept.some((type) => type === source.type)
          : accept === source.type;
  }
  refreshShape(): Rectangle | undefined {
    const source = this.manager?.dragOperation.source;
    const next =
      source && !this.disabled && this.accepts(source)
        ? measureElement(this.#proxy ?? this.element)
        : undefined;
    if (!next || !this.#shape?.equals(next)) this.#shape = next;
    return this.#shape;
  }
  clearShape(): void {
    this.#shape = undefined;
  }
}
