export function isFocusable(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.hidden || element.inert) return false;
  if (element.matches('[disabled], [aria-disabled="true"]')) return false;
  return element.matches(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
}

export function focusableElements(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll('*')].filter(isFocusable);
}

export function trapTabKey(event: KeyboardEvent, root: ParentNode): void {
  if (event.key !== 'Tab') return;
  const items = focusableElements(root);
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export function restoreFocus(target: Element | null): void {
  if (target instanceof HTMLElement && target.isConnected && !target.inert) target.focus();
}
