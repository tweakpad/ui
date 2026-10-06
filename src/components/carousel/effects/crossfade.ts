import {
  stackEffectConstraint,
  type CarouselEffect,
  type CarouselEffectFrame,
} from '../../../foundation/carousel/effect.js';
import {
  EffectStyles,
  easeInOutCubic,
  smoothstep,
  easings,
  type CarouselEffectTiming,
} from './shared.js';

export interface CarouselCrossfadeOptions extends CarouselEffectTiming {
  /**
   * Portion of the transition during which the outgoing item stays opaque under the incoming
   * one, from 0 (simultaneous fade) to 1 (incoming covers before the outgoing fades). Default 0.5.
   */
  overlap?: number;
}

/** Opacity transition between stacked items; also the fallback for richer stack effects. */
export function carouselCrossfadeEffect(options: CarouselCrossfadeOptions = {}): CarouselEffect {
  const overlap = Math.min(1, Math.max(0, options.overlap ?? 0.5));
  return {
    name: 'crossfade',
    duration: options.duration ?? 600,
    easing: options.easing ?? easings.inOut,
    layout: 'stack',
    constrain: stackEffectConstraint('crossfade'),
    attach() {
      const styles = new EffectStyles();
      return {
        frame(frame: CarouselEffectFrame) {
          renderCrossfade(styles, frame, overlap);
        },
        detach() {
          styles.dispose();
        },
      };
    },
  };
}

/** Shared crossfade rendering, reused by effects that fall back to it. */
export function renderCrossfade(
  styles: EffectStyles,
  frame: CarouselEffectFrame,
  overlap = 0.5,
): void {
  for (const item of frame.items) {
    if (item === frame.current) {
      styles.set(item.shell, 'opacity', String(1 - smoothstep(overlap, 1, frame.amount)));
      styles.set(item.shell, 'z-index', '1');
    } else if (item === frame.next) {
      styles.set(item.shell, 'opacity', String(easeInOutCubic(frame.amount)));
      styles.set(item.shell, 'z-index', '2');
    } else {
      styles.set(item.shell, 'opacity', '0');
      styles.set(item.shell, 'z-index', '0');
    }
  }
}
