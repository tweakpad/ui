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
    { name: 'text-editor' },
    { name: 'text-editor-toolbar' },
    { name: 'text-editor-viewport' },
    { name: 'text-editor-content' },
    { name: 'text-editor-overlay' },
    { name: 'text-editor-placeholder' },
    { name: 'text-editor-gutter' },
    { name: 'text-editor-insert' },
    { name: 'text-editor-grip' },
    { name: 'text-editor-drop-indicator' },
    { name: 'text-editor-block-selection' },
    { name: 'text-editor-selection-toolbar' },
    { name: 'text-editor-suggestions' },
    { name: 'text-editor-link-popover' },
    { name: 'text-editor-alt-input' },
    { name: 'text-editor-link-editor' },
    { name: 'text-editor-table-picker' },
    { name: 'text-editor-swatch' },
    { name: 'text-editor-status' },
    { name: 'text-editor-row-grip' },
    { name: 'text-editor-column-grip' },
    { name: 'text-editor-cell-handle' },
    { name: 'text-editor-add-row' },
    { name: 'text-editor-add-column' },
    { name: 'text-editor-resize-handle' },
    { name: 'text-editor-table-selection' },
    { name: 'text-editor-sticky-header' },
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
