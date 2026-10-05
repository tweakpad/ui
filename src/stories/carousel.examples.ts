import { interactiveMarkupExample } from './documentation-examples.js';
import { setupCarouselExample } from './carousel-example.js';
import setupSource from './carousel-example.js?raw';
export const carouselExamples = [
  ['Data content', 'data', 'Typed item identity with a shared draggable scrollbar.'],
  [
    'Virtual archive',
    'virtual',
    'Two hundred logical records with a bounded rendered window and keyed view caching.',
  ],
  [
    'Controlled selection',
    'controlled',
    'One synchronous application owner acknowledges numeric proposals.',
  ],
].map(([title, mode, description]) => {
  const id = `carousel-${mode}-example`;
  return interactiveMarkupExample(
    title!,
    `<section id="${id}" data-example="${mode}" style="max-width:48rem"><p data-status role="status">Navigate the collection.</p></section>`,
    setupCarouselExample,
    `${setupSource}\nconst cleanup = setupCarouselExample(document.getElementById('${id}'));\n// Call cleanup() when removing the example.`,
    description!,
  );
});
