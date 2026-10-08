import { describe, expect, it } from 'vitest';
import { groupLoadingStatus } from './group-status.js';

describe('image group status', () => {
  it('aggregates member status, counting failures as settled', () => {
    expect(groupLoadingStatus([])).toEqual({ status: 'idle', loaded: 0, failed: 0, total: 0 });
    expect(groupLoadingStatus(['loaded', 'loading'])).toMatchObject({
      status: 'loading',
      loaded: 1,
    });
    expect(groupLoadingStatus(['loaded', 'error', 'idle'])).toEqual({
      status: 'loaded',
      loaded: 1,
      failed: 1,
      total: 3,
    });
  });
});
