import { expect, it, vi } from 'vitest';
import type * as Motion from './motion.js';

const calls: { role: string; context: Record<string, unknown> }[] = [];
vi.mock('./motion.js', async (importOriginal) => {
  const original = await importOriginal<typeof Motion>();
  return {
    ...original,
    dragMotion: (
      _owner: unknown,
      _target: unknown,
      role: string,
      _keyframes: unknown,
      _transition: unknown,
      context: Record<string, unknown>,
    ) => {
      calls.push({ role, context });
      return { cancel() {}, finished: Promise.resolve() };
    },
  };
});

const { DragDropManager } = await import('./manager.js');
const { Sortable } = await import('./sortable.js');

function element(rect: { top: number }): Element {
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
  return Object.assign(new EventTarget(), {
    nodeType: 1,
    isConnected: true,
    parentNode: null,
    nextSibling: null,
    ownerDocument: Object.assign(new EventTarget(), { defaultView: view }),
    getBoundingClientRect: () => ({ left: 0, top: rect.top, width: 100, height: 40 }),
    getAnimations: () => [],
  }) as unknown as Element;
}
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

it('supplies full sort-displacement context for idle membership changes', async () => {
  const manager = new DragDropManager({
    sensors: [],
    feedback: 'none',
    autoScroll: false,
    accessibility: false,
  });
  const a = { top: 0 },
    b = { top: 40 };
  const first = new Sortable(
    { id: 'a', index: 0, group: 'g', element: element(a), transition: { idle: true } },
    manager,
  );
  const second = new Sortable(
    { id: 'b', index: 1, group: 'g', element: element(b), transition: { idle: true } },
    manager,
  );
  await settle();
  calls.length = 0;
  a.top = 40;
  b.top = 0;
  manager.registry.coordinator.batch(() => {
    first.setMembership(1, 'g');
    second.setMembership(0, 'g');
  });
  await settle();
  const contexts = calls
    .filter((call) => call.role === 'sort-displacement')
    .map((call) => call.context);
  expect(contexts).toContainEqual({
    itemId: 'a',
    sourceGroup: 'g',
    targetGroup: 'g',
    fromIndex: 0,
    toIndex: 1,
    x: 0,
    y: -40,
  });
  expect(contexts).toContainEqual({
    itemId: 'b',
    sourceGroup: 'g',
    targetGroup: 'g',
    fromIndex: 1,
    toIndex: 0,
    x: 0,
    y: 40,
  });
  manager.destroy();
});
