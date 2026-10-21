/**
 * The block cursor on Lexical (Widgets `uwg-te-req-engine-9`).
 *
 * The engine can leave a collapsed selection beside a block that is no textblock: an element point
 * on the root between blocks, which it draws as a block cursor (`tp-te-block-cursor`). The adapter
 * never leaves it there. After a key placed it, the selection selects the adjacent block in the
 * key's direction when that block is an atom, or else moves into the nearest textblock or cell in
 * that direction (at its start forward, at its end backward), or goes back to where it was when
 * there is none. After a press resolved there, the selection head (and, without Shift, the anchor)
 * moves to the nearest text point: the end of the textblock before or the start of the one after,
 * whichever block lies nearer to the press. The block cursor therefore only ever shows for the
 * update in between. A block cursor that arises while no selection is placed, from the caret the
 * browser puts at the start of a root that takes focus (with Tab, say) before a leading atom,
 * moves to the shared first text edge of the document, as `focus()` places it: a leading atom is
 * never block-selected implicitly. ArrowUp and ArrowDown at the edge line of a textblock beside an
 * atom select the atom.
 *
 * A range that a press makes keeps the press point as its anchor (`uwg-te-req-engine-4`): inside a
 * shadow tree the engine reads the DOM selection by its composed range and the direction the browser
 * states, and a mouse-made selection states none, so a range made backward from the press reads
 * forward. Each plain press records the text point under it, and a range read after it that ends
 * there turns backward (the shared `reversesToPressAnchor`).
 */
import type { TextEditorSelectionInput, TextEditorTextPoint } from '../../model.js';
import { caretPositionAt } from '../shared/dom-geometry.js';
import { domSelectionDirected, reversesToPressAnchor } from '../shared/presses.js';
import { blockBesideKey, type TextEditorDeleteKey } from '../shared/text-edits.js';
import { $portableDocument, $textEdgeIn } from './document.js';
import { LexicalGeometry } from './geometry.js';
import { $blockId, $holderById, $holders } from './ids.js';
import type { LexicalElementLike, LexicalNodeLike, LexicalRangeSelectionLike } from './modules.js';
import {
  $offsetIn,
  $tablePlacement,
  $textblockAt,
  $textblockLength,
  $textPointOf,
} from './points.js';
import type { LexicalLastInput, LexicalRuntime } from './runtime.js';
import { $applySelection, $readSelection, $selectBlocks } from './selection.js';

/** The tag of the update that moves the selection off a block cursor. */
export const BLOCK_CURSOR_TAG = 'tp-block-cursor';

/** The keys that move the selection backward; every other key moves it forward. */
const BACKWARD_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowUp',
  'Home',
  'PageUp',
  'Backspace',
]);

/** Whether the selection being read is a collapsed caret on the root, between two blocks. */
export function $atBlockCursor(rt: LexicalRuntime): boolean {
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const { anchor } = selection;
  return anchor.type === 'element' && rt.lexical.$isRootNode(anchor.getNode());
}

/** Whether a block is an atom: a block that holds no text and no cells. */
const isAtom = (rt: LexicalRuntime, node: LexicalNodeLike): boolean =>
  rt.lexical.$isDecoratorNode(node) && !node.isInline();

/** A caret at a text point, or `null`. */
const caretAt = (point: TextEditorTextPoint | null): TextEditorSelectionInput | null =>
  point ? { kind: 'text', anchor: point } : null;

/** The text points after and before an element point on the root. */
function $around(rt: LexicalRuntime, root: LexicalElementLike, index: number) {
  const children = root.getChildren();
  return {
    after: $textEdgeIn(rt, children.slice(index), 'start'),
    before: $textEdgeIn(rt, children.slice(0, index), 'end'),
  };
}

/** The text point nearest to a press between two blocks: on the side whose block lies nearer. */
function $nearestToPress(
  rt: LexicalRuntime,
  root: LexicalElementLike,
  index: number,
  press: { readonly x: number; readonly y: number },
): TextEditorTextPoint | null {
  const { after, before } = $around(rt, root, index);
  const distance = (node: LexicalNodeLike | null) => {
    const element = node ? rt.engine.getElementByKey(node.getKey()) : null;
    if (!element || element.getClientRects().length === 0) return Number.POSITIVE_INFINITY;
    const rect = element.getBoundingClientRect();
    const dx = Math.max(rect.left - press.x, 0, press.x - rect.right);
    const dy = Math.max(rect.top - press.y, 0, press.y - rect.bottom);
    return Math.hypot(dx, dy);
  };
  if (!before) return after;
  if (!after) return before;
  const next = root.getChildAtIndex(index);
  const previous = index > 0 ? root.getChildAtIndex(index - 1) : null;
  return distance(previous) < distance(next) ? before : after;
}

/**
 * Moves a collapsed selection off a block cursor, after `input` placed it there; `previous` is
 * the selection before, to return to when no block lies in the key's direction.
 */
export function $leaveBlockCursor(
  rt: LexicalRuntime,
  input: LexicalLastInput | null,
  previous: TextEditorSelectionInput | null,
): boolean {
  if (!$atBlockCursor(rt)) return false;
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection)) return false;
  const anchor = selection.anchor;
  const root = anchor.getNode() as LexicalElementLike;
  if (previous === null && input?.kind !== 'press') {
    // No selection was placed: the root took focus (`uwg-te-req-engine-4`).
    const edge = $textEdgeIn(rt, root.getChildren(), 'start');
    return edge !== null && $applySelection(rt, { kind: 'text', anchor: edge });
  }
  if (input?.kind === 'press') {
    const point = $nearestToPress(rt, root, anchor.offset, input);
    if (!point) return false;
    const keep = input.shift && previous?.kind === 'text' ? previous.anchor : point;
    return $applySelection(rt, { kind: 'text', anchor: keep, head: point });
  }
  const backward = input !== null && BACKWARD_KEYS.has(input.key);
  const target = backward
    ? anchor.offset > 0
      ? root.getChildAtIndex(anchor.offset - 1)
      : null
    : root.getChildAtIndex(anchor.offset);
  if (!target) return previous !== null && $applySelection(rt, previous);
  if (isAtom(rt, target)) {
    const id = $blockId(rt, target);
    return id !== '' && $selectBlocks(rt, [id]);
  }
  const around = $around(rt, root, anchor.offset);
  const wanted = caretAt(backward ? around.before : around.after);
  if (wanted) return $applySelection(rt, wanted);
  return previous !== null && $applySelection(rt, previous);
}

/**
 * Backspace with a caret at the start of a textblock right after a table or an atom block, or
 * Delete at the end of one right before such a block, block-selects that block and keeps the
 * textblock, an empty one included (the shared `blockBesideKey`, `uwg-te-req-engine-9`); a second
 * key deletes the selected block. The engine's own deletion would delete an atom at once, or an
 * empty textblock. Answers whether it applied.
 */
export function $selectBlockBesideKey(rt: LexicalRuntime, key: TextEditorDeleteKey): boolean {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const found = $textblockAt(rt, selection.anchor);
  if (!found || found.address.cell) return false;
  const offset = $offsetIn(rt, found.block, selection.anchor);
  if (offset !== (key === 'backspace' ? 0 : $textblockLength(rt, found.block))) return false;
  const id = blockBesideKey($portableDocument(rt), key, { block: found.address.block, offset });
  return id !== null && $selectBlocks(rt, [id]);
}

// ArrowUp and ArrowDown beside an atom

/**
 * ArrowUp on the first line of a textblock, or ArrowDown on its last line, selects the block beside
 * it in that direction when that block is an atom (`uwg-te-req-engine-9`), as the other engine
 * does: the browser's own vertical move skips an atom, and toward one can even leave the editing
 * root. A caret in a table cell leads to the block beside the table only from the first paragraph
 * of a cell on the table's first row (ArrowUp) or the last paragraph of a cell on its last row
 * (ArrowDown). `onEdgeLine` tells whether a text point lies on the first or last line of its
 * textblock as laid out. Answers whether it selected an atom.
 */
export function $verticalToAtom(
  rt: LexicalRuntime,
  key: 'ArrowUp' | 'ArrowDown',
  onEdgeLine: (point: TextEditorTextPoint, side: 'first' | 'last') => boolean,
): boolean {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const point = $textPointOf(rt, selection.anchor);
  if (!point) return false;
  const up = key === 'ArrowUp';
  const from = $holderById(rt, point.block);
  if (!from) return false;
  if (point.cell) {
    if (!rt.isTable(from)) return false;
    const placement = $tablePlacement(rt, from as LexicalElementLike);
    const cell = placement.at(point.cell.row, point.cell.column);
    if (!cell) return false;
    const edge = up
      ? point.cell.row === 0 && point.cell.paragraph === 0
      : point.cell.row + cell.getRowSpan() >= placement.rows &&
        point.cell.paragraph === cell.getChildrenSize() - 1;
    if (!edge) return false;
  }
  const holders = $holders(rt);
  const index = holders.findIndex((holder) => holder.is(from));
  const beside = index < 0 ? undefined : holders[up ? index - 1 : index + 1];
  if (!beside || !isAtom(rt, beside) || !onEdgeLine(point, up ? 'first' : 'last')) return false;
  const id = $blockId(rt, beside);
  return id !== '' && $selectBlocks(rt, [id]);
}

// The DOM selection of a press

/**
 * The range selection of the document's selection, read as the engine reads a DOM selection and
 * through the shadow roots around the root, when it lies in the editing root; else `null`.
 */
function $domSelectionInRoot(rt: LexicalRuntime): LexicalRangeSelectionLike | null {
  const root = rt.root;
  const selection = root?.ownerDocument.getSelection?.() ?? null;
  if (!root || !selection || selection.rangeCount === 0) return null;
  const points = rt.lexical.getDOMSelectionPoints(selection, root);
  const inside = (node: Node | null) => node !== null && root.contains(node);
  if (!inside(points.anchorNode) || !inside(points.focusNode)) return null;
  return rt.lexical.$createRangeSelectionFromDom(points, rt.engine);
}

/** Whether the selection being read is a block selection or a cell range. */
const $holdsBlocksOrCells = (rt: LexicalRuntime): boolean => {
  const selection = rt.lexical.$getSelection();
  return (
    rt.lexical.$isNodeSelection(selection) ||
    (rt.modules.table?.$isTableSelection(selection) ?? false)
  );
};

/**
 * A click outside the selected blocks of a block selection selects where the press placed the DOM
 * selection (`uwg-te-req-engine-9`): the engine's click clears a block selection, and when the press
 * is short enough that its click runs before the press's selection change, the engine then finds no
 * DOM selection and leaves none. The press's DOM selection is read as a text selection instead (a
 * block cursor there moves to the text point nearest to the press). A click on an atom or inside a
 * selected block is the engine's. Answers whether it selected.
 */
export function $pressOutsideBlocks(rt: LexicalRuntime, event: MouseEvent): boolean {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isNodeSelection(selection)) return false;
  const target = event.target as Node | null;
  if (!target || !rt.root?.contains(target)) return false;
  const node = lexical.$getNearestNodeFromDOMNode(target);
  if (!node || lexical.$isDecoratorNode(node)) return false;
  for (const selected of selection.getNodes()) {
    const element = rt.engine.getElementByKey(selected.getKey());
    if (element?.contains(target)) return false;
  }
  const range = $domSelectionInRoot(rt);
  if (!range) return false;
  lexical.$setSelection(range);
  return true;
}

/**
 * While the editor is read-only, a DOM selection change inside the root replaces a block selection
 * or a cell range with the DOM selection (`uwg-te-req-engine-4`): the engine follows the DOM
 * selection only from a text selection while it takes no presses, so a click or a selection of the
 * root's content would otherwise leave the earlier block selection, which a copy would write. Only
 * a `selectionchange` event counts, never the engine's own notification of a selection it set.
 */
export function $followReadOnlySelection(rt: LexicalRuntime): boolean {
  if (rt.engine.isEditable() || !$holdsBlocksOrCells(rt)) return false;
  const view = rt.root?.ownerDocument.defaultView as (Window & { event?: Event }) | null;
  if (view?.event?.type !== 'selectionchange') return false;
  const range = $domSelectionInRoot(rt);
  if (!range) return false;
  rt.lexical.$setSelection(range);
  return true;
}

// The anchor of a range that a press makes

/**
 * The text point under a press: the DOM position that hit testing gives there, through the shadow
 * roots around the root (the shared `caretPositionAt`), read as the engine reads a DOM point. That
 * is where the press puts the anchor of the selection it makes; `null` outside text.
 */
function pressPointAt(
  rt: LexicalRuntime,
  root: HTMLElement,
  x: number,
  y: number,
): TextEditorTextPoint | null {
  const position = caretPositionAt(root, x, y);
  if (!position) return null;
  const { node, offset } = position;
  const point = { anchorNode: node, anchorOffset: offset, focusNode: node, focusOffset: offset };
  return rt.readCommitted(() => {
    const range = rt.lexical.$createRangeSelectionFromDom(point, rt.engine);
    return range ? $textPointOf(rt, range.anchor) : null;
  });
}

/**
 * Turns the range being read backward when the last input was a plain press, the range runs
 * forward and ends at the press point, and the DOM selection states no direction
 * (`uwg-te-req-engine-4`, the shared `reversesToPressAnchor`): the engine read a range made backward
 * from the press without its direction. Its two points swap; a range after a key, a press with
 * Shift, a double press, and a DOM selection that states its direction, as a key or a script makes
 * it, are read as they are. Answers whether it turned the range.
 */
export function $keepPressAnchor(rt: LexicalRuntime): boolean {
  const press = rt.lastInput?.kind === 'press' ? rt.pressPoint : null;
  if (!press || (rt.root !== null && domSelectionDirected(rt.root))) return false;
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || selection.isCollapsed()) return false;
  if (selection.isBackward()) return false;
  const read = $readSelection(rt);
  if (read.kind !== 'text' || !reversesToPressAnchor(read, press)) return false;
  const { anchor, focus } = selection;
  const start = { key: anchor.key, offset: anchor.offset, type: anchor.type };
  anchor.set(focus.key, focus.offset, focus.type);
  focus.set(start.key, start.offset, start.type);
  return true;
}

/**
 * Records presses in the editing root, which tell a block cursor where it came from, and the text
 * point under a plain press of the primary button (no Shift, not the second press of a double
 * press), where the selection it makes keeps its anchor.
 */
export function trackPresses(rt: LexicalRuntime, root: HTMLElement): () => void {
  const listener = (event: PointerEvent) => {
    rt.lastInput = { kind: 'press', x: event.clientX, y: event.clientY, shift: event.shiftKey };
    rt.pressPoint = null;
  };
  // The press count comes with the mouse event, which follows the pointer event of a press.
  const anchor = (event: MouseEvent) => {
    const plain = event.button === 0 && !event.shiftKey && event.detail <= 1;
    rt.pressPoint = plain ? pressPointAt(rt, root, event.clientX, event.clientY) : null;
  };
  root.addEventListener('pointerdown', listener);
  root.addEventListener('mousedown', anchor);
  return () => {
    root.removeEventListener('pointerdown', listener);
    root.removeEventListener('mousedown', anchor);
  };
}

/**
 * Registers the update listener that moves the selection off a block cursor, the keys that
 * block-select a table or an atom block beside the caret or an atom above or below it, the click after a block
 * selection, the read-only DOM selection changes and the anchor of a range that a press made.
 */
export function registerBlockCursor(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const HIGH = lexical.COMMAND_PRIORITY_HIGH;
  const keys = (
    [
      [lexical.KEY_BACKSPACE_COMMAND, 'backspace'],
      [lexical.KEY_DELETE_COMMAND, 'delete'],
    ] as const
  ).map(([command, key]) =>
    editor.registerCommand(
      command,
      (event) => {
        if (!editor.isEditable() || !$selectBlockBesideKey(rt, key)) return false;
        event.preventDefault();
        return true;
      },
      HIGH,
    ),
  );
  const input = editor.registerCommand(
    lexical.DELETE_CHARACTER_COMMAND,
    (backward) =>
      editor.isEditable() && $selectBlockBesideKey(rt, backward ? 'backspace' : 'delete'),
    HIGH,
  );
  // Plain ArrowUp and ArrowDown toward an atom, ahead of the engine's and the table's keys.
  const vertical = (key: 'ArrowUp' | 'ArrowDown') => (event: KeyboardEvent) => {
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
    if (!editor.isEditable()) return false;
    const geometry = new LexicalGeometry(rt);
    if (!$verticalToAtom(rt, key, (point, side) => geometry.onEdgeLine(point, side))) return false;
    event.preventDefault();
    return true;
  };
  const arrows = [
    editor.registerCommand(
      lexical.KEY_ARROW_UP_COMMAND,
      vertical('ArrowUp'),
      lexical.COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      lexical.KEY_ARROW_DOWN_COMMAND,
      vertical('ArrowDown'),
      lexical.COMMAND_PRIORITY_CRITICAL,
    ),
  ];
  // Ahead of the engine's own click, which clears a block selection; after an atom's own.
  const press = editor.registerCommand(
    lexical.CLICK_COMMAND,
    (event) => $pressOutsideBlocks(rt, event),
    lexical.COMMAND_PRIORITY_LOW,
  );
  // The engine's reads of the DOM selection: a read-only change that replaces a block selection or
  // a cell range, and a range made backward from a press.
  const readOnly = editor.registerCommand(
    lexical.SELECTION_CHANGE_COMMAND,
    () => {
      if (!$followReadOnlySelection(rt)) $keepPressAnchor(rt);
      return false;
    },
    lexical.COMMAND_PRIORITY_CRITICAL,
  );
  const cursor = editor.registerUpdateListener(({ editorState, prevEditorState, tags }) => {
    if (tags.has(BLOCK_CURSOR_TAG) || !editorState.read(() => $atBlockCursor(rt))) return;
    const previous = prevEditorState.read(() => {
      const before = $readSelection(rt);
      return before.kind === 'text'
        ? ({ kind: 'text', anchor: before.anchor, head: before.head } as const)
        : before.kind === 'blocks' || before.kind === 'cells'
          ? before
          : null;
    });
    const last = rt.lastInput;
    editor.update(() => void $leaveBlockCursor(rt, last, previous), {
      tag: [lexical.HISTORY_MERGE_TAG, BLOCK_CURSOR_TAG],
    });
  });
  return lexical.mergeRegister(...keys, input, ...arrows, press, readOnly, cursor);
}
