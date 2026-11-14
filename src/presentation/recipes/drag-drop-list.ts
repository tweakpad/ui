import type { PresentationDictionary } from '../resolver.js';
import { listDropLine } from './shared/drop-line.js';
/** Collection layout and drag state only; rows and handles retain their component recipes. */
export const dragDropListAppearance: PresentationDictionary = {
  'drag-drop-list-list': [
    { declarations: { gap: 'var(--tp-space-2)', 'min-block-size': 'var(--tp-space-12)' } },
  ],
  // The item under the drag is not marked: an outline around it would read as dropping inside it.
  'drag-drop-list-item': [],
  'drag-drop-list-handle': [{ declarations: { cursor: 'grab' } }],
  // A shown stand-in (`feedback: 'clone'`) is translucent next to the solid dragged row, so the
  // two never read as two rows.
  'drag-drop-list-placeholder': [{ declarations: { opacity: '0.65' } }],
  'drag-drop-list-drop-indicator': [{ declarations: listDropLine('drag-drop-list') }],
};
