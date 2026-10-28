import type { PresentationDeclarations } from '../../resolver.js';

const checkerLayer =
  'linear-gradient(45deg, var(--tp-muted) 25%, transparent 25% 75%, var(--tp-muted) 75%)';

/** The corner of a swatch square (`uwg-te-req-pres-3`). */
export const swatchCorner = 'var(--tp-radius-md)';

/**
 * The swatch fill (`uwg-te-req-pres-3`, `uwg-cp-req-pres-2`): `paint`, an `<image>` list that
 * holds the color, over a transparency checker of `tile`-sized squares in the muted role on the
 * background role.
 */
export function swatchFill(paint: string, tile: string): PresentationDeclarations {
  return {
    'background-color': 'var(--tp-background)',
    'background-image': `${paint}, ${checkerLayer}, ${checkerLayer}`,
    'background-size': `auto, ${tile} ${tile}, ${tile} ${tile}`,
    'background-position': `0 0, 0 0, calc(${tile} / 2) calc(${tile} / 2)`,
  };
}
