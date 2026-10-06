import { motionTransition } from '../../motion.js';
import type { PresentationRule } from '../../resolver.js';

export const rule = (
  declarations: PresentationRule['declarations'],
  selector?: string,
): PresentationRule => (selector ? { declarations, selector } : { declarations });

// Primitive interaction paint must yield to a composed role's recipe. Otherwise
// Button hover can briefly replace a Menu/Navigation highlight as focus moves.
export const interactive =
  '&:where(:not(:disabled, [aria-disabled="true"]):is(:hover, [data-popup-open]))';

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
        rule(
          {
            'background-color': `color-mix(in oklab, var(--tp-${role}) ${variant === 'destructive' ? 85 : 80}%, light-dark(var(--tp-foreground), var(--tp-background)))`,
          },
          interactive,
        ),
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
          ? { transition: motionTransition(['color', 'background-color', 'border-color'], 'fast') }
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
        rule(
          {
            'background-color': 'color-mix(in oklab, var(--tp-input) 50%, var(--tp-background))',
          },
          interactive,
        ),
      );
    return rules;
  }
  // No invented treatment for unresolved cataloged variants.
  return [];
}

export function controlSizePresentation(size: string): readonly PresentationRule[] {
  const step = size.replace('icon-', '').replace(/^icon$/, 'default');
  const height = step === 'xs' || step === 'sm' ? 'sm' : step === 'lg' ? 'lg' : 'md';
  return [
    rule({
      'min-block-size': `var(--tp-control-height-${height})`,
      'block-size': `var(--tp-control-height-${height})`,
      padding:
        step === 'xs'
          ? 'var(--tp-space-1) var(--tp-space-2)'
          : step === 'sm'
            ? 'var(--tp-space-1) var(--tp-space-3)'
            : step === 'lg'
              ? 'var(--tp-space-3) var(--tp-space-4)'
              : 'var(--tp-space-2) var(--tp-space-3)',
      'font-size': `var(--tp-text-${step === 'default' ? 'base' : step})`,
      ...(size.startsWith('icon')
        ? { 'inline-size': `var(--tp-control-height-${height})`, 'padding-inline': '0' }
        : {}),
    }),
    rule(
      { 'block-size': 'auto', 'min-block-size': 'auto', padding: '0' },
      ':host([variant="link"]) &',
    ),
  ];
}
