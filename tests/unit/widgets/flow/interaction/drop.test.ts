import { describe, expect, it } from 'vitest';
import { FlowScopeView } from '../../../../../src/foundation/flow/groups/view.js';
import type { FlowTransaction } from '../../../../../src/foundation/flow/model/model.js';
import type { FlowChange } from '../../../../../src/foundation/flow/types.js';
import {
  GroupDragTracker,
  reparentable,
  resolveDropTarget,
  type GroupDropHost,
} from '../../../../../src/widgets/flow/interaction/drop.js';
import { ids, model, step } from '../../../foundation/flow/groups/fixture.js';

// G spans 200..900 × 100..500; H (inside G) 500..800 × 160..410; a at 240,250; b at 600,260.

function host(target = model(), path: readonly string[] = []) {
  const view = new FlowScopeView(target, { path });
  const marks: Array<string | undefined> = [];
  const value: GroupDropHost = {
    model: target,
    view,
    scope: path[path.length - 1],
    idFactory: ids(),
    proposeIn: (transaction, changes) => {
      transaction.apply(changes, { clamp: false, cascade: false });
    },
    markTarget: (id) => marks.push(id),
    toFlow: (event) => ({ x: event.clientX, y: event.clientY }),
  };
  return { host: value, model: target, view, marks };
}

const pointer = (x: number, y: number) => ({ clientX: x, clientY: y }) as PointerEvent;

function frame(
  tracker: GroupDragTracker,
  transaction: FlowTransaction,
  moves: FlowChange[],
  x: number,
  y: number,
): void {
  transaction.apply([...tracker.before(), ...moves], { clamp: false, cascade: false });
  tracker.after(transaction, pointer(x, y));
}

describe('drop target resolution', () => {
  it('takes the deepest expanded group under the pointer, else the scope', () => {
    const { view, model: target } = host();
    expect(resolveDropTarget(view, { x: 550, y: 200 }, ['x'], undefined)).toBe('H');
    expect(resolveDropTarget(view, { x: 250, y: 120 }, ['x'], undefined)).toBe('G');
    expect(resolveDropTarget(view, { x: 50, y: 50 }, ['a'], undefined)).toBeUndefined();
    target.apply([{ type: 'node-update', id: 'H', patch: { collapsed: true } }]);
    expect(resolveDropTarget(view, { x: 550, y: 200 }, ['x'], undefined)).toBe('G');
  });

  it('never drops into a moved node or a node inside it', () => {
    const { view } = host();
    expect(resolveDropTarget(view, { x: 550, y: 200 }, ['H'], undefined)).toBe('G');
    expect(resolveDropTarget(view, { x: 550, y: 200 }, ['G'], undefined)).toBeUndefined();
  });

  it('falls back to the group the view shows', () => {
    const { view } = host(model(), ['G']);
    expect(resolveDropTarget(view, { x: 550, y: 200 }, ['a'], 'G')).toBe('H');
    expect(resolveDropTarget(view, { x: 250, y: 120 }, ['a'], 'G')).toBe('G');
  });

  it('only moves top-level nodes and group members', () => {
    const target = model();
    target.apply([
      { type: 'node-add', node: step('p', 2000, 0) },
      { type: 'node-add', node: step('q', 10, 10, { parentId: 'p' }) },
    ]);
    expect(reparentable(target, 'x')).toBe(true);
    expect(reparentable(target, 'a')).toBe(true);
    expect(reparentable(target, 'q')).toBe(false);
  });
});

describe('group drag tracking', () => {
  it('moves a member dragged out of its group to the scope level on drop', () => {
    const { host: drop, model: target } = host();
    const transaction = target.transaction({ label: 'move' });
    const tracker = new GroupDragTracker(drop, ['a']);
    frame(
      tracker,
      transaction,
      [{ type: 'node-position', id: 'a', position: { x: 800, y: 500 } }],
      1010,
      610,
    );
    expect(tracker.target).toBeUndefined();
    expect(tracker.drop(transaction, pointer(1010, 610))?.moved).toEqual(['a']);
    transaction.commit();
    expect(target.getNode('a')?.parentId).toBeUndefined();
    expect(target.absolutePosition('a')).toEqual({ x: 1000, y: 600 });
    expect(target.validate().filter((issue) => issue.code === 'boundary-crossing')).toEqual([]);
    expect(target.history.depth).toBe(1);
  });

  it('marks and enters the group a top-level node is dropped on', () => {
    const { host: drop, model: target, marks } = host();
    const transaction = target.transaction({ label: 'move' });
    const tracker = new GroupDragTracker(drop, ['y']);
    frame(
      tracker,
      transaction,
      [{ type: 'node-position', id: 'y', position: { x: 560, y: 300 } }],
      570,
      310,
    );
    expect(tracker.target).toBe('H');
    expect(marks.at(-1)).toBe('H');
    tracker.drop(transaction, pointer(570, 310));
    transaction.commit();
    expect(target.getNode('y')?.parentId).toBe('H');
    expect(target.absolutePosition('y')).toEqual({ x: 560, y: 300 });
    tracker.clear();
    expect(marks.at(-1)).toBeUndefined();
  });

  it('grows the parent of a member live and starts the next frame from the press-time frame', () => {
    const { host: drop, model: target } = host();
    const transaction = target.transaction({ label: 'move' });
    const tracker = new GroupDragTracker(drop, ['b']);
    expect(tracker.before()).toEqual([]);
    frame(
      tracker,
      transaction,
      [{ type: 'node-position', id: 'b', position: { x: 250, y: 100 } }],
      760,
      270,
    );
    expect(tracker.target).toBe('H');
    expect(target.getNode('H')?.size?.width).toBe(366);
    const restore = tracker.before();
    expect(restore).toContainEqual({
      type: 'node-size',
      id: 'H',
      size: { width: 300, height: 250 },
    });
    // Back inside: the frame returns to its press-time size.
    frame(
      tracker,
      transaction,
      [{ type: 'node-position', id: 'b', position: { x: 100, y: 100 } }],
      610,
      270,
    );
    expect(target.getNode('H')?.size?.width).toBe(300);
    expect(tracker.drop(transaction, pointer(610, 270))).toBeUndefined();
    transaction.rollback();
    expect(target.getNode('b')?.position).toEqual({ x: 100, y: 100 });
  });

  it('leaves a document without groups as it was', () => {
    const target = model({
      version: 1,
      nodes: [step('a', 0, 0), step('b', 300, 0)],
      edges: [],
    });
    const { host: drop } = host(target);
    const transaction = target.transaction({ label: 'move' });
    const tracker = new GroupDragTracker(drop, ['a']);
    frame(
      tracker,
      transaction,
      [{ type: 'node-position', id: 'a', position: { x: 50, y: 50 } }],
      60,
      60,
    );
    expect(tracker.before()).toEqual([]);
    expect(tracker.drop(transaction, pointer(60, 60))).toBeUndefined();
    transaction.commit();
    expect(target.getNode('a')).toMatchObject({ position: { x: 50, y: 50 } });
    expect(target.getNode('a')?.parentId).toBeUndefined();
  });
});
