import { describe, expect, it } from 'vitest';
import { pushRecent } from './recent.js';

describe('recent colors', () => {
  it('keeps newest first, de-duplicated and capped', () => {
    let list: readonly string[] = [];
    for (const entry of ['#1', '#2', '#3', '#2', '#4']) list = pushRecent(list, entry, 3);
    expect(list).toEqual(['#4', '#2', '#3']);
    expect(pushRecent(list, '#9', 0)).toEqual([]);
    expect(pushRecent(['#a', '#b'], '#b', 8)).toEqual(['#b', '#a']);
  });
});
