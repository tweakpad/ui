import { interactiveMarkupExample } from './documentation-examples.js';
import { setupDragDropListExample } from './drag-drop-list-example.js';
import setupSource from './drag-drop-list-example.js?raw';
const script = setupSource.replace(
  "'../foundation/drag-drop/index.js'",
  "'@tweakpad/ui/drag-drop'",
);
function example(title: string, mode: string, content: string, description: string) {
  const id = `drag-drop-${mode}-example`;
  return interactiveMarkupExample(
    title,
    `<section id="${id}" data-example="${mode}" style="display:grid;gap:var(--tp-space-4)">${content}<p data-status role="status" aria-live="polite">Move an item to change its order.</p></section>`,
    setupDragDropListExample,
    `${script}\nconst cleanup = setupDragDropListExample(document.getElementById('${id}'));\n// Call cleanup() when removing the example.`,
    description,
  );
}
const connected =
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:var(--tp-space-4)"><tp-drag-drop-list variant="outline"></tp-drag-drop-list><tp-drag-drop-list variant="outline"></tp-drag-drop-list></div>';
export const dragDropListExamples = [
  example(
    'Connected lists and an empty destination',
    'connected',
    connected + '<tp-button data-move variant="outline">Move first item to Ready</tp-button>',
    'One shared manager coordinates two independently committed lanes. Keyboard users can move toward the empty list.',
  ),
  example(
    'One controlled owner',
    'controlled',
    connected,
    'The owner stages both proposals, acknowledges both lists synchronously, then publishes its application snapshot after the atomic component commit.',
  ),
  example(
    'Content, actions and a custom overlay',
    'rich',
    '<tp-drag-drop-list variant="outline"></tp-drag-drop-list>',
    'Badge, Button and List Item are public library components. Item actions remain separately operable.',
  ),
  example(
    'Item activation and a vertical constraint',
    'vertical',
    '<tp-drag-drop-list variant="subdued"></tp-drag-drop-list>',
    'Pointer activation covers the item while the named keyboard handle stays available. A Foundation modifier restricts movement and clone feedback shows the layout position.',
  ),
  example(
    'Authorize a drop before committing',
    'decision',
    connected +
      '<div data-decision hidden><tp-button data-approve>Accept drop</tp-button> <tp-button data-reject variant="outline">Reject drop</tp-button></div>',
    'The drag-end suspension retains feedback and committed values until a decision. The same handle can be resolved by asynchronous application work.',
  ),
];
