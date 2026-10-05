import { describe, expect, it } from 'vitest';
import { resolveCarouselConfiguration, matchCarouselBreakpoint } from './configuration.js';

describe('Carousel coherent configuration', () => {
  it('diagnoses explicit transform-only native options without rejecting supported native controls', () => {
    const messages: string[] = [];
    const config = resolveCarouselConfiguration(
      { transport: 'scroll', interaction: { resistance: false, allowNext: false } },
      {},
      null,
      undefined,
      (message) => messages.push(message),
    );
    expect(config.transport).toBe('scroll');
    expect(config.interaction.allowNext).toBe(false);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('resistance');
    expect(messages[0]).not.toContain('allowNext');
    messages.length = 0;
    resolveCarouselConfiguration({ transport: 'scroll' }, {}, null, undefined, (message) =>
      messages.push(message),
    );
    expect(messages).toEqual([]);
  });
  it('merges declared fields without mutating base or retaining an old breakpoint', () => {
    const options = Object.freeze({
      layout: Object.freeze({ gap: 12 }),
      breakpoints: {
        '600.5': { layout: { itemsPerView: 2 } },
        '@2': { layout: { itemsPerView: 3 } },
      },
    });
    expect(matchCarouselBreakpoint(options.breakpoints, 600.4, 400)).toBe(null);
    expect(matchCarouselBreakpoint(options.breakpoints, 600.5, 400)).toBe('600.5');
    expect(matchCarouselBreakpoint(options.breakpoints, 900, 400)).toBe('@2');
    expect(resolveCarouselConfiguration(options, {}, '600.5').layout).toMatchObject({
      gap: 12,
      itemsPerView: 2,
    });
    expect(resolveCarouselConfiguration(options).layout.itemsPerView).toBe(1);
  });
  it('rejects an invalid initial group atomically and retains a coherent later configuration', () => {
    const initial = resolveCarouselConfiguration({ layout: { gap: 12, itemsPerView: NaN } });
    expect(initial.layout.gap).toBe(0);
    const previous = resolveCarouselConfiguration({ layout: { gap: 12 } });
    expect(resolveCarouselConfiguration({ layout: { gap: -1 } }, {}, null, previous)).toBe(
      previous,
    );
  });
  it('ignores inherited configuration and prototype keys while accepting foreign plain objects', () => {
    const layout = Object.assign(Object.create(null), { gap: '12.5%' });
    expect(resolveCarouselConfiguration({ layout }).layout.gap).toBe('12.5%');
    expect(resolveCarouselConfiguration(Object.create({ layout: { gap: 99 } })).layout.gap).toBe(0);
    const options = JSON.parse('{"layout":{"__proto__":{"polluted":true},"gap":2}}');
    expect(resolveCarouselConfiguration(options).layout.gap).toBe(2);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
  it('validates incompatible groups and closed breakpoint fields', () => {
    const messages: string[] = [];
    const config = resolveCarouselConfiguration(
      { layout: { centered: true, centeredBounds: true } },
      {},
      null,
      undefined,
      (m) => messages.push(m),
    );
    expect(config.layout.centeredBounds).toBe(false);
    expect(messages.length).toBeGreaterThan(0);
    const next = resolveCarouselConfiguration(
      { breakpoints: { '0': { transport: 'scroll' } } } as never,
      {},
      '0',
    );
    expect(next.transport).toBe('transform');
  });
  it('rejects environment-invalid groups before activation and preserves the last coherent configuration', () => {
    const validate = (group: string) =>
      group !== 'interaction' && group !== 'virtual' && group !== 'breakpointsBase';
    const options = {
      interaction: { threshold: 25, noSwipeSelector: '[' },
      virtual: {},
      breakpointsBase: '#missing',
    };
    const initial = resolveCarouselConfiguration(options, {}, null, undefined, () => {}, validate);
    expect(initial.interaction.threshold).toBe(5);
    expect(initial.virtual).toBe(false);
    expect(initial.breakpointsBase).toBe('window');
    const coherent = resolveCarouselConfiguration({ layout: { gap: 7 } });
    expect(resolveCarouselConfiguration(options, {}, null, coherent, () => {}, validate)).toBe(
      coherent,
    );
  });
});
