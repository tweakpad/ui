/**
 * Visually hidden content (Foundation §12.3): a clipped 1px box at its place in the flow that
 * paints nothing and takes no layout space while its content stays in the accessibility tree.
 * Every library part, region and element that hides text this way uses these declarations.
 * A block box starts at its parent's inline-start edge in either direction, so the 1px box stays
 * inside it; an inline box would sit wherever the line ends. The negative margin is on the
 * block-start side, which never scrolls.
 */
export const visuallyHiddenDeclarations: Readonly<Record<string, string>> = Object.freeze({
  display: 'block',
  position: 'absolute',
  'inline-size': '1px',
  'block-size': '1px',
  'margin-block': '-1px 0',
  'margin-inline': '0',
  padding: '0',
  border: '0',
  overflow: 'hidden',
  'clip-path': 'inset(50%)',
  'white-space': 'nowrap',
});

/** The declarations as CSS text; `important` makes them win over every outer style. */
export function visuallyHiddenText(options: { important?: boolean } = {}): string {
  const priority = options.important ? ' !important' : '';
  return Object.entries(visuallyHiddenDeclarations)
    .map(([property, value]) => `${property}: ${value}${priority};`)
    .join(' ');
}

/**
 * A complete rule hiding `selector` (one complex selector) visually. Elements with `hidden` keep
 * their `display: none`; `:where()` leaves the selector's specificity unchanged.
 */
export function visuallyHiddenRule(
  selector: string,
  options: { important?: boolean } = {},
): string {
  return `${selector}:not(:where([hidden])) { ${visuallyHiddenText(options)} }`;
}

/**
 * Hides one element visually through inline declarations, for nodes no stylesheet reaches. The
 * inline `display` outranks `hidden`: remove such a node instead of hiding it.
 */
export function hideVisually(element: HTMLElement): void {
  for (const [property, value] of Object.entries(visuallyHiddenDeclarations))
    element.style.setProperty(property, value);
}
