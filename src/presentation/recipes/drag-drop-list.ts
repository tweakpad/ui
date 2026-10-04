import type { PresentationDictionary } from '../resolver.js';
/** Collection layout and drag state only; rows and handles retain their component recipes. */
export const dragDropListAppearance: PresentationDictionary = {
  'drag-drop-list-list': [
    { declarations: { gap: 'var(--tp-space-2)', 'min-block-size': 'var(--tp-space-12)' } },
  ],
  'drag-drop-list-item': [
    {
      selector: '&[data-drop-target]',
      declarations: {
        outline: 'var(--tp-border-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
  ],
  'drag-drop-list-handle': [{ declarations: { cursor: 'grab' } }],
};
