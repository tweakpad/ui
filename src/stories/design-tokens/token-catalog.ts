import type { RequiredTokenRole, TokenFamily } from '../../presentation/tokens.js';

/** How a role's value is read from the page. */
export type ValueKind = 'color' | 'length' | 'raw' | 'shadow' | 'time';

/** How a role is drawn in its preview cell. */
export type PreviewKind =
  | 'fill'
  | 'foreground'
  | 'line'
  | 'ring'
  | 'syntax'
  | 'bar'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'leading'
  | 'tracking'
  | 'box-height'
  | 'icon'
  | 'target'
  | 'border-width'
  | 'border-style'
  | 'ring-width'
  | 'ring-offset'
  | 'radius'
  | 'shadow'
  | 'opacity'
  | 'duration'
  | 'easing';

export interface FamilyInfo {
  readonly title: string;
  readonly description: string;
  readonly value: ValueKind;
  readonly preview: PreviewKind;
}

export const FAMILIES = {
  color: {
    title: 'Color',
    description:
      'Semantic surfaces, each paired with the foreground placed on it, plus lines, focus and chart series. Foreground rows give their contrast on the paired surface, flagged under 4.5:1.',
    value: 'color',
    preview: 'fill',
  },
  syntax: {
    title: 'Syntax color',
    description: 'One color per lexical scope of highlighted code.',
    value: 'color',
    preview: 'syntax',
  },
  spacing: {
    title: 'Spacing',
    description:
      'Padding, gaps and margins. Every step is the spacing seed times its number; a trailing -5 is the half step.',
    value: 'length',
    preview: 'bar',
  },
  fontFamily: {
    title: 'Font family',
    description: 'Typefaces for interface text, headings and code.',
    value: 'raw',
    preview: 'font-family',
  },
  fontSize: {
    title: 'Font size',
    description: 'Type scale, from the smallest text to page titles.',
    value: 'length',
    preview: 'font-size',
  },
  fontWeight: {
    title: 'Font weight',
    description: 'Weights for body text, labels, titles and strong emphasis.',
    value: 'raw',
    preview: 'font-weight',
  },
  lineHeight: {
    title: 'Line height',
    description: 'Line heights as multiples of the font size.',
    value: 'raw',
    preview: 'leading',
  },
  letterSpacing: {
    title: 'Letter spacing',
    description: 'Letter spacing relative to the font size.',
    value: 'raw',
    preview: 'tracking',
  },
  size: {
    title: 'Size',
    description:
      'Block size of single-line controls, icon extents and the minimum pointer target. Control and icon sizes derive from the spacing seed.',
    value: 'length',
    preview: 'box-height',
  },
  border: {
    title: 'Border and focus',
    description: 'Line widths and style for borders, and the focus ring geometry.',
    value: 'length',
    preview: 'border-width',
  },
  radius: {
    title: 'Radius',
    description:
      'Corner rounding. Every step derives from the radius seed, so changing it reshapes the whole set.',
    value: 'length',
    preview: 'radius',
  },
  shadow: {
    title: 'Shadow',
    description: 'Elevation, from flat to the highest overlay.',
    value: 'shadow',
    preview: 'shadow',
  },
  opacity: {
    title: 'Opacity',
    description: 'State opacities for disabled content and modal backdrops.',
    value: 'raw',
    preview: 'opacity',
  },
  motion: {
    title: 'Motion',
    description:
      'Durations and easing curves of default motion. Durations are multiplied by the motion scale, so reduced motion makes them instant.',
    value: 'time',
    preview: 'duration',
  },
} as const satisfies Record<TokenFamily, FamilyInfo>;

/** Each foreground role and the surface it is placed on. */
export const PAIRED_SURFACE: Partial<Record<RequiredTokenRole, RequiredTokenRole>> = {
  foreground: 'background',
  'card-foreground': 'card',
  'popover-foreground': 'popover',
  'primary-foreground': 'primary',
  'secondary-foreground': 'secondary',
  'muted-foreground': 'muted',
  'accent-foreground': 'accent',
  'destructive-foreground': 'destructive',
  'success-foreground': 'success',
  'warning-foreground': 'warning',
};

const PREVIEW_OVERRIDES: Partial<Record<RequiredTokenRole, PreviewKind>> = {
  border: 'line',
  input: 'line',
  ring: 'ring',
  'icon-size-xs': 'icon',
  'icon-size-sm': 'icon',
  'icon-size-md': 'icon',
  'icon-size-lg': 'icon',
  'target-size-min': 'target',
  'border-style': 'border-style',
  'ring-width': 'ring-width',
  'ring-offset': 'ring-offset',
  'easing-standard': 'easing',
  'easing-enter': 'easing',
  'easing-exit': 'easing',
};

const VALUE_OVERRIDES: Partial<Record<RequiredTokenRole, ValueKind>> = {
  'border-style': 'raw',
  'easing-standard': 'raw',
  'easing-enter': 'raw',
  'easing-exit': 'raw',
};

export const previewKind = (role: RequiredTokenRole, family: TokenFamily): PreviewKind =>
  PAIRED_SURFACE[role] ? 'foreground' : (PREVIEW_OVERRIDES[role] ?? FAMILIES[family].preview);

export const valueKind = (role: RequiredTokenRole, family: TokenFamily): ValueKind =>
  VALUE_OVERRIDES[role] ?? FAMILIES[family].value;

/** A short code sample per syntax scope. */
export const SYNTAX_SAMPLES: Partial<Record<RequiredTokenRole, string>> = {
  'syntax-comment': '// note',
  'syntax-keyword': 'const',
  'syntax-string': '"label"',
  'syntax-number': '42',
  'syntax-function': 'render()',
  'syntax-type': 'Panel',
  'syntax-constant': 'MAX_ROWS',
  'syntax-variable': 'count',
  'syntax-property': '.width',
  'syntax-tag': '<section>',
  'syntax-attribute': 'hidden=',
  'syntax-operator': '=>',
  'syntax-inserted': '+ added',
  'syntax-deleted': '- removed',
};

export const DESCRIPTIONS = {
  background: 'Base surface of the interface.',
  foreground: 'Text and icons on the base surface.',
  card: 'Contained surface in ordinary flow, such as cards and panels.',
  'card-foreground': 'Text and icons on card surfaces.',
  popover: 'Floating or layered surface, such as popovers, menus and dialogs.',
  'popover-foreground': 'Text and icons on floating surfaces.',
  primary: 'Primary action or selected emphasis.',
  'primary-foreground': 'Text and icons on primary fills.',
  secondary: 'Secondary action or emphasis.',
  'secondary-foreground': 'Text and icons on secondary fills.',
  muted: 'Low-emphasis surface, such as tracks, wells and placeholders.',
  'muted-foreground': 'Low-emphasis text and icons: descriptions, hints and captions.',
  accent: 'Transient hover, active or highlighted surface.',
  'accent-foreground': 'Text and icons on accent surfaces.',
  destructive: 'Destructive action or error surface.',
  'destructive-foreground': 'Text and icons on destructive fills.',
  success: 'Successful or positive status surface.',
  'success-foreground': 'Text and icons on success fills.',
  warning: 'Cautionary status surface.',
  'warning-foreground': 'Text and icons on warning fills.',
  border: 'Default separator and enclosing line.',
  input: 'Boundary or fill of editable controls.',
  ring: 'Focus indication.',
  'chart-1': 'First categorical data series.',
  'chart-2': 'Second categorical data series.',
  'chart-3': 'Third categorical data series.',
  'chart-4': 'Fourth categorical data series.',
  'chart-5': 'Fifth categorical data series.',
  'syntax-comment': 'Comments.',
  'syntax-keyword': 'Keywords and storage modifiers.',
  'syntax-string': 'String and template literals.',
  'syntax-number': 'Numeric literals.',
  'syntax-function': 'Function and method names.',
  'syntax-type': 'Type, class and interface names.',
  'syntax-constant': 'Named and literal constants.',
  'syntax-variable': 'Variables and parameters.',
  'syntax-property': 'Properties, keys and member names.',
  'syntax-tag': 'Markup element names.',
  'syntax-attribute': 'Markup attribute names.',
  'syntax-operator': 'Operators.',
  'syntax-inserted': 'Added lines in a diff.',
  'syntax-deleted': 'Removed lines in a diff.',
  spacing:
    'Seed of the spacing scale. Every space step, control height and icon size multiplies it.',
  'space-0': 'No space.',
  'space-0-5': 'Half a step.',
  'space-1': 'One step.',
  'space-1-5': 'One and a half steps.',
  'space-2': 'Two steps.',
  'space-2-5': 'Two and a half steps.',
  'space-3': 'Three steps.',
  'space-4': 'Four steps.',
  'space-5': 'Five steps.',
  'space-6': 'Six steps.',
  'space-8': 'Eight steps.',
  'space-10': 'Ten steps.',
  'space-12': 'Twelve steps.',
  'space-16': 'Sixteen steps.',
  'font-sans': 'Interface text; the default for every component.',
  'font-heading': 'Headings and titles. Follows the sans family unless a theme sets it.',
  'font-mono': 'Code, keyboard input and machine values such as codes and readouts.',
  'text-xs': 'Smallest text: captions, badges and dense metadata.',
  'text-sm': 'Small text: controls, tables and secondary copy.',
  'text-base': 'Body text; the default size.',
  'text-lg': 'Large text and small headings.',
  'text-xl': 'Section headings.',
  'text-2xl': 'Largest text: page titles and figures.',
  'font-normal': 'Body text; the default weight.',
  'font-medium': 'Labels, controls and light emphasis.',
  'font-semibold': 'Titles and headings.',
  'font-bold': 'Strong emphasis.',
  'leading-tight': 'Compact lines: headings, labels and single-line controls.',
  'leading-normal': 'Body text; the default line height.',
  'leading-relaxed': 'Open lines for longer reading.',
  'tracking-tight': 'Tighter letters for large headings.',
  'tracking-normal': 'Neutral letter spacing; the default.',
  'tracking-wide': 'Wider letters for small or uppercase labels.',
  'control-height-xs': 'Block size of extra-small single-line controls.',
  'control-height-sm': 'Block size of small single-line controls.',
  'control-height-md': 'Block size of default single-line controls.',
  'control-height-lg': 'Block size of large single-line controls.',
  'icon-size-xs': 'Extra-small icons, such as icons inside badges.',
  'icon-size-sm': 'Small icons.',
  'icon-size-md': 'Default icon extent.',
  'icon-size-lg': 'Large icons.',
  'target-size-min':
    'Minimum pointer target. Smaller controls extend their hit area to it on touch; it is never a visual size.',
  'border-width': 'Default width of borders and separators.',
  'border-width-strong': 'Heavier line for emphasis, at least the default width.',
  'border-style': 'Line style of borders.',
  'ring-width': 'Width of the focus ring.',
  'ring-offset': 'Gap between an element and its focus ring.',
  'radius-sm': 'Smallest corner, for small inner elements.',
  'radius-md': 'Compact controls and items inside surfaces.',
  'radius-lg': 'Default corner of controls and surfaces; equal to the seed.',
  radius: 'Seed of the radius scale. Every other step multiplies it.',
  'radius-xl': 'Larger surfaces such as dialogs and code blocks.',
  'radius-2xl': 'Large rounded surfaces such as toasts.',
  'radius-3xl': 'Very large rounded surfaces.',
  'radius-4xl': 'Largest derived corner.',
  'radius-full': 'Circles and pills.',
  'shadow-none': 'No elevation.',
  'shadow-sm': 'Slight lift for raised controls and selected tabs.',
  'shadow-md': 'Floating surfaces such as popovers and select lists.',
  'shadow-lg': 'Highest lift for menus and large overlays.',
  'opacity-disabled': 'Disabled controls and content.',
  'opacity-backdrop': 'Strength of the modal backdrop behind dialogs and drawers.',
  'duration-fast': 'Feedback: color, fill, track and thumb changes, and dialog fades.',
  'duration-normal': 'Anchored surfaces, panels, layout changes and viewport moves.',
  'duration-slow': 'Reveals and hover zoom.',
  'easing-standard': 'State changes and movement within the page.',
  'easing-enter': 'Arrivals: opening surfaces, reveals and items settling into place.',
  'easing-exit': 'Departures: closing surfaces.',
} satisfies Record<RequiredTokenRole, string>;

/** The first authored value of every `--tp-*` declaration in a stylesheet, by role name. */
export function authoredTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, name, value] of source.matchAll(/(?<![\w-])--tp-([\w-]+)\s*:\s*([^;{}]+);/g)) {
    if (!tokens.has(name!)) tokens.set(name!, value!.trim().replace(/\s+/g, ' '));
  }
  return tokens;
}

/** An sRGB color as 0–255 channels and 0–255 alpha. */
export type Rgba = readonly [number, number, number, number];

const channel = (value: number) => value.toString(16).padStart(2, '0');

export function hex([red, green, blue, alpha]: Rgba): string {
  return `#${channel(red)}${channel(green)}${channel(blue)}${alpha < 255 ? channel(alpha) : ''}`;
}

const linear = (value: number) => {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const luminance = ([red, green, blue]: Rgba) =>
  0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);

/** Contrast ratio of a foreground over an opaque surface; a translucent foreground is composited first. */
export function contrastRatio(foreground: Rgba, surface: Rgba): number {
  const alpha = foreground[3] / 255;
  const mixed: Rgba = [
    foreground[0] * alpha + surface[0] * (1 - alpha),
    foreground[1] * alpha + surface[1] * (1 - alpha),
    foreground[2] * alpha + surface[2] * (1 - alpha),
    255,
  ];
  const [lighter, darker] = [luminance(mixed), luminance(surface)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** The minimum contrast for text on its surface. */
export const MINIMUM_CONTRAST = 4.5;

const KEYWORD_CURVES: Readonly<Record<string, readonly [number, number, number, number]>> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** Control points of a `cubic-bezier()` or keyword easing; null for other easing functions. */
export function bezierPoints(easing: string): readonly [number, number, number, number] | null {
  const value = easing.trim();
  if (KEYWORD_CURVES[value]) return KEYWORD_CURVES[value];
  const match = /^cubic-bezier\(([^)]*)\)$/.exec(value);
  const points = match?.[1]!.split(',').map((part) => Number.parseFloat(part));
  return points?.length === 4 && points.every(Number.isFinite)
    ? (points as unknown as readonly [number, number, number, number])
    : null;
}
