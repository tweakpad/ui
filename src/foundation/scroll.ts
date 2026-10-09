/**
 * Scroll-container discovery and scrollport geometry shared by drag-and-drop auto-scroll, scroll
 * spy, scroll progress (parallax and scroll-linked reveals), the virtual list and positioning.
 */
import { composedContains, composedParent } from './focus.js';

/** Milliseconds after the last scroll event before programmatic scrolling counts as settled. */
export const SCROLL_SETTLE_MS = 150;

/** Whether `root` is its document's scrolling element, which the viewport scrolls. */
export function isDocumentScroller(root: Element): boolean {
  return root === root.ownerDocument.scrollingElement;
}

/** The visible box of a scroll root in viewport coordinates, with its current scroll offsets. */
export interface Scrollport {
  readonly isDocument: boolean;
  /** Visible start edges: the padding box past the border (0 for the document). */
  readonly top: number;
  readonly left: number;
  /** Visible extent (the window's inner size for the document). */
  readonly width: number;
  readonly height: number;
  readonly scrollTop: number;
  readonly scrollLeft: number;
}

/**
 * Measures `root`'s scrollport: the document scrolling element is the window's inner size at the
 * viewport origin; any other root is its padding box, past its border, where it currently sits.
 */
export function scrollport(root: HTMLElement): Scrollport {
  const view = root.ownerDocument.defaultView;
  if (isDocumentScroller(root))
    return {
      isDocument: true,
      top: 0,
      left: 0,
      width: view?.innerWidth ?? root.clientWidth,
      height: view?.innerHeight ?? root.clientHeight,
      scrollTop: view?.scrollY ?? root.scrollTop,
      scrollLeft: view?.scrollX ?? root.scrollLeft,
    };
  const box = root.getBoundingClientRect();
  return {
    isDocument: false,
    top: box.top + root.clientTop,
    left: box.left + root.clientLeft,
    width: root.clientWidth,
    height: root.clientHeight,
    scrollTop: root.scrollTop,
    scrollLeft: root.scrollLeft,
  };
}

/** The visual viewport of `view` in layout-viewport coordinates (offset while pinch-zoomed). */
export function visualViewportBox(view: Window): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const visual = view.visualViewport;
  return {
    x: visual?.offsetLeft ?? 0,
    y: visual?.offsetTop ?? 0,
    width: visual?.width ?? view.innerWidth,
    height: visual?.height ?? view.innerHeight,
  };
}

/**
 * Overflowing scroll containers around `element`, nearest first, across shadow boundaries; the
 * document scrolling element always closes the list, followed by those of parent frames.
 * Source-derived from dnd-kit utilities/scroll (MIT).
 */
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

/**
 * The nearest overflowing scroll container, in the elements' own document, that contains every
 * element; the document scrolling element when none does (Foundation §18.15 scroll root).
 */
export function commonScrollContainer(elements: readonly Element[]): HTMLElement | null {
  const [first] = elements;
  if (!first) return null;
  const document = first.ownerDocument;
  for (const ancestor of scrollableAncestors(first)) {
    if (ancestor.ownerDocument !== document) break;
    if (elements.every((element) => composedContains(ancestor, element))) return ancestor;
  }
  return document.scrollingElement as HTMLElement | null;
}
