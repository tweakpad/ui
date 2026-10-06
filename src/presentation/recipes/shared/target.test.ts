import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { packedExtent } from './target.js';

describe('packed control extent', () => {
  it('keeps the visible extent and defers to the coarse-pointer target', () => {
    expect(packedExtent('var(--tp-control-height-sm)')).toBe(
      'max(var(--tp-control-height-sm), var(--_tp-coarse-target, 0px))',
    );
  });

  it('raises packed controls to the minimum target only for coarse pointers', () => {
    const theme = readFileSync('src/styles.css', 'utf8');
    expect(theme).toMatch(
      /@media \(pointer: coarse\) \{\s*:root \{\s*--_tp-coarse-target: var\(--tp-target-size-min\);/,
    );
  });
});
