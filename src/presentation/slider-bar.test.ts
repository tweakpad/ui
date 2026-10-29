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
    expect(variantKeys('inline')).toEqual([]);
  });

  it('adds the bar paint only for the bar variant', () => {
    const selectors = (variant: string, part: string) =>
      resolve(variant).parts[part]!.map((rule) => rule.selector ?? '&');
    expect(selectors('bar', 'slider-range')).not.toContain('&::after');
    const range = resolve('bar').parts['slider-range']!;
    expect(range.some((rule) => rule.declarations.background === 'var(--tp-foreground)')).toBe(
      true,
    );
    const thumb = resolve('bar').parts['slider-thumb']!;
    expect(thumb.some((rule) => rule.declarations.background === 'transparent')).toBe(true);
    const root = resolve('bar').parts.slider!;
    expect(root.some((rule) => '--_tp-slider-bar-size' in rule.declarations)).toBe(true);
  });
});

describe('Slider inline variant and ticks', () => {
  const rules = (variant: string, part: string) => resolve(variant).parts[part]!;

  it('paints the inline row only on horizontal sliders', () => {
    const inline = rules('inline', 'slider-track').slice(rules('default', 'slider-track').length);
    expect(inline.length).toBeGreaterThan(0);
    expect(
      inline.every((rule) => rule.selector?.includes('&:not([data-orientation="vertical"])')),
    ).toBe(true);
    expect(inline[0]!.declarations).toMatchObject({ height: '100%', overflow: 'clip' });
  });

  it('paints the inline value edge and fill in the primary color', () => {
    const edge = rules('inline', 'slider-range').find((rule) => rule.selector?.endsWith('::after'));
    expect(edge?.declarations.background).toBe('var(--tp-primary)');
    expect(edge?.declarations.opacity).toBe('var(--_tp-slider-edge, 0)');
    expect(
      rules('inline', 'slider-range').some((rule) => rule.selector?.includes('[data-multiple]')),
    ).toBe(true);
    const root = rules('inline', 'slider');
    expect(root.some((rule) => rule.declarations['--_tp-slider-edge'] === '1')).toBe(true);
    const range = rules('inline', 'slider-range').at(-1)!;
    expect(range.declarations.background).toContain('--tp-primary');
  });

  it('draws ticks in every variant with a distinct center', () => {
    for (const variant of ['default', 'bar', 'inline'])
      expect(
        rules(variant, 'slider-tick').some((rule) => rule.selector?.includes('[data-center]')),
      ).toBe(true);
    expect(
      rules('inline', 'slider-tick').some(
        (rule) => rule.selector?.includes('[data-edge]') && rule.declarations.display === 'none',
      ),
    ).toBe(true);
  });
});
