import { describe, expect, it, vi } from 'vitest';
import { DragDropManager } from './manager.js';
import { Draggable, Droppable } from './entities.js';
import { Sortable } from './sortable.js';
import type { DragEvent, DragEventName } from './types.js';

function element(left = 0, top = 0): Element {
  const view = Object.assign(new EventTarget(), {
    frameElement: null,
    setInterval: () => 1,
    clearInterval: () => {},
    getComputedStyle: () => ({
      transform: 'none',
      translate: 'none',
      scale: 'none',
      transformOrigin: '0 0',
    }),
  });
  const doc = Object.assign(new EventTarget(), { defaultView: view });
  return Object.assign(new EventTarget(), {
    nodeType: 1,
    isConnected: true,
    parentNode: null,
    ownerDocument: doc,
    getBoundingClientRect: () => ({ left, top, width: 100, height: 40 }),
    getAnimations: () => [],
  }) as unknown as Element;
}
const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const deferred = () => {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function setup() {
  const manager = new DragDropManager({
    sensors: [],
    feedback: 'none',
    autoScroll: false,
    accessibility: false,
  });
  const source = new Draggable({ id: 1, element: element() }, manager);
  const target = new Droppable({ id: '1', element: element(0, 80) }, manager);
  source.register();
  target.register();
  return { manager, source, target };
}
describe('manager generation and terminal boundaries', () => {
  it('validates before mutation, guards duplicates and destroy-before-register', async () => {
    const { manager, source } = setup();
    expect(() =>
      manager.actions.start({ source: 'missing', coordinates: { x: 0, y: 0 } }),
    ).toThrow();
    expect(manager.dragOperation.status).toBe('idle');
    expect(manager.dragOperation.source).toBeNull();
    const duplicate = new Draggable({ id: 1, element: element() }, manager);
    duplicate.register();
    duplicate.unregister();
    expect(manager.registry.draggables.get(1)).toBe(source);
    const destroyed = new Draggable({ id: 'gone', element: element() }, manager);
    destroyed.destroy();
    await tick();
    expect(manager.registry.draggables.has('gone')).toBe(false);
    manager.destroy();
  });
  it('honors before-start and movement prevention before the default action', async () => {
    const { manager, source } = setup();
    const starts = vi.fn();
    manager.monitor.addEventListener('dragstart', starts);
    const veto = manager.monitor.addEventListener('beforedragstart', (event) =>
      event.preventDefault(),
    );
    expect(manager.actions.start({ source, coordinates: { x: 0, y: 0 } }).signal.aborted).toBe(
      true,
    );
    await tick();
    expect(starts).not.toHaveBeenCalled();
    veto();
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    let held: DragEvent | undefined;
    const prevent = manager.monitor.addEventListener('dragmove', (event) => {
      held = event;
      event.preventDefault();
    });
    expect(manager.actions.move({ to: { x: 10, y: 20 } })).toBe(false);
    expect(manager.dragOperation.position.current).toEqual({ x: 0, y: 0 });
    prevent();
    manager.actions.move({ by: { x: 4, y: 5 } });
    expect(held?.operation.position.current).toEqual({ x: 0, y: 0 });
    manager.destroy();
  });
  it('cannot revive an aborted initialization when its old renderer settles', async () => {
    const { manager, source } = setup();
    const barrier = deferred();
    manager.renderer = { rendering: barrier.promise };
    const controller = manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    controller.abort();
    await tick();
    expect(manager.dragOperation.status).toBe('idle');
    manager.renderer = { rendering: Promise.resolve() };
    manager.actions.start({ source, coordinates: { x: 2, y: 3 } });
    await tick();
    const id = manager.dragOperation.id;
    barrier.resolve();
    await tick();
    expect(manager.dragOperation.id).toBe(id);
    expect(manager.dragOperation.status).toBe('dragging');
    manager.destroy();
  });
  it('cleans up renderer rejection and direct listener exceptions', async () => {
    const { manager, source } = setup();
    const barrier = deferred();
    manager.renderer = { rendering: barrier.promise };
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    barrier.reject(new Error('render'));
    await tick();
    expect(manager.dragOperation.status).toBe('idle');
    manager.renderer = { rendering: Promise.resolve() };
    manager.monitor.addEventListener('dragstart', () => {
      throw new Error('consumer');
    });
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    expect(manager.dragOperation.status).toBe('idle');
    manager.destroy();
  });
  it('dispatches the final target response before ending, and settles suspension only once', async () => {
    const { manager, source, target } = setup();
    const order: string[] = [];
    for (const name of ['dragstart', 'dragover', 'dragend', 'settled'] as DragEventName[])
      manager.monitor.addEventListener(name, () => order.push(name));
    let first: ReturnType<DragEvent['suspend']> | undefined;
    manager.monitor.addEventListener('dragend', (event) => {
      first = event.suspend();
      expect(event.suspend()).toBe(first);
    });
    const complete = vi.fn(() => true);
    manager.addCompletion(complete);
    const controller = manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    void manager.actions.setDropTarget(target.id);
    const stop = manager.actions.stop();
    expect(controller.signal.aborted).toBe(true);
    await tick();
    expect(order).toEqual(['dragstart', 'dragover', 'dragend']);
    expect(complete).not.toHaveBeenCalled();
    expect(manager.actions.move({ by: { x: 1, y: 1 } })).toBe(false);
    first!.resume();
    first!.abort();
    await stop;
    expect(complete).toHaveBeenCalledOnce();
    expect(order.at(-1)).toBe('settled');
    expect(manager.dragOperation.source).toBeNull();
    manager.destroy();
  });
  it('uses current acceptance at drop and destroys a suspended operation without waiting', async () => {
    const { manager, source, target } = setup();
    const outcomes: unknown[] = [];
    manager.monitor.addEventListener('settled', (event) => outcomes.push(event.outcome));
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    await manager.actions.setDropTarget(target.id);
    target.accept = [];
    await manager.actions.stop();
    expect(outcomes).toEqual(['rejected']);
    manager.monitor.addEventListener('dragend', (event) => event.suspend());
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    const stop = manager.actions.stop();
    await tick();
    manager.destroy();
    await stop;
    expect(outcomes).toEqual(['rejected', 'canceled']);
    expect(manager.dragOperation.status).toBe('idle');
  });
  it('rebinds remounted typed source identity only within the rendering grace period', async () => {
    const { manager, source } = setup();
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    source.unregister();
    const replacement = new Draggable({ id: 1, element: element() }, manager);
    replacement.register();
    await tick();
    expect(manager.dragOperation.source).toBe(replacement);
    expect(manager.dragOperation.status).toBe('dragging');
    replacement.unregister();
    await tick();
    expect(manager.dragOperation.status).toBe('idle');
    manager.destroy();
  });
  it('composes sortable lanes, preserves explicit refs and sparse initial membership', async () => {
    const manager = new DragDropManager({
      sensors: [],
      feedback: 'none',
      accessibility: false,
      autoScroll: false,
    });
    const common = element(),
      explicit = element();
    const sortable = new Sortable(
      { id: 'a', index: 7, group: 0, element: common, target: explicit },
      manager,
    );
    sortable.register();
    const replacement = element();
    sortable.element = replacement;
    expect(sortable.source).toBe(replacement);
    expect(sortable.target).toBe(explicit);
    sortable.disabled = { droppable: true };
    expect(sortable.disabled).toEqual({ draggable: false, droppable: true });
    manager.actions.start({ source: 'a', coordinates: { x: 0, y: 0 } });
    await tick();
    sortable.setMembership(22, 'next');
    expect(sortable.initialIndex).toBe(7);
    expect(sortable.initialGroup).toBe(0);
    manager.destroy();
  });
  it('keeps typed operation identity through a same-turn virtual ID permutation', async () => {
    const { manager, source } = setup();
    const other = new Draggable({ id: 2, element: element(0, 40) }, manager);
    other.register();
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    source.id = 2;
    other.id = 1;
    await tick();
    expect(manager.registry.draggables.get(1)).toBe(other);
    expect(manager.registry.draggables.get(2)).toBe(source);
    expect(manager.dragOperation.source).toBe(other);
    expect(other.isDragSource).toBe(true);
    expect(source.isDragSource).toBe(false);
    manager.destroy();
  });
  it('uses to over by and suppresses only the move notification when propagation is false', async () => {
    const { manager, source } = setup();
    const moved = vi.fn(),
      collision = vi.fn();
    manager.monitor.addEventListener('dragmove', moved);
    manager.monitor.addEventListener('collision', collision);
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    collision.mockClear();
    manager.actions.move({ to: { x: 20, y: 30 }, by: { x: 100, y: 100 }, propagate: false });
    expect(manager.dragOperation.position.current).toEqual({ x: 20, y: 30 });
    expect(moved).not.toHaveBeenCalled();
    expect(collision).toHaveBeenCalledOnce();
    manager.destroy();
  });
  it('publishes dragstart before initial collision and isolates retained snapshots', async () => {
    const { manager, source } = setup();
    const order: string[] = [];
    for (const name of ['dragstart', 'collision', 'dragover'] as const)
      manager.monitor.addEventListener(name, () => order.push(name));
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    const old = manager.dragOperation.snapshot();
    manager.actions.move({ by: { x: 3, y: 4 } });
    expect(order[0]).toBe('dragstart');
    expect(old.position.current).toEqual({ x: 0, y: 0 });
    expect(Object.isFrozen(old.shape?.initial)).toBe(true);
    manager.destroy();
  });
  it.each([
    false,
    true,
    {},
    { draggable: true },
    { droppable: true },
    { draggable: true, droppable: true },
    { draggable: false, droppable: true },
  ])('keeps independent sortable flags for %j', (disabled) => {
    const manager = new DragDropManager({ sensors: [], accessibility: false, autoScroll: false });
    const sortable = new Sortable({ id: 'flags', index: 4, disabled }, manager);
    sortable.register();
    expect(sortable.disabled).toEqual(
      typeof disabled === 'boolean'
        ? { draggable: disabled, droppable: disabled }
        : { draggable: disabled.draggable ?? false, droppable: disabled.droppable ?? false },
    );
    manager.destroy();
  });
  it.each([0, '', Symbol('type'), undefined])(
    'accepts typed and untyped sources without truthiness shortcuts: %s',
    (type) => {
      const { manager, source, target } = setup();
      source.type = type;
      target.accept = (candidate) => candidate.type === type;
      expect(target.accepts(source)).toBe(true);
      target.accept = [];
      expect(target.accepts(source)).toBe(false);
      if (type !== undefined) {
        target.accept = [type];
        expect(target.accepts(source)).toBe(true);
        target.accept = type;
        expect(target.accepts(source)).toBe(true);
      }
      manager.destroy();
    },
  );
  it('reuses manager modifiers and releases per-source instances at every operation end', async () => {
    const order: string[] = [],
      end = vi.fn(),
      destroy = vi.fn(),
      factory = vi.fn(() => ({
        apply: ({ transform }: { transform: { x: number; y: number } }) => {
          order.push('source');
          return transform;
        },
        end,
        destroy,
      }));
    const managed = {
      apply: ({ transform }: { transform: { x: number; y: number } }) => {
        order.push('manager');
        return transform;
      },
      end: vi.fn(),
      destroy: vi.fn(),
    };
    const manager = new DragDropManager({
      sensors: [],
      modifiers: [managed],
      feedback: 'none',
      autoScroll: false,
      accessibility: false,
    });
    const source = new Draggable({ id: 'mod', element: element() }, manager);
    source.register();
    for (let i = 0; i < 2; i++) {
      manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
      await tick();
      manager.actions.move({ by: { x: 1, y: 0 } });
      await manager.actions.stop({ canceled: true });
    }
    expect(order).toEqual(['manager', 'manager']);
    expect(managed.end).toHaveBeenCalledTimes(2);
    expect(managed.destroy).not.toHaveBeenCalled();
    source.modifiers = [factory];
    manager.actions.start({ source, coordinates: { x: 0, y: 0 } });
    await tick();
    manager.actions.move({ by: { x: 1, y: 0 } });
    await manager.actions.stop({ canceled: true });
    expect(factory).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    manager.destroy();
    expect(managed.destroy).toHaveBeenCalledOnce();
  });
});
