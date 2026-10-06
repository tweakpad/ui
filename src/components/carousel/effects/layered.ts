import {
  stackEffectConstraint,
  type CarouselEffect,
  type CarouselEffectContext,
  type CarouselEffectFrame,
  type CarouselEffectItem,
} from '../../../foundation/carousel/effect.js';
import {
  EffectStyles,
  carouselItemLayers,
  carouselItemMedia,
  clamp01,
  easeOutCubic,
  smoothstep,
  easings,
  type CarouselEffectTiming,
} from './shared.js';

export interface CarouselLayeredOptions extends CarouselEffectTiming {
  /** Perspective distance in pixels for the media rotation. Default 1200. */
  perspective?: number;
  /** Rotation of the outgoing media at the end of its exit, in degrees. Default 70. */
  rotation?: number;
  /** Scale both media reach while turned away. Default 0.6. */
  depthScale?: number;
  /** Distance `data-carousel-layer` elements rise while revealing, in pixels. Default 32. */
  rise?: number;
  /** Delay between successive layers as a fraction of the transition. Default 0.12. */
  stagger?: number;
}

/**
 * Stacked 3D transition: the outgoing media turns away and recedes, the incoming media turns
 * in, then its `data-carousel-layer` elements reveal in order. Every value is a function of
 * the frame, so drags scrub the whole choreography.
 */
export function carouselLayeredEffect(options: CarouselLayeredOptions = {}): CarouselEffect {
  const perspective = options.perspective ?? 1200;
  const rotation = options.rotation ?? 70;
  const depthScale = options.depthScale ?? 0.6;
  const rise = options.rise ?? 32;
  const stagger = options.stagger ?? 0.12;
  return {
    name: 'layered',
    duration: options.duration ?? 1000,
    easing: options.easing ?? easings.inOut,
    layout: 'stack',
    constrain: stackEffectConstraint('layered'),
    attach(context: CarouselEffectContext) {
      const styles = new EffectStyles();
      const axis = context.orientation === 'horizontal' ? 'y' : 'x';
      const sign = context.direction === 'rtl' ? -1 : 1;
      const media = (item: CarouselEffectItem, turn: number, scale: number, opacity: number) => {
        const target = carouselItemMedia(item) ?? item.shell;
        styles.set(
          target,
          'transform',
          `perspective(${perspective}px) rotate${axis.toUpperCase()}(${turn}deg) scale(${scale})`,
        );
        styles.set(target, 'opacity', String(opacity));
        styles.set(target, 'backface-visibility', 'hidden');
      };
      const layers = (item: CarouselEffectItem, reveal: (order: number) => number) => {
        carouselItemLayers(item).forEach((layer, order) => {
          const amount = reveal(order);
          styles.set(layer, 'opacity', String(amount));
          styles.set(
            layer,
            'translate',
            context.orientation === 'horizontal'
              ? `0 ${(1 - amount) * rise}px`
              : `${(1 - amount) * rise}px 0`,
          );
        });
      };
      return {
        frame(frame: CarouselEffectFrame) {
          const { current, next, amount } = frame;
          for (const item of frame.items) {
            if (item !== current && item !== next) continue;
            styles.set(item.shell, 'z-index', item === next && amount > 0.5 ? '2' : '1');
          }
          if (current) {
            // Exit in the first part of the transition, accelerating away.
            const exit = clamp01(amount / 0.55) ** 2;
            media(
              current,
              sign * exit * rotation,
              1 - exit * (1 - depthScale),
              1 - smoothstep(0.35, 0.6, amount),
            );
            layers(current, () => 1 - smoothstep(0, 0.3, amount));
          }
          if (next) {
            // Enter in the second part, decelerating into place.
            const enter = easeOutCubic(clamp01((amount - 0.3) / 0.6));
            media(
              next,
              -sign * (1 - enter) * (rotation + 20),
              depthScale + enter * (1 - depthScale),
              smoothstep(0.3, 0.5, amount),
            );
            // Each window ends at arrival so layers are complete when the item settles.
            layers(next, (order) => {
              const start = Math.min(0.45 + order * stagger, 0.9);
              return easeOutCubic(clamp01((amount - start) / (1 - start)));
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
