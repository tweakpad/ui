import type { PresentationDictionary } from '../resolver.js';
import { fillHidden } from './shared/fill.js';

const pressedInteraction =
  '&[aria-pressed="true"]:not(:disabled, [aria-disabled="true"]):is(:hover, :focus-visible)';

export const toggleAppearance: PresentationDictionary = {
  toggle: [
    // Nova `min-w-8 / min-w-7 / min-w-9`: a Toggle is never narrower than its height.
    { declarations: { 'min-inline-size': 'var(--tp-control-height-md)' } },
    // Keep pressed paint distinct when a consumer moves the pointer onto it.
    {
      selector: pressedInteraction,
      declarations: { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
    },
    fillHidden(pressedInteraction),
  ],
  'toggle-content': [{ declarations: { gap: 'inherit' } }],
  'toggle-size-sm': [{ declarations: { 'min-inline-size': 'var(--tp-control-height-sm)' } }],
  'toggle-size-lg': [{ declarations: { 'min-inline-size': 'var(--tp-control-height-lg)' } }],
};
