import { describe, expect, it } from 'vitest';
import { runLayoutPasses, scheduleLayoutPass } from './layout-batch.js';

describe('layout batch', () => {
  it('runs every write, then every measurement, then every apply', () => {
    const order: string[] = [];
    for (const name of ['a', 'b'])
      scheduleLayoutPass(
        {},
        {
          write: () => order.push(`write ${name}`),
          measure: () => {
            order.push(`measure ${name}`);
            return name.toUpperCase();
          },
          apply: (measured) => order.push(`apply ${measured}`),
        },
      );
    runLayoutPasses();
    expect(order).toEqual(['write a', 'write b', 'measure a', 'measure b', 'apply A', 'apply B']);
  });

  it('keeps only the latest pass of an owner and skips inactive passes', () => {
    const owner = {};
    const seen: string[] = [];
    scheduleLayoutPass(owner, { measure: () => seen.push('first') });
    scheduleLayoutPass(owner, { measure: () => seen.push('second') });
    scheduleLayoutPass({}, { active: () => false, measure: () => seen.push('inactive') });
    runLayoutPasses();
    expect(seen).toEqual(['second']);
  });

  it('runs in one microtask and queues passes scheduled during a batch for the next one', async () => {
    const seen: string[] = [];
    scheduleLayoutPass(
      {},
      {
        measure: () => seen.push('first'),
        apply: () => scheduleLayoutPass({}, { measure: () => seen.push('next') }),
      },
    );
    expect(seen).toEqual([]);
    await Promise.resolve();
    expect(seen).toEqual(['first']);
    await Promise.resolve();
    expect(seen).toEqual(['first', 'next']);
  });
});
