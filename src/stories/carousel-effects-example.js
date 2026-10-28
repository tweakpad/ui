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

/** Attach the effect named by data-effect; optional option selects switch shader options. */
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
    const controls = [...root.querySelectorAll('[data-option]')];
    if (controls.length && carousel.dataset.effect === 'shader') {
      // Option selects (variant, direction) rebuild the effect with every selected value.
      const selected = {};
      const change = (event) => {
        const value = event.detail.value;
        if (!value) return;
        selected[event.currentTarget.dataset.option] = value;
        carousel.effect = create(selected);
      };
      for (const control of controls) {
        control.addEventListener('tp-value-change', change);
        cleanups.push(() => control.removeEventListener('tp-value-change', change));
      }
    }
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const carousel of carousels) carousel.effect = null;
  };
}
