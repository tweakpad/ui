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

/**
 * The selection toolbar editor with blocks: the gutter beside each block, and the slash menu, which
 * also inserts tables and images.
 */
export function setupBlockEditor(editor) {
  editor.features = [
    textEditorSelectionToolbar(),
    textEditorLinks(),
    textEditorBlocks(),
    textEditorSuggestions(),
    textEditorTables(),
    textEditorImages({ upload }),
  ];
  editor.layout = { toolbar: [] };
  editor.engine = createEngine();
}
