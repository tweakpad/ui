/**
 * Logical sizes of laid-out boxes: the inline axis is horizontal in horizontal writing modes and
 * vertical in vertical and sideways ones.
 */

/** Whether `element` lays out its inline axis vertically. */
export function isVerticalWritingMode(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  const mode = view.getComputedStyle(element).writingMode;
  return mode.startsWith('vertical') || mode.startsWith('sideways');
}

/** The extent of `rect` along the inline axis. */
export function inlineSize(rect: DOMRectReadOnly, vertical: boolean): number {
  return vertical ? rect.height : rect.width;
}

/** The start and end of `rect` along the block axis, for grouping boxes into lines. */
export function blockSpan(
  rect: DOMRectReadOnly,
  vertical: boolean,
): { readonly top: number; readonly bottom: number } {
  return vertical ? { top: rect.left, bottom: rect.right } : { top: rect.top, bottom: rect.bottom };
}
