/** Scroll-container discovery shared by drag-and-drop auto-scroll and scroll spy. */
import { composedContains, composedParent } from './focus.js';

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
