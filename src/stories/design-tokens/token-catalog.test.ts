import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REQUIRED_TOKEN_ROLES, TOKEN_FAMILIES } from '../../presentation/tokens.js';
import {
  DESCRIPTIONS,
  FAMILIES,
  PAIRED_SURFACE,
  SYNTAX_SAMPLES,
  authoredTokens,
  bezierPoints,
  contrastRatio,
  hex,
} from './token-catalog.js';

const stylesheet = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('design token catalog', () => {
  it('describes every role and family', () => {
    expect(Object.keys(DESCRIPTIONS).sort()).toEqual([...REQUIRED_TOKEN_ROLES].sort());
    for (const role of REQUIRED_TOKEN_ROLES) expect(DESCRIPTIONS[role].length).toBeGreaterThan(0);
    expect(Object.keys(FAMILIES).sort()).toEqual(Object.keys(TOKEN_FAMILIES).sort());
    for (const role of TOKEN_FAMILIES.syntax) expect(SYNTAX_SAMPLES[role]).toBeTruthy();
    for (const surface of Object.values(PAIRED_SURFACE))
      expect(REQUIRED_TOKEN_ROLES).toContain(surface);
  });

  it('reads the authored definition of every role', () => {
    const tokens = authoredTokens(stylesheet);
    for (const role of REQUIRED_TOKEN_ROLES) expect(tokens.get(role), role).toBeTruthy();
    expect(tokens.get('card-foreground')).toBe('var(--tp-foreground)');
    expect(tokens.get('space-4')).toBe('calc(var(--tp-spacing) * 4)');
    // Private properties and declarations inside comments are not roles.
    expect(authoredTokens('/* --tp-a: 1; */ :root { --_tp-b: 2; --tp-c: 3; }')).toEqual(
      new Map([['c', '3']]),
    );
  });

  it('measures contrast and formats colors', () => {
    expect(contrastRatio([0, 0, 0, 255], [255, 255, 255, 255])).toBeCloseTo(21);
    expect(contrastRatio([255, 255, 255, 255], [255, 255, 255, 255])).toBeCloseTo(1);
    // A translucent foreground is composited onto its surface first.
    expect(contrastRatio([0, 0, 0, 0], [255, 255, 255, 255])).toBeCloseTo(1);
    expect(hex([109, 93, 252, 255])).toBe('#6d5dfc');
    expect(hex([0, 0, 0, 128])).toBe('#00000080');
  });

  it('draws cubic-bezier and keyword curves only', () => {
    expect(bezierPoints('cubic-bezier(0.2, 0, 0, 1)')).toEqual([0.2, 0, 0, 1]);
    expect(bezierPoints('ease-in')).toEqual([0.42, 0, 1, 1]);
    expect(bezierPoints('steps(4)')).toBeNull();
    expect(bezierPoints('linear(0, 0.5, 1)')).toBeNull();
  });
});
