import type { PresentationDictionary } from '../resolver.js';
import { calloutSurface, calloutTint, calloutTints } from './shared/callout-surface.js';

export const alertAppearance: PresentationDictionary = {
  alert: [
    { selector: '&', declarations: calloutSurface },
    // Actions that move under the text in a narrow alert keep the surface's own gap from it.
    { selector: '&', declarations: { 'row-gap': 'var(--tp-space-2)' } },
    {
      selector: '& > .body',
      declarations: { gap: 'var(--tp-space-0-5)' },
    },
    ...calloutTints.map((severity) => ({
      selector: `:host([severity='${severity}']) &`,
      declarations: calloutTint(severity),
    })),
  ],
  'alert-title': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'alert-description': [
    { selector: '&', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: ":host(:is([severity='success'], [severity='warning'], [severity='danger'])) &",
      declarations: { color: 'inherit' },
    },
    { selector: '& ::slotted(p)', declarations: { margin: '0' } },
  ],
  'alert-mark': [{ selector: '&', declarations: { 'padding-block-start': 'var(--tp-space-0-5)' } }],
  'alert-action': [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
};
