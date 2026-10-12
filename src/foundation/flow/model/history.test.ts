import { describe, expect, it } from 'vitest';
import type { FlowChange } from '../types.js';
import { FlowHistory } from './history.js';

const move = (id: string, x: number): FlowChange => ({
  type: 'node-position',
  id,
  position: { x, y: 0 },
});

describe('FlowHistory', () => {
  it('records, undoes and redoes', () => {
    const history = new FlowHistory({}, () => 0);
    expect(
      history.record({
        changes: [move('a', 1)],
        inverse: [move('a', 0)],
        reason: 'drag',
        origin: 'user',
        label: 'Move',
      }),
    ).toBe(true);
    expect(history.state).toEqual({ canUndo: true, canRedo: false, depth: 1, undoLabel: 'Move' });
    const entry = history.undo();
    expect(entry?.inverse).toEqual([move('a', 0)]);
    expect(history.state).toEqual({ canUndo: false, canRedo: true, depth: 0, redoLabel: 'Move' });
    expect(history.redo()?.changes).toEqual([move('a', 1)]);
    expect(history.undo()).toBeDefined();
    history.record({
      changes: [move('b', 1)],
      inverse: [move('b', 0)],
      reason: 'drag',
      origin: 'user',
    });
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeUndefined();
    history.clear();
    expect(history.depth).toBe(0);
  });

  it('never records measurement and records selection and viewport only when enabled', () => {
    const history = new FlowHistory();
    expect(
      history.record({
        changes: [{ type: 'node-measure', id: 'a', measured: { width: 1, height: 1 } }],
        inverse: [],
        reason: 'programmatic',
        origin: 'measure',
      }),
    ).toBe(false);
    expect(
      history.record({
        changes: [{ type: 'node-select', id: 'a', selected: true }],
        inverse: [],
        reason: 'programmatic',
        origin: 'user',
      }),
    ).toBe(false);
    expect(
      history.record({
        changes: [{ type: 'viewport', viewport: { x: 1, y: 1, zoom: 1 } }],
        inverse: [],
        reason: 'programmatic',
        origin: 'user',
      }),
    ).toBe(false);
    const recording = new FlowHistory({ recordSelection: true, recordViewport: true });
    expect(
      recording.record({
        changes: [
          { type: 'node-select', id: 'a', selected: true },
          { type: 'node-measure', id: 'a' },
        ],
        inverse: [],
        reason: 'programmatic',
        origin: 'user',
      }),
    ).toBe(true);
    expect(recording.peekUndo()?.changes).toHaveLength(1);
    expect(
      recording.record({
        changes: [{ type: 'viewport', viewport: { x: 1, y: 1, zoom: 1 } }],
        inverse: [],
        reason: 'programmatic',
        origin: 'user',
      }),
    ).toBe(true);
  });

  it('coalesces same-key entries inside the window and squashes them', () => {
    let now = 0;
    const history = new FlowHistory({ coalesceWindow: 300 }, () => now);
    history.record({
      changes: [move('a', 1)],
      inverse: [move('a', 0)],
      reason: 'keyboard',
      origin: 'user',
      coalesceKey: 'nudge:a',
    });
    now = 100;
    history.record({
      changes: [move('a', 2)],
      inverse: [move('a', 1)],
      reason: 'keyboard',
      origin: 'user',
      coalesceKey: 'nudge:a',
    });
    expect(history.depth).toBe(1);
    expect(history.peekUndo()?.changes).toEqual([move('a', 2)]);
    expect(history.peekUndo()?.inverse).toEqual([move('a', 0)]);
    now = 500;
    history.record({
      changes: [move('a', 3)],
      inverse: [move('a', 2)],
      reason: 'keyboard',
      origin: 'user',
      coalesceKey: 'nudge:a',
    });
    expect(history.depth).toBe(2);
    now = 600;
    history.record({
      changes: [move('b', 1)],
      inverse: [move('b', 0)],
      reason: 'keyboard',
      origin: 'user',
      coalesceKey: 'nudge:b',
    });
    expect(history.depth).toBe(3);
    now = 700;
    history.record({
      changes: [move('b', 2)],
      inverse: [move('b', 1)],
      reason: 'keyboard',
      origin: 'user',
    });
    expect(history.depth).toBe(4);
  });

  it('applies entry and change limits', () => {
    const history = new FlowHistory({ limit: 3 });
    for (let index = 0; index < 5; index += 1)
      history.record({
        changes: [move('a', index)],
        inverse: [move('a', index - 1)],
        reason: 'drag',
        origin: 'user',
        label: `m${index}`,
      });
    expect(history.depth).toBe(3);
    expect(history.entries.map((entry) => entry.label)).toEqual(['m2', 'm3', 'm4']);

    const bounded = new FlowHistory({ maxChanges: 5 });
    bounded.record({
      changes: [move('a', 1), move('b', 1), move('c', 1)],
      inverse: [],
      reason: 'drag',
      origin: 'user',
      label: 'first',
    });
    bounded.record({
      changes: [move('a', 2), move('b', 2), move('c', 2)],
      inverse: [],
      reason: 'drag',
      origin: 'user',
      label: 'second',
    });
    expect(bounded.entries.map((entry) => entry.label)).toEqual(['second']);
    bounded.record({
      changes: Array.from({ length: 9 }, (_, index) => move(`n${index}`, 1)),
      inverse: [],
      reason: 'drag',
      origin: 'user',
      label: 'big',
    });
    expect(bounded.entries.map((entry) => entry.label)).toEqual(['big']);
  });
});
