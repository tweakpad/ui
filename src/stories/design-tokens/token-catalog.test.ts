import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_TOKEN_ROLES,
  TOKEN_FAMILIES,
  type RequiredTokenRole,
} from '../../presentation/tokens.js';
import {
  DESCRIPTIONS,
  FAMILIES,
  MINIMUM_CONTRAST,
  PAIRED_SURFACE,
  SYNTAX_SAMPLES,
  authoredTokens,
  bezierPoints,
  contrastRatio,
  contrastSurfaces,
  hex,
  previewKind,
  type Rgba,
} from './token-catalog.js';

const stylesheet = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

/** The content color hues, in their listed order. */
const HUES = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

/** The light and dark values of a `light-dark()` value; a plain value serves both modes. */
const modes = (value: string): readonly [string, string] => {
  const match = /^light-dark\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/u.exec(value);
  return match ? [match[1]!, match[2]!] : [value, value];
};

/** A `#rgb`, `#rrggbb` or `#rrggbbaa` color as sRGB bytes. */
const rgba = (color: string): Rgba => {
  const digits = /^#([0-9a-f]+)$/iu.exec(color)?.[1] ?? '';
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
  if (full.length !== 6 && full.length !== 8) throw new Error(`Not a hex color: ${color}`);
  const [red, green, blue, alpha = 255] = (full.match(/../gu) ?? []).map((pair) =>
    Number.parseInt(pair, 16),
  );
  return [red!, green!, blue!, alpha];
};

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

  describe('content colors', () => {
    const tokens = authoredTokens(stylesheet);
    const background = modes(tokens.get('background') ?? '');
    const pairs = HUES.map((hue) => {
      const surface = modes(tokens.get(`content-${hue}`) ?? '');
      const foreground = modes(tokens.get(`content-${hue}-foreground`) ?? '');
      return { hue, surface, foreground };
    });
    const schemes = ['light', 'dark'] as const;

    it('lists a surface and a foreground for each content hue (ccx-roles)', () => {
      expect(TOKEN_FAMILIES.content).toEqual(
        HUES.flatMap((hue) => [`content-${hue}`, `content-${hue}-foreground`]),
      );
      expect(FAMILIES.content.value).toBe('color');
    });

    it('defines every content role for light and dark (ccx-defined)', () => {
      for (const hue of HUES)
        for (const role of [`content-${hue}`, `content-${hue}-foreground`])
          expect(tokens.get(role), role).toMatch(/^light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\)$/u);
    });

    it('keeps each content foreground at 4.5:1 on the background and on its surface in both modes (ccx-defined)', () => {
      for (const { hue, surface, foreground } of pairs) {
        schemes.forEach((scheme, index) => {
          const text = rgba(foreground[index]!);
          const onBackground = contrastRatio(text, rgba(background[index]!));
          const onSurface = contrastRatio(text, rgba(surface[index]!));
          expect(onBackground, `${hue} ${scheme} on background`).toBeGreaterThanOrEqual(
            MINIMUM_CONTRAST,
          );
          expect(onSurface, `${hue} ${scheme} on surface`).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
        });
      }
    });

    it('keeps each content surface apart from the background in both modes (ccx-defined)', () => {
      for (const { hue, surface } of pairs) {
        schemes.forEach((scheme, index) => {
          expect(rgba(surface[index]!), `${hue} ${scheme}`).not.toEqual(rgba(background[index]!));
        });
      }
    });

    it('measures each content foreground on its surface and on the background (ccx-defined, req-cl-52-pair-use)', () => {
      for (const hue of HUES) {
        const foreground = `content-${hue}-foreground` as RequiredTokenRole;
        expect(PAIRED_SURFACE[foreground], hue).toBe(`content-${hue}`);
      }
      expect(contrastSurfaces('content-blue-foreground')).toEqual(['content-blue', 'background']);
      expect(contrastSurfaces('primary-foreground')).toEqual(['primary']);
      expect(contrastSurfaces('border')).toEqual([]);
      expect(previewKind('content-blue-foreground', 'content')).toBe('content');
      expect(previewKind('content-blue', 'content')).toBe('fill');
      expect(previewKind('primary-foreground', 'color')).toBe('foreground');
    });
  });
});
