import { describe, expect, it } from 'vitest';
import { MAP_CORNERS, parseMapControls } from './map.js';

describe('tp-map floating controls', () => {
  it('parses actions in authored order, ignoring unknown and repeated tokens', () => {
    expect(parseMapControls('reset, zoom-in zoom-in  pan fit-pins')).toEqual([
      'reset',
      'zoom-in',
      'fit-pins',
    ]);
    expect(parseMapControls(['zoom-out'])).toEqual(['zoom-out']);
    expect(parseMapControls('')).toEqual([]);
    expect(parseMapControls(null)).toEqual([]);
  });

  it('offers four logical corners', () => {
    expect(MAP_CORNERS).toEqual(['top-start', 'top-end', 'bottom-start', 'bottom-end']);
  });
});
