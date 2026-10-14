import { describe, expect, it } from 'vitest';
import {
  carouselCrossfadeEffect,
  carouselFocusEffect,
  carouselLayeredEffect,
  carouselParallaxEffect,
  carouselShaderEffect,
} from './index.js';

describe('carousel effect timing defaults', () => {
  it('leave the easing to the motion roles unless one is given', () => {
    for (const effect of [
      carouselCrossfadeEffect(),
      carouselLayeredEffect(),
      carouselShaderEffect(),
    ])
      expect([effect.easing, effect.easingRole]).toEqual([undefined, undefined]);
    // Track effects whose items arrive along the track settle on the enter role.
    for (const effect of [carouselParallaxEffect(), carouselFocusEffect()])
      expect([effect.easing, effect.easingRole]).toEqual([undefined, 'enter']);
    expect(carouselCrossfadeEffect({ easing: 'linear' }).easing).toBe('linear');
    expect(carouselCrossfadeEffect().duration).toBe(600);
  });
});
