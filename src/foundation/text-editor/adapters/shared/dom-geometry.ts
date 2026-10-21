/**
 * DOM geometry of every engine adapter (Widgets `uwg-te-req-engine-10`, `uwg-te-tab-engine` r6,
 * `uwg-te-req-content-2`).
 *
 * Read-only measurements in client coordinates over the engine's DOM, written once for both
 * adapters: range rectangles in line order, the caret rectangle with the line box of an empty
 * block, whether a caret lies on a textblock's first or last line, block rectangles and those of
 * a task item's text after its marker, the text offset of a point at a character's centre, the
 * caret position under a client point through the shadow roots around the editing root, and
 * whether that point lies on the lines of the textblock it resolves to. Nothing here writes to
 * the document or reads the document selection, and an element that has no layout box measures
 * as nothing.
 */
import { contentBox, cssPixels, type TextEditorEdges } from '../../content/box.js';
import type {
  TextEditorBlockRects,
  TextEditorCellPoint,
  TextEditorTextPoint,
} from '../../model.js';

/** A DOM range, as far as geometry reads it. */
export type TextEditorRangeLike = Pick<Range, 'getClientRects'>;

/** How far apart two edges may lie and still count as one, in CSS pixels. */
const TOLERANCE = 0.5;
const DOCUMENT_FRAGMENT_NODE = 11;

type Box = TextEditorEdges;

/** The window of an element, whose rectangle class and computed styles geometry uses. */
export type TextEditorGeometryView = Partial<Pick<Window, 'getComputedStyle'>> & {
  readonly DOMRectReadOnly?: typeof DOMRectReadOnly | undefined;
};

const viewOf = (element: Element | null | undefined): TextEditorGeometryView | null =>
  (element?.ownerDocument?.defaultView as TextEditorGeometryView | null | undefined) ?? null;

/** A rectangle of a position and size: the window's `DOMRectReadOnly`, or the same plain data. */
function sizedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  view: TextEditorGeometryView | null | undefined,
): DOMRectReadOnly {
  const Rect = view?.DOMRectReadOnly;
  if (typeof Rect === 'function') return new Rect(x, y, width, height);
  const data = { x, y, width, height, top: y, right: x + width, bottom: y + height, left: x };
  return Object.freeze({ ...data, toJSON: () => ({ ...data }) });
}

/**
 * The client rectangle of edges: the window's `DOMRectReadOnly`, or the same data frozen where
 * the window has none; an edge past its opposite gives a size of 0.
 */
export function clientRect(
  edges: TextEditorEdges,
  view: TextEditorGeometryView | null | undefined,
): DOMRectReadOnly {
  const { left, top } = edges;
  return sizedRect(
    left,
    top,
    Math.max(0, edges.right - left),
    Math.max(0, edges.bottom - top),
    view,
  );
}

const contains = (outer: Box, inner: Box): boolean =>
  outer.left <= inner.left + TOLERANCE &&
  outer.top <= inner.top + TOLERANCE &&
  outer.right >= inner.right - TOLERANCE &&
  outer.bottom >= inner.bottom - TOLERANCE;

/**
 * The rectangles of a range in line order, one per line fragment of what it holds: zero-width
 * fragments and the boxes of elements that hold other fragments are left out, and fragments of
 * one line keep their order.
 */
export function rangeRects(range: TextEditorRangeLike): readonly DOMRectReadOnly[] {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  // An element box that holds another fragment, or the later of two equal fragments, goes.
  const fragments = rects.filter(
    (rect, index) =>
      !rects.some(
        (other, at) =>
          at !== index && contains(rect, other) && (!contains(other, rect) || at < index),
      ),
  );
  const lines: { top: number; bottom: number; readonly rects: DOMRectReadOnly[] }[] = [];
  for (const rect of fragments) {
    const line = lines.find(
      (candidate) =>
        Math.min(candidate.bottom, rect.bottom) - Math.max(candidate.top, rect.top) >
        Math.min(candidate.bottom - candidate.top, rect.height) / 2,
    );
    if (line) {
      line.rects.push(rect);
      line.top = Math.min(line.top, rect.top);
      line.bottom = Math.max(line.bottom, rect.bottom);
    } else lines.push({ top: rect.top, bottom: rect.bottom, rects: [rect] });
  }
  lines.sort((a, b) => a.top - b.top);
  return Object.freeze(lines.flatMap((line) => line.rects));
}

/** Where the caret is. */
export interface TextEditorCaretInput {
  /** A collapsed range at the caret, or `null`. */
  readonly range: TextEditorRangeLike | null;
  /** The element of the textblock that holds the caret, or `null`. */
  readonly block: Element | null;
  /** The textblock is empty. */
  readonly empty: boolean;
}

/** The computed style of an element, or `null` where its window computes none. */
function styleOf(element: Element): CSSStyleDeclaration | null {
  const view = viewOf(element);
  return typeof view?.getComputedStyle === 'function' ? view.getComputedStyle(element) : null;
}

/** Whether an element lays out its inline content from right to left, by its computed direction. */
export function isRightToLeft(element: Element | null): boolean {
  return element !== null && styleOf(element)?.direction === 'rtl';
}

/** The content box of an element in client coordinates, or `null` when it is not measurable. */
function elementContentBox(element: Element): Box | null {
  const rect = elementRect(element);
  return rect ? contentBox(rect, styleOf(element)) : null;
}

/** The computed line height of an element in CSS pixels, or `null` for `normal`. */
function lineHeight(element: Element): number | null {
  const value = styleOf(element)?.lineHeight ?? '';
  return value.endsWith('px') ? cssPixels(value) : null;
}

/** The caret in an empty textblock: its line box at the inline position of its `br`. */
function lineCaret(block: Element): DOMRectReadOnly | null {
  const box = elementContentBox(block);
  if (!box) return null;
  const lineBreak = block.querySelector('br');
  const breakRect = lineBreak ? elementRect(lineBreak) : null;
  const x = breakRect ? breakRect.left : isRightToLeft(block) ? box.right : box.left;
  const height = lineHeight(block) ?? box.bottom - box.top;
  return sizedRect(x, box.top, 0, height, viewOf(block));
}

/**
 * The caret rectangle, zero wide: in an empty textblock its line box, as high as its line and at
 * the inline position of its `br` (or its start edge without one); otherwise the first rectangle
 * of the collapsed range. `null` when neither measures.
 */
export function caretRect(input: TextEditorCaretInput): DOMRectReadOnly | null {
  const { range, block, empty } = input;
  if (empty && block) return lineCaret(block);
  if (!range) return null;
  for (const rect of Array.from(range.getClientRects()))
    if (rect.height > 0)
      return rect.width === 0
        ? rect
        : sizedRect(rect.left, rect.top, 0, rect.height, viewOf(block));
  return null;
}

/**
 * Whether a caret lies on the first or the last line of a textblock's element
 * (`uwg-te-req-tables-5`): its vertical centre lies less than one line height below the top
 * (`first`) or above the bottom (`last`) of the element's content box, the line height being the
 * computed one, or the caret's own height for a normal line height. An empty textblock's caret
 * (`caretRect`) lies on its only line. `false` when either does not measure.
 */
export function caretOnEdgeLine(
  caret: TextEditorEdges | null,
  block: Element | null,
  side: 'first' | 'last',
): boolean {
  if (!caret || !block) return false;
  const box = elementContentBox(block);
  const height = caret.bottom - caret.top;
  if (!box || height <= 0) return false;
  const line = lineHeight(block) ?? height;
  const centre = (caret.top + caret.bottom) / 2;
  return side === 'first' ? centre - box.top < line : box.bottom - centre < line;
}

/** The elements of a block. */
export interface TextEditorBlockElements {
  /** The block's element, which holds its nested items where the engine renders them inside it. */
  readonly element: Element;
  /** The element of the block's own text, when it is not `element`, such as a list item's paragraph. */
  readonly content?: Element | null | undefined;
  /** Elements outside `element` that hold the block's nested items. */
  readonly nested?: readonly Element[] | undefined;
}

/** The height of the first line of an element's text, or `null` without text that measures. */
function firstTextLine(element: Element): number | null {
  const range = element.ownerDocument?.createRange?.();
  if (!range) return null;
  range.selectNodeContents(element);
  const [first] = rangeRects(range);
  return first ? first.height : null;
}

/** The first line box of an element: its content box's top and width, as high as one line. */
function firstLine(element: Element, fallback: DOMRectReadOnly): DOMRectReadOnly {
  const box = elementContentBox(element) ?? fallback;
  const height = lineHeight(element) ?? firstTextLine(element) ?? box.bottom - box.top;
  return sizedRect(box.left, box.top, box.right - box.left, height, viewOf(element));
}

/**
 * The client rectangles of a block: `box` around its element and nested items, `content` of its
 * own text's element, and `firstLine`, the first line box of that element, as high as a line in
 * an empty block. `null` when the element has no layout box.
 */
export function blockRects(elements: TextEditorBlockElements): TextEditorBlockRects | null {
  const own = elementRect(elements.element);
  if (!own) return null;
  const text = elements.content ?? elements.element;
  const content = text === elements.element ? own : elementRect(text);
  if (!content) return null;
  const nested = (elements.nested ?? []).map(elementRect);
  const box = unionRect([own, ...nested.filter((rect) => rect !== null)]) ?? own;
  return Object.freeze({ box, content, firstLine: firstLine(text, content) });
}

/**
 * The rectangles of a task item whose text follows its marker inside the item: `content` and
 * `firstLine` start at the marker's inline end (its right edge, in a right-to-left item its left
 * edge), so that every engine measures the text after its marker; `box` keeps the whole item.
 */
export function taskContentRects(
  rects: TextEditorBlockRects,
  marker: TextEditorEdges,
  rtl: boolean,
  view: TextEditorGeometryView | null | undefined,
): TextEditorBlockRects {
  const clip = (rect: TextEditorEdges): DOMRectReadOnly => {
    const { left, top, right, bottom } = rect;
    return clientRect(
      rtl
        ? { left, top, right: Math.min(right, marker.left), bottom }
        : { left: Math.max(left, marker.right), top, right, bottom },
      view,
    );
  };
  return Object.freeze({
    box: rects.box,
    content: clip(rects.content),
    firstLine: clip(rects.firstLine),
  });
}

/** The border box of an element, or `null` when it is disconnected or has no layout box. */
export function elementRect(element: Element): DOMRectReadOnly | null {
  if (!element.isConnected || element.getClientRects().length === 0) return null;
  return element.getBoundingClientRect();
}

/** The rectangle around rectangles, or `null` without any. */
export function unionRect(rects: Iterable<DOMRectReadOnly>): DOMRectReadOnly | null {
  let union: Box | null = null;
  let count = 0;
  let only: DOMRectReadOnly | null = null;
  for (const rect of rects) {
    count += 1;
    only = rect;
    union = union
      ? {
          left: Math.min(union.left, rect.left),
          top: Math.min(union.top, rect.top),
          right: Math.max(union.right, rect.right),
          bottom: Math.max(union.bottom, rect.bottom),
        }
      : { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  }
  if (!union) return null;
  if (count === 1) return only;
  return sizedRect(union.left, union.top, union.right - union.left, union.bottom - union.top, null);
}

// A point at a character's centre

/**
 * The UTF-16 length of the character that starts at an offset of a text: 2 for a surrogate pair,
 * else 1; 0 at or past the text's end.
 */
export function characterLength(text: string, offset: number): number {
  if (offset < 0 || offset >= text.length) return 0;
  const code = text.charCodeAt(offset);
  const next = text.charCodeAt(offset + 1);
  return code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff ? 2 : 1;
}

/**
 * Whether a client point on a glyph's line lies at or past the glyph's horizontal centre in the
 * inline direction (right of it, or left of it in a right-to-left line): the tie that every
 * engine resolves to the offset after the character, where a browser may answer the offset
 * before it. A glyph without width is no tie.
 */
export function characterTieAfter(
  x: number,
  y: number,
  glyph: TextEditorEdges & { readonly width: number },
  rtl: boolean,
): boolean {
  if (glyph.width <= 0 || y < glyph.top || y > glyph.bottom) return false;
  const centre = (glyph.left + glyph.right) / 2;
  return rtl ? x <= centre : x >= centre;
}

/**
 * The offset in a text node that a client point resolves to, from the offset that the engine or
 * the browser resolved: at a tie with the character after that offset (`characterTieAfter`), the
 * offset after the whole character, so that a surrogate pair is never split; otherwise the offset
 * as it is.
 */
export function tieOffset(text: Text, offset: number, x: number, y: number): number {
  const length = characterLength(text.data, offset);
  if (length === 0) return offset;
  const range = text.ownerDocument.createRange();
  range.setStart(text, offset);
  range.setEnd(text, offset + length);
  const glyph = range.getBoundingClientRect();
  return characterTieAfter(x, y, glyph, isRightToLeft(text.parentElement))
    ? offset + length
    : offset;
}

/** A DOM position: a node and an offset into it. */
export interface TextEditorCaretPosition {
  readonly node: Node;
  readonly offset: number;
}

/** The shadow roots that hold a node, the innermost first. */
export function enclosingShadowRoots(node: Node): ShadowRoot[] {
  const roots: ShadowRoot[] = [];
  for (
    let root = node.getRootNode();
    root.nodeType === DOCUMENT_FRAGMENT_NODE && 'host' in root;
    root = (root as ShadowRoot).host.getRootNode()
  )
    roots.push(root as ShadowRoot);
  return roots;
}

/**
 * The DOM position under a client point, inside `root`: `caretPositionFromPoint` with the shadow
 * roots between `root` and its document, else `caretRangeFromPoint`. `null` when the point is
 * not over `root`'s content or the document can resolve neither.
 */
export function caretPositionAt(
  root: Element,
  x: number,
  y: number,
): TextEditorCaretPosition | null {
  const document = root.ownerDocument as Partial<
    Pick<Document, 'caretPositionFromPoint' | 'caretRangeFromPoint'>
  >;
  let node: Node | null = null;
  let offset = 0;
  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y, {
      shadowRoots: enclosingShadowRoots(root),
    });
    if (position) ({ offsetNode: node, offset } = position);
  } else if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y);
    if (range) ({ startContainer: node, startOffset: offset } = range);
  }
  return node && root.contains(node) ? Object.freeze({ node, offset }) : null;
}

// The text point under a client point

/** The lookups of a mounted engine that find the box of a text point's lines. */
export interface TextEditorLineLookups {
  /** The rectangles of a block, as the engine contract's `blockRects` measures them. */
  blockRects(id: string): TextEditorBlockRects | null;
  /** The element of a paragraph of the table cell that starts at a row and column, or `null`. */
  paragraphElement(table: string, cell: TextEditorCellPoint): Element | null;
}

/**
 * The text point under a client point (`uwg-te-req-engine-10`), from the point that the engine or
 * the browser resolved there: kept only when the client point lies on the lines of the textblock
 * that holds it, inside the box of its text, edges included. That box is the `content` rectangle
 * of `blockRects`, after a task item's marker, or in a table cell the box of the cell's paragraph.
 * Between blocks, in a cell's padding, over a list or task marker or beside an atom, where the
 * engine resolves the nearest text point, no text lies under the client point: `null`.
 */
export function textPointOnLines(
  point: TextEditorTextPoint | null,
  lookups: TextEditorLineLookups,
  x: number,
  y: number,
): TextEditorTextPoint | null {
  if (!point) return null;
  const paragraph = point.cell ? lookups.paragraphElement(point.block, point.cell) : null;
  const box = point.cell
    ? paragraph && elementRect(paragraph)
    : (lookups.blockRects(point.block)?.content ?? null);
  if (!box) return null;
  const inside =
    x >= box.left - TOLERANCE &&
    x <= box.right + TOLERANCE &&
    y >= box.top - TOLERANCE &&
    y <= box.bottom + TOLERANCE;
  return inside ? point : null;
}
