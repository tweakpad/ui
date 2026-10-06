import type { PresentationDictionary } from '../resolver.js';
import {
  disabledBackground,
  fieldBoundary,
  fieldFocus,
  fieldInvalid,
} from './shared/text-control.js';

export const oneTimeCodeAppearance: PresentationDictionary = {
  'one-time-code-field': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'one-time-code-field-group': [{ declarations: { 'border-radius': 'var(--tp-radius-lg)' } }],
  'one-time-code-field-separator': [{ declarations: { color: 'var(--tp-muted-foreground)' } }],
  'one-time-code-field-slot': [
    {
      declarations: {
        ...fieldBoundary,
        padding: '0',
        'min-height': '0',
        // Nova slots are field-height squares (size-8) with the shared field typography.
        'inline-size': 'var(--tp-control-height-md)',
        'block-size': 'var(--tp-control-height-md)',
        'border-inline-start-width': '0',
        'border-radius': '0',
      },
    },
    {
      selector: '&:first-child',
      declarations: {
        'border-inline-start-width': 'var(--tp-border-width)',
        'border-start-start-radius': 'var(--tp-radius-lg)',
        'border-end-start-radius': 'var(--tp-radius-lg)',
      },
    },
    {
      selector: '&:last-child',
      declarations: {
        'border-start-end-radius': 'var(--tp-radius-lg)',
        'border-end-end-radius': 'var(--tp-radius-lg)',
      },
    },
    { selector: '&[data-active]', declarations: fieldFocus },
    { selector: '&[data-selected]', declarations: { background: 'var(--tp-muted)' } },
    { selector: '&[data-invalid]', declarations: fieldInvalid },
    {
      selector: '&[data-disabled]',
      declarations: { background: disabledBackground, opacity: 'var(--tp-opacity-disabled)' },
    },
    {
      selector: '&[data-caret]::after',
      declarations: {
        content: "''",
        position: 'absolute',
        'inline-size': 'var(--tp-border-width)',
        'block-size': '1em',
        background: 'var(--tp-foreground)',
      },
    },
  ],
};
