/**
 * Whether light-DOM content is assigned to one of the named slots: elements by their `slot`
 * attribute (the default slot is `''`); with `text`, non-empty text nodes count for the default
 * slot too.
 */
export function slotOccupied(
  host: Element,
  names: string | readonly string[],
  options: { text?: boolean } = {},
): boolean {
  const list = typeof names === 'string' ? [names] : names;
  for (const node of host.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (list.includes((node as Element).getAttribute('slot') ?? '')) return true;
    } else if (
      options.text &&
      node.nodeType === Node.TEXT_NODE &&
      list.includes('') &&
      node.textContent?.trim()
    )
      return true;
  }
  return false;
}

/**
 * Observes slot assignment on a host: children, their `slot` attributes and, when asked, text.
 * Returns the disconnect function.
 */
export function observeSlots(
  host: Element,
  callback: MutationCallback,
  options: { characterData?: boolean } = {},
): () => void {
  const observer = new (host.ownerDocument.defaultView ?? window).MutationObserver(callback);
  observer.observe(host, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['slot'],
    characterData: options.characterData ?? false,
  });
  return () => observer.disconnect();
}
