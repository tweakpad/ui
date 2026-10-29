import type { PresentationRule } from '../../resolver.js';
import { invalidFocusRing } from './focus.js';

// Input and Text area share their boundary paint.
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

/**
 * A native editor joined into a surrounding boundary (Input group, inline Input): the boundary
 * owns the border, rings and fill, so the editor paints none of them.
 */
export const joinedEditor = {
  border: '0',
  'border-radius': '0',
  outline: '0',
  'box-shadow': 'none',
  background: 'transparent',
  'font-size': 'var(--tp-text-sm)',
  'line-height': 'var(--tp-leading-normal)',
};
/** A joined editor's block size: the control height inside its boundary's borders. */
export const joinedEditorMinHeight = 'calc(var(--tp-control-height-md) - var(--tp-border-width) * 2)';
/** Joined-editor rules win over each standalone editor state, without !important. */
export const joinedEditorSelector =
  '&[data-tp-presentation-part], &[data-tp-presentation-part]:is(:focus-visible, :disabled, [aria-invalid="true"])';
export const control: readonly PresentationRule[] = [
  { declarations: fieldBoundary },
  { selector: '&::placeholder', declarations: { color: 'var(--tp-muted-foreground)' } },
  // A mono control presents code-like values (expressions, paths, numeric parameters).
  { selector: '&[data-mono]', declarations: { 'font-family': 'var(--tp-font-mono)' } },
  { selector: '&:focus-visible', declarations: fieldFocus },
  { selector: '&[aria-invalid="true"]', declarations: fieldInvalid },
  // Equal specificity: the later invalid paint would tint the focus ring away.
  { selector: '&[aria-invalid="true"]:focus-visible', declarations: invalidFocusRing },
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
  // The field grows with its text (`field-sizing: content`).
  {
    declarations: {
      'field-sizing': 'content',
      'min-block-size': 'var(--tp-space-16)',
      'padding-block': 'var(--tp-space-2)',
    },
  },
];
