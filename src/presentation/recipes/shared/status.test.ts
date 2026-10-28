import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapPresentation } from '../../families/map.js';
import { mapAppearance } from '../map.js';
import { statusAppearance } from './status.js';

describe('shared status set', () => {
  it('paints the status region with muted text and fill, small text, gap and padding (`uwg-te-req-pres-1`)', () => {
    const [region] = statusAppearance;
    expect(region?.selector).toBeUndefined();
    expect(Object.entries(region?.declarations ?? {})).toEqual([
      ['color', 'var(--tp-muted-foreground)'],
      ['font-size', 'var(--tp-text-sm)'],
      ['background', 'var(--tp-muted)'],
      ['gap', 'var(--tp-space-2)'],
      ['padding', 'var(--tp-space-4)'],
    ]);
  });

  it("turns the status text destructive while the owner's status is error (`uwg-te-tab-anatomy-status`)", () => {
    expect(statusAppearance).toHaveLength(2);
    expect(statusAppearance[1]).toEqual({
      selector: ':host([data-status="error"]) &',
      declarations: { color: 'var(--tp-destructive)' },
    });
  });

  it("gives Map's status the shared status set (`ucl21-map`)", () => {
    expect(mapAppearance['map-status']).toBe(statusAppearance);
    expect(mapPresentation.appearance['map-status']).toEqual(statusAppearance);
  });

  it('keeps no status paint of its own in the Map recipe (`uwg-te-lis-conf-i1`)', () => {
    const source = readFileSync(new URL('../map.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('data-status');
    expect(source).not.toContain('--tp-muted-foreground');
    expect(source).toContain("from './shared/status.js'");
  });
});
