import type {
  CarouselEffect,
  CarouselEffectContext,
  CarouselEffectFrame,
} from '../../../foundation/carousel/effect.js';
import { parallaxGeometry } from '../../../foundation/parallax.js';
import { EffectStyles, carouselItemMedia, easings, type CarouselEffectTiming } from './shared.js';

export interface CarouselParallaxOptions extends CarouselEffectTiming {
  /**
   * How much the `data-carousel-media` element lags behind its item, as extra media scale.
   * 0.3 enlarges the media 30% and lets it travel within that overflow. Default 0.3.
   */
  depth?: number;
}

/**
 * Moving-track parallax: each item's media is enlarged inside its clipped item and travels
 * more slowly than the item. Positions derive from item progress, so loops and drags stay
 * continuous and no layout is read per frame.
 */
export function carouselParallaxEffect(options: CarouselParallaxOptions = {}): CarouselEffect {
  const depth = Math.max(0, options.depth ?? 0.3);
  return {
    name: 'parallax',
    duration: options.duration ?? 900,
    easing: options.easing ?? easings.out,
    layout: 'track',
    attach(context: CarouselEffectContext) {
      const styles = new EffectStyles();
      const horizontal = context.orientation === 'horizontal';
      const sign = horizontal && context.direction === 'rtl' ? -1 : 1;
      const geometry = parallaxGeometry(depth);
      const scale = geometry.scale;
      const travel = geometry.travel * 100;
      return {
        frame(frame: CarouselEffectFrame) {
          for (const item of frame.items) {
            const media = carouselItemMedia(item);
            if (!media) continue;
            styles.set(item.shell, 'overflow', 'clip');
            const offset = -Math.max(-1, Math.min(1, item.progress)) * travel * sign;
            styles.set(media, 'scale', String(scale));
            styles.set(media, 'translate', horizontal ? `${offset}% 0` : `0 ${offset}%`);
          }
        },
        detach() {
          styles.dispose();
        },
      };
    },
  };
}
