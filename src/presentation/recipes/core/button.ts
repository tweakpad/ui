import type { PresentationDictionary, PresentationRule } from '../../resolver.js';
import { controlSizePresentation, rule, variantPresentation } from '../shared/variant.js';

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
  'button-label': [],
  'button-leading-mark': [],
  'button-trailing-mark': [],
};
for (const part of Object.keys(button)) {
  for (const variant of ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'])
    button[`${part}-variant-${variant}`] =
      part === 'button' ? variantPresentation(variant, true) : [];
  // Nova cn-button-variant-outline: dark:bg-input/30 dark:border-input, the field fill, so an
  // outline Button sits with Input, Select and date-picker triggers instead of the page color.
  if (part === 'button')
    button['button-variant-outline'] = [
      ...button['button-variant-outline']!,
      rule({
        background:
          'light-dark(var(--tp-background), color-mix(in oklab, var(--tp-input) 30%, transparent))',
        'border-color': 'light-dark(var(--tp-border), var(--tp-input))',
      }),
    ];
  for (const size of ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'])
    button[`${part}-size-${size}`] = part === 'button' ? controlSizePresentation(size) : [];
}

/** Button paint, variants and sizes; Toggle builds on the base rule. */
export const buttonCoreAppearance: PresentationDictionary = button;
