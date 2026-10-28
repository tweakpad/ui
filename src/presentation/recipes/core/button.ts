import type { PresentationDictionary, PresentationRule } from '../../resolver.js';
import { controlSizePresentation, rule, variantPresentation } from '../shared/variant.js';

/**
 * The Button size set: the control steps and their square `icon-*` steps. Toggle and Toggle group
 * offer the same set.
 */
export const buttonSizes = [
  'xs',
  'sm',
  'default',
  'lg',
  'icon-xs',
  'icon-sm',
  'icon',
  'icon-lg',
] as const;

const button: Record<string, readonly PresentationRule[]> = {
  button: [
    rule({
      appearance: 'none',
      border: 'var(--tp-border-width) var(--tp-border-style) transparent',
      'border-radius': 'var(--tp-radius-lg)',
      font: 'inherit',
      'font-weight': 'var(--tp-font-medium)',
      'text-decoration': 'none',
    }),
  ],
};
for (const part of Object.keys(button)) {
  for (const variant of ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'])
    button[`${part}-variant-${variant}`] =
      part === 'button' ? variantPresentation(variant, true) : [];
  // In dark schemes the outline variant takes the field fill and border, so an outline Button sits
  // with Input, Select and date-picker triggers instead of the page color.
  if (part === 'button')
    button['button-variant-outline'] = [
      ...button['button-variant-outline']!,
      rule({
        background:
          'light-dark(var(--tp-background), color-mix(in oklab, var(--tp-input) 30%, transparent))',
        'border-color': 'light-dark(var(--tp-border), var(--tp-input))',
      }),
    ];
  for (const size of buttonSizes)
    button[`${part}-size-${size}`] = part === 'button' ? controlSizePresentation(size) : [];
}

/** Button paint, variants and sizes; Toggle builds on the base rule. */
export const buttonCoreAppearance: PresentationDictionary = button;
