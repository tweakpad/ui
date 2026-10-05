import { describe, expect, it, vi } from 'vitest';
import { resolveCarouselConfiguration } from './configuration.js';
import {
  CarouselRenderGuard,
  carouselPositionText,
  carouselScrollbarActivity,
  carouselScrollbarValue,
} from './status.js';
import { carouselAutoHeightMotion, carouselScrollbarVisibilityMotion } from './transport.js';

describe('Carousel status text, scrollbar value and renderer guards', () => {
  const position = resolveCarouselConfiguration().messages.position;
  it('exposes human-readable scrollbar position text through messages.position', () => {
    expect(carouselScrollbarValue(position, { snapIndex: 2, snapCount: 8 })).toEqual({
      min: 0,
      max: 7,
      now: 2,
      text: '3 of 8',
    });
    const localized = resolveCarouselConfiguration({
      messages: { position: (index, count) => `Diapositiva ${index} de ${count}` },
    }).messages.position;
    expect(carouselScrollbarValue(localized, { snapIndex: 0, snapCount: 3 }).text).toBe(
      'Diapositiva 1 de 3',
    );
    expect(carouselPositionText(position, { snapIndex: null, snapCount: 0 })).toBe('0 of 0');
    expect(carouselScrollbarValue(position, null)).toMatchObject({ max: 0, now: 0 });
  });
  it('treats movement and transition boundaries as scrollbar activity, not mount or relayout', () => {
    const base = { initialized: true, previewProgress: 0, animating: false };
    expect(carouselScrollbarActivity(null, base)).toBe(false);
    expect(carouselScrollbarActivity({ ...base, initialized: false }, base)).toBe(false);
    expect(carouselScrollbarActivity(base, { ...base })).toBe(false);
    expect(carouselScrollbarActivity(base, { ...base, previewProgress: 0.25 })).toBe(true);
    expect(carouselScrollbarActivity(base, { ...base, animating: true })).toBe(true);
    expect(carouselScrollbarActivity({ ...base, animating: true }, base)).toBe(true);
  });
  it('cancels a throwing render and keeps the previous coherent output with a diagnostic', () => {
    const guard = new CarouselRenderGuard<string>();
    const failed = vi.fn();
    expect(
      guard.render(
        () => {
          throw new Error('first');
        },
        'fallback',
        failed,
      ),
    ).toBe('fallback');
    expect(guard.render(() => '1 / 4', 'fallback', failed)).toBe('1 / 4');
    const error = new Error('formatter');
    expect(
      guard.render(
        () => {
          throw error;
        },
        'fallback',
        failed,
      ),
    ).toBe('1 / 4');
    expect(failed).toHaveBeenLastCalledWith(error);
    expect(failed).toHaveBeenCalledTimes(2);
    guard.reset();
    expect(
      guard.render(
        () => {
          throw error;
        },
        'fallback',
        failed,
      ),
    ).toBe('fallback');
  });
  it('supplies registered motion parameters for auto-height and scrollbar visibility', () => {
    expect(carouselAutoHeightMotion(120, 180, 2)).toEqual({
      phase: 'change',
      fromState: 120,
      toState: 180,
      context: { snap: 2 },
    });
    expect(carouselScrollbarVisibilityMotion(false, true, 'vertical')).toEqual({
      phase: 'change',
      fromState: false,
      toState: true,
      context: { orientation: 'vertical' },
    });
  });
});
