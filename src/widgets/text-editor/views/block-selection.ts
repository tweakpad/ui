/**
 * Block mode of the text editor (`uwg-te-req-blocks-4`, `uwg-te-tab-keymap-host`): the pure block
 * selection model, the keys that block mode handles, the Escape order's block steps and the paint
 * of the selected blocks. The adapter holds the selected identifiers as the engine selection; the
 * widget keeps only the anchor and the head. Escape ends block mode with no selection
 * (`selection.set` with none), the editing root keeping focus.
 */
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorBlock,
  TextEditorBlockTree,
  TextEditorNoSelection,
  TextEditorSelection,
  TextEditorSelectionInput,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import { blocksDeletedText, blocksSelectedText } from '../announcer.js';
import { escapeStep } from '../focus.js';
import {
  OverlayPool,
  type OverlayBox,
  type OverlayLayer,
  type OverlayMeasureContext,
} from '../geometry.js';

// Model ------------------------------------------------------------------------------------------

/** A block selection from its anchor to its head, with every identifier it holds in order. */
export interface TextEditorBlockRange {
  readonly anchor: string;
  readonly head: string;
  readonly ids: readonly string[];
}

/** The index of every block in document order. */
function indexOf(tree: TextEditorBlockTree): Map<string, number> {
  const index = new Map<string, number>();
  tree.ordered().forEach((block, position) => index.set(block.id, position));
  return index;
}

/** The position in document order of the last nested item of a block, or its own position. */
function lastDescendant(ordered: readonly TextEditorBlock[], position: number): number {
  const block = ordered[position];
  if (!block) return position;
  let end = position;
  while (end + 1 < ordered.length && ordered[end + 1]!.depth > block.depth) end++;
  return end;
}

/**
 * The blocks from `anchor` to `head` in document order, together with the nested items of the
 * later one; empty when either is not in the tree.
 */
export function blockRange(tree: TextEditorBlockTree, anchor: string, head: string): string[] {
  const ordered = tree.ordered();
  const index = indexOf(tree);
  const from = index.get(anchor);
  const to = index.get(head);
  if (from === undefined || to === undefined) return [];
  const start = Math.min(from, to);
  const end = lastDescendant(ordered, Math.max(from, to));
  return ordered.slice(start, end + 1).map((block) => block.id);
}

/** The block range of `anchor` and `head`. */
export function blockRangeOf(
  tree: TextEditorBlockTree,
  anchor: string,
  head: string,
): TextEditorBlockRange {
  return { anchor, head, ids: blockRange(tree, anchor, head) };
}

/**
 * The blocks that a selection touches, as Escape selects them: those of a text selection or a
 * caret, the table of a cell range or of text in a cell (never a paragraph of a cell), the blocks
 * of a block selection; none without a selection.
 */
export function touchedBlocks(tree: TextEditorBlockTree, selection: TextEditorSelection): string[] {
  switch (selection.kind) {
    case 'text':
      return blockRange(tree, selection.anchor.block, selection.head.block);
    case 'cells':
      return tree.get(selection.table) ? [selection.table] : [];
    case 'blocks':
      return selection.ids.filter((id) => tree.get(id));
    default:
      return [];
  }
}

/** The identifiers whose ancestors are not in the list, in document order. */
export function topmostBlocks(tree: TextEditorBlockTree, ids: readonly string[]): string[] {
  const set = new Set(ids);
  const covered = (block: TextEditorBlock): boolean => {
    let parent = block.parentId;
    while (parent !== null) {
      if (set.has(parent)) return true;
      parent = tree.get(parent)?.parentId ?? null;
    }
    return false;
  };
  return tree
    .ordered()
    .filter((block) => set.has(block.id) && !covered(block))
    .map((block) => block.id);
}

/** Runs of blocks adjacent in document order, each run in order; nested items join their item. */
export function selectionRuns(tree: TextEditorBlockTree, ids: readonly string[]): string[][] {
  const set = new Set(ids);
  const runs: string[][] = [];
  let run: string[] | null = null;
  for (const block of tree.ordered()) {
    if (set.has(block.id)) {
      if (!run) runs.push((run = []));
      run.push(block.id);
    } else run = null;
  }
  return runs;
}

/** An atom: a block that holds no text and is no table (divider, image, custom atom). */
function atom(block: TextEditorBlock): boolean {
  return !block.textblock && block.kind !== 'table';
}

/** A caret at one end of a textblock, or in the last or first cell of a table. */
function caretIn(block: TextEditorBlock, position: 'start' | 'end'): TextEditorSelectionInput {
  if (block.kind !== 'table') return { kind: 'caret', block: block.id, position };
  const rows = Number(block.attrs.rows) || 1;
  const columns = Number(block.attrs.columns) || 1;
  const cell = position === 'end' ? { row: rows - 1, column: columns - 1 } : { row: 0, column: 0 };
  return { kind: 'caret', block: block.id, cell, position };
}

/**
 * The caret at the end of the nearest textblock or cell before `position` (`before`), or at the
 * start of the nearest one after it; `null` when there is none.
 */
export function nearestCaret(
  ordered: readonly TextEditorBlock[],
  position: number,
  side: 'before' | 'after',
): TextEditorSelectionInput | null {
  const step = side === 'before' ? -1 : 1;
  for (let index = position + step; index >= 0 && index < ordered.length; index += step) {
    const block = ordered[index]!;
    if (block.textblock || block.kind === 'table')
      return caretIn(block, side === 'before' ? 'end' : 'start');
  }
  return null;
}

/** A block-mode key: Up, Down, or the arrow key that points to the inline start or end. */
export type TextEditorBlockKey = 'up' | 'down' | 'start' | 'end';

/** What a block-mode key does: select blocks, place a caret, or nothing. */
export type TextEditorBlockKeyResult =
  | { readonly kind: 'select'; readonly range: TextEditorBlockRange }
  | { readonly kind: 'caret'; readonly selection: TextEditorSelectionInput }
  | { readonly kind: 'none' };

const NOTHING: TextEditorBlockKeyResult = Object.freeze({ kind: 'none' });

/**
 * The result of a block-mode arrow key (`uwg-te-req-blocks-4`, R4-D9, R5-D8):
 * - Shift+Up or Shift+Down moves the head to the previous or next block and extends from the
 *   anchor;
 * - from one atom block, Up or Down selects the adjacent block when it is an atom, else places the
 *   caret at the end of the nearest textblock or cell before (Up) or at the start of the nearest
 *   one after (Down);
 * - otherwise Up or Down selects the block before the first or after the last selected block;
 * - the inline-start or inline-end arrow acts before the first or after the last selected block:
 *   an adjacent atom is selected, else the caret goes to the nearest textblock or cell.
 * Nothing changes at either end of the document.
 */
export function blockKeyResult(
  tree: TextEditorBlockTree,
  range: TextEditorBlockRange,
  key: TextEditorBlockKey,
  extend: boolean,
): TextEditorBlockKeyResult {
  const ordered = tree.ordered();
  const index = indexOf(tree);
  const positions = range.ids
    .map((id) => index.get(id))
    .filter((position): position is number => position !== undefined)
    .sort((a, b) => a - b);
  if (!positions.length) return NOTHING;
  const first = positions[0]!;
  const last = positions.at(-1)!;
  const backward = key === 'up' || key === 'start';
  if (extend && (key === 'up' || key === 'down')) {
    const head = index.get(range.head);
    if (head === undefined) return NOTHING;
    const next = ordered[head + (backward ? -1 : 1)];
    return next ? { kind: 'select', range: blockRangeOf(tree, range.anchor, next.id) } : NOTHING;
  }
  if (extend) return NOTHING;
  const single = positions.length === 1 && atom(ordered[first]!);
  const sideways = key === 'start' || key === 'end';
  if (single || sideways) {
    const from = backward ? first : last;
    const adjacent = ordered[from + (backward ? -1 : 1)];
    if (!adjacent) return NOTHING;
    if (atom(adjacent))
      return { kind: 'select', range: blockRangeOf(tree, adjacent.id, adjacent.id) };
    const caret = nearestCaret(ordered, from, backward ? 'before' : 'after');
    return caret ? { kind: 'caret', selection: caret } : NOTHING;
  }
  const next = backward ? ordered[first - 1] : ordered[lastDescendant(ordered, last) + 1];
  return next ? { kind: 'select', range: blockRangeOf(tree, next.id, next.id) } : NOTHING;
}

/** The caret that Enter places in block mode: in the head block, or the nearest textblock. */
export function editCaret(
  tree: TextEditorBlockTree,
  range: TextEditorBlockRange,
): TextEditorSelectionInput | null {
  const ordered = tree.ordered();
  const head = ordered.findIndex((block) => block.id === range.head);
  const block = ordered[head];
  if (!block) return null;
  if (block.textblock || block.kind === 'table') return caretIn(block, 'end');
  return nearestCaret(ordered, head, 'after') ?? nearestCaret(ordered, head, 'before');
}

/**
 * The one request of a printable key in block mode: the first selected block is replaced with an
 * empty paragraph holding the caret, the other selected blocks are deleted and the key's text is
 * inserted there.
 */
export function replaceWithTextActions(
  tree: TextEditorBlockTree,
  ids: readonly string[],
  text: string,
): TextEditorRequestProposal['target'] | null {
  const topmost = topmostBlocks(tree, ids);
  const first = topmost[0];
  if (first === undefined) return null;
  const rest = topmost.slice(1);
  return [
    { type: 'blocks.insert', kind: 'paragraph', at: { replace: first }, select: 'start' },
    ...(rest.length ? [{ type: 'blocks.delete' as const, ids: rest }] : []),
    ...(text ? [{ type: 'text.insert' as const, text }] : []),
  ];
}

/** Whether a key event types text: one character, without Control or Command. */
export function printableKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>): boolean {
  return !event.ctrlKey && !event.metaKey && [...event.key].length === 1;
}

// Controller --------------------------------------------------------------------------------------

/** What block mode needs from the element. */
export interface TextEditorBlockSelectionHost {
  /** The block tree of the ready instance, or `null`. */
  tree(): TextEditorBlockTree | null;
  /** The live selection of the ready instance, else the published one. */
  selection(): TextEditorSelection;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  direction(): 'ltr' | 'rtl';
  strings(): TextEditorStrings;
  announce(message: string): void;
  /** Whether the editor is editable: neither read-only nor disabled. */
  editable(): boolean;
  /** Opens the block menu for the block selection from a key. */
  openMenu(event: KeyboardEvent): boolean;
  /** A block drag is active: Escape cancels it first. */
  dragging(): boolean;
  cancelDrag(): void;
  /** A suggestion list is open: Escape closes it (the suggestions view fills these in). */
  suggestionOpen?(): boolean;
  closeSuggestion?(event: KeyboardEvent): void;
  /** The pooled paint layers, underlay and overlay. */
  underlay(): HTMLElement | null;
  overlay(): HTMLElement | null;
  /** Re-runs the overlay pass. */
  invalidate(): void;
}

const ignore = (): void => undefined;

/**
 * Block mode: follows the adapter-held block selection, handles its keys and Shift clicks, takes
 * the Escape order's selection steps and paints the selected blocks.
 */
export class TextEditorBlockSelection implements OverlayLayer<readonly OverlayBox[]> {
  readonly #host: TextEditorBlockSelectionHost;
  readonly #fill: OverlayPool;
  readonly #outline: OverlayPool;
  #range: TextEditorBlockRange | null = null;
  #announced = '';

  constructor(host: TextEditorBlockSelectionHost) {
    this.#host = host;
    this.#fill = new OverlayPool(() => host.underlay(), 'text-editor-block-selection');
    this.#outline = new OverlayPool(() => host.overlay(), 'text-editor-block-selection');
  }

  /** The block selection while in block mode, or `null`. */
  get range(): TextEditorBlockRange | null {
    return this.#range;
  }

  get active(): boolean {
    return this.#range !== null;
  }

  /**
   * Follows the engine selection after each publication: a block selection that the widget did
   * not make (an atom click, an arrow onto an atom) enters block mode on it; any other selection
   * ends block mode. Announces the count when block mode starts or its blocks change.
   */
  sync(): void {
    const selection = this.#host.selection();
    if (selection.kind !== 'blocks' || !selection.ids.length) {
      if (this.#range) this.#host.invalidate();
      this.#range = null;
      this.#announced = '';
      return;
    }
    const range = this.#range;
    const same =
      range !== null &&
      range.ids.length === selection.ids.length &&
      range.ids.every((id, index) => selection.ids[index] === id);
    if (!same) {
      const keeps = range !== null && selection.ids.includes(range.anchor);
      const anchor = keeps ? range.anchor : selection.ids[0]!;
      const head =
        keeps && selection.ids.includes(range.head)
          ? range.head
          : anchor === selection.ids[0]
            ? selection.ids.at(-1)!
            : selection.ids[0]!;
      this.#range = { anchor, head, ids: selection.ids };
    }
    const key = selection.ids.join('\u0000');
    if (key !== this.#announced) {
      this.#announced = key;
      this.#host.announce(blocksSelectedText(this.#host.strings(), selection.ids.length));
    }
    this.#host.invalidate();
  }

  /**
   * Selects blocks: a selection-only change applied directly, which moves focus into the editing
   * root unless `focus` is false.
   */
  select(range: TextEditorBlockRange, sourceEvent?: Event, focus = true): Promise<boolean> {
    if (!range.ids.length) return Promise.resolve(false);
    this.#range = range;
    return this.#host
      .request({
        target: { type: 'selection.set', selection: { kind: 'blocks', ids: range.ids } },
        surface: 'keyboard',
        reason: 'programmatic',
        sourceEvent,
        trigger: null,
        focus,
      })
      .then(
        (outcome) => outcome === 'applied',
        () => false,
      );
  }

  /** Selects one block, or keeps the block selection when it holds the block (a grip click). */
  selectBlock(id: string, sourceEvent?: Event): Promise<boolean> {
    if (this.#range?.ids.includes(id)) return Promise.resolve(true);
    const tree = this.#host.tree();
    if (!tree?.get(id)) return Promise.resolve(false);
    return this.select(blockRangeOf(tree, id, id), sourceEvent);
  }

  /** Extends the block selection from its anchor to `id` (Shift click in block mode). */
  extendTo(id: string, sourceEvent?: Event): boolean {
    const range = this.#range;
    const tree = this.#host.tree();
    if (!range || !tree?.get(id)) return false;
    void this.select(blockRangeOf(tree, range.anchor, id), sourceEvent);
    return true;
  }

  /** Enters block mode on the blocks that the selection touches; `false` when it touches none. */
  enterFromSelection(sourceEvent?: Event): boolean {
    const tree = this.#host.tree();
    const selection = this.#host.selection();
    if (!tree) return false;
    const ids = touchedBlocks(tree, selection);
    if (!ids.length) return false;
    void this.select({ anchor: ids[0]!, head: ids.at(-1)!, ids }, sourceEvent);
    return true;
  }

  /**
   * The Escape order (`uwg-te-req-key-4`) for a keydown in the editing root; whether the key was
   * consumed. A step that applies is performed: the drag is cancelled, the suggestion list closes,
   * a cell range collapses to a caret in its head cell, a text selection enters block mode, block
   * mode ends with no selection; the next Escape after that passes, so an enclosing dialog closes.
   */
  escape(event: KeyboardEvent): boolean {
    const host = this.#host;
    const selection = host.selection();
    const step = escapeStep({
      gesture: host.dragging(),
      composing: false,
      surfaceOpen: false,
      suggestionOpen: host.suggestionOpen?.() ?? false,
      selection: selection.kind,
      blockMode: this.#range !== null,
    });
    switch (step) {
      case 'cancel-gesture':
        host.cancelDrag();
        return true;
      case 'close-suggestion':
        host.closeSuggestion?.(event);
        return true;
      case 'collapse-cells': {
        if (selection.kind !== 'cells') return false;
        this.#selectInput(
          {
            kind: 'caret',
            block: selection.table,
            cell: selection.range.head,
            position: 'end',
          },
          event,
        );
        return true;
      }
      case 'enter-block-mode':
        return this.enterFromSelection(event);
      case 'end-block-mode':
        this.#end(event);
        return true;
      default:
        return false;
    }
  }

  /**
   * A keydown in the editing root while in block mode (`uwg-te-tab-keymap-host`): arrows select,
   * Enter edits, Backspace and Delete delete, a printable key replaces the blocks with an empty
   * paragraph receiving it, Shift+F10 and the ContextMenu key open the block menu. Whether the key
   * was consumed.
   */
  handleKey(event: KeyboardEvent): boolean {
    const range = this.#range;
    const tree = this.#host.tree();
    if (!range || !tree || event.isComposing) return false;
    if (event.key === 'Escape') return false;
    const plain = !event.altKey && !event.ctrlKey && !event.metaKey;
    const rtl = this.#host.direction() === 'rtl';
    const arrow: Partial<Record<string, TextEditorBlockKey>> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: rtl ? 'end' : 'start',
      ArrowRight: rtl ? 'start' : 'end',
    };
    const key = arrow[event.key];
    if (key && plain) {
      const result = blockKeyResult(tree, range, key, event.shiftKey);
      if (result.kind === 'select') void this.select(result.range, event);
      else if (result.kind === 'caret') this.#selectInput(result.selection, event);
      return true;
    }
    if ((event.key === 'F10' && event.shiftKey && !event.altKey) || event.key === 'ContextMenu')
      return this.#host.openMenu(event);
    if (event.key === 'Enter' && plain && !event.shiftKey) {
      const caret = editCaret(tree, range);
      if (caret) this.#selectInput(caret, event);
      return true;
    }
    if (!this.#host.editable()) return false;
    if ((event.key === 'Backspace' || event.key === 'Delete') && plain && !event.shiftKey) {
      this.deleteBlocks(range.ids, event, 'keyboard');
      return true;
    }
    if (printableKey(event)) {
      const target = replaceWithTextActions(tree, range.ids, event.key);
      if (target)
        void this.#host
          .request({
            target,
            surface: 'keyboard',
            reason: 'keyboard',
            sourceEvent: event,
            trigger: null,
          })
          .catch(ignore);
      return true;
    }
    return false;
  }

  /** Deletes blocks in one request, announcing the count once it applied. */
  deleteBlocks(
    ids: readonly string[],
    sourceEvent: Event,
    surface: TextEditorRequestProposal['surface'],
  ): void {
    const count = ids.length;
    void this.#host
      .request({
        target: [{ type: 'blocks.delete', ids }],
        surface,
        reason: surface === 'keyboard' ? 'keyboard' : 'item-press',
        sourceEvent,
        trigger: null,
      })
      .then((outcome) => {
        if (outcome === 'applied')
          this.#host.announce(blocksDeletedText(this.#host.strings(), count));
      })
      .catch(ignore);
  }

  /** Forgets block mode; called when the instance goes away. */
  reset(): void {
    this.#range = null;
    this.#announced = '';
    this.hide();
  }

  /** Ends block mode with no selection, the editing root keeping focus (`uwg-te-req-surfaces-6`). */
  #end(event: KeyboardEvent): void {
    this.#range = null;
    this.#host.invalidate();
    void this.#selectInput({ kind: 'none' }, event);
  }

  #selectInput(
    selection: TextEditorSelectionInput | TextEditorNoSelection,
    sourceEvent: Event,
  ): Promise<unknown> {
    return this.#host
      .request({
        target: { type: 'selection.set', selection },
        surface: 'keyboard',
        reason: 'programmatic',
        sourceEvent,
        trigger: null,
      })
      .catch(ignore);
  }

  // Paint (uwg-te-req-pres-4): one rectangle per run, fill in the underlay, outline in the overlay.

  wanted(): boolean {
    return this.#range !== null;
  }

  measure(context: OverlayMeasureContext): readonly OverlayBox[] {
    const range = this.#range;
    if (!range || context.source.kind !== 'instance') return [];
    const instance = context.source.instance;
    const tree = instance.getBlocks();
    const boxes: OverlayBox[] = [];
    for (const run of selectionRuns(tree, range.ids)) {
      const first = instance.blockRects(run[0]!);
      const last = instance.blockRects(run.at(-1)!);
      if (!first || !last) continue;
      const top = Math.min(first.box.top, last.box.top);
      const bottom = Math.max(first.box.bottom, last.box.bottom);
      const left = Math.min(first.box.left, last.box.left);
      const right = Math.max(first.box.right, last.box.right);
      boxes.push(
        context.toOverlay({ left, top, width: right - left, height: bottom - top } as DOMRect),
      );
    }
    return boxes;
  }

  apply(boxes: readonly OverlayBox[]): void {
    this.#fill.write(boxes);
    this.#outline.write(boxes);
    for (const element of this.#fill.elements) element.dataset['layer'] = 'fill';
    for (const element of this.#outline.elements) element.dataset['layer'] = 'outline';
  }

  hide(): void {
    this.#fill.hide();
    this.#outline.hide();
  }

  release(): void {
    this.#fill.release();
    this.#outline.release();
  }
}
