import type { ComponentDefinition } from '../definition.js';
import type { PresentationFamily } from '../family.js';
import { definePresentation } from '../family.js';
import { textEditorAppearance, textEditorStructure } from '../recipes/text-editor.js';

/**
 * One family with no axis and the parts of its anatomy, in anatomy order (`uwg-te-req-pres-1`;
 * `uwg-te-tab-anatomy`, `uwg-te-tab-anatomy-status`, `uwg-te-tab-anatomy-tables`).
 */
const definition: ComponentDefinition = {
  name: 'Text editor',
  tagName: 'tp-text-editor',
  kind: 'flattening-compound',
  parts: [
    { name: 'text-editor', description: 'The root container.' },
    { name: 'text-editor-toolbar', description: 'The fixed toolbar.' },
    { name: 'text-editor-viewport', description: 'The scroll container of the editing surface.' },
    { name: 'text-editor-content', description: 'The container of the editing root.' },
    { name: 'text-editor-overlay', description: 'The layer of overlay marks over the content.' },
    { name: 'text-editor-placeholder', description: 'The placeholder text.' },
    { name: 'text-editor-gutter', description: 'The block gutter.' },
    { name: 'text-editor-insert', description: "The gutter's insert button." },
    { name: 'text-editor-grip', description: "The gutter's block grip." },
    { name: 'text-editor-drop-indicator', description: 'The block drop indicator.' },
    { name: 'text-editor-block-selection', description: 'The selected-block highlight.' },
    { name: 'text-editor-selection-toolbar', description: 'The floating selection toolbar.' },
    { name: 'text-editor-suggestions', description: 'The suggestion popup.' },
    { name: 'text-editor-link-popover', description: 'The link popover.' },
    {
      name: 'text-editor-alt-input',
      description: 'The alternative text field of a selected image, in the context bar.',
    },
    {
      name: 'text-editor-link-editor',
      description: 'The link editor at the caret, in the context bar.',
    },
    { name: 'text-editor-table-picker', description: 'The table size picker.' },
    { name: 'text-editor-swatch', description: 'A color swatch.' },
    { name: 'text-editor-status', description: 'The loading and error status.' },
    { name: 'text-editor-row-grip', description: 'A table row grip.' },
    { name: 'text-editor-column-grip', description: 'A table column grip.' },
    { name: 'text-editor-cell-handle', description: 'The table cell handle.' },
    { name: 'text-editor-add-row', description: 'The add-row button of a table.' },
    { name: 'text-editor-add-column', description: 'The add-column button of a table.' },
    { name: 'text-editor-resize-handle', description: 'A table column resize handle.' },
    { name: 'text-editor-table-selection', description: 'The table cell selection.' },
    { name: 'text-editor-sticky-header', description: 'The sticky table header.' },
  ],
};

export const textEditorPresentation: PresentationFamily = definePresentation({
  definition,
  // Every part is one the widget's own templates author, so each binds by its part name.
  bindings: {
    'tp-text-editor': Object.fromEntries(
      definition.parts.map(({ name }) => [`[part~="${name}"]`, name]),
    ),
  },
  structure: textEditorStructure,
  sources: [textEditorAppearance],
});
