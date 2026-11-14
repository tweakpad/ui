import { describe, expect, it } from 'vitest';
import {
  crosshairOption,
  jsonAxisOption,
  jsonOption,
} from '../../../../src/widgets/plot/geometry.js';

describe('Plot JSON attributes', () => {
  it('parses object options and restores the default when the attribute is removed', () => {
    const data = jsonOption({});
    expect(data.fromAttribute('{"price":[[0,712.8],[1,null]]}')).toEqual({
      price: [
        [0, 712.8],
        [1, null],
      ],
    });
    expect(data.fromAttribute(null)).toEqual({});
    expect(jsonOption([]).fromAttribute(null)).toEqual([]);
  });

  it('passes text that is not JSON through, for validation to report', () => {
    expect(jsonOption([]).fromAttribute('[{"id":')).toBe('[{"id":');
  });

  it('reads axes and the legend as hidden, default or configured', () => {
    expect(jsonAxisOption.fromAttribute(null)).toBe(false);
    expect(jsonAxisOption.fromAttribute('false')).toBe(false);
    expect(jsonAxisOption.fromAttribute('')).toEqual({});
    expect(jsonAxisOption.fromAttribute('{"type":"time"}')).toEqual({ type: 'time' });
  });

  it('reads the crosshair as a Boolean attribute or JSON options', () => {
    expect(crosshairOption.fromAttribute(null)).toBe(false);
    expect(crosshairOption.fromAttribute('')).toBe(true);
    expect(crosshairOption.fromAttribute('false')).toBe(false);
    expect(crosshairOption.fromAttribute('{"hint":"bottom"}')).toEqual({ hint: 'bottom' });
  });
});
