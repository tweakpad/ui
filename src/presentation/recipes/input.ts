import type { PresentationDictionary } from '../resolver.js';
import { motionTransition } from '../motion.js';
import {
  inlineControlLabel,
  inlineControlRings,
  inlineControlSurface,
  inlineControlValue,
} from './shared/inline-control.js';
import {
  disabledBackground,
  inputRules,
  joinedEditor,
  joinedEditorMinHeight,
  joinedEditorSelector,
} from './shared/text-control.js';

export const inputAppearance: PresentationDictionary = {
  input: inputRules,
  // Inline variant: the row is the shared inline control row and owns the boundary, rings and
  // fill; the native editor joins it as in an Input group, with its value at the row's end.
  'input-row-variant-inline': [
    {
      declarations: {
        ...inlineControlSurface,
        gap: 'var(--tp-space-2)',
        'padding-inline-start': 'var(--tp-space-2-5)',
      },
    },
    ...inlineControlRings('&', ':focus-within'),
    { selector: '&[data-disabled]', declarations: { background: disabledBackground } },
  ],
  'input-label-variant-inline': [{ declarations: inlineControlLabel }],
  // The value reads like the other inline values: muted at rest, the foreground while in use.
  'input-variant-inline': [
    { declarations: { 'min-height': joinedEditorMinHeight } },
    { selector: joinedEditorSelector, declarations: joinedEditor },
    {
      declarations: {
        color: inlineControlValue.color!,
        transition: motionTransition(['color'], 'fast'),
      },
    },
    { selector: '&:is(:hover, :focus)', declarations: { color: 'var(--tp-foreground)' } },
    // A number value sits centered between the Stepper's Buttons, in place of the browser's spin
    // buttons; tabular digits keep its width, and with it the Buttons, steady while it steps.
    {
      selector: '&[type="number"]',
      declarations: {
        appearance: 'textfield',
        flex: 'none',
        'box-sizing': 'border-box',
        'inline-size': 'calc(var(--_tp-input-chars, 3) * 1ch + var(--tp-space-1) * 2)',
        'padding-inline': 'var(--tp-space-1)',
        'text-align': 'center',
        'font-variant-numeric': 'tabular-nums',
      },
    },
    {
      selector:
        '&[type="number"]::-webkit-inner-spin-button, &[type="number"]::-webkit-outer-spin-button',
      declarations: { appearance: 'none', margin: '0' },
    },
  ],
  // The Stepper sits at the row's end, inset like the Select trigger's chevron.
  'input-stepper-variant-inline': [{ declarations: { 'padding-inline-end': 'var(--tp-space-1)' } }],
};
