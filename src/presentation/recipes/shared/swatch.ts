import type { PresentationDeclarations } from '../../resolver.js';

const checkerLayer = (color: string) =>
  `linear-gradient(45deg, ${color} 25%, transparent 25% 75%, ${color} 75%)`;

/** The corner of a swatch square (`uwg-te-req-pres-3`). */
export const swatchCorner = 'var(--tp-radius-md)';

/**
 * The swatch fill (`uwg-te-req-pres-3`, `uwg-cp-req-pres-2`): `paint`, an `<image>` list that
 * holds the color, over a transparency checker of `tile`-sized squares in `color` (the muted role
 * by default) on the background role.
 */
export function swatchFill(
  paint: string,
  tile: string,
  color = 'var(--tp-muted)',
): PresentationDeclarations {
  const checker = checkerLayer(color);
  return {
    'background-color': 'var(--tp-background)',
    'background-image': `${paint}, ${checker}, ${checker}`,
    'background-size': `auto, ${tile} ${tile}, ${tile} ${tile}`,
    'background-position': `0 0, 0 0, calc(${tile} / 2) calc(${tile} / 2)`,
  };
}
