import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('anchored toast positioning writes', () => {
  const source = readFileSync(new URL('./toast.ts', import.meta.url), 'utf8');

  it('writes the side and alignment of a positioning pass only when they change', () => {
    const start = source.indexOf('      onPosition: (result: PositioningResult) => {');
    const body = source.slice(start, source.indexOf('\n      },\n', start));
    // A pass whose placement did not change leaves the toast and its arrow untouched.
    expect(body).toContain('if (wrapper.dataset.side !== side)');
    expect(body).toContain('if (wrapper.dataset.align !== alignment)');
    expect(body).toContain('if (arrow.dataset.side !== side)');
    expect(body.match(/\.dataset\.(side|align) =/g)).toHaveLength(3);
  });
});
