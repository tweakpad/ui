import { reportDragDropDiagnostic, type UniqueIdentifier } from './sorting.js';

export function validIdentifier(id: unknown): id is UniqueIdentifier {
  return typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id));
}
export function assertIdentifier(id: unknown): asserts id is UniqueIdentifier {
  if (!validIdentifier(id)) {
    reportDragDropDiagnostic('identity', 'Entity IDs must be strings or finite numbers.', id);
    throw new TypeError('Entity IDs must be strings or finite numbers.');
  }
}
export interface RegistryEntity {
  readonly id: UniqueIdentifier;
  readonly destroyed: boolean;
}

/** One coordinator owns both lanes, so Sortable rekeys publish atomically. */
export class RegistryCoordinator {
  #pending = new Map<
    RegistryEntity,
    { registry: EntityRegistry<RegistryEntity>; id: UniqueIdentifier; commit: () => void }
  >();
  #scheduled = false;
  #depth = 0;
  #changed = false;
  version = 0;
  constructor(private readonly onChange: () => void) {}
  get pending(): boolean {
    return this.#pending.size > 0;
  }
  changed(): void {
    this.#changed = true;
    if (!this.#depth) this.#publish();
  }
  #publish(): void {
    if (this.#changed) {
      this.#changed = false;
      this.version++;
      this.onChange();
    }
  }
  batch<T>(callback: () => T): T {
    this.#depth++;
    try {
      return callback();
    } finally {
      if (!--this.#depth) this.#publish();
    }
  }
  cancel(entity: RegistryEntity): void {
    this.#pending.delete(entity);
  }
  rekey<T extends RegistryEntity>(
    registry: EntityRegistry<T>,
    entity: T,
    id: UniqueIdentifier,
    commit: () => void,
  ): void {
    this.#pending.set(entity, {
      registry: registry as unknown as EntityRegistry<RegistryEntity>,
      id,
      commit,
    });
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.flush();
    });
  }
  flush(): void {
    if (!this.#pending.size) return;
    const pending = this.#pending;
    this.#pending = new Map();
    const maps = new Map<EntityRegistry<RegistryEntity>, Map<UniqueIdentifier, RegistryEntity>>();
    for (const { registry } of pending.values())
      if (!maps.has(registry)) maps.set(registry, registry.copy());
    for (const [entity, { registry }] of pending)
      for (const [key, value] of maps.get(registry)!)
        if (value === entity) maps.get(registry)!.delete(key);
    for (const [entity, { registry, id }] of pending) {
      if (entity.destroyed) continue;
      const map = maps.get(registry)!;
      if (map.has(id) && map.get(id) !== entity) {
        reportDragDropDiagnostic(
          'duplicate',
          'Rekey batch rejected: the final mapping contains a duplicate ID.',
          id,
        );
        return;
      }
      if (registry.contains(entity)) map.set(id, entity);
    }
    this.batch(() => {
      for (const [entity, { commit }] of pending) if (!entity.destroyed) commit();
      for (const [registry, map] of maps) registry.install(map);
      this.changed();
    });
  }
}

export class EntityRegistry<T extends RegistryEntity> implements Iterable<T> {
  #map = new Map<UniqueIdentifier, T>();
  constructor(readonly coordinator: RegistryCoordinator) {}
  [Symbol.iterator](): IterableIterator<T> {
    return this.#map.values();
  }
  get value(): IterableIterator<T> {
    return this.#map.values();
  }
  get size(): number {
    return this.#map.size;
  }
  get(id: UniqueIdentifier): T | undefined {
    return this.#map.get(id);
  }
  has(id: UniqueIdentifier): boolean {
    return this.#map.has(id);
  }
  contains(entity: T): boolean {
    return [...this.#map.values()].includes(entity);
  }
  copy(): Map<UniqueIdentifier, T> {
    return new Map(this.#map);
  }
  install(map: Map<UniqueIdentifier, T>): void {
    this.#map = map;
  }
  register(id: UniqueIdentifier, entity: T): boolean {
    assertIdentifier(id);
    if (entity.destroyed) return false;
    const incumbent = this.#map.get(id);
    if (incumbent === entity) return true;
    if (incumbent) {
      reportDragDropDiagnostic(
        'duplicate',
        'Registration rejected; the first entity keeps its ID.',
        id,
      );
      return false;
    }
    this.#map.set(id, entity);
    this.coordinator.changed();
    return true;
  }
  unregister(entity: T): void {
    this.coordinator.cancel(entity);
    for (const [id, value] of this.#map)
      if (value === entity) {
        this.#map.delete(id);
        this.coordinator.changed();
        return;
      }
  }
  clear(): void {
    if (this.#map.size) {
      this.#map.clear();
      this.coordinator.changed();
    }
  }
}
