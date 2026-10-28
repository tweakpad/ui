/**
 * Lookups and geometry of the Tiptap adapter (Widgets `uwg-te-req-engine-10`, `uwg-te-tab-engine`
 * r6, r9).
 *
 * The lookups map identifiers to the engine's elements and back through its view: a block's
 * element (a list item's `li`, a table's scroll wrapper), a table's elements, a cell's element,
 * and the block or cell that holds a DOM node. The rectangles are the shared measurements
 * (`AD/shared/dom-geometry.ts`) over DOM ranges built from engine positions; a cell range
 * measures the cells of the shared rule, grown over merged cells. `pointAt` maps a client point
 * through the view, or through the shared caret position under the point, and keeps it only on
 * the lines of its textblock. Nothing here writes to the document or reads the document selection.
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
  textPointOnLines,
  tieOffset,
  type TextEditorLineLookups,
} from '../shared/dom-geometry.js';
import {
  cellAt,
  holderAtPos,
  holderIndex,
  isCellNode,
  isItemNode,
  pointToPos,
  posToPoint,
  rangeToPositions,
} from './mapping.js';
import { isInstance, type TiptapViewLike } from './modules.js';
import { NATIVE } from './schema.js';
import { isBlockSelection, isCellSelection, selectedCells } from './selection.js';
import type { TiptapEnv } from './work.js';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const asElement = (node: Node | null | undefined): HTMLElement | null =>
  node?.nodeType === ELEMENT_NODE ? (node as HTMLElement) : null;

/** The lookups and geometry of a mounted view. */
export class TiptapGeometry implements TextEditorLineLookups {
  readonly #env: TiptapEnv;
  readonly #view: () => TiptapViewLike;

  constructor(env: TiptapEnv, view: () => TiptapViewLike) {
    this.#env = env;
    this.#view = view;
  }

  /** The element that the view renders for the node after a position. */
  #element(pos: number): HTMLElement | null {
    try {
      return asElement(this.#view().nodeDOM(pos));
    } catch {
      return null;
    }
  }

  /** The engine position of a DOM node inside the editing root, or `null`. */
  #pos(node: Node, offset = 0): number | null {
    const view = this.#view();
    if (!view.dom.contains(node)) return null;
    try {
      return view.posAtDOM(node, offset);
    } catch {
      return null;
    }
  }

  /**
   * A collapsed DOM range at a caret position, in a text node wherever one touches it: at a node
   * boundary (a block's start or end, a mark boundary) the view's own DOM position is an element
   * position, where a collapsed range measures nothing. The text before the position comes first,
   * then the text after it, then the element position.
   */
  #caretRange(pos: number): Range | null {
    const view = this.#view();
    try {
      let at = view.domAtPos(pos, -1);
      if (at.node.nodeType !== TEXT_NODE) {
        const after = view.domAtPos(pos, 1);
        at = after.node.nodeType === TEXT_NODE ? after : view.domAtPos(pos);
      }
      const range = view.dom.ownerDocument.createRange();
      range.setStart(at.node, at.offset);
      range.setEnd(at.node, at.offset);
      return range;
    } catch {
      return null;
    }
  }

  /** A DOM range between two engine positions. */
  #range(from: number, to: number): Range | null {
    const view = this.#view();
    try {
      const start = view.domAtPos(from);
      const end = from === to ? start : view.domAtPos(to);
      const range = view.dom.ownerDocument.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      return range;
    } catch {
      return null;
    }
  }

  blockElement(id: string): HTMLElement | null {
    const holder = holderIndex(this.#view().state.doc).byId.get(id);
    return holder ? this.#element(holder.pos) : null;
  }

  tableElements(id: string): TextEditorTableElements | null {
    const holder = holderIndex(this.#view().state.doc).byId.get(id);
    if (holder?.node.type.name !== NATIVE.table) return null;
    const scroller = this.#element(holder.pos);
    const table = scroller
      ? Array.from(scroller.children).find((child) => child.tagName === 'TABLE')
      : undefined;
    return scroller && table ? { table: table as HTMLElement, scroller } : null;
  }

  cellElement(table: string, cell: TextEditorCellAddress): HTMLElement | null {
    const { tables } = this.#env;
    const holder = holderIndex(this.#view().state.doc).byId.get(table);
    if (!tables || holder?.node.type.name !== NATIVE.table) return null;
    const found = cellAt(holder.node, holder.pos, cell, tables);
    return found ? this.#element(found.pos) : null;
  }

  blockAt(node: Node): string | null {
    const pos = this.#pos(node);
    if (pos === null) return null;
    return holderAtPos(this.#view().state.doc, pos)?.id ?? null;
  }

  cellAt(node: Node): TextEditorCellLocation | null {
    const { tables } = this.#env;
    const pos = this.#pos(node);
    if (pos === null || !tables) return null;
    const $pos = this.#view().state.doc.resolve(pos);
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      if (!isCellNode($pos.node(depth))) continue;
      const table = $pos.node(depth - 2);
      const id = table.attrs.id;
      if (typeof id !== 'string') return null;
      const rect = tables.TableMap.get(table).findCell($pos.before(depth) - $pos.start(depth - 2));
      return { table: id, cell: { row: rect.top, column: rect.left } };
    }
    return null;
  }

  /**
   * A position moved past the character after it when a client point ties with that character
   * (`tieOffset`): at or past its centre in the inline direction the point resolves after the whole
   * character, a surrogate pair included, whichever way the browser rounded.
   */
  #tied(pos: number, x: number, y: number): number {
    try {
      const at = this.#view().domAtPos(pos, 1);
      if (at.node.nodeType !== TEXT_NODE) return pos;
      return pos + tieOffset(at.node as Text, at.offset, x, y) - at.offset;
    } catch {
      return pos;
    }
  }

  /**
   * The text point under a client point (`uwg-te-req-engine-10`): the view's position, else the
   * shared caret position under it, moved past a character it ties with, and kept only on the
   * lines of its textblock (`textPointOnLines`); `null` outside text, between blocks and in a
   * cell's padding included.
   */
  pointAt(x: number, y: number): TextEditorTextPoint | null {
    const view = this.#view();
    let pos: number | null;
    try {
      pos = view.posAtCoords({ left: x, top: y })?.pos ?? null;
    } catch {
      pos = null;
    }
    if (pos === null) {
      const caret = caretPositionAt(view.dom, x, y);
      if (caret) pos = this.#pos(caret.node, caret.offset);
    }
    if (pos === null) return null;
    const point = posToPoint(view.state.doc, this.#tied(pos, x, y), this.#env.tables);
    return textPointOnLines(point, this, x, y);
  }

  /** The element of a paragraph of the table cell that starts at a row and column, or `null`. */
  paragraphElement(table: string, cell: TextEditorCellPoint): HTMLElement | null {
    const { doc } = this.#view().state;
    const pos = pointToPos(doc, { block: table, cell, offset: 0 }, this.#env.tables);
    return pos === null ? null : this.#element(doc.resolve(pos).before());
  }

  /** The caret rectangle at a position in a textblock, with the textblock's element. */
  #caretAt(
    pos: number,
  ): { readonly rect: DOMRectReadOnly | null; readonly block: HTMLElement | null } | null {
    const $pos = this.#view().state.doc.resolve(pos);
    if (!$pos.parent.isTextblock) return null;
    const block = this.#element($pos.before());
    const empty = $pos.parent.content.size === 0;
    return { block, rect: caretRect({ range: this.#caretRange(pos), block, empty }) };
  }

  /**
   * Whether a text point lies on the first or the last line of its textblock as laid out
   * (`caretOnEdgeLine`), where Shift with ArrowUp or ArrowDown leaves a table cell's text
   * (`uwg-te-req-tables-5`); `false` when it does not measure.
   */
  onEdgeLine(point: TextEditorTextPoint, side: 'first' | 'last'): boolean {
    const pos = pointToPos(this.#view().state.doc, point, this.#env.tables);
    const caret = pos === null ? null : this.#caretAt(pos);
    return caret !== null && caretOnEdgeLine(caret.rect, caret.block, side);
  }

  blockRects(id: string): TextEditorBlockRects | null {
    const holder = holderIndex(this.#view().state.doc).byId.get(id);
    if (!holder) return null;
    const element = this.#element(holder.pos);
    if (!element) return null;
    // A list item's own text is its paragraph, inside the item's element.
    const content = isItemNode(holder.node) ? this.#element(holder.pos + 1) : null;
    return blockRects({ element, content });
  }

  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[] {
    const { doc } = this.#view().state;
    const positions = rangeToPositions(doc, range, this.#env.tables);
    const dom = positions ? this.#range(positions.from, positions.to) : null;
    return dom ? rangeRects(dom) : [];
  }

  selectionRects(): readonly DOMRectReadOnly[] {
    const { selection } = this.#view().state;
    const { modules, tables } = this.#env;
    const rects: DOMRectReadOnly[] = [];
    const add = (pos: number) => {
      const element = this.#element(pos);
      const rect = element ? elementRect(element) : null;
      if (rect) rects.push(rect);
    };
    if (isBlockSelection(modules, selection)) for (const span of selection.spans) add(span.from);
    else if (isCellSelection(tables, selection))
      for (const cell of selectedCells(this.#env, this.#view().state.doc, selection)) add(cell.pos);
    else if (isInstance(selection, modules.state.NodeSelection)) add(selection.from);
    else if (!selection.empty) {
      const dom = this.#range(selection.from, selection.to);
      return dom ? rangeRects(dom) : [];
    }
    return Object.freeze(rects);
  }

  caretRect(): DOMRectReadOnly | null {
    const { selection } = this.#view().state;
    return selection.empty ? (this.#caretAt(selection.$head.pos)?.rect ?? null) : null;
  }
}
