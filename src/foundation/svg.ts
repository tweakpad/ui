/** The SVG namespace, for elements created outside a Lit `svg` template. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/** An SVG element in `doc`, with its attributes set. */
export function createSvgElement<Tag extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: Tag,
  attributes: Readonly<Record<string, string>> = {},
): SVGElementTagNameMap[Tag] {
  const element = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}
