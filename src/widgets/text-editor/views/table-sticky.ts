/**
 * The sticky table header of the text editor (`uwg-te-req-tables-9`, `uwg-te-tab-anatomy-tables-r6`,
 * `uwg-te-tab-props-r8`): with `stickyTableHeaders`, while a table's header row is scrolled above
 * the top edge (the viewport's top, or, when the editor grows with its content, the block-end edge
 * of the fixed toolbar, or the top of the page without one) and the table's last row still extends
 * below that edge, `text-editor-sticky-header` holds an inert copy of that row, hidden from
 * assistive technology and presented by the content binding, at that edge. It takes the table's
 * column widths, follows the wrapper's horizontal scroll and is clipped to the wrapper. Nothing of
 * it is stored in the content.
 */
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { cloneFeedback } from '../../../foundation/drag-drop/clone.js';
import { observeScroll } from '../../../foundation/observation.js';
import { scrollableAncestors } from '../../../foundation/scroll.js';
import type { TextEditorEngineInstance } from '../../../foundation/text-editor/engine.js';
import type {
  OverlayBox,
  OverlayGeometry,
  OverlayInvalidation,
  OverlayLayer,
  OverlayMeasureContext,
} from '../geometry.js';

/** The client geometry that decides whether a header sticks. */
export interface StickyHeaderInput {
  /** The top edge in client coordinates that the copy sticks to. */
  readonly edge: number;
  /** The header row's client box. */
  readonly header: { readonly top: number; readonly bottom: number };
  /** The bottom of the table's last row in client coordinates. */
  readonly last: number;
}

/**
 * Whether a header sticks: its top is above the edge and the table's last row still extends below
 * the edge plus the header's height, so at most one copy shows as tables pass.
 */
export function headerSticks(input: StickyHeaderInput): boolean {
  const height = input.header.bottom - input.header.top;
  return input.header.top < input.edge && input.last > input.edge + height;
}

/**
 * The edge the copy sticks to: the viewport's top while the viewport scrolls; when the editor
 * grows with its content, the fixed toolbar's block-end edge, or the page's top without one.
 */
export function stickyEdge(input: {
  readonly scrolls: boolean;
  readonly viewportTop: number;
  readonly toolbarBottom: number | null;
}): number {
  if (input.scrolls) return input.viewportTop;
  return input.toolbarBottom === null ? 0 : Math.max(0, input.toolbarBottom);
}

/**
 * The copy's clip box across the inline axis: the part of the wrapper that the table covers, so
 * the copy never extends over the wrapper's reserved space beside the table (the quick-add
 * Buttons) and follows the table's visible part while the wrapper scrolls.
 */
export function stickyClip(
  scroller: { readonly left: number; readonly right: number },
  table: { readonly left: number; readonly right: number },
): { readonly left: number; readonly right: number; readonly width: number } {
  const left = Math.max(scroller.left, table.left);
  const right = Math.min(scroller.right, table.right);
  return { left, right, width: Math.max(0, right - left) };
}

/**
 * The physical shift of the copy from where its box lays it out: the box puts a table at its
 * inline start, the left edge, or the right edge in right-to-left content, so the shift is the
 * distance of the table's edge on that side from the clip box's.
 */
export function stickyOffset(
  table: { readonly left: number; readonly right: number },
  clip: { readonly left: number; readonly right: number },
  rtl: boolean,
  scale = 1,
): number {
  return (rtl ? table.right - clip.right : table.left - clip.left) / scale;
}

export interface TableStickyHost {
  readonly geometry: OverlayGeometry;
  /** `stickyTableHeaders`. */
  enabled(): boolean;
  instance(): TextEditorEngineInstance | null;
  /** The viewport part, which scrolls in a fixed-height editor. */
  viewport(): HTMLElement | null;
  /** The fixed toolbar part, or null. */
  toolbar(): HTMLElement | null;
}

/** A header table's rows in the viewport's scrolled content, in CSS pixels from its top. */
interface StickyExtent {
  readonly id: string;
  /** The header row's top and height. */
  readonly top: number;
  readonly height: number;
  /** The bottom of the last row. */
  readonly last: number;
}

/**
 * The invalidations after which the tables may lie elsewhere in the scrolled content: a scroll
 * moves them all alike and a layer's model change (`state`) moves none.
 */
const LAYOUT_REASONS: ReadonlySet<OverlayInvalidation> = new Set([
  'content',
  'resize',
  'fonts',
  'instance',
  'visibility',
]);

/** Tolerance of the extents against the rows read live (subpixel scroll offsets). */
const EXTENT_SLACK = 1;

/** The header row and the last row of a table with at least two rows, or null. */
function headerRows(
  instance: TextEditorEngineInstance,
  id: string,
): { readonly header: HTMLTableRowElement; readonly last: HTMLTableRowElement } | null {
  const rows = (instance.tableElements(id)?.table as HTMLTableElement | undefined)?.rows;
  const header = rows?.[0];
  const last = rows?.[rows.length - 1];
  return header && last && rows.length >= 2 ? { header, last } : null;
}

interface StickyPlacement {
  readonly table: string;
  /** The header row to copy, compared by identity to reuse the copy. */
  readonly row: HTMLTableRowElement;
  /** Version of the content when measured: the copy is renewed after an edit. */
  readonly version: number;
  /** The clip box: the wrapper's visible width at the edge. */
  readonly box: OverlayBox;
  /** The copy's physical shift from where its box lays it out (`stickyOffset`). */
  readonly offset: number;
  /** The table's width and the width of each header cell, in CSS pixels. */
  readonly width: number;
  readonly cells: readonly number[];
}

/** The sticky header layer (`views/table-sticky.ts`). */
export class TextEditorTableSticky implements OverlayLayer<StickyPlacement | null> {
  readonly #host: TableStickyHost;
  readonly #remove: () => void;
  #element: HTMLElement | null = null;
  #copy: { key: string; table: HTMLElement; dispose: () => void } | null = null;
  #shown = false;
  #translate = '';
  #scrollers: { key: string; releases: (() => void)[] } | null = null;
  #version = 0;

  constructor(host: TableStickyHost) {
    this.#host = host;
    this.#remove = host.geometry.addLayer(this);
  }

  /** The `ref` callback of the part `renderTableSticky` renders. */
  readonly bind = (element: Element | undefined): void => {
    const next = (element as HTMLElement | undefined) ?? null;
    if (next === this.#element) return;
    this.#clear();
    this.#element = next;
    this.#shown = false;
  };

  /** The document changed: the next copy is taken again. */
  contentChanged(): void {
    this.#version++;
    this.#host.geometry.invalidate('content');
  }

  /** Starts or stops the scroll observations that move the copy; call when `enabled` changes. */
  sync(): void {
    const viewport = this.#host.viewport();
    const enabled = this.#host.enabled() && viewport !== null;
    const key = enabled ? 'on' : '';
    if ((this.#scrollers?.key ?? '') === key) return;
    for (const release of this.#scrollers?.releases ?? []) release();
    this.#scrollers = null;
    if (!enabled) {
      this.hide();
      return;
    }
    // When the editor grows with its content, the page or a scrolling ancestor moves the header.
    const invalidate = () => this.#host.geometry.invalidate('scroll');
    const view = viewport.ownerDocument.defaultView;
    const releases = scrollableAncestors(viewport).map((ancestor) =>
      observeScroll(ancestor, { scroll: invalidate }),
    );
    if (view) releases.push(observeScroll(view, { scroll: invalidate }));
    this.#scrollers = { key, releases };
    this.#host.geometry.invalidate('state');
  }

  /** Stops the observations and hides the copy. */
  release(): void {
    for (const release of this.#scrollers?.releases ?? []) release();
    this.#scrollers = null;
    this.#watchWrapper(null);
    this.hide();
  }

  dispose(): void {
    this.release();
    this.#remove();
  }

  #wrapper: { element: HTMLElement; release: () => void } | null = null;

  #watchWrapper(element: HTMLElement | null): void {
    if (this.#wrapper?.element === element) return;
    this.#wrapper?.release();
    this.#wrapper = element
      ? {
          element,
          release: observeScroll(element, {
            scroll: () => this.#host.geometry.invalidate('scroll'),
          }),
        }
      : null;
  }

  wanted(): boolean {
    return this.#host.enabled() && this.#element !== null && this.#host.instance() !== null;
  }

  /**
   * The tables with a header row in document order, for the instance and the content version they
   * were read at.
   */
  #headerTables: {
    readonly instance: TextEditorEngineInstance;
    readonly version: number;
    readonly ids: readonly string[];
  } | null = null;
  /**
   * Where those tables lie in the viewport's scrolled content, measured again after an edit, a
   * resize, a font or image load (`LAYOUT_REASONS`): scrolling moves them all alike, so a pass
   * that only scrolled reads the rows of the tables near the edge alone.
   */
  #extents: readonly StickyExtent[] | null = null;

  #headerTableIds(instance: TextEditorEngineInstance): readonly string[] {
    const cached = this.#headerTables;
    if (cached?.instance === instance && cached.version === this.#version) return cached.ids;
    const ids: string[] = [];
    for (const block of instance.getBlocks().ordered())
      if (block.kind === 'table' && instance.getTable(block.id)?.headerRow) ids.push(block.id);
    this.#headerTables = { instance, version: this.#version, ids };
    this.#extents = null;
    return ids;
  }

  #tableExtents(
    instance: TextEditorEngineInstance,
    ids: readonly string[],
    origin: number,
    reasons: ReadonlySet<OverlayInvalidation> | undefined,
  ): readonly StickyExtent[] {
    const moved =
      reasons === undefined || [...reasons].some((reason) => LAYOUT_REASONS.has(reason));
    if (this.#extents && !moved) return this.#extents;
    const tables: StickyExtent[] = [];
    for (const id of ids) {
      const rows = headerRows(instance, id);
      if (!rows) continue;
      const header = rows.header.getBoundingClientRect();
      tables.push({
        id,
        top: header.top - origin,
        height: header.height,
        last: rows.last.getBoundingClientRect().bottom - origin,
      });
    }
    this.#extents = tables;
    return tables;
  }

  measure(context: OverlayMeasureContext): StickyPlacement | null {
    const instance = this.#host.instance();
    const viewport = this.#host.viewport();
    if (!instance || !viewport) return null;
    // No table with a header row: nothing to read.
    const ids = this.#headerTableIds(instance);
    if (!ids.length) return null;
    const viewportRect = viewport.getBoundingClientRect();
    const toolbar = this.#host.toolbar();
    const edge = stickyEdge({
      scrolls: viewport.scrollHeight > viewport.clientHeight,
      viewportTop: viewportRect.top,
      toolbarBottom: toolbar ? toolbar.getBoundingClientRect().bottom : null,
    });
    // Client position of the scrolled content's top: the extents' origin.
    const origin = viewportRect.top - viewport.scrollTop;
    for (const extent of this.#tableExtents(instance, ids, origin, context.reasons)) {
      // The extents are in document order: the first header at or below the edge ends the walk,
      // and a table whose last row is above the edge cannot stick; only the others are read.
      if (extent.top + origin >= edge + EXTENT_SLACK) break;
      if (extent.last + origin <= edge + extent.height - EXTENT_SLACK) continue;
      const elements = instance.tableElements(extent.id);
      const rows = headerRows(instance, extent.id);
      if (!elements || !rows) continue;
      const { header, last } = rows;
      const headerRect = header.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      if (headerRect.top >= edge) break;
      if (!headerSticks({ edge, header: headerRect, last: lastRect.bottom })) continue;
      const tableRect = elements.table.getBoundingClientRect();
      const clip = stickyClip(elements.scroller.getBoundingClientRect(), tableRect);
      if (clip.width <= 0) continue;
      const box = context.toOverlay({
        left: clip.left,
        top: edge,
        width: clip.width,
        height: headerRect.height,
        right: clip.right,
        bottom: edge + headerRect.height,
        x: clip.left,
        y: edge,
      } as DOMRectReadOnly);
      const scale = clip.width && box.width ? clip.width / box.width : 1;
      return {
        table: extent.id,
        row: header,
        version: this.#version,
        box,
        offset: stickyOffset(
          tableRect,
          clip,
          getComputedStyle(elements.table).direction === 'rtl',
          scale,
        ),
        width: tableRect.width / scale,
        cells: [...header.cells].map((cell) => cell.getBoundingClientRect().width / scale),
      };
    }
    return null;
  }

  apply(placement: StickyPlacement | null): void {
    const element = this.#element;
    if (!element) return;
    if (!placement) {
      this.hide();
      return;
    }
    const instance = this.#host.instance();
    this.#watchWrapper(instance?.tableElements(placement.table)?.scroller ?? null);
    const key = `${placement.table}:${placement.version}`;
    if (this.#copy?.key !== key || !this.#copy.table.isConnected) {
      this.#clear();
      // An inert copy of the header row inside a table of the content vocabulary.
      const { element: row, dispose } = cloneFeedback(placement.row);
      const table = element.ownerDocument.createElement('table');
      table.className = 'tp-te-table';
      const body = element.ownerDocument.createElement('tbody');
      body.append(row);
      table.append(body);
      element.append(table);
      this.#copy = { key, table, dispose };
    }
    const table = this.#copy!.table;
    table.style.setProperty('table-layout', 'fixed');
    table.style.setProperty('inline-size', `${placement.width}px`);
    table.style.setProperty('translate', `${placement.offset}px 0`);
    const cells = table.querySelectorAll<HTMLElement>('th, td');
    cells.forEach((cell, index) => {
      const width = placement.cells[index];
      if (width !== undefined) cell.style.setProperty('inline-size', `${width}px`);
    });
    const { box } = placement;
    element.style.setProperty('inline-size', `${box.width}px`);
    const translate = `${box.left}px ${box.top}px`;
    if (translate !== this.#translate)
      element.style.setProperty('translate', (this.#translate = translate));
    if (!this.#shown) {
      this.#shown = true;
      element.hidden = false;
    }
  }

  hide(): void {
    if (this.#element && this.#shown) {
      this.#shown = false;
      this.#element.hidden = true;
    }
    this.#watchWrapper(null);
  }

  #clear(): void {
    this.#copy?.dispose();
    this.#copy?.table.remove();
    this.#copy = null;
  }
}

/** The sticky header part: an inert, hidden-from-assistive-technology layer in the overlay. */
export function renderTableSticky(layer: TextEditorTableSticky): TemplateResult {
  return html`<div
    part="text-editor-sticky-header"
    class="table-sticky"
    aria-hidden="true"
    inert
    hidden
    ${ref(layer.bind)}
  ></div>`;
}
