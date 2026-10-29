import type { PresentationDictionary } from '../resolver.js';
import {
  inlineControlLabel,
  inlineControlRings,
  inlineControlSurface,
} from './shared/inline-control.js';
import { checkboxRules } from './shared/selection-control.js';

export const checkboxAppearance: PresentationDictionary = {
  checkbox: checkboxRules,
  // Inline variant: the control is the shared inline row, its label at the start inset like a
  // Select trigger's text and its box at the end inset like the trigger's chevron. The row
  // carries the focus and validity rings.
  'checkbox-variant-inline': [
    {
      declarations: {
        ...inlineControlSurface,
        ...inlineControlLabel,
        'min-block-size': 'var(--tp-control-height-md)',
        gap: 'var(--tp-space-2)',
        'padding-inline-start': 'var(--tp-space-2-5)',
        'padding-inline-end': 'var(--tp-space-3)',
      },
    },
    { selector: '&:focus-visible > .box', declarations: { outline: 'none' } },
    ...inlineControlRings('&', ':focus-visible'),
  ],
  'checkbox-indicator': [{ declarations: { color: 'inherit' } }],
};
