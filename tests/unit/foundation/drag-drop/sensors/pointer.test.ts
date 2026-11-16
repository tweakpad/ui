import { afterEach, expect, it, vi } from 'vitest';
import { DragDropManager } from '../../../../../src/foundation/drag-drop/manager.js';
import { Draggable } from '../../../../../src/foundation/drag-drop/entities.js';
import { PointerSensor } from '../../../../../src/foundation/drag-drop/sensors/pointer.js';
import type { PointerSensorOptions } from '../../../../../src/foundation/drag-drop/sensors/pointer.js';
import { DistanceConstraint } from '../../../../../src/foundation/drag-drop/sensors/activation.js';

/** An inline style declaration that records its properties. */
function inlineStyle() {
  const values = new Map<string, string>();
  return {
    values,
    getPropertyValue: (property: string) => values.get(property) ?? '',
    getPropertyPriority: () => '',
    setProperty: (property: string, value: string) => void values.set(property, value),
    removeProperty: (property: string) => {
      const value = values.get(property) ?? '';
      values.delete(property);
      return value;
    },
  };
}

/** A window, document, root element and drag handle, enough for a pointer gesture. */
function realm(options?: PointerSensorOptions) {
  const view = Object.assign(new EventTarget(), {
    frameElement: null,
    parent: null,
    frames: { length: 0 },
    setTimeout: (callback: () => void, delay?: number) => setTimeout(callback, delay),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    setInterval: (callback: () => void, delay?: number) => setInterval(callback, delay),
    clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(0), 16) as unknown as number,
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    getComputedStyle: () => ({
      transform: 'none',
      translate: 'none',
      scale: 'none',
      transformOrigin: '0 0',
    }),
  });
  const root = Object.assign(new EventTarget(), { nodeType: 1, style: inlineStyle() });
  /** The body's children: the drag cursor's layer while a drag shows it. */
  const children: { style: ReturnType<typeof inlineStyle>; open: boolean }[] = [];
  const body = Object.assign(new EventTarget(), {
    nodeType: 1,
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    append: (node: (typeof children)[number] & { isConnected: boolean }) => {
      node.isConnected = true;
      children.push(node);
    },
  });
  const createElement = () => {
    const attributes = new Map<string, string>();
    const node = {
      isConnected: false,
      open: false,
      style: inlineStyle(),
      setAttribute: (name: string, value: string) => void attributes.set(name, value),
      hasAttribute: (name: string) => attributes.has(name),
      matches: (selector: string) => selector === ':popover-open' && node.open,
      showPopover: () => void (node.open = true),
      hidePopover: () => void (node.open = false),
      remove: () => {
        node.isConnected = false;
        children.splice(children.indexOf(node), 1);
      },
    };
    return node;
  };
  const document = Object.assign(new EventTarget(), {
    nodeType: 9,
    defaultView: view,
    documentElement: root,
    body,
    createElement,
  });
  Object.assign(view, { document });
  const handle = Object.assign(new EventTarget(), {
    nodeType: 1,
    isConnected: true,
    parentNode: null,
    ownerDocument: document,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
    }),
    getAnimations: () => [],
    getAttribute: () => null,
  }) as unknown as HTMLElement;
  const manager = new DragDropManager({
    sensors: [],
    feedback: 'none',
    autoScroll: false,
    accessibility: false,
  });
  const source = new Draggable({ id: 'row', element: handle, handle, register: false }, manager);
  source.register();
  const sensor = new PointerSensor(manager, options);
  const release = sensor.bind(source);
  const press = (pointerType: string, path?: readonly EventTarget[]) =>
    handle.dispatchEvent(
      Object.assign(new Event('pointerdown', { cancelable: true }), {
        isPrimary: true,
        button: 0,
        pointerId: 1,
        pointerType,
        clientX: 10,
        clientY: 10,
        ...(path ? { composedPath: () => [handle, ...path] } : {}),
      }),
    );
  const up = () =>
    document.dispatchEvent(
      Object.assign(new Event('pointerup', { cancelable: true }), { pointerId: 1 }),
    );
  /** A selection starting at `on` (the document by default), from `target`; whether it was stopped. */
  const selectStart = (on: EventTarget = document, target?: unknown) => {
    const event = new Event('selectstart', { cancelable: true });
    if (target) Object.assign(event, { composedPath: () => [target, on] });
    on.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const dispose = () => {
    release();
    sensor.destroy();
    manager.destroy();
  };
  const cursor = () => children[0]?.style.values.get('cursor');
  return { root, children, cursor, manager, document, press, up, selectStart, dispose };
}

afterEach(() => {
  vi.useRealTimers();
});

it('a mouse drag shows the grabbing cursor through the drag cursor layer and blocks selection, with no root declaration (V-587)', () => {
  vi.useFakeTimers();
  const { root, children, cursor, manager, press, up, selectStart, dispose } = realm();
  press('mouse');
  expect(manager.dragOperation.status).not.toBe('idle');
  // The starting task writes nothing; the cursor follows in the next frame.
  expect(children).toHaveLength(0);
  expect(selectStart()).toBe(true);
  vi.advanceTimersByTime(20);
  // One element in the top layer carries the cursor; the root keeps no declaration, which would
  // restyle the document at both ends of the drag.
  expect(children).toHaveLength(1);
  expect(children[0]?.open).toBe(true);
  expect(cursor()).toBe('grabbing');
  expect(root.style.values.size).toBe(0);
  expect(selectStart()).toBe(true);
  up();
  expect(children).toHaveLength(0);
  expect(root.style.values.size).toBe(0);
  expect(selectStart()).toBe(false);
  dispose();
});

it('a touch drag still leases user-select on the root against the long-press selection, with no cursor', () => {
  vi.useFakeTimers();
  const { root, children, manager, press, up, dispose } = realm();
  press('touch');
  expect(root.style.values.size).toBe(0);
  vi.advanceTimersByTime(260);
  expect(manager.dragOperation.status).not.toBe('idle');
  vi.advanceTimersByTime(20);
  expect(root.style.values.get('user-select')).toBe('none');
  expect(root.style.values.has('cursor')).toBe(false);
  expect(children).toHaveLength(0);
  up();
  expect(root.style.values.size).toBe(0);
  dispose();
});

it('a drag that ends before the next frame writes nothing', () => {
  vi.useFakeTimers();
  const { root, children, press, up, dispose } = realm();
  press('mouse');
  up();
  vi.advanceTimersByTime(40);
  expect(root.style.values.size).toBe(0);
  expect(children).toHaveLength(0);
  dispose();
});

it('a press waiting to become a drag already blocks text selection, in every shadow root on its path, but not in fields', () => {
  const shadow = Object.assign(new EventTarget(), { nodeType: 11, host: {} });
  const { manager, press, up, selectStart, dispose } = realm({
    activationConstraints: [new DistanceConstraint({ value: 6 })],
  });
  press('mouse', [shadow]);
  // Not a drag yet: the browser would start a selection on the first moves.
  expect(manager.dragOperation.status).toBe('idle');
  expect(selectStart()).toBe(true);
  // `selectstart` is not composed: one that starts inside a shadow root never reaches the document.
  expect(selectStart(shadow)).toBe(true);
  // A press in a field selects its text.
  const field = { nodeType: 1, matches: (selector: string) => selector.startsWith('input') };
  expect(selectStart(shadow, field)).toBe(false);
  up();
  // Once the press is over, selection is free again.
  expect(selectStart()).toBe(false);
  dispose();
});
