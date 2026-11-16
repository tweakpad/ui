import type { PresentationDictionary } from '../resolver.js';
import { dragGhost } from './shared/drag-look.js';
import { listDropLine } from './shared/drop-line.js';
/** Collection layout and drag state only; rows and handles retain their component recipes. */
export const dragDropListAppearance: PresentationDictionary = {
  'drag-drop-list-list': [
    { declarations: { gap: 'var(--tp-space-2)', 'min-block-size': 'var(--tp-space-12)' } },
  ],
  // The item under the drag is not marked: an outline around it would read as dropping inside it.
  // The row a list renders for the item being dragged, such as the row a connected list shows for
  // an item dragged into it, is the drag ghost; the lifted item keeps the drag feedback's look.
  'drag-drop-list-item': [{ selector: '&[data-drag-ghost]', declarations: dragGhost }],
  'drag-drop-list-handle': [{ declarations: { cursor: 'grab' } }],
  // The stand-in that holds the dragged row's place takes the shared drag ghost opacity from the
  // drag feedback, as every dragged item's place does.
  'drag-drop-list-placeholder': [],
  'drag-drop-list-drop-indicator': [{ declarations: listDropLine('drag-drop-list') }],
};
