import { interactiveMarkupExample } from './documentation-examples.js';
import { setupCarouselExample } from './carousel-example.js';
import setupSource from './carousel-example.js?raw';
import demoStyles from './carousel.stories.css?raw';
export const carouselDemoSource = (vertical = false) => `<style>${demoStyles}</style>
<div class="carousel-demo${vertical ? ' carousel-demo--vertical' : ''}">
  <tp-carousel id="numbered-carousel" label="Numbered slides" orientation="${vertical ? 'vertical' : 'horizontal'}">
    ${Array.from({ length: 5 }, (_, index) => `<tp-card class="carousel-demo-card" section-colors="off"><span>${index + 1}</span></tp-card>`).join('\n    ')}
  </tp-carousel>
</div>
<script type="module">
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
document.getElementById('numbered-carousel').options = {
  layout: { itemsPerView: ${vertical ? 2 : 1}, gap: 16 },
  indicators: false,
  navigation: { placement: 'outside' },
};
</script>`;

export const carouselExamples = [
  ['Data content', 'data', 'Numbered Cards with typed item identity.'],
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
    `<style>${demoStyles}</style><section class="carousel-data-demo" id="${id}" data-example="${mode}"><p data-status role="status">Navigate the collection.</p></section>`,
    setupCarouselExample,
    `${setupSource}\nconst cleanup = setupCarouselExample(document.getElementById('${id}'));\n// Call cleanup() when removing the example.`,
    description!,
  );
});
