import type { PresentationDictionary } from '../resolver.js';

export const timelineAppearance: PresentationDictionary = {
  timeline: [{ declarations: { color: 'var(--tp-foreground)' } }],
  // Complete is a filled mark, current a ring with a halo, upcoming and none a muted outline.
  'timeline-item-dot': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        border: 'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-border)',
        'background-color': 'var(--tp-background)',
      },
    },
    {
      selector: "&[data-status='complete']",
      declarations: {
        'border-color': 'var(--tp-foreground)',
        'background-color': 'var(--tp-foreground)',
      },
    },
    {
      selector: "&[data-status='current']",
      declarations: {
        'border-color': 'var(--tp-foreground)',
        'box-shadow': '0 0 0 var(--tp-space-1) var(--tp-muted)',
      },
    },
  ],
  // Tracks keep the Separator's border color; a complete segment fills over them.
  'timeline-item-connector-fill': [
    { declarations: { 'background-color': 'var(--tp-foreground)' } },
  ],
  'timeline-item-opposite': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
};
