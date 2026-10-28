/**
 * The base CSS of the Tiptap adapter (Widgets `uwg-te-req-pres-2`, `uwg-te-req-pres-4`,
 * `uwg-te-tab-engine` r2).
 *
 * Written for this adapter, never taken from the engine: only the editing mechanics the engine
 * relies on, so that its editing root behaves as the other engine's does. Text keeps its spaces
 * and wraps, without ligatures; a code block keeps its line breaks with a tab two spaces wide;
 * non-editable islands (images, task markers, custom atoms and inline nodes) keep normal spacing
 * and are not selectable as text; the native selection is hidden under a block selection or a
 * selected node, in selected cells and in a table holding a cell range; the engine's caret helper
 * images take no room; a table scrolls inside its wrapper; a list inside a list item is laid out
 * in the direction of the editing root, which the root records from the widget's (`:dir()`), never
 * in the one that the item's `dir="auto"` resolves from its text. The shared `textMechanicsCss`
 * comes first; the rules after it are this adapter's own.
 * It names no color: every appearance, the selection paint included, comes from the widget's
 * engine-neutral recipes. The factory's `css` option replaces it with a string or extends it with
 * a function of it (`resolveCss`).
 */
import { textMechanicsCss } from '../../content/mechanics.js';

/** The adapter's base CSS, scoped to the editing root that the engine marks. */
export const TIPTAP_BASE_CSS = `${textMechanicsCss('.ProseMirror')}.ProseMirror [contenteditable="false"] [contenteditable="true"] {
  white-space: pre-wrap;
}
.ProseMirror img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  inline-size: 0 !important;
  block-size: 0 !important;
}
.ProseMirror-hideselection,
.ProseMirror-hideselection * {
  caret-color: transparent;
}
.ProseMirror-hideselection::selection,
.ProseMirror-hideselection *::selection,
.ProseMirror .tp-te-cell-selected::selection,
.ProseMirror .tp-te-cell-selected *::selection,
.ProseMirror .tp-te-table-selection *::selection {
  background: transparent;
}
.ProseMirror .tp-te-table-wrapper {
  overflow-x: auto;
}
`;
