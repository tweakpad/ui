import type { PresentationRule } from '../../resolver.js';

// shadcn base/style-nova cn-input and cn-textarea share their boundary paint.
// The library control-height token supplies the locally governed default extent.
export const fieldBoundary = {
  'min-height': 'var(--tp-control-height-md)',
  padding: 'var(--tp-space-1) var(--tp-space-2-5)',
  border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
  'border-radius': 'var(--tp-radius-lg)',
  color: 'var(--tp-foreground)',
  background: 'light-dark(transparent, color-mix(in oklab, var(--tp-input) 30%, transparent))',
  font: 'inherit',
  'font-size': 'var(--tp-text-sm)',
  'line-height': 'var(--tp-leading-normal)',
};
export const fieldFocus = {
  'border-color': 'var(--tp-ring)',
  outline:
    'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
  'outline-offset': '0',
};
export const fieldInvalid = {
  'border-color': 'var(--tp-destructive)',
  outline:
    'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-destructive) 20%, transparent)',
  'outline-offset': '0',
};
export const disabledBackground = 'color-mix(in oklab, var(--tp-input) 50%, transparent)';
export const control: readonly PresentationRule[] = [
  { declarations: fieldBoundary },
  { selector: '&::placeholder', declarations: { color: 'var(--tp-muted-foreground)' } },
  { selector: '&:focus-visible', declarations: fieldFocus },
  { selector: '&[aria-invalid="true"]', declarations: fieldInvalid },
  {
    selector: '&:disabled',
    declarations: { background: disabledBackground, cursor: 'not-allowed' },
  },
];

/** Input paint, reused by Select, Native select and Questionnaire editors. */
export const inputRules: readonly PresentationRule[] = [
  ...control,
  {
    selector: '&::file-selector-button',
    declarations: {
      display: 'inline-flex',
      border: '0',
      background: 'transparent',
      color: 'var(--tp-foreground)',
      'font-size': 'var(--tp-text-sm)',
      'font-weight': 'var(--tp-font-medium)',
    },
  },
];

export const textAreaRules: readonly PresentationRule[] = [
  ...control,
  // Nova cn-textarea: field-sizing-content min-h-16 py-2; the field grows with its text.
  {
    declarations: {
      'field-sizing': 'content',
      'min-block-size': 'var(--tp-space-16)',
      'padding-block': 'var(--tp-space-2)',
    },
  },
];
