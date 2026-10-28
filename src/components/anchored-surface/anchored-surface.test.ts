import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('anchored surface render cost', () => {
  const source = readFileSync(new URL('./anchored-surface.ts', import.meta.url), 'utf8');

  it('measures the arrow (a theme spacing probe, a forced layout) only for a surface that shows it', () => {
    const layer = source.slice(source.indexOf('  protected renderLayer(): unknown {'));
    const body = layer.slice(0, layer.indexOf('\n  }\n'));
    expect(body).toContain('const arrow = this.showArrow ? this.#arrowGeometry() : null;');
    expect(body).not.toMatch(/this\.arrow(Width|Height)\b/);
  });

  it('writes the popup side and alignment of a positioning pass only when they change', () => {
    const start = source.indexOf('      onPosition: (result) => {');
    const body = source.slice(start, source.indexOf('\n      },\n', start));
    // A pass whose placement did not change leaves the popup untouched (no attribute records).
    expect(body).toContain('if (node.dataset.side !== surface.dataset.side)');
    expect(body).toContain('if (node.dataset.align !== surface.dataset.align)');
    expect(body.match(/node\.dataset\.(side|align) =/g)).toHaveLength(2);
  });
});
