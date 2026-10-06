import {
  carouselCrossfadeEffect,
  carouselFocusEffect,
  carouselLayeredEffect,
  carouselParallaxEffect,
  carouselShaderEffect,
} from '../components/carousel/effects/index.js';

const factories = {
  crossfade: carouselCrossfadeEffect,
  focus: carouselFocusEffect,
  layered: carouselLayeredEffect,
  parallax: carouselParallaxEffect,
  shader: carouselShaderEffect,
};

/** Attach the effect named by data-effect; an optional variant group switches shader looks. */
export function setupCarouselEffectExample(root) {
  const carousels = [...root.querySelectorAll('tp-carousel[data-effect]')];
  const cleanups = [];
  for (const carousel of carousels) {
    if (carousel.dataset.options) carousel.options = JSON.parse(carousel.dataset.options);
    const create = (options = {}) =>
      factories[carousel.dataset.effect]({
        ...JSON.parse(carousel.dataset.effectOptions || '{}'),
        ...options,
      });
    carousel.effect = create();
    const variants = root.querySelector('tp-toggle-group[data-variants]');
    if (variants && carousel.dataset.effect === 'shader') {
      const change = (event) => {
        const [variant] = event.detail.value;
        if (variant) carousel.effect = create({ variant });
      };
      variants.addEventListener('tp-value-change', change);
      cleanups.push(() => variants.removeEventListener('tp-value-change', change));
    }
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const carousel of carousels) carousel.effect = null;
  };
}
