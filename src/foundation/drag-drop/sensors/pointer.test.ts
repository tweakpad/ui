import { afterEach, expect, it, vi } from 'vitest';
import { DragDropManager } from '../manager.js';
import { Draggable } from '../entities.js';
import { PointerSensor } from './pointer.js';

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
function realm() {
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
  const sensor = new PointerSensor(manager);
  const release = sensor.bind(source);
  const press = (pointerType: string) =>
    handle.dispatchEvent(
      Object.assign(new Event('pointerdown', { cancelable: true }), {
        isPrimary: true,
        button: 0,
        pointerId: 1,
        pointerType,
        clientX: 10,
        clientY: 10,
      }),
    );
  const up = () =>
    document.dispatchEvent(
      Object.assign(new Event('pointerup', { cancelable: true }), { pointerId: 1 }),
    );
  const selectStart = () => {
    const event = new Event('selectstart', { cancelable: true });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const dispose = () => {
    release();
    sensor.destroy();
    manager.destroy();
  };
  const cursor = () => children[0]?.style.values.get('cursor');
  return { root, children, cursor, manager, press, up, selectStart, dispose };
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
