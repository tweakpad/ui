import { composedParent } from '../../foundation/focus.js';

/**
 * Pure helpers for Custom cursor zones (Foundation `cc-innermost`, `cc-adoption`, `cc-stick`):
 * which hovered zone is active for a root, which custom properties a zone hands to the surface,
 * and what a layout-neutral zone's bounds are.
 */

/** A hovered zone as the registry records it. */
export interface HoveredZone<Z> {
  readonly zone: Z;
  /** Composed-tree depth of the zone; deeper zones are innermost. */
  readonly depth: number;
  /** Entry order; later entries win ties. */
  readonly order: number;
  readonly disabled: boolean;
  /** Whether the zone addresses `root`. */
  addresses(root: unknown): boolean;
}

/** The innermost enabled hovered zone addressing `root`, or null. */
export function selectActiveZone<Z>(hovered: Iterable<HoveredZone<Z>>, root: unknown): Z | null {
  let best: HoveredZone<Z> | undefined;
  for (const candidate of hovered) {
    if (candidate.disabled || !candidate.addresses(root)) continue;
    if (
      !best ||
      candidate.depth > best.depth ||
      (candidate.depth === best.depth && candidate.order > best.order)
    )
      best = candidate;
  }
  return best ? best.zone : null;
}

/** Composed-tree depth of a node (hops to the document). */
export function composedDepth(node: Node): number {
  let depth = 0;
  for (let current = composedParent(node); current; current = composedParent(current)) depth++;
  return depth;
}

/** Pointer types that drive a custom cursor (Base UI `isMouseLikePointerType`). */
export function mouseLikePointer(pointerType: string | undefined): boolean {
  return pointerType === 'mouse' || pointerType === 'pen' || pointerType === '' || !pointerType;
}

/** Custom properties a zone hands to the surface while active (CL `ccl-q4`). */
export const ADOPTED_PROPERTIES = [
  '--tp-cursor-size',
  '--tp-cursor-color',
  '--tp-cursor-blend',
  '--tp-cursor-opacity',
  '--tp-cursor-radius',
] as const;

export type AdoptedProperty = (typeof ADOPTED_PROPERTIES)[number];

/** The adoptable properties a computed style sets, by name. */
export function readAdoptedProperties(style: {
  getPropertyValue(name: string): string;
}): Map<AdoptedProperty, string> {
  const values = new Map<AdoptedProperty, string>();
  for (const name of ADOPTED_PROPERTIES) {
    const value = style.getPropertyValue(name).trim();
    if (value) values.set(name, value);
  }
  return values;
}

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The smallest box containing every rect; null when none has area. */
export function unionBounds(rects: Iterable<DOMRectReadOnly>): Bounds | null {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const rect of rects) {
    if (!(rect.width > 0 || rect.height > 0)) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (left === Infinity) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * A zone's bounds in client coordinates: its own box when it has one, otherwise the union of
 * its element children's boxes (a layout-neutral zone renders as contents).
 */
export function zoneBounds(zone: Element): Bounds | null {
  const own = zone.getBoundingClientRect();
  if (own.width > 0 || own.height > 0) return own;
  return unionBounds(
    Array.from(zone.children)
      .filter((child) => child.localName !== 'template')
      .map((child) => child.getBoundingClientRect()),
  );
}
