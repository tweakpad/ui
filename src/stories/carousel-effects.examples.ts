import { interactiveMarkupExample } from './documentation-examples.js';
import { setupCarouselEffectExample } from './carousel-effects-example.js';
import setupSource from './carousel-effects-example.js?raw';
import demoStyles from './carousel-effects.stories.css?raw';

/** CORS-enabled landscape photography (Unsplash license). */
const photos = [
  ['1501785888041-af3ef285b470', 'Lake Braies', 'Dolomites, Italy'],
  ['1470071459604-3b5ec3a7fe05', 'Morning valley', 'Ciucaș Peak, Romania'],
  ['1441974231531-c6227db76b6e', 'Forest path', 'Black Forest, Germany'],
  ['1506905925346-21bda4d32df4', 'Sea of clouds', 'Swiss Alps'],
  ['1469474968028-56623f02e42e', 'First light', 'Dolomites, Italy'],
] as const;

const variants = [
  ['wipe', 'Wipe'],
  ['displace', 'Displace'],
  ['chromatic', 'Chromatic'],
] as const;

const directions = [
  ['left', 'Left'],
  ['right', 'Right'],
  ['up', 'Up'],
  ['down', 'Down'],
  ['up-left', 'Up left'],
  ['up-right', 'Up right'],
  ['down-left', 'Down left'],
  ['down-right', 'Down right'],
] as const;

const slides = (layers: boolean) =>
  photos
    .map(
      ([id, title, place]) => `<figure class="carousel-effect-slide">
      <img data-carousel-media crossorigin="anonymous" alt="${title}, ${place}" src="https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop">
      ${
        layers
          ? `<figcaption class="carousel-effect-caption"><strong data-carousel-layer="1">${title}</strong><span data-carousel-layer="2">${place}</span></figcaption>`
          : ''
      }
    </figure>`,
    )
    .join('\n    ');

const script = (id: string) =>
  `${setupSource.replaceAll("'../components/carousel/effects/index.js'", "'@tweakpad/ui'")}\nconst cleanup = setupCarouselEffectExample(document.getElementById('${id}'));\n// Call cleanup() when removing the example.`;

function example(
  title: string,
  id: string,
  effect: string,
  description: string,
  {
    effectOptions,
    options,
    cards = false,
    extra = '',
    loop = false,
  }: {
    effectOptions?: object;
    options?: object;
    cards?: boolean;
    extra?: string;
    loop?: boolean;
  } = {},
) {
  return interactiveMarkupExample(
    title,
    `<style>${demoStyles}</style>
<div class="carousel-effect-demo${cards ? ' carousel-effect-demo--cards' : ''}" id="${id}">
  ${extra}<tp-carousel label="${title} landscapes" data-effect="${effect}"${loop ? ' loop' : ''}${effectOptions ? ` data-effect-options='${JSON.stringify(effectOptions)}'` : ''}${options ? ` data-options='${JSON.stringify(options)}'` : ''}>
    ${slides(true)}
  </tp-carousel>
</div>`,
    setupCarouselEffectExample,
    script(id),
    description,
  );
}

export const carouselEffectExamples = [
  example(
    'Shader transition',
    'carousel-effect-shader',
    'shader',
    'A WebGL2 transition drawn over each item’s data-carousel-media. Wipe sweeps a noise-edged front across the frame; Displace and Chromatic use a flowing noise map that pushes the old image out and draws the new one in along the chosen direction, edge or corner. Drag to scrub it; captions marked data-carousel-layer stay live text above the canvas and reveal in order. Without WebGL2, ready media or motion it falls back to a crossfade.',
    {
      extra: `<div class="carousel-effect-options">
    <tp-field label="Variant"><tp-select data-option="variant" default-value="wipe">${variants
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join('')}</tp-select></tp-field>
    <tp-field label="Direction"><tp-select data-option="direction" default-value="left">${directions
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join('')}</tp-select></tp-field>
  </div>
  `,
      loop: true,
    },
  ),
  example(
    'Crossfade',
    'carousel-effect-crossfade',
    'crossfade',
    'Stacked items fade with the outgoing item held under the incoming one, so the background never shows through.',
  ),
  example(
    'Layered 3D',
    'carousel-effect-layered',
    'layered',
    'The outgoing media turns away and recedes, the incoming media turns in, then its layers rise in order. Every value follows the drag.',
  ),
  example(
    'Parallax',
    'carousel-effect-parallax',
    'parallax',
    'The moving track keeps its layout; each item’s media travels more slowly inside its clipped item.',
    { options: { layout: { itemsPerView: 1.25, gap: 16, centered: true } }, loop: true },
  ),
  example(
    'Focus',
    'carousel-effect-focus',
    'focus',
    'Items dim and shrink with distance from alignment, and the aligned item’s layers reveal as it arrives.',
    {
      options: { layout: { itemsPerView: 2.4, gap: 16, centered: true } },
      cards: true,
      loop: true,
    },
  ),
];
