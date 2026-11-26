import { describe, expect, it } from 'vitest';
import { resolveChartSeries, chartIdentifier } from '../../../../src/components/chart/payload.js';

describe('chart metadata', () => {
  const series = { desktop: { label: 'Desktop' }, mobile: { label: 'Mobile' } };
  it('uses declared then data/name/value keys, including nested engine records', () => {
    const payload = {
      dataKey: 'desktop',
      name: 'mobile',
      value: 12,
      payload: { device: 'mobile' },
    };
    expect(resolveChartSeries(series, payload, 'device').label).toBe('Mobile');
    expect(resolveChartSeries(series, payload).label).toBe('Desktop');
    expect(resolveChartSeries(series, { name: 'mobile' }).key).toBe('mobile');
    expect(resolveChartSeries(series, { value: 'desktop' }).label).toBe('Desktop');
    expect(payload.payload).toEqual({ device: 'mobile' });
  });
  it('retains unknown engine labels and uses collision-free CSS identifiers', () => {
    expect(
      resolveChartSeries(series, { dataKey: 'missing', name: 'Other', value: 3 }),
    ).toMatchObject({ key: 'missing', label: 'Other', metadata: undefined });
    expect(chartIdentifier('a:b')).not.toBe(chartIdentifier('ab'));
    expect(chartIdentifier('x] "☀')).toMatch(/^v-[a-f0-9-]+$/);
  });
});
