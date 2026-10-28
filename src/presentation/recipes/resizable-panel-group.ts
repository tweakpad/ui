import type { PresentationDictionary } from '../resolver.js';
import { focusRing } from './shared/focus.js';
export const resizablePanelGroupAppearance: PresentationDictionary = {
  'resizable-panel-group-separator': [
    { declarations: { background: 'var(--tp-border)' } },
    {
      selector: '&:focus-visible',
      declarations: focusRing,
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
