/**
 * Opt-in target collector for scroll spy (Foundation §18.15). The caller always supplies the root
 * and the selector; nothing is scanned by default, no identifier is assigned, and depth exists only
 * when the caller derives it.
 */
export interface CollectedTarget {
  readonly element: Element;
  /** The element's id, or null when it has none. */
  readonly id: string | null;
  /** Normalized text content. */
  readonly label: string;
  /** Present only when a depth function was supplied. */
  readonly depth?: number;
}

export interface CollectTargetsOptions {
  /** Derives a depth from each element, for example from a data attribute. */
  readonly depth?: (element: Element) => number | undefined;
  /** Derives a label; defaults to the normalized text content. */
  readonly label?: (element: Element) => string;
}

export function collectTargets(
  root: ParentNode,
  selector: string,
  options: CollectTargetsOptions = {},
): CollectedTarget[] {
  return [...root.querySelectorAll(selector)].map((element) => {
    const depth = options.depth?.(element);
    return {
      element,
      id: element.id || null,
      label: options.label?.(element) ?? (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ...(depth === undefined ? {} : { depth }),
    };
  });
}
