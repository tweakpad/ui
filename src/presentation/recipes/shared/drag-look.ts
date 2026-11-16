import type { PresentationDeclarations } from '../../resolver.js';

// The shared drag look in recipes: the drag feedback applies the same tokens inline to the
// elements it owns (the stand-in, the lifted item, an overlay and the source under it), and a
// component that renders the ghost itself (a Tree view's ghost row, a row a connected list renders
// for an item dragged into it) takes this declaration.

/** The dimmed copy that holds a dragged item's place. */
export const dragGhost: PresentationDeclarations = { opacity: 'var(--tp-opacity-drag-ghost)' };
