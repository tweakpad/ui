import { createEngine } from './text-editor-engine.js';

/** The form submits the editor's Markdown under its name; the code block shows what was sent. */
export function setupNotesForm(root) {
  root.querySelector('tp-text-editor').engine = createEngine();
  const submitted = root.querySelector('tp-code-block');
  root.querySelector('tp-form').onFormSubmit = (_values, { data }) => {
    submitted.code = String(data.get('notes'));
    submitted.hidden = false;
  };
}
