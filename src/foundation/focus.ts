import { createId } from './id.js';

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

/**
 * Flat-tree containment for a scope that may be an element or a shadow root. A shadow root
 * contains its own tree and nodes slotted through it; it does not contain its host.
 */
export function composedScopeContains(scope: Node, node: Node | null): boolean {
  if (scope.nodeType !== 11) return composedContains(scope, node);
  for (let current = node; current; current = composedParent(current))
    if (current === scope || current.parentNode === scope) return true;
  return false;
}

export function deepActiveElement(document: Document): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

export interface AvailabilityOptions {
  /** Inertness this predicate accepts, such as isolation applied by a modal layer above. */
  ignoreInert?: (element: HTMLElement) => boolean;
  /** False judges attributes only, for content whose layout does not exist yet. Default true. */
  layout?: boolean;
}

export function isAvailable(
  element: Element,
  includeDisabled = false,
  options: AvailabilityOptions = {},
): element is HTMLElement {
  const view = element.ownerDocument.defaultView;
  if (!view || element.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !element.isConnected)
    return false;
  const layout = options.layout ?? true;
  for (let node: Node | null = element; node; node = composedParent(node)) {
    if (node.nodeType !== 1) continue;
    const current = node as HTMLElement;
    // Native form named properties can shadow .hidden/.inert with a control.
    // These platform booleans reflect attributes; inspect that source directly.
    if (
      current.matches('[hidden]') ||
      (current.matches('[inert]') && !options.ignoreInert?.(current)) ||
      (!includeDisabled && current.matches('[disabled], [aria-disabled="true"]'))
    )
      return false;
    if (!layout) continue;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (!style) return false;
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse'
    )
      return false;
  }
  return !layout || element.getClientRects().length > 0;
}

export function isFocusable(element: Element): element is HTMLElement {
  return isAvailable(element) && element.tabIndex >= 0 && !element.matches('input[type="hidden"]');
}

/** Visit each rendered element once, including slots and open shadow roots. */
export function composedElements(root: ParentNode): HTMLElement[] {
  const result: HTMLElement[] = [];
  const visited = new Set<Node>();
  const visit = (node: Node): void => {
    if (visited.has(node)) return;
    visited.add(node);
    const element = node.nodeType === 1 ? (node as Element) : null;
    if (element?.namespaceURI === 'http://www.w3.org/1999/xhtml')
      result.push(element as HTMLElement);
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
  const renderedRoot = (root as Element).shadowRoot ?? root;
  [...renderedRoot.childNodes].forEach(visit);
  return result;
}

/** Visit the flattened tree in browser tab order, including library controls. */
export function focusableElements(root: ParentNode): HTMLElement[] {
  return composedElements(root)
    .filter(isFocusable)
    .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
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

/** Reference a semantic target through its public shadow hosts using valid ARIA scopes. */
export function shadowReferenceTarget(
  element: Element,
  scope: Node = element.ownerDocument,
): Element {
  let target = element;
  for (
    let root = target.getRootNode();
    root !== scope && root.nodeType === 11 && 'host' in root;
    root = target.getRootNode()
  ) {
    const shadow = root as ShadowRoot & { referenceTarget?: string };
    if ('referenceTarget' in shadow) {
      if (!target.id) target.id = createId('tp-reference');
      shadow.referenceTarget = target.id;
    }
    target = shadow.host;
  }
  return target;
}
