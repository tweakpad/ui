import { motionTransition } from '../../motion.js';
import type { PresentationRule } from '../../resolver.js';
import { fillColor, fillShown } from './fill.js';

export const rule = (
  declarations: PresentationRule['declarations'],
  selector?: string,
): PresentationRule => (selector ? { declarations, selector } : { declarations });

// Primitive interaction paint must yield to a composed role's recipe. Otherwise
// Button hover can briefly replace a Menu/Navigation highlight as focus moves.
export const interactive =
  '&:where(:not(:disabled, [aria-disabled="true"]):is(:hover, [data-popup-open]))';
// The variant's fill layer color yields the same way to a composed role's layer color.
const primitive = ':where(&)';

/** Shared paint only. Geometry and interaction policy are not inferred from a variant. */
export function variantPresentation(
  variant: string,
  isInteractive = false,
): readonly PresentationRule[] {
  if (variant === 'subdued')
    return [
      rule({
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        'border-color': 'transparent',
      }),
    ];
  if (variant === 'tinted')
    return [
      rule({
        background: 'color-mix(in oklab, var(--tp-primary) 15%, var(--tp-background))',
        color: 'var(--tp-foreground)',
        'border-color': 'transparent',
      }),
    ];
  if (variant === 'plain')
    return [rule({ background: 'transparent', 'border-color': 'transparent', color: 'inherit' })];
  if (['default', 'secondary', 'destructive'].includes(variant)) {
    const role = variant === 'default' ? 'primary' : variant;
    const rules = [
      rule({
        background: `var(--tp-${role})`,
        color: `var(--tp-${role}-foreground)`,
        'border-color': `var(--tp-${role})`,
      }),
    ];
    if (isInteractive)
      rules.push(
        fillColor(
          `color-mix(in oklab, var(--tp-${role}) ${variant === 'destructive' ? 85 : 80}%, light-dark(var(--tp-foreground), var(--tp-background)))`,
          primitive,
        ),
        fillShown(interactive),
      );
    return rules;
  }
  if (['outline', 'ghost', 'link'].includes(variant)) {
    const rules = [
      rule({
        color: 'var(--tp-foreground)',
        background: variant === 'outline' ? 'var(--tp-background)' : 'transparent',
        'border-color': variant === 'outline' ? 'var(--tp-border)' : 'transparent',
        ...(isInteractive && variant !== 'link'
          ? { transition: motionTransition(['color', 'border-color'], 'fast') }
          : {}),
      }),
    ];
    if (isInteractive && variant === 'link')
      rules.push(
        rule(
          { 'text-decoration': 'underline' },
          '&:not(:disabled, [aria-disabled="true"]):is(:hover, :focus-visible)',
        ),
      );
    else if (isInteractive)
      rules.push(
        fillColor('color-mix(in oklab, var(--tp-input) 50%, transparent)', primitive),
        fillShown(interactive),
      );
    return rules;
  }
  // No invented treatment for unresolved cataloged variants.
  return [];
}

/** The four control steps (CL §5.3 control-height-xs..lg). */
export type ControlStep = 'xs' | 'sm' | 'md' | 'lg';

export interface ControlStepMetrics {
  readonly height: string;
  readonly paddingInline: string;
  /** Inline padding on an edge that holds an icon or mark (Nova `has-data-[icon=…]`). */
  readonly iconEdge: string;
  readonly gap: string;
  readonly fontSize: string;
  readonly icon: string;
  readonly radius: string;
}

/**
 * One size table for every single-line control (Button, Toggle, Select, Native select, field
 * controls, Tabs, Menubar, navigation rows). Values follow Nova (`cn-button-size-*`): heights
 * 24/28/32/36 at the 4px seed, text-xs at xs and text-sm otherwise, and the step's icon extent.
 * Nova's sm `text-[0.8rem]` is a non-token literal; text-sm keeps one control font per step.
 */
export const CONTROL_STEPS: Readonly<Record<ControlStep, ControlStepMetrics>> = {
  xs: {
    height: 'var(--tp-control-height-xs)',
    paddingInline: 'var(--tp-space-2)',
    iconEdge: 'var(--tp-space-1-5)',
    gap: 'var(--tp-space-1)',
    fontSize: 'var(--tp-text-xs)',
    icon: 'var(--tp-icon-size-xs)',
    radius: 'var(--tp-radius-md)',
  },
  sm: {
    height: 'var(--tp-control-height-sm)',
    paddingInline: 'var(--tp-space-2-5)',
    iconEdge: 'var(--tp-space-1-5)',
    gap: 'var(--tp-space-1)',
    fontSize: 'var(--tp-text-sm)',
    icon: 'var(--tp-icon-size-sm)',
    radius: 'var(--tp-radius-md)',
  },
  md: {
    height: 'var(--tp-control-height-md)',
    paddingInline: 'var(--tp-space-2-5)',
    iconEdge: 'var(--tp-space-2)',
    gap: 'var(--tp-space-1-5)',
    fontSize: 'var(--tp-text-sm)',
    icon: 'var(--tp-icon-size-md)',
    radius: 'var(--tp-radius-lg)',
  },
  lg: {
    height: 'var(--tp-control-height-lg)',
    paddingInline: 'var(--tp-space-2-5)',
    iconEdge: 'var(--tp-space-2)',
    gap: 'var(--tp-space-1-5)',
    fontSize: 'var(--tp-text-sm)',
    icon: 'var(--tp-icon-size-md)',
    radius: 'var(--tp-radius-lg)',
  },
};

/** Maps a public size value (`xs`, `sm`, `default`, `lg`, `icon-*`) to its control step. */
export function controlStepOf(size: string): ControlStep {
  const step = size.replace(/^icon-?/, '') || 'md';
  return step === 'xs' || step === 'sm' || step === 'lg' ? step : 'md';
}

/**
 * Block extent, inline padding, gap, type and icon extent of a control step. The icon extent is
 * published as `--_tp-icon-extent`, which slotted Icons and marks inherit as their default size.
 */
export function controlStepDeclarations(
  step: ControlStep,
  options: { square?: boolean } = {},
): PresentationRule['declarations'] {
  const metrics = CONTROL_STEPS[step];
  return {
    'min-block-size': metrics.height,
    'block-size': metrics.height,
    'padding-block': '0',
    'padding-inline': options.square ? '0' : metrics.paddingInline,
    gap: metrics.gap,
    'font-size': metrics.fontSize,
    'border-radius': metrics.radius,
    '--_tp-icon-extent': metrics.icon,
    ...(options.square ? { 'inline-size': metrics.height, 'min-inline-size': metrics.height } : {}),
  };
}

/**
 * A control size key's rules. `iconEdges` are the selectors (relative to the control part) that
 * mark an icon at the inline start and end; that edge takes the step's tighter icon padding.
 */
export function controlSizePresentation(
  size: string,
  iconEdges: { start: string; end: string } = {
    start: "&:has(> [part~='button-leading-mark']:not([hidden]))",
    end: "&:has(> [part~='button-trailing-mark']:not([hidden]))",
  },
): readonly PresentationRule[] {
  const step = controlStepOf(size);
  const square = size.startsWith('icon');
  return [
    rule(controlStepDeclarations(step, { square })),
    ...(square
      ? []
      : [
          rule({ 'padding-inline-start': CONTROL_STEPS[step].iconEdge }, iconEdges.start),
          rule({ 'padding-inline-end': CONTROL_STEPS[step].iconEdge }, iconEdges.end),
        ]),
  ];
}
