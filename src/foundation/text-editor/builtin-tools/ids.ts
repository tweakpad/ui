/**
 * Identifiers of the built-in tools (Widgets `uwg-te-par-tools-1`, `uwg-te-tab-tools`,
 * `uwg-te-tab-tools-blocks`, `uwg-te-tab-tools-inserts`, `uwg-te-tab-tools-actions`,
 * `uwg-te-tab-tools-tables`).
 *
 * Every built-in tool by identifier, in the order of the five tables, with the feature that
 * defines it: `core` tools ship with the widget, the others with the widget feature of that name.
 * This module imports nothing at runtime, so that node definitions and the layout resolver can
 * check an identifier without loading the tools and their icons.
 */

/** The feature that defines a built-in tool; `core` tools ship with the widget. */
export type TextEditorToolFeature =
  'core' | 'links' | 'tables' | 'images' | 'suggestions' | 'blocks';

/** The feature of each built-in tool, by identifier, in the order of the tool tables. */
export const BUILTIN_TOOL_FEATURES = Object.freeze({
  // Formatting tools
  undo: 'core',
  redo: 'core',
  bold: 'core',
  italic: 'core',
  underline: 'core',
  strike: 'core',
  code: 'core',
  superscript: 'core',
  subscript: 'core',
  'clear-formatting': 'core',
  highlight: 'core',
  color: 'core',
  link: 'links',
  align: 'core',
  'align-start': 'core',
  'align-center': 'core',
  'align-end': 'core',
  'align-justify': 'core',
  more: 'core',
  // Block tools
  paragraph: 'core',
  'heading-1': 'core',
  'heading-2': 'core',
  'heading-3': 'core',
  'heading-4': 'core',
  'heading-5': 'core',
  'heading-6': 'core',
  'bullet-list': 'core',
  'ordered-list': 'core',
  'task-list': 'core',
  blockquote: 'core',
  'code-block': 'core',
  divider: 'core',
  'block-type': 'core',
  'list-type': 'core',
  'turn-into': 'core',
  // Insert and suggestion tools
  table: 'tables',
  image: 'images',
  slash: 'suggestions',
  // Block actions
  'duplicate-block': 'blocks',
  'copy-block-link': 'blocks',
  'move-block-up': 'blocks',
  'move-block-down': 'blocks',
  'nest-block': 'core',
  'unnest-block': 'core',
  'open-block-menu': 'blocks',
  'delete-block': 'blocks',
  'toggle-task': 'core',
  // Table tools
  'table-insert-row-before': 'tables',
  'table-insert-row-after': 'tables',
  'table-insert-column-before': 'tables',
  'table-insert-column-after': 'tables',
  'table-move-row-up': 'tables',
  'table-move-row-down': 'tables',
  'table-move-column-before': 'tables',
  'table-move-column-after': 'tables',
  'table-duplicate-row': 'tables',
  'table-delete-row': 'tables',
  'table-duplicate-column': 'tables',
  'table-delete-column': 'tables',
  'table-toggle-header-row': 'tables',
  'table-toggle-header-column': 'tables',
  'table-merge-cells': 'tables',
  'table-split-cell': 'tables',
  'table-cell-align': 'tables',
  'cell-background': 'tables',
  'table-clear-cells': 'tables',
} as const satisfies Readonly<Record<string, TextEditorToolFeature>>);

/** The identifier of a built-in tool. */
export type TextEditorBuiltinToolId = keyof typeof BUILTIN_TOOL_FEATURES;

/** The identifiers of the built-in tools of a feature. */
export type BuiltinToolIdOf<Feature extends TextEditorToolFeature> = {
  [Id in TextEditorBuiltinToolId]: (typeof BUILTIN_TOOL_FEATURES)[Id] extends Feature ? Id : never;
}[TextEditorBuiltinToolId];
