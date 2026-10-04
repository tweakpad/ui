import { describe, expect, it } from 'vitest';
import { resolveVisualizationSeries, visualizationIdentifier } from './payload.js';

describe('visualization metadata', () => {
  const series = { desktop: { label: 'Desktop' }, mobile: { label: 'Mobile' } };
  it('uses declared then data/name/value keys, including nested engine records', () => {
    const payload = {
      dataKey: 'desktop',
      name: 'mobile',
      value: 12,
      payload: { device: 'mobile' },
    };
    expect(resolveVisualizationSeries(series, payload, 'device').label).toBe('Mobile');
    expect(resolveVisualizationSeries(series, payload).label).toBe('Desktop');
    expect(resolveVisualizationSeries(series, { name: 'mobile' }).key).toBe('mobile');
    expect(resolveVisualizationSeries(series, { value: 'desktop' }).label).toBe('Desktop');
    expect(payload.payload).toEqual({ device: 'mobile' });
  });
  it('retains unknown engine labels and uses collision-free CSS identifiers', () => {
    expect(
      resolveVisualizationSeries(series, { dataKey: 'missing', name: 'Other', value: 3 }),
    ).toMatchObject({ key: 'missing', label: 'Other', metadata: undefined });
    expect(visualizationIdentifier('a:b')).not.toBe(visualizationIdentifier('ab'));
    expect(visualizationIdentifier('x] "☀')).toMatch(/^v-[a-f0-9-]+$/);
  });
});
