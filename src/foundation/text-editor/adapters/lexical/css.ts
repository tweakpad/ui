/**
 * The base CSS of the Lexical adapter (Widgets `uwg-te-req-pres-2`, `uwg-te-tab-vocabulary`).
 *
 * Written for this adapter, not taken from the engine: only editing mechanics that the engine
 * relies on, so that the root behaves as the other engine's does: the code block element is a
 * block, a table scrolls inside its wrapper, the item that only wraps a nested list draws no
 * marker of its own, the list in it is laid out in the widget's direction (the shared
 * `textMechanicsCss`, written first), never in the left-to-right one that the wrapper's
 * `dir="auto"` resolves without text of its own, and the caret is hidden while a cell range is
 * selected. Every appearance, color included, belongs to the widget's engine-neutral recipe. The
 * factory's `css` option replaces this sheet with a string or extends it with a function of it
 * (the shared `resolveCss`).
 */
import { textMechanicsCss } from '../../content/mechanics.js';

/** The base sheet, adopted into the widget's shadow root at mount. */
export const LEXICAL_BASE_CSS = `${textMechanicsCss('[data-lexical-editor]')}[data-lexical-editor] .tp-te-code-block {
  display: block;
}
[data-lexical-editor] .tp-te-table-wrapper {
  overflow-x: auto;
}
[data-lexical-editor] .tp-te-nested-item {
  list-style-type: none;
}
[data-lexical-editor]:has(.tp-te-table-selection) {
  caret-color: transparent;
}
[data-lexical-editor] .tp-te-cell-selected::selection,
[data-lexical-editor] .tp-te-cell-selected *::selection,
[data-lexical-editor] .tp-te-table-selection *::selection {
  background-color: transparent;
}
`;
