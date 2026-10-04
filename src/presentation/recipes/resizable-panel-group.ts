import type { PresentationDictionary } from '../resolver.js';
export const resizablePanelGroupAppearance: PresentationDictionary = {
  'resizable-panel-group': [],
  'resizable-panel-group-panel': [],
  'resizable-panel-group-separator': [
    { declarations: { background: 'var(--tp-border)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'resizable-panel-group-handle-decoration': [
    {
      declarations: {
        background: 'var(--tp-border)',
        width: 'var(--tp-space-1)',
        height: 'var(--tp-space-6)',
        'border-radius': 'var(--tp-radius-lg)',
      },
    },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { width: 'var(--tp-space-6)', height: 'var(--tp-space-1)' },
    },
  ],
};
