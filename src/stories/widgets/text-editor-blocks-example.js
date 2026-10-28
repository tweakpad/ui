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

/** The block gutter, the slash menu and the selection toolbar carry every control. */
export function setupBlockEditor(editor) {
  editor.features = [
    textEditorBlocks(),
    textEditorSuggestions(),
    textEditorSelectionToolbar(),
    textEditorTables(),
    textEditorImages({ upload }),
    textEditorLinks(),
  ];
  // An empty list turns the fixed toolbar off.
  editor.layout = { toolbar: [] };
  editor.engine = createEngine();
}
