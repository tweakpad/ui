import { expect, it, vi } from 'vitest';
import { DragDropManager } from '../manager.js';
import { Draggable } from '../entities.js';
import { KeyboardSensor } from './keyboard.js';
import { PointerSensor } from './pointer.js';
import type { Sensor } from '../types.js';

function node(): Element {
  const view = Object.assign(new EventTarget(), { frameElement: null });
  const doc = Object.assign(new EventTarget(), { defaultView: view });
  return Object.assign(new EventTarget(), {
    nodeType: 1,
    isConnected: true,
    parentNode: null,
    ownerDocument: doc,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }),
    getAnimations: () => [],
  }) as unknown as Element;
}
function event(type: string, fields: Record<string, unknown>): Event {
  return Object.assign(new Event(type, { cancelable: true }), fields);
}
function setup() {
  const manager = new DragDropManager({
    sensors: [],
    feedback: 'none',
    autoScroll: false,
    accessibility: false,
  });
  const source = new Draggable({ id: 'a', element: node(), register: false }, manager);
  source.register();
  return { manager, source };
}

it('passes per-binding keyboard options over the instance configuration', () => {
  const { manager, source } = setup();
  const instance = vi.fn(() => true),
    binding = vi.fn(() => true);
  const sensor = new KeyboardSensor(manager, { preventActivation: instance });
  const release = sensor.bind(source, {
    keyboardCodes: { start: ['w'] },
    preventActivation: binding,
  });
  source.element!.dispatchEvent(event('keydown', { key: ' ', repeat: false }));
  expect(binding).not.toHaveBeenCalled();
  source.element!.dispatchEvent(event('keydown', { key: 'W', repeat: false }));
  expect(binding).toHaveBeenCalledOnce();
  expect(instance).not.toHaveBeenCalled();
  expect(sensor.codes.start).toEqual(['Space', 'Enter']);
  expect(() => sensor.bind(source, { offset: -1 })).toThrow(RangeError);
  release();
  source.element!.dispatchEvent(event('keydown', { key: 'w', repeat: false }));
  expect(binding).toHaveBeenCalledOnce();
  sensor.destroy();
  manager.destroy();
});

it('passes per-binding pointer activator and prevention options', () => {
  const { manager, source } = setup();
  const activator = node(),
    binding = vi.fn<(event: PointerEvent, source: Draggable) => boolean>(() => true);
  const sensor = new PointerSensor(manager);
  const release = sensor.bind(source, {
    activatorElements: [activator],
    preventActivation: binding,
  });
  const down = { isPrimary: true, button: 0, pointerId: 1, pointerType: 'mouse' };
  source.element!.dispatchEvent(event('pointerdown', down));
  expect(binding).not.toHaveBeenCalled();
  activator.dispatchEvent(event('pointerdown', down));
  expect(binding).toHaveBeenCalledOnce();
  expect(binding.mock.calls[0]![1]).toBe(source);
  release();
  sensor.destroy();
  manager.destroy();
});

it('binds custom sensors through the bind(source, options?) contract', async () => {
  const bind = vi.fn<Sensor['bind']>(() => () => {});
  const manager = new DragDropManager({
    sensors: [{ bind }],
    feedback: 'none',
    autoScroll: false,
    accessibility: false,
  });
  const source = new Draggable({ id: 'custom', element: node() }, manager);
  source.register();
  await Promise.resolve();
  expect(bind).toHaveBeenCalled();
  expect(bind.mock.calls[0]![0]).toBe(source);
  manager.destroy();
});
