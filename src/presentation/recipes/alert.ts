import type { PresentationDictionary } from '../resolver.js';

export const alertAppearance: PresentationDictionary = {
  alert: [
    {
      selector: '&',
      declarations: {
        'column-gap': 'var(--tp-space-2)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-lg)',
        background: 'var(--tp-card)',
        color: 'var(--tp-card-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'box-shadow': 'var(--tp-shadow-none)',
      },
    },
    {
      selector: '& > .body',
      declarations: { gap: 'calc(var(--tp-space-1) / 2)' },
    },
    ...(['success', 'warning', 'danger'] as const).map((severity) => ({
      selector: `:host([severity='${severity}']) &`,
      declarations: {
        color: `color-mix(in oklab, var(--tp-${severity === 'danger' ? 'destructive' : severity}) 85%, var(--tp-card-foreground))`,
      },
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
  'alert-mark': [
    { selector: '&', declarations: { 'padding-block-start': 'calc(var(--tp-space-1) / 2)' } },
  ],
  'alert-action': [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
};
