/** Content-only alpha masks. Geometry is supplied by the shared native scroll adapter. */
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
export interface ScrollEdgeMaskRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
/**
 * One product of two edge gradients, plus opaque islands preserving sticky/fixed chrome. The
 * masks are applied in the content's coordinates, so they move with it until the next measure: a
 * side without a fade band reaches the edge of `content`, so a scroll never uncovers it.
 */
export function scrollEdgeMask(
  rect: ScrollEdgeMaskRect,
  bands: { left: number; right: number; top: number; bottom: number },
  protectedRects: readonly ScrollEdgeMaskRect[],
  original: string,
  content?: { width: number; height: number },
) {
  const px = (value: number) => `${Math.round(value * 1000) / 1000}px`;
  // Each side without a band reaches the content's edge.
  const left = content && !bands.left ? Math.min(0, rect.left) : rect.left;
  const top = content && !bands.top ? Math.min(0, rect.top) : rect.top;
  const right =
    content && !bands.right
      ? Math.max(content.width, rect.left + rect.width)
      : rect.left + rect.width;
  const bottom =
    content && !bands.bottom
      ? Math.max(content.height, rect.top + rect.height)
      : rect.top + rect.height;
  const box = { left, top, width: right - left, height: bottom - top };
  const x = `linear-gradient(to right,transparent 0px,#000 ${px(bands.left)},#000 ${px(box.width - bands.right)},transparent ${px(box.width)})`;
  const y = `linear-gradient(to bottom,transparent 0px,#000 ${px(bands.top)},#000 ${px(box.height - bands.bottom)},transparent ${px(box.height)})`;
  const images = protectedRects.map(() => 'linear-gradient(#000,#000)');
  const sizes = protectedRects.map((r) => `${px(r.width)} ${px(r.height)}`);
  const positions = protectedRects.map((r) => `${px(r.left)} ${px(r.top)}`);
  const composites = protectedRects.map(() => 'add');
  images.push(x, y);
  sizes.push(`${px(box.width)} ${px(box.height)}`, `${px(box.width)} ${px(box.height)}`);
  positions.push(`${px(box.left)} ${px(box.top)}`, `${px(box.left)} ${px(box.top)}`);
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
