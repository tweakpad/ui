/**
 * Table chrome of the text editor (`uwg-te-req-tables-3` to `uwg-te-req-tables-9`,
 * `uwg-te-tab-anatomy-tables`): the row and column grips, detached triggers of the row and column
 * menus; the cell-range outline with its handle, which extends the range by dragging and opens the
 * cell menu; the quick-add Buttons in the space that the table wrapper always reserves; and the
 * column resize separator (`views/table-resize.ts`). Every control lives in the overlay, pooled
 * and hidden rather than detached, placed by one layout pass of the overlay geometry, and follows
 * the active table wrapper's horizontal scroll, clipped to its visible area.
 */
import { css, html, nothing, render, unsafeCSS, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpMenu } from '../../../components/menu/menu.js';
import { compositeControl } from '../../../foundation/composite-control.js';
import { observeScroll } from '../../../foundation/observation.js';
import { componentHandlingPrevented, preventComponentHandling } from '../../../foundation/part.js';
import { PointerDrag } from '../../../foundation/pointer-drag.js';
import { preserveFocusOnPress } from '../../../foundation/press.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { TextEditorAction } from '../../../foundation/text-editor/actions.js';
import type {
  TextEditorAccess,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type { TextEditorEngineInstance } from '../../../foundation/text-editor/engine.js';
import type {
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorEngineState,
  TextEditorSelectionInput,
  TextEditorTableModel,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type {
  TextEditorRequestSurface,
  TextEditorToolTarget,
} from '../../../foundation/text-editor/tools.js';
import { ellipsisVerticalIcon } from '../../../icons/ellipsis.js';
import { navigationIcons } from '../../../icons/navigation.js';
import { plusIcon } from '../../../icons/plus.js';
import { resizeSeparatorTargetCss } from '../../../foundation/resize-separator.js';
import { cellRangeRect } from '../../../foundation/text-editor/table-range.js';
import type {
  OverlayBox,
  OverlayGeometry,
  OverlayLayer,
  OverlayMeasureContext,
} from '../geometry.js';
import type { TextEditorToolHandlers } from '../tools/controls.js';
import { renderToolMenuItems } from '../tools/menu-items.js';
import type { TextEditorToolbarGroup } from '../tools/resolve.js';
import { TextEditorTableResize } from './table-resize.js';

// Model -----------------------------------------------------------------------------------------

/** The three table menus. */
export type TableMenuKind = 'row' | 'column' | 'cell';

/** The request surface of each table menu. */
export const TABLE_MENU_SURFACE: Readonly<Record<TableMenuKind, TextEditorRequestSurface>> =
  Object.freeze({ row: 'table-row', column: 'table-column', cell: 'table-cell' });

/** What the pointer is over: a table, the cell under it, and the boundary it is near. */
export interface TableHover {
  readonly table: string;
  /** The cell under the pointer, or null over the wrapper's reserved space. */
  readonly cell: TextEditorCellAddress | null;
  /** The column whose inline-end boundary the pointer is near, or null. */
  readonly boundary: number | null;
}

/** What the chrome shows for one table. */
export interface TableChromeModel {
  readonly table: string;
  /** The row of the row grip, or null. */
  readonly row: number | null;
  /** The column of the column grip, or null. */
  readonly column: number | null;
  /** The cell range to outline, or null. */
  readonly range: TextEditorCellRange | null;
  /** Whether the quick-add Buttons show. */
  readonly quickAdd: boolean;
  /** The column before the boundary of the resize separator, or null. */
  readonly boundary: number | null;
}

export interface TableChromeInput {
  /** Editable: neither read-only nor disabled, and the engine editable. */
  readonly editable: boolean;
  readonly state: Pick<TextEditorEngineState, 'selection' | 'table'>;
  readonly hover: TableHover | null;
  /** The model kept while a menu is open or a gesture runs; its range stays live. */
  readonly frozen: TableChromeModel | null;
  /** The table-controls session is active. */
  readonly session: boolean;
  /**
   * Focus is within the widget. Without it the editor has no caret: the grips at the selection
   * head, the cell range's outline and its handle hide, and only the pointer reveals controls.
   */
  readonly focused: boolean;
}

/**
 * The chrome of the moment (`uwg-te-req-tables-3`, `-4`, `-6`, `-7`): nothing unless editable; a
 * frozen model while a menu is open or a gesture runs; during the session, the table of the
 * selection with every control, the separator on the head column; otherwise the hovered table with
 * its grips at the hovered cell, its quick-add Buttons and the separator near the pointer; else,
 * while focus is within the widget, the table of the selection with its grips at the selection
 * head. The selection's grips and its range outline need that focus: an editor without it has no
 * caret.
 */
export function tableChromeModel(input: TableChromeInput): TableChromeModel | null {
  if (!input.editable) return null;
  const { selection } = input.state;
  const selected = input.focused || input.session ? input.state.table : null;
  const rangeOf = (table: string): TextEditorCellRange | null =>
    selected && selection.kind === 'cells' && selection.table === table ? selection.range : null;
  if (input.frozen) return { ...input.frozen, range: rangeOf(input.frozen.table) };
  const hover = input.hover;
  if (hover && !input.session) {
    const caret = selected?.id === hover.table ? (selected.range?.head ?? selected.cell) : null;
    const cell = hover.cell ?? caret;
    return {
      table: hover.table,
      row: cell?.row ?? null,
      column: cell?.column ?? null,
      range: rangeOf(hover.table),
      quickAdd: true,
      boundary: hover.boundary,
    };
  }
  if (!selected) return null;
  const head = selected.range?.head ?? selected.cell;
  return {
    table: selected.id,
    row: head.row,
    column: head.column,
    range: rangeOf(selected.id),
    quickAdd: input.session,
    boundary: input.session ? head.column : null,
  };
}

/** The cell range of one whole row or column. */
export function lineRange(
  model: Pick<TextEditorTableModel, 'rows' | 'columns'>,
  axis: 'row' | 'column',
  index: number,
): TextEditorCellRange {
  return axis === 'row'
    ? { anchor: { row: index, column: 0 }, head: { row: index, column: model.columns - 1 } }
    : { anchor: { row: 0, column: index }, head: { row: model.rows - 1, column: index } };
}

/** What a table menu's tools act on: its row or column, or the cell range for the cell menu. */
export function tableMenuTarget(
  kind: TableMenuKind,
  table: string,
  index: number | null,
): TextEditorToolTarget {
  return kind === 'cell' || index === null
    ? { kind: 'table', table, axis: 'cells' }
    : { kind: 'table', table, axis: kind, index };
}

/**
 * How far a grip's centre sits outside the table's edge: a pill `thickness` across the edge reaches
 * out as far as half its `length` (the outset that the content inset reserves beside a table),
 * so that its inner end stays clear of the cells' content (`uwg-te-req-tables-3`).
 */
export function gripOutset(length: number, thickness: number): number {
  return Math.max(0, (length - thickness) / 2);
}

/**
 * The number of rows and columns a cell range spans: with the table model, those of its rectangle
 * grown over merged cells, which it selects and outlines.
 */
export function cellRangeSize(
  range: TextEditorCellRange,
  model?: TextEditorTableModel | null,
): { rows: number; columns: number } {
  const rect = model ? cellRangeRect(model, range) : null;
  if (rect) return { rows: rect.bottom - rect.top + 1, columns: rect.right - rect.left + 1 };
  return {
    rows: Math.abs(range.head.row - range.anchor.row) + 1,
    columns: Math.abs(range.head.column - range.anchor.column) + 1,
  };
}

/**
 * The announcement of a request's structural table change (`uwg-te-req-tables-8`): inserting,
 * duplicating, moving and deleting rows and columns, merging and splitting; null for other actions.
 */
export function tableAnnouncement(
  actions: readonly TextEditorAction[],
  strings: TextEditorStrings,
): string | null {
  for (const action of actions)
    switch (action.type) {
      case 'table.insert-row':
      case 'table.duplicate-row':
        return strings.announceRowInserted;
      case 'table.insert-column':
      case 'table.duplicate-column':
        return strings.announceColumnInserted;
      case 'table.move-row':
        return fillTemplate(strings.announceRowMoved, { position: action.to + 1 });
      case 'table.move-column':
        return fillTemplate(strings.announceColumnMoved, { position: action.to + 1 });
      case 'table.delete-rows':
        return fillTemplate(strings.announceRowsDeleted, {
          count: Math.abs(action.to - action.from) + 1,
        });
      case 'table.delete-columns':
        return fillTemplate(strings.announceColumnsDeleted, {
          count: Math.abs(action.to - action.from) + 1,
        });
      case 'table.merge-cells':
        return strings.announceCellsMerged;
      case 'table.split-cell':
        return strings.announceCellSplit;
      default:
        break;
    }
  return null;
}

/** One move of Tab or Shift+Tab in a table (`uwg-te-req-tables-7`). */
export type TableTabMove =
  | { readonly kind: 'cell'; readonly cell: TextEditorCellAddress }
  | { readonly kind: 'append' }
  | { readonly kind: 'none' };

/**
 * Tab moves to the next cell and Shift+Tab to the previous one in row-major order, a spanned cell
 * counted once; Tab in the last cell appends a row, Shift+Tab in the first does nothing.
 */
export function tableTabMove(
  model: Pick<TextEditorTableModel, 'cells' | 'grid'>,
  cell: TextEditorCellAddress,
  backward: boolean,
): TableTabMove {
  const index = model.grid[cell.row]?.[cell.column];
  if (index === undefined) return { kind: 'none' };
  const next = model.cells[index + (backward ? -1 : 1)];
  if (next) return { kind: 'cell', cell: { row: next.row, column: next.column } };
  return backward ? { kind: 'none' } : { kind: 'append' };
}

/**
 * Whether the inline-end boundary of `column` is a cell edge in `row`: the table's end edge, or two
 * different cells meet there. Inside a cell that spans the boundary there is none.
 */
export function columnEdgeAt(
  model: Pick<TextEditorTableModel, 'columns' | 'grid'>,
  column: number,
  row: number,
): boolean {
  if (column >= model.columns - 1) return true;
  const line = model.grid[row];
  return !line || line[column] !== line[column + 1];
}

/** The last column of the cell that covers `row` and `column`, where its inline-end edge lies. */
export function cellEndColumn(
  model: Pick<TextEditorTableModel, 'cells' | 'grid'>,
  row: number,
  column: number,
): number {
  const cell = model.cells[model.grid[row]?.[column] ?? -1];
  return cell ? cell.column + cell.colSpan - 1 : column;
}

/**
 * The rows along which the inline-end boundary of `column` runs as cell edges without a break,
 * around `row` (which must hold one): a merged cell that spans the boundary ends the run.
 */
export function columnEdgeRun(
  model: Pick<TextEditorTableModel, 'rows' | 'columns' | 'grid'>,
  column: number,
  row: number,
): { readonly from: number; readonly to: number } {
  let from = row;
  let to = row;
  while (from > 0 && columnEdgeAt(model, column, from - 1)) from--;
  while (to < model.rows - 1 && columnEdgeAt(model, column, to + 1)) to++;
  return { from, to };
}

/**
 * For each column, a cell whose box gives the column's band: the first single-column cell of it
 * in row-major order, else the cell covering its first row (whose band is then shared).
 */
export function columnBandCells(
  model: Pick<TextEditorTableModel, 'columns' | 'cells' | 'grid'>,
): readonly (TextEditorCellAddress | null)[] {
  const bands: (TextEditorCellAddress | null)[] = Array.from({ length: model.columns }, () => null);
  for (const cell of model.cells)
    if (cell.colSpan === 1 && !bands[cell.column])
      bands[cell.column] = { row: cell.row, column: cell.column };
  for (let column = 0; column < model.columns; column++) {
    if (bands[column]) continue;
    const covering = model.cells[model.grid[0]?.[column] ?? -1];
    bands[column] = covering ? { row: covering.row, column: covering.column } : null;
  }
  return bands;
}

/** The union of rectangles, or null for none. */
export function unionRect(
  rects: readonly Pick<DOMRectReadOnly, 'left' | 'top' | 'right' | 'bottom'>[],
): { left: number; top: number; right: number; bottom: number } | null {
  if (!rects.length) return null;
  return rects.reduce(
    (union, rect) => ({
      left: Math.min(union.left, rect.left),
      top: Math.min(union.top, rect.top),
      right: Math.max(union.right, rect.right),
      bottom: Math.max(union.bottom, rect.bottom),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );
}

// Measure ---------------------------------------------------------------------------------------

/** A pointer position in client coordinates. */
type PointerPoint = Pick<PointerEvent, 'clientX' | 'clientY'>;

interface ClientBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** A point in overlay coordinates where a control is centred. */
interface Anchor {
  readonly x: number;
  readonly y: number;
}

interface TableChromePlacement {
  readonly model: TableChromeModel;
  readonly rowGrip: Anchor | null;
  readonly columnGrip: Anchor | null;
  readonly outline: OverlayBox | null;
  readonly handle: Anchor | null;
  readonly addRow: OverlayBox | null;
  readonly addColumn: OverlayBox | null;
  readonly separator: OverlayBox | null;
  readonly guide: OverlayBox | null;
  /** Right-to-left content, read with the measurements so that the writes read nothing. */
  readonly rtl: boolean;
  /**
   * The inline scroll of the wrapper, in CSS pixels, that brings the boundary of the focused
   * separator back into view after a keyboard step moved it out; 0 otherwise.
   */
  readonly reveal: number;
}

const TOLERANCE = 1;
/** An owner state that keeps the chrome's Buttons out of the Tab sequence outside the session. */
const OUT_OF_SEQUENCE = Object.freeze({
  disabled: false,
  focusableWhenDisabled: true,
  tabIndex: -1,
});
/** How far inside the wrapper's visible edge a revealed boundary lands, in CSS pixels. */
const REVEAL_MARGIN = 16;
/** How near a column boundary, in CSS pixels, the pointer reveals the resize separator. */
const BOUNDARY_REACH = 4;
/** How far outside a table, in CSS pixels, the pointer keeps its controls shown. */
const CONTROL_REACH = 32;

const rectOf = (box: ClientBox): DOMRectReadOnly =>
  ({
    left: box.left,
    top: box.top,
    right: box.right,
    bottom: box.bottom,
    width: box.right - box.left,
    height: box.bottom - box.top,
    x: box.left,
    y: box.top,
  }) as DOMRectReadOnly;

const inside = (x: number, clip: ClientBox): boolean =>
  x >= clip.left - TOLERANCE && x <= clip.right + TOLERANCE;

// View ------------------------------------------------------------------------------------------

/** What the chrome needs from the element, which implements it. */
/**
 * The selection of a press at a client point outside a table's own box, on its scroll wrapper:
 * the text point of the cell nearest to the point, on the line of its paragraph nearest to the
 * point, else the end of that cell; `null` when no cell lies there.
 */
export function reservedPressSelection(
  instance: Pick<TextEditorEngineInstance, 'cellAt' | 'cellElement' | 'pointAt'>,
  table: string,
  element: Element,
  x: number,
  y: number,
): TextEditorSelectionInput | null {
  const box = element.getBoundingClientRect();
  if (box.width <= 2 || box.height <= 2) return null;
  const clamp = (value: number, low: number, high: number) =>
    Math.min(Math.max(value, low + 1), high - 1);
  const cx = clamp(x, box.left, box.right);
  const cy = clamp(y, box.top, box.bottom);
  const scope = element.getRootNode() as Partial<DocumentOrShadowRoot>;
  const hit = scope
    .elementsFromPoint?.(cx, cy)
    .find((node) => element.contains(node) && instance.cellAt(node) !== null);
  const location = hit ? instance.cellAt(hit) : null;
  if (!location || location.table !== table) return null;
  const cell = instance.cellElement(table, location.cell);
  const distance = (rect: DOMRect) => Math.max(rect.top - cy, 0, cy - rect.bottom);
  const lines = cell
    ? [...cell.children].map((child) => child.getBoundingClientRect()).filter((r) => r.height > 0)
    : [];
  const nearest = lines.reduce<DOMRect | null>(
    (best, rect) => (best === null || distance(rect) < distance(best) ? rect : best),
    null,
  );
  const point = nearest
    ? instance.pointAt(
        clamp(x, nearest.left, nearest.right),
        clamp(cy, nearest.top, nearest.bottom),
      )
    : null;
  return point
    ? { kind: 'text', anchor: point }
    : { kind: 'caret', block: table, cell: location.cell, position: 'end' };
}

export interface TableChromeHost {
  /** The widget element. */
  readonly element: HTMLElement;
  readonly geometry: OverlayGeometry;
  /** The instance while ready. */
  instance(): TextEditorEngineInstance | null;
  state(): TextEditorEngineState;
  access(): TextEditorAccess;
  strings(): TextEditorStrings;
  direction(): 'ltr' | 'rtl';
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** The resolved groups of a table menu surface for a target. */
  menuGroups(
    surface: TextEditorRequestSurface,
    target: TextEditorToolTarget,
  ): readonly TextEditorToolbarGroup[];
  /** Focuses the editing root with its selection. */
  focusEditing(): void;
  announce(message: string): void;
  requestUpdate(): void;
  /** Whether focus is within the widget, its top-layer surfaces included. */
  focused(): boolean;
  /** The widget's one transient surface (`uwg-te-req-surfaces-6`), for the table menus. */
  transientOpened?(owner: object, close: () => void): void;
  transientClosed?(owner: object): void;
}

interface ChromeElements {
  container: HTMLElement | null;
  rowGrip: HTMLElement | null;
  columnGrip: HTMLElement | null;
  outline: HTMLElement | null;
  handle: HTMLElement | null;
  addRow: HTMLElement | null;
  addColumn: HTMLElement | null;
  separator: HTMLElement | null;
  guide: HTMLElement | null;
  rowMenu: TpMenu | null;
  columnMenu: TpMenu | null;
  cellMenu: TpMenu | null;
}

/** The last written style of a control, so that `apply` writes only changes and never reads. */
interface Written {
  hidden: boolean;
  translate: string;
  inline: string;
  block: string;
  /** A quick-add Button's length along its bar (`QUICK_ADD_LENGTH`). */
  length: string;
}

/**
 * A grip or the cell handle: a pill (round for the handle) filling its host, which the family
 * sizes along and across the table's edge.
 */
const GRIP = {
  button: {
    styleHook: {
      'border-radius': 'var(--tp-radius-full)',
      'inline-size': '100%',
      'block-size': '100%',
      'min-inline-size': '0',
      'min-block-size': '0',
    },
  },
};

/** The length of a quick-add Button along its bar, written by the pass on the Button. */
const QUICK_ADD_LENGTH = '--_tp-text-editor-quick-add-length';

/**
 * A quick-add Button fills the extent the pass gives it. Its mark keeps one place in the Button's
 * layout and a translate from the bar's length centres it, so a new length moves no box and
 * shifts no layout.
 */
const quickAdd = (mark: Record<string, string>) => ({
  button: { styleHook: { 'inline-size': '100%', 'block-size': '100%' } },
  'button-leading-mark': { styleHook: { position: 'absolute', ...mark } },
});
const ADD_ROW = quickAdd({
  left: '0',
  top: '50%',
  translate: `calc(var(${QUICK_ADD_LENGTH}, 0px) / 2 - 50%) -50%`,
});
const ADD_COLUMN = quickAdd({
  left: '50%',
  top: '0',
  translate: `-50% calc(var(${QUICK_ADD_LENGTH}, 0px) / 2 - 50%)`,
});

const ignore = (): void => undefined;

/** The table chrome layer and its interactions. */
export class TextEditorTableChrome implements OverlayLayer<TableChromePlacement | null> {
  readonly #host: TableChromeHost;
  readonly #remove: () => void;
  readonly resize: TextEditorTableResize;
  readonly #elements: ChromeElements = {
    container: null,
    rowGrip: null,
    columnGrip: null,
    outline: null,
    handle: null,
    addRow: null,
    addColumn: null,
    separator: null,
    guide: null,
    rowMenu: null,
    columnMenu: null,
    cellMenu: null,
  };
  readonly #written = new Map<HTMLElement, Written>();
  #model: TableChromeModel | null = null;
  #hover: TableHover | null = null;
  /** The latest pointer move awaiting the frame's resolution. */
  #move: (PointerPoint & { readonly path: readonly EventTarget[] }) | null = null;
  #frozen: TableChromeModel | null = null;
  #session = false;
  readonly #outOfSequence = { owner: 'text-editor-table-chrome' };
  #openMenu: TableMenuKind | null = null;
  /**
   * The column boundaries of the last pass in client coordinates, for the pointer's reach, with the
   * rows' block extents and the table's grid, which tell where a boundary is a cell edge.
   */
  #boundaries: {
    table: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
    edges: readonly number[];
    /** The row at a client y, -1 for none; it reads the row boxes when called. */
    rowAt: (y: number) => number;
    grid: Pick<TextEditorTableModel, 'columns' | 'grid'>;
  } | null = null;
  #scroller: { element: HTMLElement; release: () => void } | null = null;
  #viewport: { element: HTMLElement; release: () => void } | null = null;
  /** The detached trigger registered with each menu, kept while both elements stay. */
  #triggers = new Map<TpMenu, { trigger: HTMLElement; release: () => void }>();
  #handleDrag: PointerDrag | null = null;
  #dragFrom: TextEditorCellRange | null = null;
  #suppressClick = false;
  #separatorRelease: (() => void) | null = null;
  #announcedRange = '';

  constructor(host: TableChromeHost) {
    this.#host = host;
    this.#remove = host.geometry.addLayer(this);
    this.resize = new TextEditorTableResize({
      element: host.element,
      direction: () => host.direction(),
      disabled: () => !this.#editable(),
      commit: (table, widths, reason, event) =>
        void host
          .request({
            target: [{ type: 'table.column-widths', table, widths }],
            surface: reason === 'drag' ? 'drag' : 'keyboard',
            reason,
            sourceEvent: event ?? undefined,
            trigger: this.#elements.separator,
            focus: false,
          })
          .catch(ignore),
      changed: () => this.#invalidate(),
    });
  }

  // State ---------------------------------------------------------------------------------------

  /** The model of the last update, for the session and tests. */
  get model(): TableChromeModel | null {
    return this.#model;
  }

  /**
   * The band of the column grips above the table holding a cell range, in client coordinates,
   * which the selection toolbar keeps clear; null without a range.
   */
  columnGripBand(): { readonly top: number; readonly bottom: number } | null {
    const selection = this.#host.state().selection;
    const grip = this.#elements.columnGrip;
    if (selection.kind !== 'cells' || !grip || !this.#editable()) return null;
    const table = this.#host.instance()?.tableElements(selection.table)?.table;
    const view = grip.ownerDocument.defaultView;
    if (!table || !view) return null;
    const centre = table.getBoundingClientRect().top - this.#gripOutset(grip);
    const half = (Number.parseFloat(view.getComputedStyle(grip).blockSize) || 0) / 2;
    return { top: centre - half, bottom: centre + half };
  }

  /** Whether a table menu is open. */
  get menuOpen(): boolean {
    return this.#openMenu !== null;
  }

  /** True during a cell-handle drag or a column resize drag. */
  get gesture(): boolean {
    return this.resize.dragging || (this.#handleDrag?.dragging ?? false);
  }

  /**
   * How far the row grip reaches outside a table's inline-start edge, on which it is centred: half
   * its inline size, measured while it shows and kept while it is hidden; 0 until it first shows.
   * The gutter beside a table sits outside it.
   */
  rowGripOutset(): number {
    const grip = this.#elements.rowGrip;
    const length = grip && !grip.hidden ? grip.offsetHeight : 0;
    if (length > 0) this.#rowGripOutset = length / 2;
    return this.#rowGripOutset;
  }

  /** A grip's outset from the table's edge (`gripOutset`), from its sizes; 0 without the grip. */
  #gripOutset(grip: HTMLElement | null): number {
    const style = grip?.ownerDocument.defaultView?.getComputedStyle(grip);
    if (!style) return 0;
    const inline = Number.parseFloat(style.inlineSize) || 0;
    const block = Number.parseFloat(style.blockSize) || 0;
    return gripOutset(Math.max(inline, block), Math.min(inline, block));
  }

  #rowGripOutset = 0;

  /** Whether the table-controls session shows every control on the selection's table. */
  get session(): boolean {
    return this.#session;
  }

  set session(active: boolean) {
    if (active === this.#session) return;
    this.#session = active;
    this.update();
    this.#host.requestUpdate();
  }

  /**
   * The controls the session moves through, in document order: grips, cell handle, resize
   * separator and quick-add Buttons; only the shown ones.
   */
  sessionControls(): HTMLElement[] {
    const { rowGrip, columnGrip, handle, separator, addRow, addColumn } = this.#elements;
    return [rowGrip, columnGrip, handle, separator, addRow, addColumn].filter(
      (element): element is HTMLElement => element !== null && !this.#hidden(element),
    );
  }

  /** The control the session starts on: the cell handle with a range, else the column grip. */
  sessionStart(): HTMLElement | null {
    const model = this.#model;
    if (!model) return null;
    return model.range ? this.#elements.handle : this.#elements.columnGrip;
  }

  /** Reveals a control at once, before the next pass places it, so it can take focus. */
  reveal(element: HTMLElement): void {
    this.#write(element, { hidden: false });
  }

  /** The chrome control that holds focus (a Button host or the separator), else null. */
  #activeControl(): HTMLElement | null {
    const root = this.#elements.container?.getRootNode() as Document | ShadowRoot | undefined;
    const active = root?.activeElement as HTMLElement | null | undefined;
    return active && active.parentElement === this.#elements.container ? active : null;
  }

  /** Whether an element is one of the chrome's own nodes, its menus included. */
  contains(node: Node | null): boolean {
    const container = this.#elements.container;
    if (!container || !node) return false;
    for (let current: Node | null = node; current;) {
      if (current === container || current === this.#menus) return true;
      current =
        current.parentNode ?? ((current as Partial<ShadowRoot>).host as Node | undefined) ?? null;
    }
    return false;
  }

  /**
   * Recomputes the model from the state, announces a new cell range and requests a pass. A new
   * table, row or column renders the chrome's own controls (their labels) and nothing of the
   * element: a reveal costs no render of the element's other views.
   */
  update(): void {
    const state = this.#host.state();
    const next = tableChromeModel({
      editable: this.#editable(),
      state,
      hover: this.#hover,
      frozen: this.#frozen,
      session: this.#session,
      focused: this.#host.focused(),
    });
    const previous = this.#model;
    this.#model = next;
    if (!next) {
      this.closeMenus();
      this.resize.reset();
      // No pass runs for a layer that is not wanted, so the marks hide here.
      this.hide();
    }
    if (
      previous?.table !== next?.table ||
      previous?.row !== next?.row ||
      previous?.column !== next?.column
    )
      this.#renderControls();
    this.#announceRange(state);
    this.#invalidate();
  }

  /** A request's actions changed the document: structural changes are announced. */
  changed(actions: readonly TextEditorAction[]): void {
    const message = tableAnnouncement(actions, this.#host.strings());
    if (message) this.#host.announce(message);
  }

  /** Starts the pointer observation on the viewport; idempotent for the same element. */
  observe(viewport: HTMLElement): void {
    if (this.#viewport?.element === viewport) return;
    this.#viewport?.release();
    const move = (event: Event) => this.#pointerMove(event as PointerEvent);
    const leave = (event: Event) => this.#pointerLeave(event as PointerEvent);
    const down = (event: Event) => this.#pressReserved(event as PointerEvent);
    viewport.addEventListener('pointermove', move, { passive: true });
    viewport.addEventListener('pointerleave', leave, { passive: true });
    viewport.addEventListener('pointerdown', down, { capture: true });
    const scroll = this.#host.geometry.onScroll(() => this.#invalidate());
    this.#viewport = {
      element: viewport,
      release: () => {
        viewport.removeEventListener('pointermove', move);
        viewport.removeEventListener('pointerleave', leave);
        viewport.removeEventListener('pointerdown', down, { capture: true });
        scroll();
      },
    };
  }

  /**
   * A plain press on a table's scroll wrapper outside the table, in the space it reserves for the
   * quick-add Buttons (a touch press shows no Buttons there), places the caret at the table's text
   * point nearest to it; the engines would put it at the table's start or before the table.
   */
  #pressReserved(event: PointerEvent): void {
    if (event.button !== 0 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const instance = this.#host.instance();
    const target = event.composedPath()[0] as Element | undefined;
    if (!instance || target?.nodeType !== 1) return;
    const table = instance.blockAt(target);
    const elements = table ? instance.tableElements(table) : null;
    if (!table || !elements || target !== elements.scroller) return;
    const selection = reservedPressSelection(
      instance,
      table,
      elements.table,
      event.clientX,
      event.clientY,
    );
    if (!selection) return;
    // No compatibility mouse events follow: the engine never reads this press.
    event.preventDefault();
    void this.#host
      .request({
        target: [{ type: 'selection.set', selection }],
        surface: 'content',
        reason: 'pointer',
        sourceEvent: event,
        trigger: null,
        focus: true,
      })
      .catch(() => undefined);
  }

  /** Stops every observation and gesture; called at disconnection. */
  release(): void {
    this.#viewport?.release();
    this.#viewport = null;
    this.#watchScroller(null);
    this.#handleDrag?.disconnect();
    this.resize.reset();
    this.#hover = null;
    this.#move = null;
    this.#frozen = null;
    this.#session = false;
    this.#openMenu = null;
  }

  /** Removes the layer from the geometry. */
  dispose(): void {
    this.release();
    this.#remove();
    for (const { release } of this.#triggers.values()) release();
    this.#triggers.clear();
    this.#separatorRelease?.();
    this.#separatorRelease = null;
  }

  #editable(): boolean {
    const access = this.#host.access();
    const instance = this.#host.instance();
    return !access.readOnly && !access.disabled && instance !== null && this.#host.state().editable;
  }

  #invalidate(): void {
    this.#host.geometry.invalidate('state');
  }

  #announceRange(state: TextEditorEngineState): void {
    const selection = state.selection;
    if (selection.kind !== 'cells') {
      this.#announcedRange = '';
      return;
    }
    const { rows, columns } = cellRangeSize(
      selection.range,
      this.#host.instance()?.getTable(selection.table),
    );
    const key = `${selection.table}:${rows}x${columns}`;
    if (key === this.#announcedRange) return;
    this.#announcedRange = key;
    this.#host.announce(fillTemplate(this.#host.strings().announceCellRange, { rows, columns }));
  }

  // Pointer -------------------------------------------------------------------------------------

  #pointerMove(event: PointerEvent): void {
    if (this.#frozen || this.gesture) return;
    const path = event.composedPath();
    // Over the chrome itself the hover is kept, so a grip stays reachable.
    if (this.#elements.container && path.includes(this.#elements.container)) return;
    // The engine lookups run in the next frame (one per frame), not in the move handler.
    this.#move = { path, clientX: event.clientX, clientY: event.clientY };
    this.#host.geometry.requestHit(event.clientX, event.clientY, this.#onHit);
  }

  /** The table under the latest pointer position, resolved in the frame. */
  readonly #onHit = (): void => {
    const move = this.#move;
    this.#move = null;
    if (!move || this.#frozen || this.gesture) return;
    const instance = this.#host.instance();
    let hover: TableHover | null = null;
    if (instance && this.#editable())
      for (const node of move.path) {
        if ((node as Node).nodeType !== 1) continue;
        const location = instance.cellAt(node as Node);
        if (location) {
          hover = { table: location.table, cell: location.cell, boundary: null };
          break;
        }
        const block = instance.blockAt(node as Node);
        // The cached tree answers the kind; a table model is read for tables only, since
        // looking one up for any other block walks the document.
        if (
          block &&
          instance.getBlocks().get(block)?.kind === 'table' &&
          instance.getTable(block)
        ) {
          hover = { table: block, cell: null, boundary: null };
          break;
        }
        if (node === this.#viewport?.element) break;
      }
    if (hover) hover = { ...hover, boundary: this.#boundaryAt(hover.table, move, hover.cell) };
    // Between the table and its grips the hover stays, so a grip remains reachable.
    else if (this.#hover && this.#nearTable(this.#hover.table, move))
      hover = { ...this.#hover, boundary: null };
    this.#setHover(hover);
  };

  #pointerLeave(event: PointerEvent): void {
    if (this.#frozen || this.gesture) return;
    // Leaving into the chrome keeps the hover; the chrome lies inside the viewport.
    if (this.contains(event.relatedTarget as Node | null)) return;
    this.#move = null;
    this.#setHover(null);
  }

  #nearTable(table: string, event: PointerPoint): boolean {
    const box = this.#boundaries;
    return (
      box !== null &&
      box.table === table &&
      event.clientX >= box.left - CONTROL_REACH &&
      event.clientX <= box.right + CONTROL_REACH &&
      event.clientY >= box.top - CONTROL_REACH &&
      event.clientY <= box.bottom + CONTROL_REACH
    );
  }

  /**
   * The column whose inline-end boundary the pointer is near, where that boundary is a cell edge
   * in the row of the cell under the pointer (else the row at its position): over a merged cell
   * the boundaries that it spans are none.
   */
  #boundaryAt(
    table: string,
    event: PointerPoint,
    cell: TextEditorCellAddress | null,
  ): number | null {
    const boundaries = this.#boundaries;
    if (!boundaries || boundaries.table !== table) return null;
    if (event.clientY < boundaries.top || event.clientY > boundaries.bottom) return null;
    const row = cell?.row ?? boundaries.rowAt(event.clientY);
    let best: number | null = null;
    let distance = BOUNDARY_REACH + 1;
    boundaries.edges.forEach((edge, column) => {
      const gap = Math.abs(event.clientX - edge);
      if (row >= 0 && !columnEdgeAt(boundaries.grid, column, row)) return;
      if (gap <= BOUNDARY_REACH && gap < distance) {
        best = column;
        distance = gap;
      }
    });
    return best;
  }

  #setHover(hover: TableHover | null): void {
    const current = this.#hover;
    if (
      current === hover ||
      (current &&
        hover &&
        current.table === hover.table &&
        current.boundary === hover.boundary &&
        current.cell?.row === hover.cell?.row &&
        current.cell?.column === hover.cell?.column)
    )
      return;
    // Over the reserved space the grips stay on the last hovered cell of the table.
    if (hover && !hover.cell && current?.table === hover.table && current.cell)
      hover = { ...hover, cell: current.cell };
    this.#hover = hover;
    this.update();
  }

  #watchScroller(element: HTMLElement | null): void {
    if (this.#scroller?.element === element) return;
    this.#scroller?.release();
    this.#scroller = element
      ? {
          element,
          release: observeScroll(element, {
            scroll: () => this.#host.geometry.invalidate('scroll'),
          }),
        }
      : null;
  }

  // Layer ---------------------------------------------------------------------------------------

  wanted(): boolean {
    return this.#model !== null && this.#elements.container !== null;
  }

  measure(context: OverlayMeasureContext): TableChromePlacement | null {
    const model = this.#model;
    const instance = this.#host.instance();
    if (!model || !instance || context.source.kind !== 'instance') return null;
    const elements = instance.tableElements(model.table);
    const table = instance.getTable(model.table);
    if (!elements || !table) return null;
    const rtl = this.#host.direction() === 'rtl';
    const tableRect = elements.table.getBoundingClientRect();
    const clip = elements.scroller.getBoundingClientRect();
    const overlay = (box: ClientBox): OverlayBox => context.toOverlay(rectOf(box));
    const point = (x: number, y: number): Anchor => {
      const box = overlay({ left: x, top: y, right: x, bottom: y });
      return { x: box.left, y: box.top };
    };
    const startX = rtl ? tableRect.right : tableRect.left;
    const endX = rtl ? tableRect.left : tableRect.right;
    // Rows: the row elements of the native table; columns: one band cell each.
    const rows = (elements.table as HTMLTableElement).rows;
    const rowRect = (index: number): DOMRectReadOnly | null =>
      rows?.[index]?.getBoundingClientRect() ?? null;
    const bands = columnBandCells(table).map((cell) => {
      const rect = cell ? instance.cellElement(model.table, cell)?.getBoundingClientRect() : null;
      return rect ? { left: rect.left, right: rect.right } : null;
    });
    // A focused control whose place a scroll or a step moved out of the visible area keeps its
    // focus: it stays at the wrapper's edge while the wrapper scrolls its place into view.
    let reveal = 0;
    const active = this.#activeControl();
    const focused = (control: HTMLElement | null) => control !== null && control === active;
    const shown = (x: number, holdsFocus: boolean): boolean => {
      if (inside(x, clip)) return true;
      if (!holdsFocus) return false;
      reveal ||=
        x > clip.right ? x - (clip.right - REVEAL_MARGIN) : x - (clip.left + REVEAL_MARGIN);
      return true;
    };
    const clamp = (x: number) => Math.min(Math.max(x, clip.left), clip.right);
    // Grips: the row grip on the table's inline-start edge, the column grip on its top edge, each
    // moved out by its outset (`gripOutset`).
    let rowGrip: Anchor | null = null;
    const row = model.row === null ? null : rowRect(model.row);
    if (row && shown(startX, focused(this.#elements.rowGrip))) {
      const outset = this.#gripOutset(this.#elements.rowGrip);
      rowGrip = point(clamp(startX) + (rtl ? outset : -outset), row.top + row.height / 2);
    }
    let columnGrip: Anchor | null = null;
    const band = model.column === null ? null : bands[model.column];
    if (band) {
      const center = (band.left + band.right) / 2;
      if (shown(center, focused(this.#elements.columnGrip)))
        columnGrip = point(
          clamp(center),
          tableRect.top - this.#gripOutset(this.#elements.columnGrip),
        );
    }
    // The outline of the range: the union of the selected cells, clipped to the wrapper.
    let outline: OverlayBox | null = null;
    let handle: Anchor | null = null;
    const state = this.#host.state();
    if (model.range && state.selection.kind === 'cells' && state.selection.table === model.table) {
      const union = unionRect(instance.selectionRects());
      if (union) {
        const left = Math.max(union.left, clip.left);
        const right = Math.min(union.right, clip.right);
        if (right > left) outline = overlay({ left, top: union.top, right, bottom: union.bottom });
        const edge = rtl ? union.left : union.right;
        if (
          (outline || focused(this.#elements.handle)) &&
          shown(edge, focused(this.#elements.handle))
        )
          handle = point(clamp(edge), (union.top + union.bottom) / 2);
      }
    }
    // Quick-add: below the last row across the visible width, beside the last column.
    let addRow: OverlayBox | null = null;
    let addColumn: OverlayBox | null = null;
    if (model.quickAdd) {
      const left = Math.max(tableRect.left, clip.left);
      const right = Math.min(tableRect.right, clip.right);
      if (right > left)
        addRow = overlay({ left, top: tableRect.bottom, right, bottom: tableRect.bottom });
      if (inside(endX, clip))
        addColumn = overlay({
          left: endX,
          top: tableRect.top,
          right: endX,
          bottom: tableRect.bottom,
        });
    }
    // The resize separator on the boundary after a column, and the guide of a drag.
    const edges = bands.map((value) => (value ? (rtl ? value.left : value.right) : NaN));
    let separator: OverlayBox | null = null;
    let guide: OverlayBox | null = null;
    // The boundary runs where it is a cell edge: on the session's head cell that spans it, the
    // separator moves to that cell's inline-end edge, and a merged cell that the boundary crosses
    // ends the line, which covers the run of rows around the grips' row.
    const edgeRow = Math.min(Math.max(model.row ?? 0, 0), table.rows - 1);
    const boundary =
      model.boundary === null || columnEdgeAt(table, model.boundary, edgeRow)
        ? model.boundary
        : cellEndColumn(table, edgeRow, model.boundary);
    const edge = boundary === null ? NaN : (edges[boundary] ?? NaN);
    // A focused separator whose boundary a keyboard step moved out of the visible area keeps its
    // focus: it stays at the wrapper's edge while the wrapper scrolls the boundary into view.
    const separatorShown = Number.isFinite(edge) && shown(edge, this.resize.focused);
    if (boundary !== null && separatorShown) {
      const at = clamp(edge);
      const run = columnEdgeRun(table, boundary, edgeRow);
      const first = run.from > 0 ? rowRect(run.from) : null;
      const last = run.to < table.rows - 1 ? rowRect(run.to) : null;
      separator = overlay({
        left: at,
        top: first?.top ?? tableRect.top,
        right: at,
        bottom: last?.bottom ?? tableRect.bottom,
      });
      const widths = bands.map((value) =>
        value ? overlay({ left: value.left, top: 0, right: value.right, bottom: 0 }).width : 0,
      );
      this.resize.setTarget({
        table: model.table,
        column: boundary,
        widths,
        visible: overlay(clip).width,
      });
      const offset = this.resize.guideOffset;
      if (offset !== null)
        guide = { ...separator, left: separator.left + (rtl ? -offset : offset) };
    } else if (!this.resize.dragging) this.resize.setTarget(null);
    this.#boundaries = {
      table: model.table,
      left: tableRect.left,
      right: tableRect.right,
      top: tableRect.top,
      bottom: tableRect.bottom,
      edges,
      rowAt: (y) => {
        for (let index = 0; index < table.rows; index++) {
          const box = rowRect(index);
          if (box && y >= box.top && y <= box.bottom) return index;
        }
        return -1;
      },
      grid: table,
    };
    return {
      model,
      rowGrip,
      columnGrip,
      outline,
      handle,
      addRow,
      addColumn,
      separator,
      guide,
      rtl,
      reveal,
    };
  }

  apply(placement: TableChromePlacement | null): void {
    if (!placement || placement.model !== this.#model) {
      this.hide();
      return;
    }
    const instance = this.#host.instance();
    const scroller = instance?.tableElements(placement.model.table)?.scroller ?? null;
    this.#watchScroller(scroller);
    // The scroll observation runs the next pass, which places the separator on its boundary.
    if (placement.reveal) scroller?.scrollBy({ left: placement.reveal });
    const elements = this.#elements;
    const centred = (anchor: Anchor | null) =>
      anchor
        ? {
            hidden: false,
            translate: `calc(${anchor.x}px - 50%) calc(${anchor.y}px - 50%)`,
          }
        : { hidden: true };
    this.#write(elements.rowGrip, centred(placement.rowGrip));
    this.#write(elements.columnGrip, centred(placement.columnGrip));
    this.#write(elements.handle, centred(placement.handle));
    const outline = placement.outline;
    this.#write(
      elements.outline,
      outline
        ? {
            hidden: false,
            translate: `${outline.left}px ${outline.top}px`,
            inline: `${outline.width}px`,
            block: `${outline.height}px`,
          }
        : { hidden: true },
    );
    // Read in the measure phase: a computed-style read here, after the writes above, would force
    // a style recalculation.
    const rtl = placement.rtl;
    const addRow = placement.addRow;
    this.#write(
      elements.addRow,
      addRow
        ? {
            hidden: false,
            translate: `${addRow.left}px ${addRow.top}px`,
            inline: `${addRow.width}px`,
            length: `${addRow.width}px`,
          }
        : { hidden: true },
    );
    const addColumn = placement.addColumn;
    this.#write(
      elements.addColumn,
      addColumn
        ? {
            hidden: false,
            translate: rtl
              ? `calc(${addColumn.left}px - 100%) ${addColumn.top}px`
              : `${addColumn.left}px ${addColumn.top}px`,
            block: `${addColumn.height}px`,
            length: `${addColumn.height}px`,
          }
        : { hidden: true },
    );
    const line = (box: OverlayBox | null) =>
      box
        ? {
            hidden: false,
            translate: `calc(${box.left}px - 50%) ${box.top}px`,
            block: `${box.height}px`,
          }
        : { hidden: true };
    this.#write(elements.separator, line(placement.separator));
    this.#write(elements.guide, line(placement.guide));
    this.#syncSeparatorAttributes();
  }

  hide(): void {
    const elements = this.#elements;
    for (const element of [
      elements.rowGrip,
      elements.columnGrip,
      elements.outline,
      elements.handle,
      elements.addRow,
      elements.addColumn,
      elements.separator,
      elements.guide,
    ])
      this.#write(element, { hidden: true });
    this.#watchScroller(null);
  }

  #hidden(element: HTMLElement): boolean {
    return this.#written.get(element)?.hidden ?? true;
  }

  #write(element: HTMLElement | null, next: Partial<Written>): void {
    if (!element) return;
    let written = this.#written.get(element);
    if (!written) {
      written = { hidden: true, translate: '', inline: '', block: '', length: '' };
      this.#written.set(element, written);
    }
    if (next.hidden !== undefined && next.hidden !== written.hidden) {
      written.hidden = next.hidden;
      element.hidden = next.hidden;
    }
    if (next.hidden) return;
    if (next.translate !== undefined && next.translate !== written.translate)
      element.style.setProperty('translate', (written.translate = next.translate));
    if (next.inline !== undefined && next.inline !== written.inline)
      element.style.setProperty('inline-size', (written.inline = next.inline));
    if (next.block !== undefined && next.block !== written.block)
      element.style.setProperty('block-size', (written.block = next.block));
    if (next.length !== undefined && next.length !== written.length)
      element.style.setProperty(QUICK_ADD_LENGTH, (written.length = next.length));
  }

  #syncSeparatorAttributes(): void {
    const element = this.#elements.separator;
    if (!element) return;
    const attributes = this.resize.attributes();
    const target = this.resize.target;
    const label = target
      ? fillTemplate(this.#host.strings().tableColumnWidth, { column: target.column + 1 })
      : null;
    const values: Record<string, string | null> = {
      'aria-label': label,
      'aria-orientation': attributes?.['aria-orientation'] ?? null,
      'aria-valuenow': attributes ? String(Math.round(attributes['aria-valuenow'])) : null,
      'aria-valuemin': attributes ? String(attributes['aria-valuemin']) : null,
      'aria-valuemax': attributes ? String(Math.round(attributes['aria-valuemax'])) : null,
      'data-dragging': this.resize.dragging ? '' : null,
    };
    for (const [name, value] of Object.entries(values))
      if (element.getAttribute(name) !== value) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
  }

  // Menus ---------------------------------------------------------------------------------------

  #menuIndex(kind: TableMenuKind, model: TableChromeModel): number | null {
    return kind === 'row' ? model.row : kind === 'column' ? model.column : null;
  }

  #target(kind: TableMenuKind): TextEditorToolTarget | null {
    const model = this.#frozen ?? this.#model;
    return model ? tableMenuTarget(kind, model.table, this.#menuIndex(kind, model)) : null;
  }

  #handlers(kind: TableMenuKind): TextEditorToolHandlers {
    return {
      activate: (activation) => {
        const toolTarget = this.#target(kind);
        void this.#host
          .request({
            target: activation.tool,
            ...(activation.value === undefined ? {} : { value: activation.value }),
            surface: TABLE_MENU_SURFACE[kind],
            reason: activation.reason,
            sourceEvent: activation.sourceEvent,
            trigger: activation.trigger,
            focus: activation.focus,
            ...(toolTarget ? { toolTarget } : {}),
          })
          .catch(ignore);
      },
      menuOpenChange: ignore,
      finalFocus: this.#finalFocus,
    };
  }

  /** Closing a table menu returns focus to the editing root with its selection (`uwg-te-req-a11y-6`). */
  readonly #finalFocus = (): boolean => {
    if (this.#host.access().disabled || !this.#host.instance()) return false;
    this.#host.focusEditing();
    return false;
  };

  #menuOpenChange(kind: TableMenuKind, event: TpSurfaceOpenChangeEvent): void {
    if (event.target !== event.currentTarget) return;
    const { value, sourceEvent } = event.detail;
    if (!value) {
      if (this.#openMenu !== kind) return;
      this.#openMenu = null;
      this.#frozen = null;
      this.#host.transientClosed?.(this);
      this.update();
      // The selection toolbar, hidden while the menu was open, shows again.
      this.#host.requestUpdate();
      return;
    }
    const model = this.#model;
    if (!model) {
      event.preventDefault();
      return;
    }
    // The row, column and cell menus are one owner; they close each other below.
    this.#host.transientOpened?.(this, () => this.closeMenus());
    for (const other of ['row', 'column', 'cell'] as const)
      if (other !== kind) this.#menu(other)?.setOpen(false, 'programmatic', sourceEvent);
    this.#openMenu = kind;
    this.#frozen = model;
    // The items exist from the open request on, rendered before the popup shows, so that a
    // keyboard opening lands on the first one.
    this.#renderMenuItems(kind, event.currentTarget as TpMenu);
    const index = this.#menuIndex(kind, model);
    const table = this.#host.instance()?.getTable(model.table);
    // Opening a row or column menu selects that line directly, with no request.
    if (kind !== 'cell' && index !== null && table)
      void this.#host
        .request({
          target: {
            type: 'selection.set',
            selection: { kind: 'cells', table: model.table, range: lineRange(table, kind, index) },
          },
          surface: TABLE_MENU_SURFACE[kind],
          reason: 'trigger-press',
          sourceEvent,
          focus: false,
        })
        .catch(ignore);
    this.update();
    this.#host.requestUpdate();
  }

  #menu(kind: TableMenuKind): TpMenu | null {
    const elements = this.#elements;
    return kind === 'row'
      ? elements.rowMenu
      : kind === 'column'
        ? elements.columnMenu
        : elements.cellMenu;
  }

  /** Closes an open table menu. */
  closeMenus(): void {
    for (const kind of ['row', 'column', 'cell'] as const) {
      const menu = this.#menu(kind);
      if (menu?.open) menu.setOpen(false, 'programmatic');
    }
  }

  // Quick-add -----------------------------------------------------------------------------------

  #append(axis: 'row' | 'column', event: Event): void {
    const model = this.#model;
    const table = model ? this.#host.instance()?.getTable(model.table) : null;
    if (!model || !table) return;
    void this.#host
      .request({
        target: [
          axis === 'row'
            ? { type: 'table.insert-row', table: model.table, index: table.rows }
            : { type: 'table.insert-column', table: model.table, index: table.columns },
        ],
        surface: axis === 'row' ? 'table-row' : 'table-column',
        reason: 'trigger-press',
        sourceEvent: event,
        trigger: event.currentTarget as Element | null,
        focus: false,
      })
      .catch(ignore);
  }

  // Cell handle drag ----------------------------------------------------------------------------

  #bindHandle(element: HTMLElement | null): void {
    if (this.#elements.handle === element) return;
    this.#handleDrag?.disconnect();
    this.#handleDrag = null;
    this.#elements.handle = element;
    if (!element) return;
    const drag = new PointerDrag({
      element,
      disabled: () => !this.#editable(),
      handlers: {
        begin: () => {
          const selection = this.#host.state().selection;
          if (selection.kind !== 'cells' || !this.#model) return false;
          this.#dragFrom = selection.range;
          this.#frozen = this.#model;
          return true;
        },
        move: (_point, event) => this.#extendTo(event.clientX, event.clientY),
        end: (_point, event, dragged) => {
          if (dragged) {
            this.#extendTo(event.clientX, event.clientY);
            // The release after a drag does not open the cell menu.
            this.#suppressClick = true;
          }
          this.#endHandleDrag();
        },
        cancel: (_reason, event) => {
          const from = this.#dragFrom;
          const model = this.#frozen;
          if (from && model) this.#selectRange(model.table, from, event);
          this.#endHandleDrag();
        },
      },
    });
    drag.connect();
    this.#handleDrag = drag;
  }

  #endHandleDrag(): void {
    this.#dragFrom = null;
    if (this.#openMenu === null) this.#frozen = null;
    this.update();
  }

  /** Extends the range from its anchor to the cell under a client point of the same table. */
  #extendTo(clientX: number, clientY: number): void {
    const from = this.#dragFrom;
    const model = this.#frozen;
    const instance = this.#host.instance();
    const root = this.#host.element.shadowRoot;
    if (!from || !model || !instance || !root || typeof root.elementsFromPoint !== 'function')
      return;
    for (const element of root.elementsFromPoint(clientX, clientY)) {
      if (this.contains(element)) continue;
      const location = instance.cellAt(element);
      if (!location) continue;
      if (location.table !== model.table) return;
      const selection = this.#host.state().selection;
      const head = selection.kind === 'cells' ? selection.range.head : null;
      if (head && head.row === location.cell.row && head.column === location.cell.column) return;
      this.#selectRange(model.table, { anchor: from.anchor, head: location.cell }, null);
      return;
    }
  }

  #selectRange(table: string, range: TextEditorCellRange, event: Event | null): void {
    void this.#host
      .request({
        target: { type: 'selection.set', selection: { kind: 'cells', table, range } },
        surface: 'table-cell',
        reason: 'drag',
        sourceEvent: event ?? undefined,
        focus: false,
      })
      .catch(ignore);
  }

  readonly #handleClick = (event: Event): void => {
    if (!this.#suppressClick) return;
    this.#suppressClick = false;
    preventComponentHandling(event);
    event.stopImmediatePropagation();
  };

  // Rendering -----------------------------------------------------------------------------------

  readonly #bindContainer = (element: Element | undefined) => {
    this.#elements.container = (element as HTMLElement | undefined) ?? null;
  };

  /** The element that holds the menus, outside the overlay. */
  #menus: HTMLElement | null = null;

  readonly #bindMenus = (element: Element | undefined) => {
    this.#menus = (element as HTMLElement | undefined) ?? null;
  };

  #bind<K extends keyof ChromeElements>(key: K) {
    return (element: Element | undefined) => {
      const next = ((element as ChromeElements[K] | undefined) ?? null) as ChromeElements[K];
      if (this.#elements[key] === next) return;
      this.#elements[key] = next;
      if (next) this.#written.delete(next as HTMLElement);
      if (key === 'separator') {
        this.#separatorRelease?.();
        this.#separatorRelease = null;
        if (next) this.#separatorRelease = this.#connectSeparator(next as HTMLElement);
      }
    };
  }

  readonly #refs = {
    rowGrip: this.#bind('rowGrip'),
    columnGrip: this.#bind('columnGrip'),
    outline: this.#bind('outline'),
    addRow: this.#bind('addRow'),
    addColumn: this.#bind('addColumn'),
    separator: this.#bind('separator'),
    guide: this.#bind('guide'),
    rowMenu: this.#bind('rowMenu'),
    columnMenu: this.#bind('columnMenu'),
    cellMenu: this.#bind('cellMenu'),
    handle: (element: Element | undefined) =>
      this.#bindHandle((element as HTMLElement | undefined) ?? null),
  };

  #connectSeparator(element: HTMLElement): () => void {
    const resize = this.resize;
    const down = (event: Event) => resize.pointerDown(event as PointerEvent, element);
    const move = (event: Event) => resize.separator.pointerMove(event as PointerEvent);
    const up = (event: Event) => resize.separator.pointerUp(event as PointerEvent);
    const cancel = (event: Event) => resize.separator.pointerCancel(event as PointerEvent);
    const key = (event: Event) => {
      if (resize.separator.handleKeyDown(event as KeyboardEvent)) event.stopPropagation();
    };
    const focus = () => resize.focusChanged(true);
    const blur = () => resize.focusChanged(false);
    const listeners: [string, EventListener][] = [
      ['pointerdown', down],
      ['pointermove', move],
      ['pointerup', up],
      ['lostpointercapture', up],
      ['pointercancel', cancel],
      ['keydown', key],
      ['focus', focus],
      ['blur', blur],
    ];
    for (const [type, listener] of listeners) element.addEventListener(type, listener);
    return () => {
      resize.separator.cancel();
      for (const [type, listener] of listeners) element.removeEventListener(type, listener);
    };
  }

  /** After each render of the element: the controls, and the items of an open menu. */
  updated(): void {
    this.#renderControls();
    if (this.#openMenu) this.#renderMenuItems(this.#openMenu);
  }

  /**
   * Renders the controls into their container, a render root of the chrome's own, so that a new
   * hovered cell renders them alone; then their Tab stops and menu triggers.
   */
  #renderControls(): void {
    const container = this.#elements.container;
    if (!container) return;
    render(this.#controls(), container, { host: this.#host.element });
    this.#syncControls();
  }

  /**
   * Resolves and renders a table menu's items and its name into the menu, a render root of the
   * chrome's own: when it opens and while it is open, never for a closed menu (a reveal resolves
   * no tool).
   */
  #renderMenuItems(kind: TableMenuKind, menu: TpMenu | null = this.#menu(kind)): void {
    if (!menu) return;
    const target = this.#target(kind);
    const groups = target ? this.#host.menuGroups(TABLE_MENU_SURFACE[kind], target) : [];
    const handlers = this.#handlers(kind);
    render(
      groups.map(
        (group, index) =>
          html`${index ? html`<tp-separator></tp-separator>` : nothing}${renderToolMenuItems(
            group.items,
            handlers,
          )}`,
      ),
      menu,
      { host: this.#host.element },
    );
    // After the items: a new name updates the menu, which must find its new items rendered
    // (their first updates queued before its own) when it moves focus to the first one.
    menu.label = kind === 'cell' ? this.#host.strings().tableCellHandle : this.#gripLabels()[kind];
  }

  /** Registers the grips and the handle as detached triggers of their menus, once per element. */
  #syncControls(): void {
    const { rowGrip, columnGrip, handle, rowMenu, columnMenu, cellMenu } = this.#elements;
    // The Buttons are Tab stops during the session only (the separator through its tabindex).
    for (const button of [
      rowGrip,
      columnGrip,
      handle,
      this.#elements.addRow,
      this.#elements.addColumn,
    ]) {
      const control = button ? compositeControl(button) : undefined;
      if (this.#session) control?.release(this.#outOfSequence);
      else control?.apply(this.#outOfSequence, OUT_OF_SEQUENCE, () => {});
    }
    for (const [menu, trigger] of [
      [rowMenu, rowGrip],
      [columnMenu, columnGrip],
      [cellMenu, handle],
    ] as const)
      if (menu && trigger && typeof menu.registerTrigger === 'function') {
        const known = this.#triggers.get(menu);
        if (known?.trigger === trigger) continue;
        known?.release();
        this.#triggers.set(menu, { trigger, release: menu.registerTrigger(trigger) });
      }
    for (const [menu, { release }] of this.#triggers)
      if (!menu.isConnected) {
        release();
        this.#triggers.delete(menu);
      }
  }

  /** The labels of the row and column grips and their menus, for the current or frozen model. */
  #gripLabels(): { readonly row: string; readonly column: string } {
    const strings = this.#host.strings();
    const model = this.#frozen ?? this.#model;
    return {
      row: fillTemplate(strings.tableRowGrip, { row: (model?.row ?? 0) + 1 }),
      column: fillTemplate(strings.tableColumnGrip, { column: (model?.column ?? 0) + 1 }),
    };
  }

  /**
   * The row, column and cell menus, outside the viewport and the overlay like every floating
   * surface (`uwg-te-req-ana-3`); focus leaving them reaches the session as it does from a control.
   */
  renderMenus(): TemplateResult {
    // The items and the name are the chrome's to render, when a menu opens (`#renderMenuItems`).
    const menu = (kind: TableMenuKind) =>
      html`<tp-menu
        class=${`table-menu table-${kind}-menu`}
        .portal=${false}
        .modal=${false}
        .finalFocus=${this.#finalFocus}
        @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => this.#menuOpenChange(kind, event)}
        ${ref(this.#refs[`${kind}Menu`])}
      ></tp-menu>`;
    return html`<div
      class="table-menus"
      ${ref(this.#bindMenus)}
      @focusout=${(event: FocusEvent) => this.focusOutHandler?.(event)}
    >
      ${menu('row')}${menu('column')}${menu('cell')}
    </div>`;
  }

  /** The holder of the chrome's controls in the overlay part; the chrome renders them into it. */
  render(): TemplateResult {
    return html`<div
      class="table-chrome"
      ${ref(this.#bindContainer)}
      @keydown=${this.#keyDown}
      @focusout=${(event: FocusEvent) => this.focusOutHandler?.(event)}
    ></div>`;
  }

  /** The chrome's controls, pooled in the overlay part. */
  #controls(): TemplateResult {
    const strings = this.#host.strings();
    const tabindex = this.#session ? '0' : '-1';
    const { row: rowLabel, column: columnLabel } = this.#gripLabels();
    return html`<tp-button
        part="text-editor-row-grip"
        class="table-control"
        variant="outline"
        size="icon-xs"
        hidden
        .icon=${ellipsisVerticalIcon}
        .partPresentation=${GRIP}
        @pointerdown=${preserveFocusOnPress}
        ${ref(this.#refs.rowGrip)}
        >${rowLabel}</tp-button
      ><tp-button
        part="text-editor-column-grip"
        class="table-control"
        variant="outline"
        size="icon-xs"
        hidden
        .icon=${navigationIcons.more}
        .partPresentation=${GRIP}
        @pointerdown=${preserveFocusOnPress}
        ${ref(this.#refs.columnGrip)}
        >${columnLabel}</tp-button
      >
      <div
        part="text-editor-table-selection"
        class="table-outline"
        hidden
        ${ref(this.#refs.outline)}
      ></div>
      <tp-button
        part="text-editor-cell-handle"
        class="table-control"
        variant="outline"
        size="icon-xs"
        hidden
        .partPresentation=${GRIP}
        @click=${{ handleEvent: this.#handleClick, capture: true }}
        ${ref(this.#refs.handle)}
        >${strings.tableCellHandle}</tp-button
      >
      <div
        part="text-editor-resize-handle"
        class="table-separator"
        role="separator"
        tabindex=${tabindex}
        hidden
        ${ref(this.#refs.separator)}
      ></div>
      <div class="table-guide" aria-hidden="true" hidden ${ref(this.#refs.guide)}></div>
      <tp-button
        part="text-editor-add-row"
        class="table-control"
        variant="ghost"
        size="icon-xs"
        hidden
        .icon=${plusIcon}
        .partPresentation=${ADD_ROW}
        @pointerdown=${preserveFocusOnPress}
        @click=${(event: Event) => this.#append('row', event)}
        ${ref(this.#refs.addRow)}
        >${strings.tableAddRow}</tp-button
      ><tp-button
        part="text-editor-add-column"
        class="table-control"
        variant="ghost"
        size="icon-xs"
        hidden
        .icon=${plusIcon}
        .partPresentation=${ADD_COLUMN}
        @pointerdown=${preserveFocusOnPress}
        @click=${(event: Event) => this.#append('column', event)}
        ${ref(this.#refs.addColumn)}
        >${strings.tableAddColumn}</tp-button
      >`;
  }

  /** Keys on the chrome's controls, outside its menus; the session adds its own handling. */
  keyHandler: ((event: KeyboardEvent) => void) | null = null;
  /** Focus leaving a node of the chrome; the session ends when it leaves the chrome. */
  focusOutHandler: ((event: FocusEvent) => void) | null = null;

  readonly #keyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    // Keys inside an open menu belong to the menu.
    if (event.composedPath().some((node) => (node as Partial<Element>).hasAttribute?.('popover')))
      return;
    this.keyHandler?.(event);
  };
}

/**
 * Structure of the chrome: absolute, pooled controls at the overlay's origin that take pointer
 * input inside the overlay, the separator's enlarged hit target, and hidden controls removed from
 * layout. Paint and sizes belong to the family.
 */
export const tableChromeStyles = css`
  .table-chrome {
    display: contents;
  }

  .table-chrome > :is(.table-control, .table-outline, .table-separator, .table-guide) {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
  }

  /* The overlay takes no pointer input; the controls do. */
  .table-chrome > :is(.table-control, .table-separator) {
    pointer-events: auto;
  }

  /* The menus' hosts take no box beside the viewport; their popups lie in the top layer. */
  .table-menus {
    display: contents;
  }

  .table-chrome > [hidden] {
    display: none !important;
  }

  .table-separator {
    inline-size: var(--tp-border-width);
    touch-action: none;
    user-select: none;
    cursor: col-resize;
    outline: none;
  }

  ${unsafeCSS(resizeSeparatorTargetCss('.table-separator', 'horizontal'))}

  /* Pointer targets beyond the visible controls, without layout: a grip grows along the edge it
     straddles, the cell handle along the outline's edge and a quick-add Button away from the table,
     so no target reaches another, the gutter beside the table or a cell's text; more under a
     coarse pointer. */
  .table-chrome > .table-control {
    --_tp-text-editor-target-grow: var(--tp-space-1);
  }

  @media (any-pointer: coarse) {
    .table-chrome > .table-control {
      --_tp-text-editor-target-grow: var(--tp-space-2);
    }
  }

  .table-chrome > .table-control::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  .table-chrome > :is([part~='text-editor-row-grip'], [part~='text-editor-cell-handle'])::after {
    inset-block: calc(-1 * var(--_tp-text-editor-target-grow));
  }

  .table-chrome > [part~='text-editor-column-grip']::after {
    inset-inline: calc(-1 * var(--_tp-text-editor-target-grow));
  }

  .table-chrome > [part~='text-editor-add-row']::after {
    inset-block-end: calc(-1 * var(--_tp-text-editor-target-grow));
  }

  .table-chrome > [part~='text-editor-add-column']::after {
    inset-inline-end: calc(-1 * var(--_tp-text-editor-target-grow));
  }
`;
