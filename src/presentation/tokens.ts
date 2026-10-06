import type { PresentationRecord } from './dictionary.js';

export const TOKEN_FAMILIES = {
  color: [
    'background',
    'foreground',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    'success',
    'success-foreground',
    'warning',
    'warning-foreground',
    'border',
    'input',
    'ring',
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
  ],
  spacing: [
    'spacing',
    'space-0',
    'space-0-5',
    'space-1',
    'space-1-5',
    'space-2',
    'space-2-5',
    'space-3',
    'space-4',
    'space-5',
    'space-6',
    'space-8',
    'space-10',
    'space-12',
    'space-16',
  ],
  fontFamily: ['font-sans', 'font-heading', 'font-mono'],
  fontSize: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'],
  fontWeight: ['font-normal', 'font-medium', 'font-semibold', 'font-bold'],
  lineHeight: ['leading-tight', 'leading-normal', 'leading-relaxed'],
  letterSpacing: ['tracking-tight', 'tracking-normal', 'tracking-wide'],
  size: [
    'control-height-xs',
    'control-height-sm',
    'control-height-md',
    'control-height-lg',
    'icon-size-xs',
    'icon-size-sm',
    'icon-size-md',
    'icon-size-lg',
    'target-size-min',
  ],
  border: ['border-width', 'border-width-strong', 'border-style', 'ring-width', 'ring-offset'],
  radius: [
    'radius-sm',
    'radius-md',
    'radius-lg',
    'radius',
    'radius-xl',
    'radius-2xl',
    'radius-3xl',
    'radius-4xl',
    'radius-full',
  ],
  shadow: ['shadow-none', 'shadow-sm', 'shadow-md', 'shadow-lg'],
  opacity: ['opacity-disabled', 'opacity-backdrop'],
} as const;

export type TokenFamily = keyof typeof TOKEN_FAMILIES;
export type RequiredTokenRole = (typeof TOKEN_FAMILIES)[TokenFamily][number];
export type TokenSet = Readonly<Record<RequiredTokenRole, string | number>> & PresentationRecord;

export const REQUIRED_TOKEN_ROLES = Object.freeze(
  Object.values(TOKEN_FAMILIES).flat(),
) as readonly RequiredTokenRole[];

export const STYLING_CATEGORIES = [
  'color',
  'typography',
  'spacing',
  'size',
  'border',
  'shape',
  'elevation',
  'state-opacity',
  'motion',
] as const;

export type StylingCategory = (typeof STYLING_CATEGORIES)[number];
export type StylingCoverageState = 'token-bound' | 'inherited' | 'not-applicable';
export type StylingCoverage = Readonly<Record<StylingCategory, StylingCoverageState>>;

export function missingTokenRoles(tokens: PresentationRecord): RequiredTokenRole[] {
  return REQUIRED_TOKEN_ROLES.filter((role) => !(role in tokens));
}

export function assertCompleteTokenSet(tokens: PresentationRecord): asserts tokens is TokenSet {
  const missing = missingTokenRoles(tokens);
  if (missing.length) throw new Error(`Incomplete token set; missing: ${missing.join(', ')}`);
}

export function assertCompatibleTokenModes(
  modes: Readonly<Record<string, PresentationRecord>>,
): void {
  const entries = Object.entries(modes);
  if (!entries.length) throw new Error('At least one token mode is required');
  for (const [, tokens] of entries) assertCompleteTokenSet(tokens);
  const [firstName, first] = entries[0]!;
  const expected = Object.keys(first).sort();
  for (const [name, tokens] of entries.slice(1)) {
    const actual = Object.keys(tokens).sort();
    if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index])) {
      throw new Error(`Token mode ${name} does not match ${firstName}`);
    }
  }
}

export function assertCompleteStylingCoverage(
  coverage: Partial<Record<StylingCategory, StylingCoverageState>>,
): asserts coverage is StylingCoverage {
  const missing = STYLING_CATEGORIES.filter((category) => !(category in coverage));
  if (missing.length)
    throw new Error(`Incomplete styling coverage; missing: ${missing.join(', ')}`);
}
