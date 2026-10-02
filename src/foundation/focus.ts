/** The rendered parent, including slot assignment and open shadow boundaries. */
export function composedParent(node: Node): Node | null {
  if (node.nodeType === 1 && (node as Element).assignedSlot) return (node as Element).assignedSlot;
  const parent = node.parentNode;
  return parent?.nodeType === 11 && 'host' in parent ? (parent as ShadowRoot).host : parent;
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
  if (!view || element.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !element.isConnected)
    return false;
  for (let node: Node | null = element; node; node = composedParent(node)) {
    if (node.nodeType !== 1) continue;
    const current = node as HTMLElement;
    if (current.hidden || current.inert || current.matches('[disabled], [aria-disabled="true"]'))
      return false;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (!style) return false;
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
    const element = node.nodeType === 1 ? (node as Element) : null;
    if (element && isFocusable(element)) result.push(element);
    const slot =
      element?.localName === 'slot' && 'assignedNodes' in element
        ? (element as HTMLSlotElement)
        : null;
    const children = slot
      ? slot.assignedNodes({ flatten: true }).length
        ? slot.assignedNodes({ flatten: true })
        : [...slot.childNodes]
      : element?.shadowRoot
        ? [...element.shadowRoot.childNodes]
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
