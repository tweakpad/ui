import { Scrollable } from '../../foundation/scrollable.js';
import { NativeScrollEdges } from '../shared/scroll-edges.js';
import { nativeScrollEdges } from '../../foundation/scroll.js';
import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { tableSections } from './parts.js';
import { tableColumns, TableGeometry } from './sticky.js';
import { tablePresentation } from '../../presentation/families/table.js';
type ScrollEdge = 'xStart' | 'xEnd' | 'yStart' | 'yEnd';
const noEdges: Record<ScrollEdge, boolean> = {
  xStart: false,
  xEnd: false,
  yStart: false,
  yEnd: false,
};
const parts: Record<string, string> = {
  table: 'table-table',
  caption: 'table-caption',
  thead: 'table-header',
  tbody: 'table-body',
  tfoot: 'table-footer',
  tr: 'table-row',
  th: 'table-column-header',
  td: 'table-cell',
};
/**
 * Tabular data for reading: each constituent renders its native table element, so column layout,
 * spans and header relationships work as in plain HTML. The host is the table's overflow region,
 * focusable while the table scrolls, and can pin its header, footer and edge columns while the
 * rest scrolls. It has no grid keyboard model or selection state of its own.
 *
 * @slot - The caption, header, body and footer regions, or one authored native `table`.
 */
export class TpTable extends Scrollable(TpElement) {
  constructor() {
    super();
    this.#scrollEdges = new NativeScrollEdges(this, {
      viewports: () => [...this.renderRoot.querySelectorAll<HTMLElement>('.root')],
      // An edge covered by sticky chrome (pinned columns, a sticky header or footer) never fades:
      // the chrome casts the shared pinned shadow while content scrolls under it.
      threshold: () => ({
        xStart: this.#covered.xStart ? Number.MAX_SAFE_INTEGER : 0,
        xEnd: this.#covered.xEnd ? Number.MAX_SAFE_INTEGER : 0,
        yStart: this.#covered.yStart ? Number.MAX_SAFE_INTEGER : 0,
        yEnd: this.#covered.yEnd ? Number.MAX_SAFE_INTEGER : 0,
      }),
      // Pinned cells fade with their rows at the other edges.
      sticky: 'content',
    });
  }

  static tagName = 'tp-table';
  static override presentation = tablePresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    layout: { type: String, reflect: true },
    selectionPresentation: { type: String, attribute: 'selection-presentation', reflect: true },
    stickyHeader: { type: Boolean, attribute: 'sticky-header', reflect: true },
    stickyFooter: { type: Boolean, attribute: 'sticky-footer', reflect: true },
    stickyStartColumns: { type: Number, attribute: 'sticky-start-columns' },
    stickyEndColumns: { type: Number, attribute: 'sticky-end-columns' },
    striped: { type: Boolean, reflect: true },
    borders: { type: String, reflect: true },
    variant: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        max-inline-size: 100%;

        /* Cells inherit these, so ordinary CSS on the table, a row or a cell replaces them. */
        text-align: start;
        white-space: nowrap;
      }

      .root {
        position: relative;
        overflow: auto;
        inline-size: 100%;
        block-size: 100%;
        max-block-size: inherit;
      }

      ::slotted(table) {
        inline-size: 100%;
        border-collapse: collapse;
      }
    `,
  ];
  /** Names the scrollable region that holds the table; a caption names the table itself. */
  label = 'Data table';
  /** The native table layout algorithm: `fixed` sizes columns from the first row and ignores content width. */
  layout: 'automatic' | 'fixed' = 'automatic';
  /** `row` paints rows marked `selected`; the selection itself belongs to the application. */
  selectionPresentation: 'none' | 'row' = 'none';
  /** Pins the whole header, every header row included, to the top of the scrolling region. */
  stickyHeader = false;
  /** Pins the footer, such as a totals row, to the bottom of the scrolling region. */
  stickyFooter = false;
  /** How many leading columns stay pinned at the inline start while the others scroll. */
  stickyStartColumns = 0;
  /** How many trailing columns stay pinned at the inline end; leading columns win where the counts overlap. */
  stickyEndColumns = 0;
  /** Fills alternate body rows, apart from the hover and selected fills. */
  striped = false;
  /** The cell lines: row lines, a grid of row and column lines, or none. A flat appearance clears them. */
  borders: 'rows' | 'grid' | 'none' = 'rows';
  /** `outline` draws the surface edge around the table and rounds its corners by the radius token. */
  variant: 'default' | 'outline' = 'default';
  #native = false;
  /** The table overflows its region, which is then a focusable named region. */
  #scrollable = false;
  #registrations: Array<() => void> = [];
  #observer: MutationObserver | undefined;
  #resize: ResizeObserver | undefined;
  #frame: number | undefined;
  #table: HTMLTableElement | null = null;
  readonly #geometry = new TableGeometry();
  readonly #scrollEdges: NativeScrollEdges;
  /** The scroll edges covered by sticky chrome. */
  #covered = { ...noEdges };
  /** The chrome that casts each covered edge's shadow: innermost pinned cells, header, footer. */
  #casters: Array<{ element: HTMLElement; edge: ScrollEdge; side: 'start' | 'end' }> = [];
  /** Which covered edges have content scrolled under them. */
  #shadowed = { ...noEdges };
  #registerParts = (): void => {
    const native = [...this.children].some((child) => child.localName === 'table');
    if (this.#native !== native) {
      this.#native = native;
      this.requestUpdate();
    }
    for (const cleanup of this.#registrations.splice(0)) cleanup();
    this.#resize?.disconnect();
    this.#geometry.clear();
    this.#table =
      [...this.children].find(
        (child): child is HTMLTableElement => child instanceof HTMLTableElement,
      ) ?? this.renderRoot.querySelector<HTMLTableElement>('[part~=table-table]');
    const table = this.#table;
    if (!table) return;
    const nodes = [
      table,
      ...table.querySelectorAll<HTMLElement>('caption, thead, tbody, tfoot, tr, th, td'),
    ].filter((node) => node.closest('table') === table);
    for (const element of nodes) {
      if (this.#native)
        this.#registrations.push(
          this.presentationController.registerPart(parts[element.localName]!, element),
        );
      this.#resize?.observe(element);
    }
    for (const section of tableSections(table, this)) {
      this.#resize?.observe(section.element);
      for (const row of section.rows) for (const cell of row) this.#resize?.observe(cell);
    }
    this.#resize?.observe(this);
    this.#schedule();
  };
  #schedule = (): void => {
    const view = this.ownerDocument.defaultView;
    if (!view || !this.isConnected || this.#frame !== undefined) return;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#measure();
    });
  };
  #measure(): void {
    this.#geometry.clear();
    this.#covered = { ...noEdges };
    this.#casters = [];
    this.#shadowed = { ...noEdges };
    const table = this.#table;
    if (!table || !this.isConnected) return;
    this.#geometry.marker(
      table,
      'data-sticky-regions',
      String(this.stickyHeader || this.stickyFooter),
    );
    this.#geometry.style(table, 'table-layout', this.layout === 'fixed' ? 'fixed' : 'auto');
    const sections = tableSections(table, this);
    // Body and footer: the last row has no bottom border, except the body's last row above a
    // footer, whose line separates them.
    // Cells live in nested shadow roots in the composed tree, so the row position is a marker.
    const lastBody = sections.filter((section) => section.element.localName === 'tbody').at(-1);
    const footed = sections.some((section) => section.element.localName === 'tfoot');
    for (const section of sections) {
      if (section.element.localName === 'thead' || (footed && section === lastBody)) continue;
      section.rows.forEach((row, index) => {
        for (const cell of row)
          if (cell.rowSpan === 0 || index + Math.max(1, cell.rowSpan) >= section.rows.length)
            this.#geometry.marker(cell, 'data-last-row', '');
      });
    }
    // Alternate body rows carry the stripe marker; the row paints one fill under all its cells.
    if (this.striped)
      for (const section of sections) {
        if (section.element.localName !== 'tbody') continue;
        section.rowElements.forEach((row, index) => {
          if (row && index % 2 === 1) this.#geometry.marker(row, 'data-stripe', '');
        });
      }
    const { cells, count } = tableColumns(sections);
    // The last column draws no column line.
    for (const record of cells)
      if (record.end === count) this.#geometry.marker(record.cell, 'data-last-column', '');
    const number = (value: number) =>
      Number.isFinite(value) ? Math.max(0, Math.min(count, Math.floor(value))) : 0;
    const start = number(this.stickyStartColumns),
      end = Math.min(number(this.stickyEndColumns), count - start);
    // Read all natural cell coordinates together, before applying any sticky offsets.
    const bounds = table.getBoundingClientRect();
    const rtl = this.direction === 'rtl';
    const pinned = cells.flatMap((record) => {
      const side: 'start' | 'end' | null =
        record.end <= start ? 'start' : record.start >= count - end ? 'end' : null;
      if (!side) return [];
      const rect = record.cell.getBoundingClientRect();
      const offset =
        (side === 'start') !== rtl ? rect.left - bounds.left : bounds.right - rect.right;
      return [{ ...record, side, offset: Math.max(0, offset) }];
    });
    this.#covered.xStart = start > 0;
    this.#covered.xEnd = end > 0;
    for (const { cell, side, ...record } of pinned)
      if (side === 'start' ? record.end === start : record.start === count - end)
        this.#casters.push({ element: cell, edge: side === 'start' ? 'xStart' : 'xEnd', side });
    for (const { cell, side, offset } of pinned) {
      this.#geometry.style(cell, 'position', 'sticky');
      this.#geometry.style(cell, `inset-inline-${side}`, `${offset}px`);
      this.#geometry.style(cell, 'z-index', '1');
      this.#geometry.marker(cell, 'data-sticky-column', side);
    }
    for (const [section, enabled, edge] of [
      [
        sections.find((section) => section.element.localName === 'thead')?.element,
        this.stickyHeader,
        'start',
      ],
      [
        sections.find((section) => section.element.localName === 'tfoot')?.element,
        this.stickyFooter,
        'end',
      ],
    ] as const) {
      if (!section || !enabled) continue;
      this.#geometry.style(section, 'position', 'sticky');
      this.#geometry.style(section, `inset-block-${edge}`, '0');
      this.#geometry.style(section, 'z-index', '2');
      this.#geometry.marker(section, 'data-sticky', edge);
      const covered = edge === 'start' ? 'yStart' : 'yEnd';
      this.#covered[covered] = true;
      this.#casters.push({ element: section, edge: covered, side: edge });
    }
    this.#syncOverflow();
    this.#scrollEdges.invalidateContent();
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    const scrollable =
      !!root &&
      (root.scrollWidth > root.clientWidth + 1 || root.scrollHeight > root.clientHeight + 1);
    if (scrollable !== this.#scrollable) {
      this.#scrollable = scrollable;
      this.requestUpdate();
    }
  }
  /** Marks the chrome of each covered edge while content scrolls under it. */
  readonly #syncOverflow = (): void => {
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    if (!root || !this.#casters.length) return;
    const edges = nativeScrollEdges(root);
    const shadowed = { ...noEdges };
    for (const edge of Object.keys(shadowed) as ScrollEdge[])
      shadowed[edge] = this.#covered[edge] && edges[edge] > 0.5;
    const changed = (Object.keys(shadowed) as ScrollEdge[]).filter(
      (edge) => shadowed[edge] !== this.#shadowed[edge],
    );
    if (!changed.length) return;
    this.#shadowed = shadowed;
    for (const { element, edge, side } of this.#casters)
      if (changed.includes(edge))
        this.#geometry.marker(element, 'data-sticky-edge', shadowed[edge] ? side : null);
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.#table) this.#registerParts();
    if (changed.has('selectionPresentation'))
      for (const row of this.querySelectorAll('tp-table-row')) row.requestUpdate();
    if (
      [
        'layout',
        'stickyHeader',
        'stickyFooter',
        'stickyStartColumns',
        'stickyEndColumns',
        'striped',
      ].some((key) => changed.has(key as keyof TpTable))
    )
      this.#schedule();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    const view = this.ownerDocument.defaultView!;
    this.#resize = new view.ResizeObserver(this.#schedule);
    this.#observer = new view.MutationObserver(this.#registerParts);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['colspan', 'rowspan'],
    });
    this.renderRoot.addEventListener('scroll', this.#syncOverflow, {
      capture: true,
      passive: true,
    });
    this.#registerParts();
  }
  override disconnectedCallback(): void {
    this.renderRoot.removeEventListener('scroll', this.#syncOverflow, { capture: true });
    this.#observer?.disconnect();
    this.#resize?.disconnect();
    if (this.#frame !== undefined)
      this.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#geometry.clear();
    this.#casters = [];
    for (const cleanup of this.#registrations.splice(0)) cleanup();
    super.disconnectedCallback();
  }
  protected override render() {
    return this.renderPart(
      'table',
      {
        layout: this.layout,
        selectionPresentation: this.selectionPresentation,
        borders: this.borders,
        variant: this.variant,
      },
      {
        // Only a table that scrolls is a Tab stop, so keyboard users can scroll it.
        properties: this.#scrollable
          ? { class: 'root', role: 'region', 'aria-label': this.label, tabindex: 0 }
          : { class: 'root' },
        content: this.#native
          ? html`<slot @slotchange=${this.#registerParts}></slot>`
          : this.renderPart(
              'table-table',
              {},
              {
                tag: 'table',
                properties: { role: 'table', 'aria-label': this.label },
                content: html`<slot @slotchange=${this.#registerParts}></slot>`,
              },
            ),
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-table': TpTable;
  }
}
