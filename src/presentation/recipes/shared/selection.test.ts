import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { flowAppearance } from '../flow.js';
import { selectionFill, selectionLine } from './selection.js';

describe('shared selection paint', () => {
  it('fills selected areas with the accent role mixed toward transparent (`uwg-te-sel-req-overlay`)', () => {
    expect(selectionFill).toMatch(/^color-mix\(in oklab, var\(--tp-accent\) \d+%, transparent\)$/);
    expect(selectionFill).toBe('color-mix(in oklab, var(--tp-accent) 60%, transparent)');
    expect(selectionFill).not.toContain('accent-foreground');
  });

  it('draws outlines and indicator lines in the primary role (`uwg-te-sel-req-overlay`)', () => {
    expect(selectionLine).toContain('var(--tp-primary)');
    expect(selectionLine).toBe('color-mix(in oklab, var(--tp-primary) 80%, transparent)');
  });

  it('paints the flow marquee from the shared fill and line (`uwg-fl-tab-anatomy-r12`)', () => {
    expect(flowAppearance['flow-selection']).toEqual([
      {
        declarations: {
          'background-color': selectionFill,
          border: `var(--tp-border-width) dotted ${selectionLine}`,
          'pointer-events': 'none',
        },
      },
    ]);
  });

  it('outlines the flow selection bounds with the shared line (`uwg-fl-tab-anatomy-r12`)', () => {
    const [bounds, ...rest] = flowAppearance['flow-selection-bounds'] ?? [];
    expect(rest).toEqual([]);
    expect(bounds?.selector).toBeUndefined();
    expect(bounds?.declarations.border).toBe(`var(--tp-border-width) dotted ${selectionLine}`);
    expect(bounds?.declarations).not.toHaveProperty('background-color');
  });

  it('keeps no selection paint of its own in the flow recipe (`req-cl-116-selection`)', () => {
    const source = readFileSync(new URL('../flow.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/const selection(Fill|Line)\b/);
    expect(source).toContain("from './shared/selection.js'");
  });
});
