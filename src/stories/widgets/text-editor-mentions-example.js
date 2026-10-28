import { defineTextEditorInline } from '../../foundation/text-editor/index.js';
import { textEditorSuggestions } from '../../widgets/text-editor/features/index.js';
import { createEngine } from './text-editor-engine.js';

const crew = [
  { id: 'maren-holt', name: 'Maren Holt', role: 'Dockmaster' },
  { id: 'tobias-vik', name: 'Tobias Vik', role: 'Ferry pilot' },
  { id: 'selma-raud', name: 'Selma Raud', role: 'Harbour office' },
  { id: 'arno-petit', name: 'Arno Petit', role: 'Deckhand' },
];

/** A mention: an inline atom that `@` inserts from a list of the crew. */
export const mentionInline = defineTextEditorInline({
  name: 'mention',
  element: 'span',
  attrs: { person: { type: 'string', default: null }, label: { type: 'string', default: '' } },
  text: (attrs) => `@${attrs.label}`,
  css: '.tp-te-inline-mention { color: var(--tp-primary); }',
  suggest: {
    trigger: '@',
    // Return the matches, or a promise of them; `signal` aborts a search a newer query replaced.
    source: ({ query }) =>
      crew.filter((person) => person.name.toLowerCase().includes(query.toLowerCase())),
    label: (person) => person.name,
    description: (person) => person.role,
    attrs: (person) => ({ person: person.id, label: person.name }),
  },
});

/** Typing `@` opens the mention list once `layout.suggestions` names it beside the slash menu. */
export function setupMentions(editor) {
  editor.nodes = [mentionInline];
  editor.features = [textEditorSuggestions()];
  editor.layout = { suggestions: ['slash', 'mention'] };
  editor.engine = createEngine();
}
