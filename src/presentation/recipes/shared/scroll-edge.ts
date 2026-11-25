/**
 * Scroll-edge fades: an alpha mask on the scroll container itself. Geometry is supplied by the
 * shared native scroll adapter.
 */
export const scrollEdgeCss = `
[data-tp-scroll-edge-mask] {
  mask-image: var(--_tp-scroll-edge-image);
  mask-composite: var(--_tp-scroll-edge-composite);
  mask-size: var(--_tp-scroll-edge-size);
  mask-position: var(--_tp-scroll-edge-position);
  mask-repeat: no-repeat;
  mask-clip: no-clip;
}
@media (forced-colors: active) {
  [data-tp-scroll-edge-mask] { mask-image: none; }
}
`;
/** Color stops per band: enough that the eased curve shows no steps. */
const RAMP_STEPS = 8;
/**
 * How far the mask reaches past the container's border box, opaque: the container's own focus
 * ring and outer shadow are drawn there and never fade.
 */
const OUTSET = 64;
/** One edge's fade: a fixed width, and how strongly it fades (0 none, 1 to transparent). */
export interface ScrollEdgeBand {
  size: number;
  strength: number;
}
export interface ScrollEdgeMaskRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
/**
 * The fade of one scroll container, in its own border-box coordinates. The mask stays fixed to
 * the container while the content scrolls under it, so it never trails a fast or inertial scroll.
 * Each band keeps its width and place; only its strength changes, near the ends of the range.
 *
 * The bands fade inward from the edges of `visible`, the scrollport without the owner's chrome
 * (a sticky header or footer, scroll buttons). Everything outside `visible` stays opaque, including
 * the container's own focus ring and shadow outside its border box, and so
 * do the `islands`: content that keeps its place in the scrollport, such as sticky asides, the
 * focused control or a highlighted option.
 */
export function scrollEdgeMask(
  box: { width: number; height: number },
  visible: ScrollEdgeMaskRect,
  bands: {
    left: ScrollEdgeBand;
    right: ScrollEdgeBand;
    top: ScrollEdgeBand;
    bottom: ScrollEdgeBand;
  },
  islands: readonly ScrollEdgeMaskRect[],
  original: string,
  /** How far the container's own focus ring reaches inside its border box; it stays opaque. */
  ring = 0,
) {
  const px = (value: number) => `${Math.round(value * 1000) / 1000}px`;
  const color = (alpha: number) => {
    const rounded = Math.round(alpha * 1000) / 1000;
    return rounded >= 1 ? '#000' : rounded <= 0 ? 'transparent' : `rgb(0 0 0 / ${rounded})`;
  };
  // A band eases from its edge to full opacity along a smoothstep curve, flat at both ends: a
  // linear ramp starts with a kink the eye reads as a bright line where the fade begins.
  const ramp = (edge: number, inner: number, band: ScrollEdgeBand) => {
    const strength = Math.min(1, Math.max(0, band.strength));
    if (!strength || !band.size) return [];
    return Array.from({ length: RAMP_STEPS + 1 }, (_, step) => {
      const t = step / RAMP_STEPS;
      const eased = t * t * (3 - 2 * t);
      return `${color(1 - strength * (1 - eased))} ${px(edge + (inner - edge) * t)}`;
    });
  };
  const axis = (
    direction: string,
    length: number,
    from: number,
    to: number,
    start: ScrollEdgeBand,
    end: ScrollEdgeBand,
  ) =>
    `linear-gradient(${[
      `${direction}`,
      '#000 0px',
      `#000 ${px(from)}`,
      ...ramp(from, from + start.size, start),
      ...ramp(to, to - end.size, end).reverse(),
      `#000 ${px(to)}`,
      `#000 ${px(length)}`,
    ].join(',')})`;
  const x = axis(
    'to right',
    box.width,
    visible.left,
    visible.left + visible.width,
    bands.left,
    bands.right,
  );
  const y = axis(
    'to bottom',
    box.height,
    visible.top,
    visible.top + visible.height,
    bands.top,
    bands.bottom,
  );
  const whole = `${px(box.width)} ${px(box.height)}`;
  // Opaque strips around the border box, reaching `ring` inside it: the container's own focus
  // ring and shadow never fade.
  const r = Math.max(0, Math.min(ring, box.width / 2, box.height / 2));
  const frame: ScrollEdgeMaskRect[] = [
    { left: -OUTSET, top: -OUTSET, width: box.width + 2 * OUTSET, height: OUTSET + r },
    { left: -OUTSET, top: box.height - r, width: box.width + 2 * OUTSET, height: OUTSET + r },
    { left: -OUTSET, top: 0, width: OUTSET + r, height: box.height },
    { left: box.width - r, top: 0, width: OUTSET + r, height: box.height },
  ];
  const solid = [...frame, ...islands];
  const images = solid.map(() => 'linear-gradient(#000,#000)');
  const sizes = solid.map((r) => `${px(r.width)} ${px(r.height)}`);
  const positions = solid.map((r) => `${px(r.left)} ${px(r.top)}`);
  const composites = solid.map(() => 'add');
  images.push(x, y);
  sizes.push(whole, whole);
  positions.push('0px 0px', '0px 0px');
  composites.push('intersect', original === 'none' ? 'add' : 'intersect');
  if (original !== 'none') {
    images.push(original);
    sizes.push('auto');
    positions.push('0 0');
    composites.push('add');
  }
  return {
    image: images.join(','),
    size: sizes.join(','),
    position: positions.join(','),
    composite: composites.join(','),
  };
}
