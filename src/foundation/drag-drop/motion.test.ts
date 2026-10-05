import { expect, it } from 'vitest';
import { dragMotionContext, resolveDropAnimation } from './motion.js';
import { DragDropManager } from './manager.js';
import { Draggable } from './entities.js';
import { Sortable, sortableMembership } from './sortable.js';

it('builds the complete drag motion role context and omits absent fields', () => {
  expect(
    dragMotionContext(
      'a',
      { sourceGroup: 'left', targetGroup: 'right', fromIndex: 0, toIndex: 2 },
      { x: 4, y: -8 },
    ),
  ).toEqual({
    itemId: 'a',
    sourceGroup: 'left',
    targetGroup: 'right',
    fromIndex: 0,
    toIndex: 2,
    x: 4,
    y: -8,
  });
  const partial = dragMotionContext(3, { fromIndex: 1, toIndex: 1 }, { x: 0, y: 0 });
  expect(partial).toEqual({ itemId: 3, fromIndex: 1, toIndex: 1, x: 0, y: 0 });
  expect('sourceGroup' in partial).toBe(false);
});

it('resolves drop configuration as entity, overlay override, then manager default', () => {
  const custom = () => undefined;
  expect(resolveDropAnimation(undefined, undefined, undefined)).toBeUndefined();
  expect(resolveDropAnimation(undefined, undefined, { duration: 100 })).toEqual({
    duration: 100,
  });
  expect(
    resolveDropAnimation(undefined, { duration: 50 }, { duration: 100, easing: 'linear' }),
  ).toEqual({ duration: 50, easing: 'linear' });
  expect(resolveDropAnimation({ easing: 'ease-in' }, { duration: 50 }, { duration: 100 })).toEqual({
    duration: 50,
    easing: 'ease-in',
  });
  expect(resolveDropAnimation(undefined, null, { duration: 100 })).toBeNull();
  expect(resolveDropAnimation(null, { duration: 50 }, { duration: 100 })).toBeNull();
  expect(resolveDropAnimation(undefined, custom, { duration: 100 })).toBe(custom);
  expect(resolveDropAnimation({ duration: 10 }, custom, undefined)).toEqual({ duration: 10 });
});

it('reports sortable source membership from drag start to the projected position', async () => {
  const element = Object.assign(new EventTarget(), {
    nodeType: 1,
    isConnected: true,
    parentNode: null,
    ownerDocument: Object.assign(new EventTarget(), {
      defaultView: Object.assign(new EventTarget(), {
        frameElement: null,
        setInterval: () => 1,
        clearInterval: () => {},
        getComputedStyle: () => ({
          transform: 'none',
          translate: 'none',
          scale: 'none',
          transformOrigin: '0 0',
        }),
      }),
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }),
    getAnimations: () => [],
  }) as unknown as Element;
  const manager = new DragDropManager({
    sensors: [],
    feedback: 'none',
    autoScroll: false,
    accessibility: false,
  });
  const sortable = new Sortable({ id: 'a', index: 1, group: 'left', element }, manager);
  await Promise.resolve();
  expect(sortableMembership(sortable.draggable)).toEqual({
    sourceGroup: 'left',
    targetGroup: 'left',
    fromIndex: 1,
    toIndex: 1,
  });
  manager.actions.start({ source: sortable.draggable, coordinates: { x: 0, y: 0 } });
  sortable.setMembership(0, 'right');
  expect(sortableMembership(sortable.draggable)).toEqual({
    sourceGroup: 'left',
    targetGroup: 'right',
    fromIndex: 1,
    toIndex: 0,
  });
  expect(sortableMembership(new Draggable({ id: 'plain', register: false }))).toEqual({});
  expect(sortableMembership(null)).toEqual({});
  manager.destroy();
});
