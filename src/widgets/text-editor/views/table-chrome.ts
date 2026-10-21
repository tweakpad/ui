/**
 * Table chrome of the text editor (`uwg-te-req-tables-3` to `uwg-te-req-tables-9`,
 * `uwg-te-tab-anatomy-tables`): the row and column grips, detached triggers of the row and column
 * menus; the cell-range outline with its handle, which extends the range by dragging and opens the
 * cell menu; the quick-add Buttons in the space that the table wrapper always reserves; and the
 * column resize separator (`views/table-resize.ts`). Every control lives in the overlay, pooled
 * and hidden rather than detached, placed by one layout pass of the overlay geometry, and follows
 * the active table wrapper's horizontal scroll, clipped to its visible area.
 */
import { css, html, nothing, unsafeCSS, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpMenu } from '../../../components/menu/menu.js';
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
}

/**
 * The chrome of the moment (`uwg-te-req-tables-3`, `-4`, `-6`, `-7`): nothing unless editable; a
 * frozen model while a menu is open or a gesture runs; during the session, the table of the
 * selection with every control, the separator on the head column; otherwise the hovered table with
 * its grips at the hovered cell, its quick-add Buttons and the separator near the pointer; else the
 * table of the selection with its grips at the selection head.
 */
export function tableChromeModel(input: TableChromeInput): TableChromeModel | null {
  if (!input.editable) return null;
  const { selection, table: selected } = input.state;
  const rangeOf = (table: string): TextEditorCellRange | null =>
    selection.kind === 'cells' && selection.table === table ? selection.range : null;
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

/** The number of rows and columns a cell range spans. */
export function cellRangeSize(range: TextEditorCellRange): { rows: number; columns: number } {
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
}

const TOLERANCE = 1;
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
}

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
  #frozen: TableChromeModel | null = null;
  #session = false;
  #openMenu: TableMenuKind | null = null;
  /** The column boundaries of the last pass in client coordinates, for the pointer's reach. */
  #boundaries: {
    table: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
    edges: readonly number[];
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
    const width = grip && !grip.hidden ? grip.offsetWidth : 0;
    if (width > 0) this.#rowGripOutset = width / 2;
    return this.#rowGripOutset;
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

  /** Whether an element is one of the chrome's own nodes. */
  contains(node: Node | null): boolean {
    const container = this.#elements.container;
    if (!container || !node) return false;
    for (let current: Node | null = node; current;) {
      if (current === container) return true;
      current =
        current.parentNode ?? ((current as Partial<ShadowRoot>).host as Node | undefined) ?? null;
    }
    return false;
  }

  /** Recomputes the model from the state, announces a new cell range and requests a pass. */
  update(): void {
    const state = this.#host.state();
    const next = tableChromeModel({
      editable: this.#editable(),
      state,
      hover: this.#hover,
      frozen: this.#frozen,
      session: this.#session,
    });
    const previous = this.#model;
    this.#model = next;
    if (!next) {
      this.closeMenus();
      this.resize.reset();
    }
    if (
      previous?.table !== next?.table ||
      previous?.row !== next?.row ||
      previous?.column !== next?.column
    )
      this.#host.requestUpdate();
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
    viewport.addEventListener('pointermove', move, { passive: true });
    viewport.addEventListener('pointerleave', leave, { passive: true });
    const scroll = this.#host.geometry.onScroll(() => this.#invalidate());
    this.#viewport = {
      element: viewport,
      release: () => {
        viewport.removeEventListener('pointermove', move);
        viewport.removeEventListener('pointerleave', leave);
        scroll();
      },
    };
  }

  /** Stops every observation and gesture; called at disconnection. */
  release(): void {
    this.#viewport?.release();
    this.#viewport = null;
    this.#watchScroller(null);
    this.#handleDrag?.disconnect();
    this.resize.reset();
    this.#hover = null;
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
    const { rows, columns } = cellRangeSize(selection.range);
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
    const instance = this.#host.instance();
    let hover: TableHover | null = null;
    if (instance && this.#editable())
      for (const node of path) {
        if ((node as Node).nodeType !== 1) continue;
        const location = instance.cellAt(node as Node);
        if (location) {
          hover = { table: location.table, cell: location.cell, boundary: null };
          break;
        }
        const block = instance.blockAt(node as Node);
        if (block && instance.getTable(block)) {
          hover = { table: block, cell: null, boundary: null };
          break;
        }
        if (node === this.#viewport?.element) break;
      }
    if (hover) hover = { ...hover, boundary: this.#boundaryAt(hover.table, event) };
    // Between the table and its grips the hover stays, so a grip remains reachable.
    else if (this.#hover && this.#nearTable(this.#hover.table, event))
      hover = { ...this.#hover, boundary: null };
    this.#setHover(hover);
  }

  #pointerLeave(event: PointerEvent): void {
    if (this.#frozen || this.gesture) return;
    // Leaving into the chrome keeps the hover; the chrome lies inside the viewport.
    if (this.contains(event.relatedTarget as Node | null)) return;
    this.#setHover(null);
  }

  #nearTable(table: string, event: PointerEvent): boolean {
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

  #boundaryAt(table: string, event: PointerEvent): number | null {
    const boundaries = this.#boundaries;
    if (!boundaries || boundaries.table !== table) return null;
    if (event.clientY < boundaries.top || event.clientY > boundaries.bottom) return null;
    let best: number | null = null;
    let distance = BOUNDARY_REACH + 1;
    boundaries.edges.forEach((edge, column) => {
      const gap = Math.abs(event.clientX - edge);
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
    // Grips: the row grip on the table's inline-start edge, the column grip on its top edge.
    let rowGrip: Anchor | null = null;
    const row = model.row === null ? null : rowRect(model.row);
    if (row && inside(startX, clip)) rowGrip = point(startX, row.top + row.height / 2);
    let columnGrip: Anchor | null = null;
    const band = model.column === null ? null : bands[model.column];
    if (band) {
      const center = (band.left + band.right) / 2;
      if (inside(center, clip)) columnGrip = point(center, tableRect.top);
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
        if (right > left) {
          outline = overlay({ left, top: union.top, right, bottom: union.bottom });
          const edge = rtl ? union.left : union.right;
          if (inside(edge, clip)) handle = point(edge, (union.top + union.bottom) / 2);
        }
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
    const boundary = model.boundary;
    const edge = boundary === null ? NaN : (edges[boundary] ?? NaN);
    if (boundary !== null && Number.isFinite(edge) && inside(edge, clip)) {
      separator = overlay({
        left: edge,
        top: tableRect.top,
        right: edge,
        bottom: tableRect.bottom,
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
    };
  }

  apply(placement: TableChromePlacement | null): void {
    if (!placement || placement.model !== this.#model) {
      this.hide();
      return;
    }
    const instance = this.#host.instance();
    this.#watchScroller(instance?.tableElements(placement.model.table)?.scroller ?? null);
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
    const rtl = this.#host.direction() === 'rtl';
    const addRow = placement.addRow;
    this.#write(
      elements.addRow,
      addRow
        ? {
            hidden: false,
            translate: `${addRow.left}px ${addRow.top}px`,
            inline: `${addRow.width}px`,
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
      written = { hidden: true, translate: '', inline: '', block: '' };
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

  /** Registers the grips and the handle as detached triggers of their menus, once per element. */
  updated(): void {
    const { rowGrip, columnGrip, handle, rowMenu, columnMenu, cellMenu } = this.#elements;
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

  /** The chrome's controls and menus, pooled in the overlay part. */
  render(): TemplateResult {
    const strings = this.#host.strings();
    const model = this.#frozen ?? this.#model;
    const tabindex = this.#session ? '0' : '-1';
    const control = { button: { hostProperties: { tabindex } } };
    const pill = { button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } } };
    // A quick-add Button fills the extent the pass gives it.
    const fill = { button: { styleHook: { 'inline-size': '100%', 'block-size': '100%' } } };
    const row = model?.row ?? null;
    const column = model?.column ?? null;
    const menu = (kind: TableMenuKind, label: string) => {
      const target = this.#target(kind);
      const groups = target ? this.#host.menuGroups(TABLE_MENU_SURFACE[kind], target) : [];
      const handlers = this.#handlers(kind);
      return html`<tp-menu
        class=${`table-menu table-${kind}-menu`}
        .portal=${false}
        .modal=${false}
        label=${label}
        .finalFocus=${this.#finalFocus}
        @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => this.#menuOpenChange(kind, event)}
        ${ref(this.#refs[`${kind}Menu`])}
        >${groups.map(
          (group, index) =>
            html`${index ? html`<tp-separator></tp-separator>` : nothing}${renderToolMenuItems(
              group.items,
              handlers,
            )}`,
        )}</tp-menu
      >`;
    };
    const rowLabel = fillTemplate(strings.tableRowGrip, { row: (row ?? 0) + 1 });
    const columnLabel = fillTemplate(strings.tableColumnGrip, { column: (column ?? 0) + 1 });
    return html`<div
      class="table-chrome"
      ${ref(this.#bindContainer)}
      @keydown=${this.#keyDown}
      @focusout=${(event: FocusEvent) => this.focusOutHandler?.(event)}
    >
      <tp-button
        part="text-editor-row-grip"
        class="table-control"
        variant="outline"
        size="icon-xs"
        hidden
        .icon=${ellipsisVerticalIcon}
        .partContracts=${control}
        .partPresentation=${pill}
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
        .partContracts=${control}
        .partPresentation=${pill}
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
        .partContracts=${control}
        .partPresentation=${pill}
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
        .partContracts=${control}
        .partPresentation=${fill}
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
        .partContracts=${control}
        .partPresentation=${fill}
        @pointerdown=${preserveFocusOnPress}
        @click=${(event: Event) => this.#append('column', event)}
        ${ref(this.#refs.addColumn)}
        >${strings.tableAddColumn}</tp-button
      >${menu('row', rowLabel)}${menu('column', columnLabel)}${menu('cell', strings.tableCellHandle)}
    </div>`;
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

  /* The overlay takes no pointer input; the controls and the menus' popups do. */
  .table-chrome > :is(.table-control, .table-separator, tp-menu) {
    pointer-events: auto;
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
`;
