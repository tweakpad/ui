import type {
  CarouselEffect,
  CarouselEffectContext,
  CarouselEffectFrame,
} from '../../../foundation/carousel/effect.js';
import {
  EffectStyles,
  carouselItemLayers,
  clamp01,
  easeOutCubic,
  easings,
  type CarouselEffectTiming,
} from './shared.js';

export interface CarouselFocusOptions extends CarouselEffectTiming {
  /** Opacity of items one pitch or more from alignment. Default 0.35. */
  dim?: number;
  /** Scale of items one pitch or more from alignment. Default 0.9. */
  scale?: number;
  /** Distance `data-carousel-layer` elements rise while revealing, in pixels. Default 24. */
  rise?: number;
}

/**
 * Moving-track emphasis: items dim and shrink with distance from alignment, and the aligned
 * item's `data-carousel-layer` elements reveal in order as it arrives.
 */
export function carouselFocusEffect(options: CarouselFocusOptions = {}): CarouselEffect {
  const dim = clamp01(options.dim ?? 0.35);
  const minimum = options.scale ?? 0.9;
  const rise = options.rise ?? 24;
  return {
    name: 'focus',
    duration: options.duration ?? 800,
    easing: options.easing ?? easings.out,
    layout: 'track',
    attach(context: CarouselEffectContext) {
      const styles = new EffectStyles();
      const horizontal = context.orientation === 'horizontal';
      return {
        frame(frame: CarouselEffectFrame) {
          for (const item of frame.items) {
            const distance = clamp01(Math.abs(item.progress));
            styles.set(item.shell, 'opacity', String(1 - distance * (1 - dim)));
            styles.set(item.shell, 'scale', String(1 - distance * (1 - minimum)));
            const arrival = clamp01(1 - distance / 0.6);
            carouselItemLayers(item).forEach((layer, order) => {
              const start = Math.min(order * 0.12, 0.6);
              const reveal = easeOutCubic(clamp01((arrival - start) / (1 - start)));
              styles.set(layer, 'opacity', String(reveal));
              styles.set(
                layer,
                'translate',
                horizontal ? `0 ${(1 - reveal) * rise}px` : `${(1 - reveal) * rise}px 0`,
              );
            });
          }
        },
        detach() {
          styles.dispose();
        },
      };
    },
  };
}
