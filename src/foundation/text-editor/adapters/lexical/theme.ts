/**
 * The theme of the Lexical adapter: the engine-neutral `tp-te-*` vocabulary (Widgets
 * `uwg-te-tab-vocabulary`, `uwg-te-req-pres-2`) through the engine's theme hook.
 *
 * The engine writes these classes itself; `render.ts` adds what a theme cannot express: the task
 * marker, the color names and the cell backgrounds. A task list carries only `tp-te-list-task`:
 * the engine gives every `ul` the `ul` classes, so the bullet class is not among them and
 * `render.ts` adds `tp-te-list-bullet` to bullet lists only. The engine caches class lists on the
 * theme object, so the theme is not frozen; one theme object serves every editor of a namespace.
 */
import type { LexicalCoreLike } from './modules.js';

/** Classes of the vocabulary that the adapter writes outside the theme. */
export const LEXICAL_CLASSES = Object.freeze({
  list: 'tp-te-list',
  bulletList: 'tp-te-list-bullet',
  taskList: 'tp-te-list-task',
  taskItem: 'tp-te-task-item',
  checked: 'tp-te-checked',
  taskMarker: 'tp-te-task-marker',
  color: 'tp-te-color',
  highlight: 'tp-te-highlight',
  imageHost: 'tp-te-image-host',
  imagePending: 'tp-te-image-pending',
  image: 'tp-te-image',
  cellSelected: 'tp-te-cell-selected',
  tableSelection: 'tp-te-table-selection',
});

/** The theme classes by engine key (`EditorThemeClasses`). */
export type LexicalTheme = Record<string, unknown>;

function createTheme(): LexicalTheme {
  const heading = 'tp-te-heading';
  return {
    paragraph: 'tp-te-paragraph',
    heading: { h1: heading, h2: heading, h3: heading, h4: heading, h5: heading, h6: heading },
    quote: 'tp-te-quote',
    code: 'tp-te-code-block',
    list: {
      // Every list element gets `ul` or `ol`; a task list only `checklist` on top of `ul`.
      ul: LEXICAL_CLASSES.list,
      ol: `${LEXICAL_CLASSES.list} tp-te-list-ordered`,
      checklist: LEXICAL_CLASSES.taskList,
      listitem: 'tp-te-item',
      listitemChecked: `${LEXICAL_CLASSES.taskItem} ${LEXICAL_CLASSES.checked}`,
      listitemUnchecked: LEXICAL_CLASSES.taskItem,
      nested: { listitem: 'tp-te-nested-item' },
    },
    link: 'tp-te-link',
    text: {
      bold: 'tp-te-bold',
      italic: 'tp-te-italic',
      underline: 'tp-te-underline',
      strikethrough: 'tp-te-strike',
      underlineStrikethrough: 'tp-te-underline tp-te-strike',
      code: 'tp-te-code',
      subscript: 'tp-te-sub',
      superscript: 'tp-te-sup',
      // The highlight class goes with its color name on the outer element (`render.ts`).
    },
    hr: 'tp-te-divider',
    // The engine adds `selected` to a clicked divider without a class here; block selection is the widget's.
    hrSelected: '',
    table: 'tp-te-table',
    tableScrollableWrapper: 'tp-te-table-wrapper',
    tableCell: 'tp-te-cell',
    tableCellHeader: 'tp-te-header-cell',
    tableCellSelected: LEXICAL_CLASSES.cellSelected,
    tableSelection: LEXICAL_CLASSES.tableSelection,
    blockCursor: 'tp-te-block-cursor',
  };
}

const themes = new WeakMap<LexicalCoreLike, LexicalTheme>();

/** The theme of a `lexical` namespace, built once per namespace. */
export function lexicalTheme(lexical: LexicalCoreLike): LexicalTheme {
  let theme = themes.get(lexical);
  if (!theme) {
    theme = createTheme();
    themes.set(lexical, theme);
  }
  return theme;
}
