import { describe, expect, it } from 'vitest';
import { FlowModel } from './model.js';
import {
  runAfterHooks,
  runBeforeHooks,
  type FlowChangeEvent,
  type FlowHookContext,
} from './hooks.js';
import type { FlowChange } from '../types.js';

const change: FlowChange = { type: 'node-position', id: 'a', position: { x: 1, y: 1 } };

function context(): FlowHookContext {
  const model = new FlowModel();
  return {
    reason: 'programmatic',
    origin: 'user',
    transaction: undefined,
    model,
    preview: () => model.document,
  };
}

describe('flow hooks', () => {
  it('runs before hooks in order, letting them transform or veto', () => {
    const seen: string[] = [];
    const result = runBeforeHooks(
      [
        {
          name: 'first',
          before: (changes) => {
            seen.push('first');
            return [...changes, { type: 'node-select', id: 'a', selected: true }];
          },
        },
        {
          before: (changes) => {
            seen.push('second');
            expect(changes).toHaveLength(2);
          },
        },
        { name: 'veto', before: () => false },
        {
          name: 'never',
          before: () => {
            seen.push('never');
          },
        },
      ],
      [change],
      context(),
    );
    expect(seen).toEqual(['first', 'second']);
    expect(result.vetoedBy).toBe('veto');
    expect(result.changes).toHaveLength(2);
    const anonymous = runBeforeHooks(
      [{ before: () => undefined }, { before: () => false }],
      [change],
      context(),
    );
    expect(anonymous.vetoedBy).toBe('middleware:1');
    const clean = runBeforeHooks([{ after: () => undefined }], [change], context());
    expect(clean.vetoedBy).toBeUndefined();
    expect(clean.changes).toEqual([change]);
    expect(clean.changes).not.toBe([change]);
  });

  it('runs every after hook and rethrows the first failure afterwards', () => {
    const model = new FlowModel();
    const event: FlowChangeEvent = {
      changes: [change],
      inverse: [],
      reason: 'programmatic',
      origin: 'user',
      transaction: undefined,
      document: model.document,
      previousDocument: model.document,
      affectedNodes: new Set(['a']),
      affectedEdges: new Set(),
      dirtyRects: [],
    };
    const seen: string[] = [];
    expect(() =>
      runAfterHooks(
        [
          {
            after: () => {
              seen.push('a');
              throw new Error('boom');
            },
          },
          {
            after: () => {
              seen.push('b');
              throw new Error('later');
            },
          },
          { before: () => undefined },
        ],
        event,
      ),
    ).toThrow('boom');
    expect(seen).toEqual(['a', 'b']);
  });
});
