import { createSvgElement } from './svg.js';

/**
 * Glyph outlines of HTML text, drawn by the browser: an SVG `<text>` in the same font, size and
 * position as each text run, so its stroke follows the glyphs exactly and a dash pattern restarts
 * on every glyph. No font file is read; the outline is whatever the browser strokes for the font.
 */

/** Computed text properties that shape and place glyphs, copied onto the outline's `<text>`. */
export const OUTLINE_TEXT_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-stretch',
  'font-variant',
  'font-kerning',
  'font-feature-settings',
  'font-variation-settings',
  'font-optical-sizing',
  'letter-spacing',
  'word-spacing',
  'text-transform',
] as const;

type StyleSource = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

/** Inline style for an outline `<text>` that renders the same glyphs as text with `style`. */
export function outlineTextStyle(style: StyleSource): string {
  return OUTLINE_TEXT_PROPERTIES.map((name) => [name, style.getPropertyValue(name).trim()])
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
}

/** The canvas `font` for metrics of text with `style`: style, weight, size and family. */
export function metricsFont(style: StyleSource): string {
  return ['font-style', 'font-weight', 'font-size', 'font-family']
    .map((name) => style.getPropertyValue(name).trim())
    .filter(Boolean)
    .join(' ');
}

const contexts = new WeakMap<Document, CanvasRenderingContext2D | null>();
const ascents = new WeakMap<Document, Map<string, number>>();

/**
 * The distance from the top of a text box to its baseline for `font`: the font's ascent, as the
 * line's content area is laid out. Cached per document and font.
 */
export function fontAscent(doc: Document, font: string): number {
  let cache = ascents.get(doc);
  if (!cache) ascents.set(doc, (cache = new Map()));
  const known = cache.get(font);
  if (known !== undefined) return known;
  if (!contexts.has(doc)) contexts.set(doc, doc.createElement('canvas').getContext('2d'));
  const context = contexts.get(doc);
  if (!context) return 0;
  context.font = font;
  const ascent = context.measureText('M').fontBoundingBoxAscent;
  cache.set(font, ascent);
  return ascent;
}

/**
 * An `aria-hidden` SVG laid over `target`, with one stroked `<text>` per text run inside it, each at
 * its run's position and baseline. `skip` leaves out nodes (and their subtrees) that are not drawn,
 * such as visually hidden copies. Returns `null` when nothing in `target` is laid out.
 */
export function outlineGlyphs(
  target: HTMLElement,
  skip: (node: Node) => boolean = () => false,
): SVGSVGElement | null {
  const doc = target.ownerDocument;
  const view = doc.defaultView;
  if (!view) return null;
  const box = target.getBoundingClientRect();
  const svg = createSvgElement(doc, 'svg', { 'aria-hidden': 'true', focusable: 'false' });
  const range = doc.createRange();
  const walker = doc.createTreeWalker(target, view.NodeFilter.SHOW_ALL, {
    acceptNode: (node) =>
      skip(node) || node instanceof view.SVGElement
        ? view.NodeFilter.FILTER_REJECT
        : node.nodeType === view.Node.TEXT_NODE && node.textContent?.trim()
          ? view.NodeFilter.FILTER_ACCEPT
          : view.NodeFilter.FILTER_SKIP,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent) continue;
    range.selectNodeContents(node);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width === 0) continue;
    const style = view.getComputedStyle(parent);
    const text = createSvgElement(doc, 'text', {
      x: String(rect.left - box.left),
      y: String(rect.top - box.top + fontAscent(doc, metricsFont(style))),
    });
    text.textContent = node.textContent;
    text.setAttribute('style', outlineTextStyle(style));
    svg.append(text);
  }
  return svg.childElementCount ? svg : null;
}
