/**
 * Copy and cut on Lexical (Widgets `uwg-te-req-content-6`, `uwg-te-req-engine-4`,
 * `uwg-te-req-engine-6`).
 *
 * `COPY_COMMAND` and `CUT_COMMAND` listeners at critical priority, registered at mount, write the
 * clipboard payload of every copy and cut in the editing root from the shared fragment and
 * serializers (`selectionFragment`, `clipboardPayload`): `text/html` with the text-range or blocks
 * record and `text/plain`, and nothing else (never the engine's `getTextContent()`, which joins
 * blocks without a separator). A clipboard event in the root is always theirs: a selection without
 * content writes nothing, and the engine never writes its own payload; at a caret the browser's own
 * copy, which copies nothing, goes ahead. For a block or cell
 * selection the engine passes Mod+C and Mod+X as keyboard events: the adapter then runs the
 * browser's command in the root itself (`runClipboardCommand`), whose clipboard event reaches these
 * listeners at once.
 *
 * A cut deletes in the update of its clipboard event, tagged `cut`, so its notification has cause
 * `cut` and reason `input` right away: text is removed, blocks are deleted as `blocks.delete`
 * deletes them, the cells of a range are cleared, and a whole-document selection leaves one empty
 * paragraph with a fresh identifier.
 */
import type { TextEditorPortableFragment } from '../../content/portable.js';
import { clipboardPayload, selectionFragment } from '../shared/fragments.js';
import { $deleteSelectedBlocks } from './blocks.js';
import { $portableDocument } from './document.js';
import { $clearWholeDocument, $holdsWholeDocument } from './guards.js';
import type { LexicalRuntime } from './runtime.js';
import { $textPointOf } from './points.js';
import { $applySelection, $readSelection } from './selection.js';
import { $prepareTable } from './tables.js';
import { $deleteAcross, $rangeAcrossBlocks } from './text.js';

/** The tag of a cut's deletion, which notifications report as cause `cut`. */
export const CUT_TAG = 'cut';

/** A clipboard event as the listeners read it; a keyboard payload has no clipboard data. */
interface ClipboardEventLike {
  readonly clipboardData: { setData(format: string, data: string): void } | null;
  preventDefault(): void;
}

/** The keyboard event the engine passes for Mod+C or Mod+X on a block or cell selection. */
const isKeyboardEvent = (payload: unknown): boolean =>
  typeof payload === 'object' && payload !== null && 'key' in payload;

const isClipboardEvent = (payload: unknown): payload is ClipboardEventLike =>
  typeof payload === 'object' &&
  payload !== null &&
  'clipboardData' in payload &&
  typeof (payload as ClipboardEventLike).clipboardData?.setData === 'function';

/**
 * The portable fragment of the selection being read (the shared `selectionFragment`): the whole
 * document while the engine holds the selection of Mod+A; `null` for a caret or none.
 */
export function $selectionFragment(rt: LexicalRuntime): TextEditorPortableFragment | null {
  return selectionFragment($portableDocument(rt), $readSelection(rt), $holdsWholeDocument(rt));
}

/** Whether an end of the engine's range selection lies outside text, between blocks. */
function $endsOutsideText(rt: LexicalRuntime): boolean {
  const range = rt.lexical.$getSelection();
  return (
    rt.lexical.$isRangeSelection(range) &&
    ($textPointOf(rt, range.anchor) === null || $textPointOf(rt, range.focus) === null)
  );
}

/** Deletes what a cut took: text, blocks, the content of cells or the whole document. */
export function $deleteCut(rt: LexicalRuntime): boolean {
  if ($clearWholeDocument(rt)) return true;
  const { lexical } = rt;
  const selection = $readSelection(rt);
  switch (selection.kind) {
    case 'text': {
      // An end outside text reads as the nearest text point inside the range: the engine's range
      // is set to the text it copied first, so the blocks outside it stay.
      if ($endsOutsideText(rt))
        $applySelection(rt, { kind: 'text', anchor: selection.anchor, head: selection.head });
      // Across blocks by the shared range deletion.
      const across = $rangeAcrossBlocks(rt);
      if (across) return $deleteAcross(rt, across);
      const range = lexical.$getSelection();
      if (!lexical.$isRangeSelection(range)) return false;
      range.removeText();
      return true;
    }
    case 'blocks':
      return $deleteSelectedBlocks(rt);
    case 'cells': {
      const step = $prepareTable(
        rt,
        { type: 'table.clear-cells', table: selection.table, range: selection.range },
        { move: false, merge: false },
      );
      return step !== null && step();
    }
    default:
      return false;
  }
}

/** Whether the engine's selection is a caret, which holds nothing to copy or cut. */
function $atCaret(rt: LexicalRuntime): boolean {
  const selection = rt.lexical.$getSelection();
  return rt.lexical.$isRangeSelection(selection) && selection.isCollapsed();
}

/**
 * Writes the payload of the selection; answers whether it wrote one. The event is the adapter's
 * either way, never the engine's own payload: a selection without content writes nothing and
 * cancels the browser's own copy, except at a caret, where the browser copies nothing and the
 * clipboard keeps what it holds, as on every engine.
 */
function $write(rt: LexicalRuntime, event: ClipboardEventLike): boolean {
  const payload = clipboardPayload($selectionFragment(rt), rt.nodes);
  if (!payload && $atCaret(rt)) return false;
  event.preventDefault();
  if (!payload || !event.clipboardData) return false;
  event.clipboardData.setData('text/html', payload.html);
  event.clipboardData.setData('text/plain', payload.text);
  return true;
}

/**
 * Runs the browser's Copy or Cut command over a temporary element in the editing root, so that its
 * clipboard event reaches the listeners here at once, and restores the DOM selection afterwards
 * (`uwg-te-req-content-6`). Mod+C and Mod+X on a block or cell selection need it: such a
 * selection holds no DOM range, so the browser's own copy would happen outside the root. The
 * engine runs the same command but waits for its event in a listener of its own, which blocks
 * every further copy for its latency and delays a cut's deletion. Answers whether it ran.
 */
export function runClipboardCommand(root: HTMLElement, command: 'copy' | 'cut'): boolean {
  const document = root.ownerDocument;
  const selection = document.getSelection?.() ?? null;
  if (!selection || typeof document.execCommand !== 'function') return false;
  const kept = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  const element = document.createElement('span');
  element.style.setProperty('position', 'fixed');
  element.style.setProperty('top', '-1000px');
  element.append(document.createTextNode('#'));
  root.append(element);
  const range = document.createRange();
  range.setStart(element, 0);
  range.setEnd(element, 1);
  selection.removeAllRanges();
  selection.addRange(range);
  try {
    document.execCommand(command);
  } finally {
    element.remove();
    selection.removeAllRanges();
    if (kept) selection.addRange(kept);
  }
  return true;
}

/**
 * Mod+C or Mod+X on a block or cell selection, as the engine's keydown table passes it: the
 * browser's command runs in the root, whose clipboard event writes the payload (and, for a cut,
 * deletes) right away; every chord copies, however close together.
 */
function $keyboardClipboard(rt: LexicalRuntime, command: 'copy' | 'cut'): boolean {
  if (rt.lexical.$isRangeSelection(rt.lexical.$getSelection()) || !rt.root) return false;
  return runClipboardCommand(rt.root, command);
}

/** Registers the copy and cut listeners. */
export function registerClipboard(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const CRITICAL = lexical.COMMAND_PRIORITY_CRITICAL;
  return lexical.mergeRegister(
    editor.registerCommand(
      lexical.COPY_COMMAND,
      (payload) => {
        if (isKeyboardEvent(payload)) return $keyboardClipboard(rt, 'copy');
        if (!isClipboardEvent(payload)) return false;
        $write(rt, payload);
        return true;
      },
      CRITICAL,
    ),
    editor.registerCommand(
      lexical.CUT_COMMAND,
      (payload) => {
        if (!editor.isEditable()) return false;
        if (isKeyboardEvent(payload)) return $keyboardClipboard(rt, 'cut');
        if (!isClipboardEvent(payload)) return false;
        if ($write(rt, payload) && $deleteCut(rt)) lexical.$addUpdateTag(CUT_TAG);
        return true;
      },
      CRITICAL,
    ),
  );
}
