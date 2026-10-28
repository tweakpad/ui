/**
 * The selection as an anchor (`uwg-te-req-surfaces-1`, Foundation §10.2), shared by every surface
 * that floats at the selection: the selection toolbar, the link popover, the suggestion lists and
 * the table size picker. One stable virtual anchor over the selection's client rectangles, the
 * band a surface keeps clear, the text of the document selection and selection equality.
 */
import { rect, type Rect, type VirtualAnchor } from '../../../foundation/positioning.js';
import type { TextEditorEngineState } from '../../../foundation/text-editor/model.js';

/** The client rectangles of the selection, as the adapter reports them. */
export type SelectionRectsSource = () => readonly DOMRectReadOnly[];

const toRect = (value: DOMRectReadOnly): Rect => rect(value.x, value.y, value.width, value.height);

/** The union of rectangles, or an empty rectangle at the origin for none. */
export function unionRect(rectangles: readonly Rect[]): Rect {
  if (!rectangles.length) return rect(0, 0, 0, 0);
  const left = Math.min(...rectangles.map((value) => value.left));
  const top = Math.min(...rectangles.map((value) => value.top));
  const right = Math.max(...rectangles.map((value) => value.right));
  const bottom = Math.max(...rectangles.map((value) => value.bottom));
  return rect(left, top, right - left, bottom - top);
}

/** A band of client coordinates across the block axis: from `top` to `bottom`. */
export interface BlockBand {
  readonly top: number;
  readonly bottom: number;
}

/**
 * The rectangles a surface anchors to: the selection's, and, when the surface placed `reach`
 * above them would cover a band that must stay clear (the column grips above a cell range), a
 * rectangle over that band across the selection, so that the surface sits above the band.
 */
export function anchorRects(
  rects: readonly DOMRectReadOnly[],
  keepClear: BlockBand | null,
  reach: number,
): readonly DOMRectReadOnly[] {
  if (!keepClear || !rects.length) return rects;
  const union = unionRect(rects.map(toRect));
  if (union.top - reach >= keepClear.bottom || union.bottom <= keepClear.top) return rects;
  const band = {
    x: union.left,
    y: keepClear.top,
    width: union.width,
    height: keepClear.bottom - keepClear.top,
    left: union.left,
    top: keepClear.top,
    right: union.right,
    bottom: keepClear.bottom,
  } as DOMRectReadOnly;
  return [band, ...rects];
}

/**
 * One stable virtual anchor over the selection: its bounding rectangle and its client rectangles
 * (line boxes of text, one per cell of a cell range) read at every positioning pass, with the
 * content part as its context element. A pass that finds no rectangle (the selection collapsed
 * before its surface hides, or while the surface's exit plays) keeps the last ones, so the surface
 * never moves to the viewport's origin.
 */
export function selectionAnchor(
  rects: SelectionRectsSource,
  context: () => Element | null,
): VirtualAnchor {
  let last: readonly Rect[] = [];
  const read = (): readonly Rect[] => {
    const next = rects().map(toRect);
    if (next.length) last = next;
    return last;
  };
  return {
    getBoundingRectangle: () => unionRect(read()),
    getClientRectangles: () => read(),
    // Read when positioning starts: the content part, rendered once the anchor is used.
    get contextElement() {
      return context() ?? undefined;
    },
  } as VirtualAnchor;
}

/**
 * The text of the document selection inside `root`, read through the composed ranges so that a
 * selection inside the shadow root is found; `null` without one.
 */
export function composedSelectionText(root: ShadowRoot): string | null {
  const document = root.ownerDocument;
  const selection = document.getSelection?.() as
    | (Selection & {
        getComposedRanges?: (options: { shadowRoots: ShadowRoot[] }) => StaticRange[];
      })
    | null
    | undefined;
  if (!selection || selection.rangeCount === 0) return null;
  const composed = selection.getComposedRanges?.({ shadowRoots: [root] })[0];
  if (!composed) return selection.toString();
  const range = document.createRange();
  range.setStart(composed.startContainer, composed.startOffset);
  range.setEnd(composed.endContainer, composed.endOffset);
  return range.toString();
}

/** Whether two reported selections are the same text selection, by value. */
export function sameTextSelection(
  a: TextEditorEngineState['selection'],
  b: TextEditorEngineState['selection'],
): boolean {
  if (a === b) return true;
  if (a.kind !== 'text' || b.kind !== 'text') return false;
  return (
    a.anchor.block === b.anchor.block &&
    a.anchor.offset === b.anchor.offset &&
    a.head.block === b.head.block &&
    a.head.offset === b.head.offset
  );
}
