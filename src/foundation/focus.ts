/** The rendered parent, including slot assignment and open shadow boundaries. */
export function composedParent(node: Node): Node | null {
  if (node instanceof Element && node.assignedSlot) return node.assignedSlot;
  const parent = node.parentNode;
  return parent instanceof ShadowRoot ? parent.host : parent;
}

export function composedContains(root: Node, node: Node | null): boolean {
  for (let current = node; current; current = composedParent(current))
    if (current === root) return true;
  return false;
}

export function deepActiveElement(document: Document): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

export function isAvailable(element: Element): element is HTMLElement {
  const view = element.ownerDocument.defaultView;
  if (!view || !(element instanceof HTMLElement) || !element.isConnected) return false;
  for (let node: Node | null = element; node; node = composedParent(node)) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.hidden || node.inert || node.matches('[disabled], [aria-disabled="true"]'))
      return false;
    const style = view.getComputedStyle(node);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse'
    )
      return false;
  }
  return element.getClientRects().length > 0;
}

export function isFocusable(element: Element): element is HTMLElement {
  return isAvailable(element) && element.tabIndex >= 0 && !element.matches('input[type="hidden"]');
}

/** Visit the flattened tree once, in browser tab order, including library controls. */
export function focusableElements(root: ParentNode): HTMLElement[] {
  const result: HTMLElement[] = [];
  const visited = new Set<Node>();
  const visit = (node: Node): void => {
    if (visited.has(node)) return;
    visited.add(node);
    if (node instanceof Element && isFocusable(node)) result.push(node);
    const children =
      node instanceof HTMLSlotElement
        ? node.assignedNodes({ flatten: true }).length
          ? node.assignedNodes({ flatten: true })
          : [...node.childNodes]
        : node instanceof Element && node.shadowRoot
          ? [...node.shadowRoot.childNodes]
          : [...node.childNodes];
    children.forEach(visit);
  };
  [...root.childNodes].forEach(visit);
  return result.sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
}

export function trapTabKey(event: KeyboardEvent, root: ParentNode): void {
  if (event.key !== 'Tab' || event.defaultPrevented) return;
  const items = focusableElements(root);
  const active = deepActiveElement((root as Node).ownerDocument ?? (root as Document));
  const index = items.findIndex((item) => item === active);
  if (!items.length || index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
    event.preventDefault();
    (event.shiftKey ? items.at(-1) : items[0])?.focus();
  }
}

export function restoreFocus(target: Element | null): boolean {
  if (!target || !isAvailable(target)) return false;
  target.focus({ preventScroll: true });
  return composedContains(target, deepActiveElement(target.ownerDocument));
}
