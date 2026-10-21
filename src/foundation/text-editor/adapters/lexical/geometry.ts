/**
 * Lookups and geometry on Lexical (Widgets `uwg-te-tab-engine` r6, r9, `uwg-te-req-engine-10`,
 * `uwg-te-req-engine-9`).
 *
 * The lookups map identifiers to the engine's elements and back: a block's element (a list item's
 * `li`, a table's scroll wrapper), a table's elements and a cell's element, and the block or cell
 * holding a DOM node. The rectangles are measured by `AD/shared/dom-geometry.ts` over DOM ranges
 * that the engine builds for its points (`createDOMRange`); the caret rectangle is measured in the
 * real textblock, never in the engine's block cursor (`[data-lexical-cursor]`), and a caret that
 * lies beside a block where no textblock holds it measures as nothing. `pointAt` finds the DOM
 * position under a client point through the shadow roots around the editing root
 * (`caretPositionFromPoint` with `shadowRoots`) and resolves it as the engine resolves a DOM
 * selection; a position outside text (between blocks, on an atom or on the block cursor) gives
 * `null`, as does a client point off the lines of the textblock it resolves to, such as the gap
 * between blocks or a cell's padding (the shared `textPointOnLines`), and a point at a character's
 * centre the offset after the whole character (the shared `tieOffset`). A cell range measures the
 * cells of the shared rule, grown over merged cells.
 */
import type { TextEditorCellLocation, TextEditorTableElements } from '../../engine.js';
import type {
  TextEditorBlockRects,
  TextEditorCellAddress,
  TextEditorCellPoint,
  TextEditorTextPoint,
  TextEditorTextRange,
} from '../../model.js';
import {
  blockRects,
  caretOnEdgeLine,
  caretPositionAt,
  caretRect,
  elementRect,
  rangeRects,
  taskContentRects,
  textPointOnLines,
  tieOffset,
  type TextEditorLineLookups,
} from '../shared/dom-geometry.js';
import { textRangePoints } from '../shared/selection-state.js';
import { tableModel, tableTargetCells } from '../shared/tables.js';
import { $locateHolder } from './document.js';
import { $blockId, $holderById, $isWrapperItem, $nearestHolder } from './ids.js';
import type { LexicalElementLike, LexicalNodeLike } from './modules.js';
import {
  $cellAddress,
  $pointOfText,
  $tablePlacement,
  $textblockAt,
  $textblockLength,
  $textblockOf,
  $textPointOf,
  type LexicalPointSpec,
} from './points.js';
import type { LexicalRuntime } from './runtime.js';
import { $stateSelection } from './state.js';
import { LEXICAL_CLASSES } from './theme.js';

/** The attribute of the engine's block cursor element. */
export const BLOCK_CURSOR_ATTRIBUTE = 'data-lexical-cursor';

/** Whether a DOM node is, or lies inside, the engine's block cursor. */
function inBlockCursor(node: Node | null): Element | null {
  for (let current = node; current; current = current.parentNode)
    if (current.nodeType === 1 && (current as Element).hasAttribute(BLOCK_CURSOR_ATTRIBUTE))
      return current as Element;
  return null;
}

export class LexicalGeometry implements TextEditorLineLookups {
  readonly #rt: LexicalRuntime;

  constructor(rt: LexicalRuntime) {
    this.#rt = rt;
  }

  #read<V>(read: () => V): V {
    return this.#rt.readCommitted(read);
  }

  // Lookups

  blockElement(id: string): HTMLElement | null {
    const rt = this.#rt;
    const key = this.#read(() => $holderById(rt, id)?.getKey() ?? null);
    return key === null ? null : rt.engine.getElementByKey(key);
  }

  tableElements(id: string): TextEditorTableElements | null {
    const rt = this.#rt;
    const key = this.#read(() => {
      const holder = $holderById(rt, id);
      return holder && rt.isTable(holder) ? holder.getKey() : null;
    });
    const element = key === null ? null : rt.engine.getElementByKey(key);
    if (!element) return null;
    const table = element.tagName === 'TABLE' ? element : element.querySelector('table');
    return table ? { table, scroller: element } : null;
  }

  cellElement(table: string, cell: TextEditorCellAddress): HTMLElement | null {
    const rt = this.#rt;
    const key = this.#read(() => {
      const holder = $holderById(rt, table);
      if (!holder || !rt.isTable(holder)) return null;
      return (
        $tablePlacement(rt, holder as LexicalElementLike)
          .at(cell.row, cell.column)
          ?.getKey() ?? null
      );
    });
    return key === null ? null : rt.engine.getElementByKey(key);
  }

  #nearest(node: Node): LexicalNodeLike | null {
    const rt = this.#rt;
    const root = rt.engine.getRootElement();
    if (!root || !root.contains(node) || inBlockCursor(node)) return null;
    return rt.lexical.$getNearestNodeFromDOMNode(node);
  }

  blockAt(node: Node): string | null {
    const rt = this.#rt;
    return this.#read(() => {
      const holder = $nearestHolder(rt, this.#nearest(node));
      const id = holder ? $blockId(rt, holder) : '';
      return id === '' ? null : id;
    });
  }

  cellAt(node: Node): TextEditorCellLocation | null {
    const rt = this.#rt;
    return this.#read(() => {
      let current = this.#nearest(node);
      while (current && !rt.isTableCell(current)) current = current.getParent();
      if (!current) return null;
      const address = $cellAddress(rt, current);
      const table = address ? $blockId(rt, address.table) : '';
      return address && table !== '' ? { table, cell: address.cell } : null;
    });
  }

  // Rectangles

  /** A DOM range between two engine points of the state being read. */
  #domRange(from: LexicalPointSpec, to: LexicalPointSpec): Range | null {
    const rt = this.#rt;
    const anchor = rt.lexical.$getNodeByKey(from.key);
    const focus = rt.lexical.$getNodeByKey(to.key);
    if (!anchor || !focus) return null;
    return rt.modules.selection.createDOMRange(rt.engine, anchor, from.offset, focus, to.offset);
  }

  /** The DOM range between two text points, or `null`. */
  #textRange(from: TextEditorTextPoint, to: TextEditorTextPoint): Range | null {
    const start = $pointOfText(this.#rt, from, 'forward');
    const end = $pointOfText(this.#rt, to, 'backward');
    return start && end ? this.#domRange(start, end) : null;
  }

  blockRects(id: string): TextEditorBlockRects | null {
    const rt = this.#rt;
    const keys = this.#read(() => {
      const holder = $holderById(rt, id);
      if (!holder) return null;
      // A list item's nested items live in the wrapper item that follows it.
      const next = holder.getNextSibling();
      const nested =
        rt.isListItem(holder) && next && $isWrapperItem(rt, next) ? [next.getKey()] : [];
      return { element: holder.getKey(), nested };
    });
    const element = keys ? rt.engine.getElementByKey(keys.element) : null;
    if (!element || !keys) return null;
    const nested = keys.nested.flatMap((key) => {
      const found = rt.engine.getElementByKey(key);
      return found ? [found] : [];
    });
    const rects = blockRects({ element, nested });
    // A task item's text follows its marker inside the item, and is measured from the marker's
    // inline end, its margin included, as the other engine measures it.
    const marker = element.querySelector(`:scope > .${LEXICAL_CLASSES.taskMarker}`);
    const markerBox = marker ? elementRect(marker) : null;
    if (!rects || !marker || !markerBox) return rects;
    const view = element.ownerDocument.defaultView;
    const style = view?.getComputedStyle(marker);
    const rtl = view?.getComputedStyle(element).direction === 'rtl';
    const margin = Number.parseFloat(style?.marginInlineEnd ?? '') || 0;
    const { left, top, right, bottom } = markerBox;
    const end = rtl
      ? { left: left - margin, top, right, bottom }
      : { left, top, right: right + margin, bottom };
    return taskContentRects(rects, end, rtl, view);
  }

  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[] {
    const dom = this.#read(() => this.#textRange(...textRangePoints(range)));
    return dom ? rangeRects(dom) : [];
  }

  selectionRects(): readonly DOMRectReadOnly[] {
    const rt = this.#rt;
    const measured = this.#read(() => {
      const selection = $stateSelection(rt);
      switch (selection.kind) {
        case 'text':
          // A caret has no selection rectangles; `caretRect` measures it.
          return {
            range: selection.empty ? null : this.#textRange(selection.anchor, selection.head),
          };
        case 'cells': {
          const table = $holderById(rt, selection.table);
          const located = table ? $locateHolder(rt, table) : null;
          if (!table || located?.block.type !== 'table') return null;
          const model = tableModel(selection.table, located.block);
          const placement = $tablePlacement(rt, table as LexicalElementLike);
          const keys = tableTargetCells(model, { range: selection.range }).flatMap((index) => {
            const cell = model.cells[index];
            const node = cell ? placement.at(cell.row, cell.column) : null;
            return node ? [node.getKey()] : [];
          });
          return { cells: keys };
        }
        case 'blocks':
          return { blocks: selection.ids };
        default:
          return null;
      }
    });
    if (!measured) return [];
    if ('range' in measured) return measured.range ? rangeRects(measured.range) : [];
    if ('cells' in measured)
      return Object.freeze(
        measured.cells.flatMap((key) => {
          const element = rt.engine.getElementByKey(key);
          const rect = element ? elementRect(element) : null;
          return rect ? [rect] : [];
        }),
      );
    return Object.freeze(
      measured.blocks.flatMap((id) => {
        const rects = this.blockRects(id);
        return rects ? [rects.box] : [];
      }),
    );
  }

  caretRect(): DOMRectReadOnly | null {
    const rt = this.#rt;
    const caret = this.#read(() => {
      const selection = rt.lexical.$getSelection();
      if (!rt.lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return null;
      // The real textblock that holds the caret; a caret beside a block has none.
      const found = $textblockAt(rt, selection.anchor);
      if (!found) return null;
      const point: LexicalPointSpec = {
        key: selection.anchor.key,
        offset: selection.anchor.offset,
        type: selection.anchor.type,
      };
      return {
        block: found.block.getKey(),
        empty: $textblockLength(rt, found.block) === 0,
        range: this.#domRange(point, point),
      };
    });
    if (!caret) return null;
    const block = rt.engine.getElementByKey(caret.block);
    if (!block || inBlockCursor(block)) return null;
    return caretRect({ range: caret.range, block, empty: caret.empty });
  }

  // The point under a client point

  pointAt(x: number, y: number): TextEditorTextPoint | null {
    const rt = this.#rt;
    const root = rt.engine.getRootElement();
    if (!root) return null;
    const position = caretPositionAt(root, x, y);
    // Outside text, on the block cursor included, there is no text point
    // (`uwg-te-req-engine-10`).
    if (!position || inBlockCursor(position.node)) return null;
    const { node } = position;
    const offset =
      node.nodeType === TEXT_NODE
        ? tieOffset(node as Text, position.offset, x, y)
        : position.offset;
    const domPoint = {
      anchorNode: node,
      anchorOffset: offset,
      focusNode: node,
      focusOffset: offset,
    };
    const point = this.#read(() => {
      const selection = rt.lexical.$createRangeSelectionFromDom(domPoint, rt.engine);
      return selection ? $textPointOf(rt, selection.anchor) : null;
    });
    // Only on the lines of the textblock it resolves to, never between blocks or in a cell's
    // padding (`textPointOnLines`).
    return textPointOnLines(point, this, x, y);
  }

  /** The element of a paragraph of the table cell that starts at a row and column, or `null`. */
  paragraphElement(table: string, cell: TextEditorCellPoint): HTMLElement | null {
    const rt = this.#rt;
    const key = this.#read(() => $textblockOf(rt, { block: table, cell })?.getKey() ?? null);
    return key === null ? null : rt.engine.getElementByKey(key);
  }

  /**
   * Whether a text point lies on the first or the last line of its textblock as laid out
   * (`caretOnEdgeLine`), where Shift with ArrowUp or ArrowDown leaves a table cell's text
   * (`uwg-te-req-tables-5`); `false` when it does not measure.
   */
  onEdgeLine(point: TextEditorTextPoint, side: 'first' | 'last'): boolean {
    const rt = this.#rt;
    const caret = this.#read(() => {
      const block = $textblockOf(rt, point);
      const at = block ? $pointOfText(rt, point, 'forward') : null;
      const element = block ? rt.engine.getElementByKey(block.getKey()) : null;
      if (!block || !at || !element || inBlockCursor(element)) return null;
      // An empty textblock's caret is its line box, which needs no range.
      const empty = $textblockLength(rt, block) === 0;
      return { element, empty, range: empty ? null : this.#domRange(at, at) };
    });
    if (!caret) return false;
    const rect = caretRect({ range: caret.range, block: caret.element, empty: caret.empty });
    return caretOnEdgeLine(rect, caret.element, side);
  }
}

const TEXT_NODE = 3;
