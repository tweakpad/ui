import type { PresentationDictionary, PresentationRule } from '../../resolver.js';
import { controlSizePresentation, rule, variantPresentation } from '../shared/variant.js';
import { buttonCoreAppearance } from './button.js';

/** Toggle retains shared control heights with its sourced Nova typography and spacing. */
function toggleSizePresentation(size: string): readonly PresentationRule[] {
  return controlSizePresentation(size).map((entry, index) =>
    index === 0
      ? {
          ...entry,
          declarations: {
            ...entry.declarations,
            padding: '0 calc(var(--tp-spacing) * 2.5)',
            'font-size': `var(--tp-text-${size === 'sm' ? 'xs' : 'sm'})`,
          },
        }
      : entry,
  );
}

export const toggleCoreAppearance: PresentationDictionary = {
  toggle: [
    ...buttonCoreAppearance.button!,
    rule(
      { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
      '&[aria-pressed="true"]',
    ),
  ],
  'toggle-content': [],
  ...Object.fromEntries(
    ['toggle', 'toggle-content'].flatMap((part) => [
      ...['ghost', 'outline'].map((variant) => [
        `${part}-variant-${variant}`,
        part === 'toggle' ? variantPresentation(variant, true) : [],
      ]),
      ...['sm', 'default', 'lg'].map((size) => [
        `${part}-size-${size}`,
        part === 'toggle' ? toggleSizePresentation(size) : [],
      ]),
    ]),
  ),
};
