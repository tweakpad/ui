import type { PresentationDictionary, PresentationRule } from '../../resolver.js';
import { controlFill, fieldEdge, variantEdgeProperty } from '../shared/edges.js';
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

/**
 * The outline variant takes the control fill and edge, so an outline control sits with Input,
 * Select and date-picker triggers instead of the page color.
 */
export const outlineFieldPaint: PresentationRule = rule({
  background: controlFill,
  'border-color': fieldEdge.color,
  [variantEdgeProperty]: fieldEdge.color,
});

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
      part === 'button'
        ? // The primary action keeps its weight: the inverted primary tint.
          variantPresentation(variant, true, { emphasis: 'inverted' })
        : [];
  if (part === 'button')
    button['button-variant-outline'] = [...button['button-variant-outline']!, outlineFieldPaint];
  for (const size of buttonSizes)
    button[`${part}-size-${size}`] = part === 'button' ? controlSizePresentation(size) : [];
}

/** Button paint, variants and sizes; Toggle builds on the base rule. */
export const buttonCoreAppearance: PresentationDictionary = button;
