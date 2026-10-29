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
  ],
};
