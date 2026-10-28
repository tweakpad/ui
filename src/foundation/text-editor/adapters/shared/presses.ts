/**
 * Pointer presses and the DOM selection of an editing root, for every engine adapter (Widgets
 * `uwg-te-req-engine-4`: the selection as text with anchor and head points).
 *
 * The state reports the selection that a press makes as the engine holds it, so both engines must
 * read a press alike. Two engine reads can miss it: an engine that compares the DOM selection with
 * the one it last recorded ignores a press that puts the DOM selection back on that recorded point
 * after the adapter changed the engine's selection while the engine did not own the DOM selection
 * (it records nothing then), and an engine that reads a selection inside a shadow tree by its
 * composed range and direction reads every mouse-made range forward, because the browser states no
 * direction for it. `domSelectionIn` reads the DOM selection inside the root through the shadow roots
 * around it, `TextEditorPressRead` tells when a press has to be read again, and
 * `reversesToPressAnchor` when a range read from a press has to turn backward so that the press point
 * stays its anchor. Nothing here writes to the document.
 */
import type { TextEditorTextPoint, TextEditorTextSelection } from '../../model.js';
import { enclosingShadowRoots } from './dom-geometry.js';
import { sameTextPoint } from './selection-state.js';

// The DOM selection inside an editing root

/** The anchor and focus of a DOM selection, as DOM positions. */
export interface TextEditorDomSelection {
  readonly anchorNode: Node;
  readonly anchorOffset: number;
  readonly focusNode: Node;
  readonly focusOffset: number;
}

/** A tree scope that may keep a selection of its own, as a document does and some shadow roots do. */
type SelectionScope = Node & { readonly getSelection?: (() => Selection | null) | undefined };

/** The points of a selection when both lie inside `root`, else `null`. */
function pointsIn(
  root: Element,
  anchorNode: Node | null,
  anchorOffset: number,
  focusNode: Node | null,
  focusOffset: number,
): TextEditorDomSelection | null {
  if (!anchorNode || !focusNode || !root.contains(anchorNode) || !root.contains(focusNode))
    return null;
  return Object.freeze({ anchorNode, anchorOffset, focusNode, focusOffset });
}

/** The first composed range of a selection through shadow roots, in either form a browser takes. */
function composedRange(selection: Selection, shadowRoots: ShadowRoot[]): StaticRange | null {
  try {
    return selection.getComposedRanges({ shadowRoots })[0] ?? null;
  } catch {
    // A browser that takes the shadow roots as arguments.
  }
  try {
    const variadic = selection.getComposedRanges as unknown as (
      ...roots: ShadowRoot[]
    ) => StaticRange[];
    return variadic.apply(selection, shadowRoots)[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * The DOM selection inside an editing root, anchor and focus as the user made them, or `null` when
 * there is none or it leaves the root. The root's tree scope gives its own selection where it keeps
 * one (the document, or a shadow root in a browser that keeps one per shadow root); otherwise, inside
 * a shadow tree, the document's selection gives its composed range through the shadow roots around
 * the root, its ends ordered by the direction the selection states (forward when it states none).
 */
export function domSelectionIn(root: Element): TextEditorDomSelection | null {
  const scope = root.getRootNode() as SelectionScope;
  const own = typeof scope.getSelection === 'function' ? scope.getSelection() : null;
  if (own && own.rangeCount > 0) {
    const points = pointsIn(root, own.anchorNode, own.anchorOffset, own.focusNode, own.focusOffset);
    if (points) return points;
  }
  const shadowRoots = enclosingShadowRoots(root);
  if (shadowRoots.length === 0) return null;
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0 || typeof selection.getComposedRanges !== 'function')
    return null;
  const range = composedRange(selection, shadowRoots);
  if (!range) return null;
  return selection.direction === 'backward'
    ? pointsIn(root, range.endContainer, range.endOffset, range.startContainer, range.startOffset)
    : pointsIn(root, range.startContainer, range.startOffset, range.endContainer, range.endOffset);
}

/**
 * Whether the document's selection states its direction, as a selection that a key or a script made
 * does; a selection that a mouse made states none in some browsers, and then only its ends are
 * known through shadow roots.
 */
export function domSelectionDirected(root: Element): boolean {
  const direction = root.ownerDocument.getSelection?.()?.direction;
  return direction === 'forward' || direction === 'backward';
}

// A press after a change that the engine did not write into the DOM

/**
 * When a press has to be read again: after the engine's selection or document changed while the
 * engine did not own the DOM selection, the DOM selection it recorded last can be the point that the
 * next press lands on, and an engine that reads only a DOM selection differing from its record then
 * misses that press. The first press after such a change, if it ends with the engine's selection as
 * it was when the press started, is read from the DOM by the adapter; a press during which the
 * engine changed its selection (a cell range, a selected atom) is the engine's. `S` is the engine's
 * selection, compared by `same`.
 */
export class TextEditorPressRead<S> {
  #stale = false;
  #start: { readonly selection: S } | null = null;

  /**
   * The engine's selection or document changed, or the engine wrote its selection again: `written`
   * when it wrote the selection into the DOM selection and recorded it, which it does only while it
   * owns the DOM selection.
   */
  changed(written: boolean): void {
    this.#stale = !written;
  }

  /** A press started in the editing root, the engine's selection then being `selection`. */
  pressed(selection: S): void {
    this.#start = this.#stale ? { selection } : null;
  }

  /**
   * A press ended in the editing root: whether the adapter reads the DOM selection, because the press
   * followed a change the engine did not write and the engine's selection is still the one it had
   * when the press started. Only the first press after such a change is read.
   */
  released(selection: S, same: (a: S, b: S) => boolean): boolean {
    const start = this.#start;
    this.#start = null;
    if (!start || !this.#stale) return false;
    this.#stale = false;
    return same(start.selection, selection);
  }
}

// The anchor of a range that a press made

/**
 * Whether a text range read from a press turns backward so that the press point stays its anchor:
 * read through shadow roots without a direction, a range runs forward whatever way the pointer
 * moved, so a range whose head is the press point and whose anchor is not was made backward from
 * the press. A caret, a range from the press point and a range that misses it are kept.
 */
export function reversesToPressAnchor(
  range: Pick<TextEditorTextSelection, 'anchor' | 'head'>,
  press: TextEditorTextPoint,
): boolean {
  return sameTextPoint(range.head, press) && !sameTextPoint(range.anchor, press);
}
