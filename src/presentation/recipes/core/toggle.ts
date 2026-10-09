import type { PresentationDictionary } from '../../resolver.js';
import { controlSizePresentation, rule, variantPresentation } from '../shared/variant.js';
import { buttonCoreAppearance } from './button.js';

export const toggleCoreAppearance: PresentationDictionary = {
  toggle: [
    ...buttonCoreAppearance.button!,
    rule(
      { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
      '&[aria-pressed="true"]',
    ),
  ],
  ...Object.fromEntries(
    ['toggle', 'toggle-content'].flatMap((part) => [
      ...['ghost', 'outline'].map((variant) => [
        `${part}-variant-${variant}`,
        part === 'toggle' ? variantPresentation(variant, true) : [],
      ]),
      ...['sm', 'default', 'lg'].map((size) => [
        `${part}-size-${size}`,
        part === 'toggle'
          ? controlSizePresentation(size, {
              start: ':host([data-icon-inline-start]) &',
              end: ':host([data-icon-inline-end]) &',
            })
          : [],
      ]),
    ]),
  ),
};
