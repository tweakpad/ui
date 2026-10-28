import { WIDGET_REGISTER_IMPORTS, interactiveMarkupExample } from '../documentation-examples.js';
import { setupEmojiPickerExample } from './emoji-picker-example.js';
import setupSource from './emoji-picker-example.js?raw';

function example(title: string, content: string, description: string) {
  const id = 'emoji-picker-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return interactiveMarkupExample(
    title,
    `<div id="${id}">${content}</div>`,
    setupEmojiPickerExample,
    `${setupSource}\nsetupEmojiPickerExample(document.getElementById('${id}'));`,
    description,
    { registerImports: WIDGET_REGISTER_IMPORTS },
  );
}

export const emojiPickerExamples = [
  example(
    'Live value',
    '<tp-emoji-picker label="Reaction" data-output></tp-emoji-picker>',
    'Every pick dispatches `tp-action`; a pick of a different emoji is also a cancelable `tp-value-change` followed by `tp-value-commit`. Type to search names and keywords, use the arrow keys to move through the grid and Enter to pick.',
  ),
  example(
    'Insert into a message',
    `<div data-composer style="display: flex; gap: var(--tp-space-2); align-items: flex-start">
  <tp-field label="Message" style="flex: 1">
    <tp-text-area rows="3" default-value="Release notes are ready "></tp-text-area>
  </tp-field>
  <tp-emoji-picker picker="popup" label="Insert emoji"></tp-emoji-picker>
</div>`,
    'The popup picker inserts each pick at the caret through `tp-action`. Cancelling the pick-driven `tp-open-change` keeps the popup open for several picks; the trigger, Escape and outside presses still close it.',
  ),
  example(
    'Recent and custom emoji',
    '<tp-emoji-picker label="Team reaction" data-recent data-custom data-output></tp-emoji-picker>',
    'The application supplies `recent` (kept here from the picks) and `custom` image emoji in their own category. Custom emoji publish `:id:` as their value and are searchable by label and keywords.',
  ),
  example(
    'Skin tones',
    '<tp-emoji-picker label="Hand signs" default-skin-tone="medium" data-tone></tp-emoji-picker>',
    'The skin tone Button opens a menu of tones; choosing one proposes `tp-skin-tone-change`, and emoji that accept a tone show it in the grid, the preview and their names.',
  ),
  example(
    'In a form',
    `<tp-form data-form-output>
  <tp-field label="Mood" description="The chosen emoji submits under its name.">
    <tp-emoji-picker picker="popup" name="mood" required></tp-emoji-picker>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>`,
    'The widget is a form control: the emoji submits under `name`, `required` validates, and Reset restores the default through `form-reset`.',
  ),
];
