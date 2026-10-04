/** Source-derived nested reveal and clipping; dnd-kit utilities/scroll (MIT). */
import { composedParent } from '../focus.js';
import { Rectangle } from './geometry.js';
import { measureElement, viewportRectangle } from './dom-geometry.js';
import { getFrameTransform, parseTransform } from './dom-geometry.js';
import { CleanupScope, Scheduler } from '../services.js';
import type { DragDropManager } from './manager.js';
import type { AutoScroll } from './types.js';
import type { Coordinates } from './geometry.js';

export function scrollableAncestors(element: Element, includeSelf = false): HTMLElement[] {
  const result: HTMLElement[] = [];
  for (
    let node: Node | null = includeSelf ? element : composedParent(element);
    node;
    node = composedParent(node)
  ) {
    if (node.nodeType !== 1) continue;
    const ancestor = node as HTMLElement,
      view = ancestor.ownerDocument.defaultView;
    const styles = view?.getComputedStyle(ancestor);
    if (
      styles &&
      /(auto|scroll|overlay)/.test(`${styles.overflowX} ${styles.overflowY}`) &&
      (ancestor.scrollWidth > ancestor.clientWidth || ancestor.scrollHeight > ancestor.clientHeight)
    )
      result.push(ancestor);
  }
  const root = element.ownerDocument.scrollingElement as HTMLElement | null;
  if (root && !result.includes(root)) result.push(root);
  try {
    const frame = element.ownerDocument.defaultView?.frameElement;
    if (frame)
      for (const ancestor of scrollableAncestors(frame))
        if (!result.includes(ancestor)) result.push(ancestor);
  } catch {
    /* Protected frame boundary. */
  }
  return result;
}
export function visibleRectangle(element: Element, margin = 0): Rectangle | undefined {
  const measured = measureElement(element);
  if (!measured) return;
  let { left, top, right, bottom } = measured;
  const clip = (rect: Rectangle, x = true, y = true) => {
    if (x) {
      left = Math.max(left, rect.left - rect.width * margin);
      right = Math.min(right, rect.right + rect.width * margin);
    }
    if (y) {
      top = Math.max(top, rect.top - rect.height * margin);
      bottom = Math.min(bottom, rect.bottom + rect.height * margin);
    }
  };
  for (let node = composedParent(element); node; node = composedParent(node)) {
    if (node.nodeType !== 1) continue;
    const ancestor = node as Element,
      style = ancestor.ownerDocument.defaultView?.getComputedStyle(ancestor),
      rect = measureElement(ancestor);
    if (style && rect) clip(rect, style.overflowX !== 'visible', style.overflowY !== 'visible');
  }
  const viewport = viewportRectangle(element);
  if (viewport) clip(viewport);
  return right > left && bottom > top
    ? new Rectangle(left, top, right - left, bottom - top)
    : undefined;
}
export function revealElement(
  element: Element,
  options: { block?: 'nearest' | 'center' | 'none'; inline?: 'nearest' | 'center' | 'none' } = {},
): void {
  for (const ancestor of scrollableAncestors(element)) {
    const rect = measureElement(element),
      bounds =
        ancestor === element.ownerDocument.scrollingElement
          ? viewportRectangle(element)
          : measureElement(ancestor);
    if (!rect || !bounds) continue;
    const x =
      options.inline === 'none'
        ? 0
        : options.inline === 'center'
          ? rect.center.x - bounds.center.x
          : rect.left < bounds.left !== rect.right > bounds.right
            ? rect.left < bounds.left
              ? rect.left - bounds.left
              : rect.right - bounds.right
            : 0;
    const y =
      options.block === 'none'
        ? 0
        : options.block === 'center'
          ? rect.center.y - bounds.center.y
          : rect.top < bounds.top !== rect.bottom > bounds.bottom
            ? rect.top < bounds.top
              ? rect.top - bounds.top
              : rect.bottom - bounds.bottom
            : 0;
    // Re-measure after each ancestor scroll; inner movement must affect outer decisions.
    ancestor.scrollLeft += x / (bounds.scale.x || 1);
    ancestor.scrollTop += y / (bounds.scale.y || 1);
  }
}

export function scrollOptions(input: AutoScroll | undefined): {
  acceleration: number;
  threshold: Coordinates;
  enabled: boolean;
} {
  const options = typeof input === 'object' ? input : {};
  const acceleration = options.acceleration ?? 25,
    threshold =
      typeof options.threshold === 'number'
        ? { x: options.threshold, y: options.threshold }
        : (options.threshold ?? { x: 0.2, y: 0.2 });
  if (
    !Number.isFinite(acceleration) ||
    acceleration < 0 ||
    ![threshold.x, threshold.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
  )
    throw new RangeError(
      'Auto-scroll requires nonnegative finite acceleration and thresholds in [0,1].',
    );
  return { acceleration, threshold, enabled: input !== false };
}

export class DragScrolling {
  #scope: CleanupScope | undefined;
  #leases = new Set<object>();
  #intent = { x: new Set<number>(), y: new Set<number>() };
  #previous: Coordinates = { x: 0, y: 0 };
  #ancestors: HTMLElement[] = [];
  #scrolling = false;
  constructor(readonly manager: DragDropManager) {
    scrollOptions(manager.options.autoScroll);
  }
  suppress(): () => void {
    const token = {};
    this.#leases.add(token);
    return () => {
      this.#leases.delete(token);
    };
  }
  start(): void {
    this.dispose();
    const operation = this.manager.dragOperation,
      element = operation.source?.element,
      view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    const scope = (this.#scope = new CleanupScope()),
      scheduler = new Scheduler(view);
    scope.add(() => scheduler.dispose());
    this.#previous = { ...operation.position.current };
    this.#intent = { x: new Set(), y: new Set() };
    if (operation.input === 'keyboard') scope.add(this.suppress());
    let scheduled = false;
    scope.add(
      scheduler.interval(() => {
        if (scheduled || this.#leases.size || operation.status !== 'dragging') return;
        scheduled = true;
        scheduler.animationFrame(() => {
          scheduled = false;
          try {
            this.#tick();
          } catch (error) {
            this.manager.fail(error);
          }
        });
      }, 10),
    );
  }
  moved(): void {
    const point = this.manager.dragOperation.position.current;
    for (const axis of ['x', 'y'] as const) {
      const direction = Math.sign(point[axis] - this.#previous[axis]);
      if (direction) this.#intent[axis].add(direction);
    }
    this.#previous = { ...point };
  }
  #tick(): void {
    const options = scrollOptions(this.manager.effectiveOptions.autoScroll);
    if (!options.enabled || this.#leases.size) return;
    const operation = this.manager.dragOperation,
      source = operation.source?.element;
    if (!source) return;
    const frame = getFrameTransform(source),
      point = operation.position.current;
    let hit = source.ownerDocument.elementFromPoint(
      (point.x - frame.x) / frame.scaleX,
      (point.y - frame.y) / frame.scaleY,
    );
    while (hit?.shadowRoot) {
      const deeper = hit.shadowRoot.elementFromPoint(
        (point.x - frame.x) / frame.scaleX,
        (point.y - frame.y) / frame.scaleY,
      );
      if (!deeper || deeper === hit) break;
      hit = deeper;
    }
    const ancestors = scrollableAncestors(hit ?? operation.target?.element ?? source, true);
    if (!this.#scrolling || ancestors.length >= this.#ancestors.length) this.#ancestors = ancestors;
    this.#scrolling = false;
    for (const element of this.#ancestors) {
      if (!element.isConnected) continue;
      const rect =
        element === element.ownerDocument.scrollingElement
          ? viewportRectangle(element)
          : measureElement(element);
      const view = element.ownerDocument.defaultView;
      if (!rect || !view) continue;
      const transform = parseTransform(view.getComputedStyle(element)),
        by = { x: 0, y: 0 };
      for (const axis of ['x', 'y'] as const) {
        const size = axis === 'x' ? rect.width : rect.height,
          edge = size * options.threshold[axis];
        if (!edge) continue;
        const start = axis === 'x' ? rect.left : rect.top,
          end = axis === 'x' ? rect.right : rect.bottom;
        const cross = axis === 'x' ? point.y : point.x,
          crossStart = axis === 'x' ? rect.top : rect.left,
          crossEnd = axis === 'x' ? rect.bottom : rect.right;
        if (cross < crossStart - 10 || cross > crossEnd + 10) continue;
        let direction = point[axis] <= start + edge ? -1 : point[axis] >= end - edge ? 1 : 0;
        if (!direction || !this.#intent[axis].has(direction)) continue;
        const speed =
          options.acceleration *
          Math.abs((direction < 0 ? start + edge - point[axis] : end - edge - point[axis]) / edge);
        if (((axis === 'x' ? transform?.scaleX : transform?.scaleY) ?? 1) < 0) direction *= -1;
        const position = axis === 'x' ? element.scrollLeft : element.scrollTop;
        const max =
          axis === 'x'
            ? element.scrollWidth - element.clientWidth
            : element.scrollHeight - element.clientHeight;
        const rtl = axis === 'x' && view.getComputedStyle(element).direction === 'rtl';
        if (
          (!rtl && (direction < 0 ? position <= 0 : position >= max)) ||
          (rtl && (direction < 0 ? position <= -max : position >= 0))
        )
          continue;
        by[axis] = direction * speed;
      }
      if (!by.x && !by.y) continue;
      const previous = { x: element.scrollLeft, y: element.scrollTop };
      element.scrollLeft += by.x;
      element.scrollTop += by.y;
      if (previous.x !== element.scrollLeft || previous.y !== element.scrollTop) {
        this.#scrolling = true;
        this.manager.collisionObserver.forceUpdate();
        return;
      }
    }
  }
  dispose(): void {
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#ancestors = [];
    this.#scrolling = false;
  }
}
