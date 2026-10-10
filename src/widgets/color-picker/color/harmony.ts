import { normalizeHue } from './convert.js';

export type HarmonyRule = 'none' | 'complementary' | 'analogous' | 'triad' | 'compound' | 'custom';

export const HARMONY_RULES: readonly HarmonyRule[] = [
  'none',
  'complementary',
  'analogous',
  'triad',
  'compound',
  'custom',
];

/** HSV in degrees and percentages. */
export interface Hsv {
  readonly h: number;
  readonly s: number;
  readonly v: number;
}

export interface HarmonyHandle {
  readonly hueOffset: number;
  readonly saturationScale: number;
  readonly valueScale: number;
  readonly base: boolean;
  /**
   * A principal hue of the scheme (the base, the complement, the triad hues, the split
   * complements, the analogous ±30°); the other handles are calculated variants of those.
   */
  readonly principal: boolean;
}

const handle = (
  hueOffset: number,
  saturationScale = 1,
  valueScale = 1,
  base = false,
  principal = base,
): HarmonyHandle => ({ hueOffset, saturationScale, valueScale, base, principal });
const principal = (hueOffset: number, saturationScale = 1, valueScale = 1): HarmonyHandle =>
  handle(hueOffset, saturationScale, valueScale, false, true);

/** Five handles per rule in wheel (polyline) order, Adobe-like. */
export const HARMONY_HANDLES: Readonly<
  Record<Exclude<HarmonyRule, 'none' | 'custom'>, readonly HarmonyHandle[]>
> = {
  complementary: [
    handle(0, 1, 1, true),
    handle(0, 1, 0.6),
    handle(0, 0.2, 0.4),
    handle(180, 1, 0.6),
    principal(180, 1, 1),
  ],
  analogous: [
    principal(-30, 1, 0.9),
    handle(-15, 0.9, 1),
    handle(0, 1, 1, true),
    handle(15, 0.9, 1),
    principal(30, 1, 0.9),
  ],
  triad: [
    handle(0, 1, 1, true),
    handle(120, 0.6, 0.85),
    principal(120, 1, 1),
    principal(240, 1, 1),
    handle(240, 0.6, 0.85),
  ],
  compound: [
    handle(-30, 0.9, 1),
    handle(0, 1, 1, true),
    principal(150, 1, 1),
    handle(180, 0.75, 0.9),
    principal(210, 1, 1),
  ],
};

export const HARMONY_HANDLE_COUNT = 5;

export function harmonyHandles(rule: HarmonyRule): readonly HarmonyHandle[] {
  if (rule === 'none') return [];
  // Custom handles are all placed by the user: every one is a principal.
  if (rule === 'custom')
    return Array.from({ length: HARMONY_HANDLE_COUNT }, (_, index) =>
      handle(0, 1, 1, index === 0, true),
    );
  return HARMONY_HANDLES[rule];
}

/** Whether each handle of a rule, in wheel order, is a principal hue of the scheme. */
export function harmonyPrincipals(rule: HarmonyRule, count?: number): readonly boolean[] {
  const flags = harmonyHandles(rule).map((entry) => entry.principal);
  if (count === undefined || count === flags.length) return flags;
  return Array.from({ length: count }, (_, index) => flags[index] ?? rule === 'custom');
}

/** Index of the base handle within the wheel order. */
export function harmonyBaseIndex(rule: HarmonyRule): number {
  const index = harmonyHandles(rule).findIndex((entry) => entry.base);
  return index < 0 ? 0 : index;
}

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

/**
 * Colors of a harmony in wheel order. For `custom` the supplied handles are used as-is
 * (the first is the base); for other rules the handles follow the base color.
 */
export function harmonyColors(
  base: Hsv,
  rule: HarmonyRule,
  custom?: readonly Hsv[],
): readonly Hsv[] {
  if (rule === 'none') return [];
  if (rule === 'custom') {
    const handles = custom && custom.length ? custom : [base];
    return handles.map((entry, index) => (index === 0 ? base : entry));
  }
  return HARMONY_HANDLES[rule].map((entry) =>
    entry.base
      ? base
      : {
          h: normalizeHue(base.h + entry.hueOffset),
          s: clampPercent(base.s * entry.saturationScale),
          v: clampPercent(base.v * entry.valueScale),
        },
  );
}

/** Seeds custom handles from a rule so switching to `custom` keeps the current layout. */
export function seedCustomHandles(base: Hsv, previous: HarmonyRule): readonly Hsv[] {
  const rule = previous === 'none' || previous === 'custom' ? 'complementary' : previous;
  const colors = harmonyColors(base, rule);
  const baseIndex = harmonyBaseIndex(rule);
  return [base, ...colors.filter((_, index) => index !== baseIndex)];
}
