import { describe, expect, it } from 'vitest';
import { sliderPresentation } from './families/slider.js';
import { resolveComponentPresentation } from './resolver.js';

const resolve = (variant: string) =>
  resolveComponentPresentation(
    sliderPresentation.definition,
    { orientation: 'horizontal', variant },
    sliderPresentation.appearance,
  );

describe('Slider bar variant (thumbless scrubbing track)', () => {
  it('resolves every variant key from the dictionary', () => {
    const variantKeys = (variant: string) =>
      resolve(variant).missingKeys.filter((key) => key.includes('-variant-'));
    expect(variantKeys('default')).toEqual([]);
    expect(variantKeys('bar')).toEqual([]);
  });

  it('adds the bar paint only for the bar variant', () => {
    const selectors = (variant: string, part: string) =>
      resolve(variant).parts[part]!.map((rule) => rule.selector ?? '&');
    expect(selectors('bar', 'slider-range')).toContain('&::after');
    expect(selectors('default', 'slider-range')).not.toContain('&::after');
    const thumb = resolve('bar').parts['slider-thumb']!;
    expect(thumb.some((rule) => rule.declarations.background === 'transparent')).toBe(true);
    const root = resolve('bar').parts.slider!;
    expect(root.some((rule) => '--_tp-slider-bar-size' in rule.declarations)).toBe(true);
  });
});
