import {
  textEditorImages,
  textEditorLinks,
  textEditorTables,
} from '../../widgets/text-editor/features/index.js';
import { createEngine } from './text-editor-engine.js';

/** Upload the image to your storage and resolve its URL; this one keeps the file in the page. */
const upload = async (file) => URL.createObjectURL(file);

/** Every control in the fixed toolbar: the features only add links, tables and images to it. */
export function setupClassicEditor(editor) {
  editor.features = [textEditorLinks(), textEditorTables(), textEditorImages({ upload })];
  editor.engine = createEngine();
}
