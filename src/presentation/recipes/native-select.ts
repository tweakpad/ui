import type { PresentationDictionary } from '../resolver.js';
import { inputRules } from './shared/text-control.js';
import { controlStepDeclarations } from './shared/variant.js';
/** Nova native-select layers its native extents over the shared Input boundary. */
export const nativeSelectAppearance: PresentationDictionary = {
  // The host already applies the disabled opacity and cursor.
  'native-select': [],
  'native-select-control': [
    ...inputRules,
    {
      declarations: {
        // Nova cn-native-select: the md control step with py-1 pl-2.5 pr-8.
        ...controlStepDeclarations('md'),
        'padding-inline-start': 'var(--tp-space-2-5)',
        'padding-inline-end': 'var(--tp-space-8)',
        'padding-block': 'var(--tp-space-1)',
        // Native text alignment remains native while extent follows shared control sizes.
        'line-height': 'normal',
      },
    },
    {
      selector: '&[data-size="sm"]',
      declarations: {
        // Nova data-[size=sm]: h-7 py-0.5 rounded-[min(var(--radius-md),10px)].
        ...controlStepDeclarations('sm'),
        'padding-inline-start': 'var(--tp-space-2-5)',
        'padding-inline-end': 'var(--tp-space-8)',
        'padding-block': 'var(--tp-space-0-5)',
      },
    },
    {
      selector: '&:hover:not(:disabled)',
      declarations: {
        background:
          'light-dark(transparent, color-mix(in oklab, var(--tp-input) 50%, transparent))',
      },
    },
    {
      selector: '&[aria-invalid="true"]',
      declarations: {
        'border-color':
          'light-dark(var(--tp-destructive), color-mix(in oklab, var(--tp-destructive) 50%, transparent))',
        'outline-color':
          'light-dark(color-mix(in oklab, var(--tp-destructive) 20%, transparent), color-mix(in oklab, var(--tp-destructive) 40%, transparent))',
      },
    },
    {
      selector: '&[multiple]',
      declarations: {
        height: 'auto',
        'block-size': 'auto',
        'padding-inline-end': 'var(--tp-space-2-5)',
      },
    },
    {
      // Native HTML has no readonly select paint. The Foundation editing state
      // uses existing neutral roles while retaining enabled, submittable text.
      selector: '&[data-readonly]:not(:disabled)',
      declarations: {
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        cursor: 'default',
      },
    },
  ],
  'native-select-option': [{ declarations: { background: 'Canvas', color: 'CanvasText' } }],
  'native-select-option-group': [{ declarations: { background: 'Canvas', color: 'CanvasText' } }],
  'native-select-indicator': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'inline-size': 'var(--tp-icon-size-md)',
        'block-size': 'var(--tp-icon-size-md)',
      },
    },
  ],
};
