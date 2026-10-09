/** DOM geometry port from dnd-kit utilities/shapes, transform and frame (MIT).
 * See LICENSE.dnd-kit. Owner realms, normalized negative scales and finite
 * measurements implement the adopted A12/A13/A22 corrections.
 */
import { Rectangle, validRectangle, type BoundingRectangle, type Coordinates } from './geometry.js';
import { composedParent } from '../focus.js';
import { visualViewportBox } from '../scroll.js';

export interface Transform extends Coordinates {
  scaleX: number;
  scaleY: number;
  z?: number;
}
const identity = (): Transform => ({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
const values = (value: string) =>
  value
    .trim()
    .split(/[\s,]+/)
    .map(Number.parseFloat);

export function parseTransform(styles: {
  transform?: string;
  translate?: string;
  scale?: string;
}): Transform | null {
  const result = identity();
  let found = false;
  const matrix = styles.transform?.match(/^matrix(3d)?\(([^)]+)\)$/);
  if (matrix) {
    const parts = values(matrix[2]!);
    const indices = matrix[1] ? [12, 13, 0, 5] : [4, 5, 0, 3];
    if (parts.length !== (matrix[1] ? 16 : 6) || parts.some((v) => !Number.isFinite(v)))
      return null;
    result.x = parts[indices[0]!]!;
    result.y = parts[indices[1]!]!;
    result.scaleX = parts[indices[2]!]!;
    result.scaleY = parts[indices[3]!]!;
    found = true;
  }
  if (styles.translate && styles.translate !== 'none') {
    const [x = NaN, y = 0, z = 0] = values(styles.translate);
    if (![x, y, z].every(Number.isFinite)) return null;
    result.x += x;
    result.y += y;
    result.z = z;
    found = true;
  }
  if (styles.scale && styles.scale !== 'none') {
    const [x = NaN, y = x] = values(styles.scale);
    if (![x, y].every(Number.isFinite)) return null;
    result.scaleX *= x;
    result.scaleY *= y;
    found = true;
  }
  return found ? result : null;
}

function origin(value: string, rect: BoundingRectangle): Coordinates {
  const [x = '0', y = '0'] = value.trim().split(/\s+/);
  const axis = (v: string, size: number) =>
    v.endsWith('%') ? (Number.parseFloat(v) * size) / 100 : Number.parseFloat(v);
  return { x: axis(x, rect.width) || 0, y: axis(y, rect.height) || 0 };
}

export function applyTransform(
  rect: BoundingRectangle,
  transform: Transform,
  transformOrigin = '0 0',
): Rectangle {
  const pivot = origin(transformOrigin, rect);
  const width = rect.width * transform.scaleX,
    height = rect.height * transform.scaleY;
  return new Rectangle(
    rect.left + transform.x + (1 - transform.scaleX) * pivot.x + Math.min(0, width),
    rect.top + transform.y + (1 - transform.scaleY) * pivot.y + Math.min(0, height),
    Math.abs(width),
    Math.abs(height),
  );
}

export function inverseTransform(
  rect: BoundingRectangle,
  transform: Transform,
  transformOrigin = '0 0',
): Rectangle {
  if (!transform.scaleX || !transform.scaleY)
    throw new RangeError('A zero-scale element has no measurable inverse rectangle.');
  const width = rect.width / Math.abs(transform.scaleX),
    height = rect.height / Math.abs(transform.scaleY);
  const pivot = origin(transformOrigin, { ...rect, width, height });
  return new Rectangle(
    rect.left -
      transform.x -
      (1 - transform.scaleX) * pivot.x -
      Math.min(0, width * transform.scaleX),
    rect.top -
      transform.y -
      (1 - transform.scaleY) * pivot.y -
      Math.min(0, height * transform.scaleY),
    width,
    height,
  );
}

/** Coordinates are expressed in the highest accessible same-origin viewport. */
export function getFrameTransform(element: Element): Transform {
  const result = identity();
  let view = element.ownerDocument.defaultView;
  while (view) {
    let frame: Element | null;
    try {
      frame = view.frameElement;
    } catch {
      break;
    }
    if (!frame) break;
    const rect = frame.getBoundingClientRect();
    const box = frame as HTMLElement;
    const sign = ancestorScale(frame, true);
    const sx = (box.offsetWidth ? rect.width / box.offsetWidth : 1) * Math.sign(sign.x || 1);
    const sy = (box.offsetHeight ? rect.height / box.offsetHeight : 1) * Math.sign(sign.y || 1);
    result.x = (sx < 0 ? rect.right : rect.left) + ((box.clientLeft || 0) + result.x) * sx;
    result.y = (sy < 0 ? rect.bottom : rect.top) + ((box.clientTop || 0) + result.y) * sy;
    result.scaleX *= sx;
    result.scaleY *= sy;
    view = frame.ownerDocument.defaultView;
  }
  return result;
}

export function frameCoordinates(element: Element, point: Coordinates): Coordinates {
  const frame = getFrameTransform(element);
  return { x: frame.x + point.x * frame.scaleX, y: frame.y + point.y * frame.scaleY };
}

function projectedTransform(element: Element, styles: CSSStyleDeclaration): Transform | null {
  const final = { transform: styles.transform, translate: styles.translate, scale: styles.scale };
  let found = false;
  for (const animation of element.getAnimations?.() ?? []) {
    if (animation.playState !== 'running') continue;
    const effect = animation.effect as KeyframeEffect | null;
    const frames = effect?.getKeyframes?.();
    const frame = frames?.[frames.length - 1];
    if (!frame) continue;
    for (const key of ['transform', 'translate', 'scale'] as const) {
      if (typeof frame[key] === 'string' && frame[key]) {
        final[key] = frame[key];
        found = true;
      }
    }
  }
  return found ? parseTransform(final) : null;
}

function projectAncestorAnimations(element: Element): () => void {
  const restores: Array<() => void> = [];
  try {
    for (let node = composedParent(element); node; node = composedParent(node)) {
      if (node.nodeType !== 1) continue;
      for (const animation of (node as Element).getAnimations?.() ?? []) {
        const effect = animation.effect as KeyframeEffect | null;
        if (effect?.target !== node || animation.pending || animation.playState !== 'running')
          continue;
        if (
          !effect
            .getKeyframes()
            .some((f) =>
              ['transform', 'translate', 'scale', 'width', 'height'].some(
                (p) => f[p] !== undefined,
              ),
            )
        )
          continue;
        const time = animation.currentTime,
          end = effect.getComputedTiming().endTime;
        if (
          typeof time !== 'number' ||
          typeof end !== 'number' ||
          !Number.isFinite(end) ||
          time >= end
        )
          continue;
        restores.push(() => {
          if (animation.currentTime === end) animation.currentTime = time;
        });
        animation.currentTime = end;
      }
    }
  } catch (error) {
    for (const restore of restores.reverse()) restore();
    throw error;
  }
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

export class DOMRectangle extends Rectangle {
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
  constructor(
    element: Element,
    options: {
      ignoreTransforms?: boolean;
      frameTransform?: Transform | null;
      getBoundingClientRect?: (element: Element) => BoundingRectangle;
    } = {},
  ) {
    const view = element.ownerDocument.defaultView;
    if (!view || !element.isConnected)
      throw new Error('Drag measurement requires a connected element and owner window.');
    const restore = projectAncestorAnimations(element);
    let rect: Rectangle, intrinsic: Rectangle, scale: Coordinates;
    try {
      rect = Rectangle.from(
        options.getBoundingClientRect?.(element) ?? element.getBoundingClientRect(),
      );
      const styles = view.getComputedStyle(element);
      const transform = parseTransform(styles);
      intrinsic = transform ? inverseTransform(rect, transform, styles.transformOrigin) : rect;
      const projected = projectedTransform(element, styles);
      scale = { x: transform?.scaleX ?? 1, y: transform?.scaleY ?? 1 };
      if (options.ignoreTransforms) rect = intrinsic;
      else if (projected) {
        rect = applyTransform(intrinsic, projected, styles.transformOrigin);
        scale = { x: projected.scaleX, y: projected.scaleY };
      }
      const frame =
        options.frameTransform === undefined ? getFrameTransform(element) : options.frameTransform;
      if (frame) {
        rect = applyTransform(rect, frame);
        scale.x *= frame.scaleX;
        scale.y *= frame.scaleY;
      }
      if (!validRectangle(rect, true))
        throw new Error('Drag measurement requires a nonempty finite rectangle.');
    } finally {
      restore();
    }
    super(rect.left, rect.top, rect.width, rect.height);
    const ancestors = ancestorScale(element);
    this.scale = { x: scale.x * ancestors.x, y: scale.y * ancestors.y };
    this.intrinsicWidth = intrinsic.width;
    this.intrinsicHeight = intrinsic.height;
  }
}

export function measureElement(
  element: Element | null | undefined,
  ignoreTransforms = false,
): DOMRectangle | undefined {
  if (!element?.isConnected) return;
  try {
    return new DOMRectangle(element, { ignoreTransforms });
  } catch {
    return undefined;
  }
}

export function viewportRectangle(element: Element): Rectangle | undefined {
  const view = element.ownerDocument.defaultView;
  if (!view) return;
  const { x, y, width, height } = visualViewportBox(view);
  return applyTransform(new Rectangle(x, y, width, height), getFrameTransform(element));
}

/** Only browser CSS transitions conflicting with final geometry are canceled. */
export function cancelGeometryTransitions(element: Element): void {
  for (const animation of element.getAnimations?.() ?? []) {
    if (
      'transitionProperty' in animation &&
      ['transform', 'translate', 'scale'].includes(String(animation.transitionProperty))
    )
      animation.cancel();
  }
}

/** Traverse accessible realms only; protected frame boundaries end traversal. */
export function sameOriginDocuments(element: Element): Document[] {
  let root: Window | null = element.ownerDocument.defaultView;
  try {
    while (root?.parent && root.parent !== root) {
      void root.parent.document;
      root = root.parent;
    }
  } catch {
    /* Cross-origin boundary. */
  }
  const result = new Set<Document>([element.ownerDocument]);
  const visit = (view: Window): void => {
    try {
      if (view.document) result.add(view.document);
      for (let index = 0; index < (view.frames?.length ?? 0); index++) visit(view.frames[index]!);
    } catch {
      /* Inaccessible child. */
    }
  };
  if (root) visit(root);
  return [...result];
}

/** Signed composed ancestor scale, excluding viewport-frame composition. */
export function ancestorScale(element: Element, includeSelf = false): Coordinates {
  const scale = { x: 1, y: 1 };
  for (
    let node: Node | null = includeSelf ? element : composedParent(element);
    node;
    node = composedParent(node)
  ) {
    if (node.nodeType !== 1) continue;
    const ancestor = node as Element,
      style = ancestor.ownerDocument.defaultView?.getComputedStyle(ancestor);
    const transform = style && parseTransform(style);
    scale.x *= transform?.scaleX ?? 1;
    scale.y *= transform?.scaleY ?? 1;
  }
  return scale;
}
