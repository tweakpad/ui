/**
 * Visible block extent of a control packed against its neighbours. It cannot expand its
 * pointer target without overlapping them, so the theme raises it to the minimum
 * accessible target only for coarse pointers (`--_tp-coarse-target` in styles.css).
 */
export const coarseTarget = 'var(--_tp-coarse-target, 0px)';

export function packedExtent(extent: string): string {
  return `max(${extent}, ${coarseTarget})`;
}
