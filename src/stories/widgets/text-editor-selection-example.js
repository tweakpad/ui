import {
  textEditorLinks,
  textEditorSelectionToolbar,
} from '../../widgets/text-editor/features/index.js';
import { createEngine } from './text-editor-engine.js';

/** No fixed toolbar: selecting text shows the formatting controls over it. */
export function setupSelectionToolbarEditor(editor) {
  editor.features = [textEditorSelectionToolbar(), textEditorLinks()];
  editor.layout = { toolbar: [] };
  editor.engine = createEngine();
}
