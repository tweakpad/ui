import {
  textEditorBlocks,
  textEditorImages,
  textEditorLinks,
  textEditorSelectionToolbar,
  textEditorSuggestions,
  textEditorTables,
} from '../../widgets/text-editor/features/index.js';
import { createEngine } from './text-editor-engine.js';

/** Upload the image to your storage and resolve its URL; this one keeps the file in the page. */
const upload = async (file) => URL.createObjectURL(file);

/** Every feature, beside the fixed toolbar. Assign only the features you use. */
export function setupTextEditor(editor) {
  editor.features = [
    textEditorBlocks(),
    textEditorTables(),
    textEditorImages({ upload }),
    textEditorLinks(),
    textEditorSelectionToolbar(),
    textEditorSuggestions(),
  ];
  editor.engine = createEngine();
}
