import type { PresentationDictionary } from '../resolver.js';
import {
  disabledBackground,
  fieldBoundary,
  fieldFocus,
  fieldInvalid,
} from './shared/text-control.js';

// A joined editor uses the same field boundary, transferred to its group root.
export const inputGroupAppearance: PresentationDictionary = {
  'input-group': [
    { declarations: { ...fieldBoundary, padding: '0', 'min-inline-size': '0' } },
    { selector: '&:focus-within', declarations: fieldFocus },
    { selector: '&[data-invalid]', declarations: fieldInvalid },
    {
      selector: '&[data-disabled]',
      declarations: { background: disabledBackground },
    },
  ],
  'input-group-addon': [
    {
      declarations: {
        padding: 'calc(var(--tp-spacing) * 1.5) var(--tp-space-2)',
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
    {
      selector: '&[data-position="inline-start"]',
      declarations: { 'padding-inline-end': '0' },
    },
    {
      selector: '&[data-position="inline-end"]',
      declarations: { 'padding-inline-start': '0' },
    },
  ],
  'input-group-text': [
    { declarations: { color: 'var(--tp-muted-foreground)', 'font-size': 'var(--tp-text-sm)' } },
    {
      selector:
        '&:is([slot="prefix"], [slot="suffix"], [slot="inline-start"], [slot="inline-end"])',
      declarations: { 'min-inline-size': 'var(--tp-icon-size-md)' },
    },
  ],
  'input-group-control': [
    {
      selector: '&:is(input)',
      declarations: {
        'min-height': 'calc(var(--tp-control-height-md) - var(--tp-border-width) * 2)',
      },
    },
    {
      // Composition must win over each standalone editor state, without !important.
      selector:
        '&[data-tp-presentation-part], &[data-tp-presentation-part]:is(:focus-visible, :disabled, [aria-invalid="true"])',
      declarations: {
        border: '0',
        'border-radius': '0',
        outline: '0',
        'box-shadow': 'none',
        background: 'transparent',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
      },
    },
  ],
};
