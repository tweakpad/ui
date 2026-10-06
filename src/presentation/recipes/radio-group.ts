import type { PresentationDictionary } from '../resolver.js';
import { radioItemRules } from './shared/selection-control.js';

export const radioGroupAppearance: PresentationDictionary = {
  // Radio orientation changes geometry in the element; indicator paint is invariant.
  ...Object.fromEntries(
    ['radio-group', 'radio-group-item', 'radio-group-indicator'].flatMap((part) =>
      ['horizontal', 'vertical'].map((orientation) => [part + '-orientation-' + orientation, []]),
    ),
  ),
  'radio-group': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'radio-group-item': radioItemRules,
  'radio-group-indicator': [
    { declarations: { background: 'currentColor', 'border-radius': 'var(--tp-radius-full)' } },
  ],
};
