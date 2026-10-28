import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createBlockId,
  freshBlockId,
  isValidBlockId,
  planIdRepair,
  reassignIdsByOrder,
} from './ids.js';

/** A generator that hands out `prefix<start>`, `prefix<start + 1>`, … in order. */
function counter(prefix = 'fresh', start = 0): () => string {
  let next = start;
  return () => `${prefix}${next++}`;
}

/** Makes `crypto.getRandomValues` fill byte arrays from `bytes`, in order. */
function feedRandomBytes(bytes: readonly number[]) {
  let next = 0;
  return vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: Uint8Array) => {
    for (let index = 0; index < array.length; index += 1) array[index] = bytes[next++] ?? 0;
    return array;
  }) as typeof crypto.getRandomValues);
}

describe('block identifiers (uwg-te-req-content-7)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('V-023, V-138: createBlockId matches /^[a-z0-9]{10}$/ with no repeat in 10,000 calls', () => {
    const ids = Array.from({ length: 10_000 }, () => createBlockId());
    expect(ids.filter((id) => !/^[a-z0-9]{10}$/.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(10_000);
  });

  it('draws from crypto.getRandomValues at call time and redraws biasing bytes', () => {
    // 252–255 are drawn again; 0, 25, 26, 35, 36 and 251 give a, z, 0, 9, a and 9.
    let random = feedRandomBytes([255, 0, 252, 25, 26, 253, 35, 36, 251, 254, 1, 2, 3, 4]);
    expect(createBlockId()).toBe('az09a9bcde');
    expect(random).toHaveBeenCalledTimes(1);
    // Sixteen biasing bytes in a row make it draw a second array.
    vi.restoreAllMocks();
    const biased = Array<number>(16).fill(255);
    random = feedRandomBytes([...biased, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(createBlockId()).toBe('hijklmnopq');
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('V-138: isValidBlockId accepts 1 to 64 of [A-Za-z0-9_-] only', () => {
    for (const id of ['a', 'Z', '7', '_', '-', 'Tide_table-02', 'x'.repeat(64), createBlockId()])
      expect(isValidBlockId(id), id).toBe(true);
    for (const id of [
      '',
      'x'.repeat(65),
      'two words',
      'dot.ted',
      'slash/ed',
      'colon:ed',
      '#anchor',
      'línea',
      'tide\n',
      '\ntide',
      'wave\u{1F30A}',
    ])
      expect(isValidBlockId(id), JSON.stringify(id)).toBe(false);
  });

  it('V-138: the first duplicate keeps its id, later and invalid ones are replaced', () => {
    const input = ['intro', 'tides', 'intro', 'not valid!', null, 'tides', 'x'.repeat(65), ''];
    const plan = planIdRepair(input, counter());
    expect(plan.ids).toEqual([
      'intro',
      'tides',
      'fresh0',
      'fresh1',
      'fresh2',
      'fresh3',
      'fresh4',
      'fresh5',
    ]);
    // Five carried identifiers were replaced; the block that carried none (null) is not one.
    // The caller reports a single `text-editor-block-id` diagnostic for the whole repair.
    expect(plan.replaced).toBe(5);
    // A repaired list needs no further repair, and fresh identifiers are generated ones.
    expect(planIdRepair(plan.ids)).toEqual({ ids: plan.ids, replaced: 0 });
    const generated = planIdRepair(input);
    expect(generated.ids.slice(0, 2)).toEqual(['intro', 'tides']);
    expect(generated.ids.slice(2).filter((id) => !/^[a-z0-9]{10}$/.test(id))).toEqual([]);
    expect(new Set(generated.ids).size).toBe(input.length);
  });

  it('keeps valid unique identifiers as they are and fills missing ones silently', () => {
    expect(planIdRepair(['a', 'b-2', 'C_3'], counter())).toEqual({
      ids: ['a', 'b-2', 'C_3'],
      replaced: 0,
    });
    expect(planIdRepair([null, null], counter())).toEqual({
      ids: ['fresh0', 'fresh1'],
      replaced: 0,
    });
    expect(planIdRepair([])).toEqual({ ids: [], replaced: 0 });
  });

  it('never hands out an identifier that the plan keeps or already handed out', () => {
    // The duplicate at 1 needs a fresh id; the generator first offers b1 (kept at 0) and b2
    // (kept later, at 2), so it receives b3.
    expect(planIdRepair(['b1', 'b1', 'b2', null], counter('b', 1))).toEqual({
      ids: ['b1', 'b3', 'b2', 'b4'],
      replaced: 1,
    });
    // A generator stuck on a taken identifier falls back to random identifiers.
    const stuck = planIdRepair(['same', null, null], () => 'same');
    expect(stuck.ids[0]).toBe('same');
    expect(stuck.ids.slice(1).filter((id) => !/^[a-z0-9]{10}$/.test(id))).toEqual([]);
    expect(new Set(stuck.ids).size).toBe(3);
  });

  it('reassigns identifiers by order when a conversion changes the block count', () => {
    // N blocks into one keep the first identifier.
    expect(reassignIdsByOrder(['p1', 'p2', 'p3'], 1, counter())).toEqual(['p1']);
    // One block into N keeps it on the first; the others are fresh.
    expect(reassignIdsByOrder(['p1'], 3, counter())).toEqual(['p1', 'fresh0', 'fresh1']);
    // N into N keeps every identifier in order.
    expect(reassignIdsByOrder(['p1', 'p2'], 2, counter())).toEqual(['p1', 'p2']);
    expect(reassignIdsByOrder([], 0)).toEqual([]);
  });

  it('gives fresh identifiers where a previous one is repeated or invalid', () => {
    expect(reassignIdsByOrder(['p1', 'p1', 'bad id'], 3, counter())).toEqual([
      'p1',
      'fresh0',
      'fresh1',
    ]);
    // Fresh identifiers avoid every previous identifier, the dropped ones included.
    expect(reassignIdsByOrder(['fresh2', 'fresh0'], 3, counter())).toEqual([
      'fresh2',
      'fresh0',
      'fresh1',
    ]);
    const generated = reassignIdsByOrder(['p1'], 4);
    expect(generated[0]).toBe('p1');
    expect(generated.slice(1).filter((id) => !/^[a-z0-9]{10}$/.test(id))).toEqual([]);
    expect(new Set(generated).size).toBe(4);
  });
});

describe('uwg-te-req-content-7: a fresh identifier', () => {
  it('is one the taken set lacks and joins it; a generator that keeps repeating falls back to random ones', () => {
    const taken = new Set(['a', 'b']);
    let calls = 0;
    expect(freshBlockId(taken, () => ((calls += 1), calls < 3 ? 'a' : 'c'))).toBe('c');
    expect(taken.has('c')).toBe(true);
    const random = freshBlockId(taken, () => 'a');
    expect(random).toMatch(/^[a-z0-9]{10}$/u);
    expect(taken.has(random)).toBe(true);
  });
});
