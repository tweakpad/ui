import type { PresentationDictionary, PresentationRule } from '../resolver.js';

// shadcn base/style-nova cn-input and cn-textarea share their boundary paint.
// The library control-height token supplies the locally governed default extent.
const fieldBoundary = {
  'min-height': 'var(--tp-control-height-md)',
  padding: 'var(--tp-space-1) calc(var(--tp-spacing) * 2.5)',
  border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
  'border-radius': 'var(--tp-radius-lg)',
  color: 'var(--tp-foreground)',
  background: 'light-dark(transparent, color-mix(in oklab, var(--tp-input) 30%, transparent))',
  font: 'inherit',
  'font-size': 'var(--tp-text-sm)',
  'line-height': 'var(--tp-leading-normal)',
};
const fieldFocus = {
  'border-color': 'var(--tp-ring)',
  outline:
    'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
  'outline-offset': '0',
};
const fieldInvalid = {
  'border-color': 'var(--tp-destructive)',
  outline:
    'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-destructive) 20%, transparent)',
  'outline-offset': '0',
};
const disabledBackground = 'color-mix(in oklab, var(--tp-input) 50%, transparent)';
const control: readonly PresentationRule[] = [
  { declarations: fieldBoundary },
  { selector: '&::placeholder', declarations: { color: 'var(--tp-muted-foreground)' } },
  { selector: '&:focus-visible', declarations: fieldFocus },
  { selector: '&[aria-invalid="true"]', declarations: fieldInvalid },
  {
    selector: '&:disabled',
    declarations: { background: disabledBackground, cursor: 'not-allowed' },
  },
];
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
  ],
  'input-group-text': [
    { declarations: { color: 'var(--tp-muted-foreground)', 'font-size': 'var(--tp-text-sm)' } },
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
      },
    },
  ],
};
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
        'inline-size': 'var(--tp-target-size-min)',
        'block-size': 'var(--tp-target-size-min)',
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
export const textControlAppearance: PresentationDictionary = {
  input: [
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
  ],
  'text-area': [
    ...control,
    { declarations: { 'min-block-size': 'calc(var(--tp-control-height-md) * 2)' } },
  ],
};

export const fieldAppearance: PresentationDictionary = {
  field: [{ declarations: { padding: '0', border: '0', gap: 'var(--tp-space-4)' } }],
  'field-legend': [
    {
      declarations: {
        'margin-block-end': 'calc(var(--tp-spacing) * 1.5)',
        'font-weight': 'var(--tp-font-medium)',
        'font-size': 'var(--tp-text-base)',
      },
    },
    { selector: '&[data-scale="field"]', declarations: { 'font-size': 'var(--tp-text-sm)' } },
  ],
  'field-field-group': [{ declarations: { gap: 'var(--tp-space-5)' } }],
  'field-field': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'field-control-region': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'field-label': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-snug)',
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'field-title': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-snug)',
      },
    },
  ],
  'field-description': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
        'overflow-wrap': 'anywhere',
      },
    },
  ],
  'field-error': [
    {
      declarations: {
        color: 'var(--tp-destructive)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-normal)',
        'overflow-wrap': 'anywhere',
      },
    },
    {
      selector: '& ul',
      declarations: { margin: '0', 'padding-inline-start': 'var(--tp-space-4)' },
    },
  ],
  'field-separator': [
    {
      declarations: {
        'margin-block': 'calc(var(--tp-space-2) * -1)',
        height: 'var(--tp-space-5)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: '& .separator-content',
      declarations: {
        'padding-inline': 'var(--tp-space-2)',
        background: 'var(--tp-background)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  ...Object.fromEntries(
    [
      'field',
      'field-legend',
      'field-field-group',
      'field-field',
      'field-label',
      'field-title',
      'field-control-region',
      'field-description',
      'field-error',
      'field-separator',
    ].flatMap((part) =>
      ['vertical', 'horizontal', 'responsive'].map((orientation) => [
        `${part}-orientation-${orientation}`,
        [],
      ]),
    ),
  ),
};
