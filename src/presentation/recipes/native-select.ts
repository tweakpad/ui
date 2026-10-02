import type { PresentationDictionary } from '../resolver.js';
import { textControlAppearance } from './text-controls.js';
/** Nova native-select layers its native extents over the shared Input boundary. */
export const nativeSelectAppearance: PresentationDictionary = {
  'native-select': [
    { selector: '&[data-disabled]', declarations: { opacity: 'var(--tp-opacity-disabled)' } },
  ],
  'native-select-size-default': [],
  'native-select-size-sm': [],
  'native-select-control': [
    ...textControlAppearance.input!,
    {
      declarations: {
        height: 'var(--tp-space-8)',
        'min-height': 'var(--tp-space-8)',
        'padding-inline-start': 'calc(var(--tp-spacing) * 2.5)',
        'padding-inline-end': 'var(--tp-space-8)',
        'padding-block': 'var(--tp-space-1)',
        // A native select centers its own text. Shared Input's 1.5 line box
        // exceeds Nova h-8 at the library spacing seed and clips that content.
        'line-height': 'normal',
      },
    },
    {
      selector: '&[data-size="sm"]',
      declarations: {
        height: 'calc(var(--tp-spacing) * 7)',
        'min-height': 'calc(var(--tp-spacing) * 7)',
        'padding-block': 'calc(var(--tp-spacing) * .5)',
        'border-radius': 'min(var(--tp-radius-md), calc(var(--tp-spacing) * 2.5))',
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
      declarations: { height: 'auto', 'padding-inline-end': 'calc(var(--tp-spacing) * 2.5)' },
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
  'native-select-control-size-default': [],
  'native-select-control-size-sm': [],
  'native-select-option': [{ declarations: { background: 'Canvas', color: 'CanvasText' } }],
  'native-select-option-size-default': [],
  'native-select-option-size-sm': [],
  'native-select-option-group': [{ declarations: { background: 'Canvas', color: 'CanvasText' } }],
  'native-select-option-group-size-default': [],
  'native-select-option-group-size-sm': [],
  'native-select-indicator-size-default': [],
  'native-select-indicator-size-sm': [],
  'native-select-indicator': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-base)',
        'inline-size': 'var(--tp-space-4)',
        'block-size': 'var(--tp-space-4)',
      },
    },
  ],
};
