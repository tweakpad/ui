// The features of `tp-text-editor`, one module each: an application imports the factories of the
// features it uses and assigns them to `features`, so that a page bundles no other.
export { textEditorBlocks } from './blocks.js';
export { textEditorImages, type TextEditorImagesOptions } from './images.js';
export { textEditorLinks } from './links.js';
export { textEditorSelectionToolbar } from './selection-toolbar.js';
export { textEditorSuggestions } from './suggestions.js';
export { textEditorTables, type TextEditorTablesOptions } from './tables.js';
