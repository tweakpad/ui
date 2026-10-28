import {
  textEditorLinks,
  textEditorSelectionToolbar,
} from '../../widgets/text-editor/features/index.js';
import { createEngine } from './text-editor-engine.js';

/** Selecting text shows the formatting controls over it, in place of the fixed toolbar. */
export function setupSelectionToolbarEditor(editor) {
  editor.features = [textEditorSelectionToolbar(), textEditorLinks()];
  // An empty list turns the fixed toolbar off.
  editor.layout = { toolbar: [] };
  editor.engine = createEngine();
}
