import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import { fillHidden } from './shared/fill.js';

const toggleIconEdges = (units: number): PresentationRule[] => [
  {
    selector: ':host([data-icon-inline-start]) &',
    declarations: { 'padding-inline-start': `calc(var(--tp-spacing) * ${units})` },
  },
  {
    selector: ':host([data-icon-inline-end]) &',
    declarations: { 'padding-inline-end': `calc(var(--tp-spacing) * ${units})` },
  },
];
const pressedInteraction =
  '&[aria-pressed="true"]:not(:disabled, [aria-disabled="true"]):is(:hover, :focus-visible)';

export const toggleAppearance: PresentationDictionary = {
  toggle: [
    { declarations: { 'min-inline-size': 'var(--tp-control-height-md)' } },
    ...toggleIconEdges(2),
    // Keep pressed paint distinct when a consumer moves the pointer onto it.
    {
      selector: pressedInteraction,
      declarations: { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
    },
    fillHidden(pressedInteraction),
  ],
  'toggle-content': [
    { declarations: { gap: 'var(--tp-space-1)', '--tp-icon-size-md': 'var(--tp-icon-size-sm)' } },
  ],
  'toggle-size-sm': [
    { declarations: { 'min-inline-size': 'var(--tp-control-height-sm)' } },
    ...toggleIconEdges(1.5),
  ],
  'toggle-size-lg': [{ declarations: { 'min-inline-size': 'var(--tp-control-height-lg)' } }],
  // TpIcon's default md extent inherits through the slot; explicit Icon.size wins.
  'toggle-content-size-sm': [
    { declarations: { '--tp-icon-size-md': 'calc(var(--tp-icon-size-sm) * 0.875)' } },
  ],
};
