import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { tableSections } from './parts.js';
import { tableColumns, TableGeometry } from './sticky.js';
import { tablePresentation } from '../../presentation/families/table.js';
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
/** Native tabular semantics and overflow, without interactive-grid state. */
export class TpTable extends TpElement {
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
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      .root {
        position: relative;
        overflow: auto;
        inline-size: 100%;
        block-size: 100%;
        max-block-size: inherit;
      }

      slot {
        background: inherit;
      }

      ::slotted(table) {
        inline-size: 100%;
        border-collapse: collapse;
      }
    `,
  ];
  label = 'Data table';
  layout: 'automatic' | 'fixed' = 'automatic';
  selectionPresentation: 'none' | 'row' = 'none';
  stickyHeader = false;
  stickyFooter = false;
  stickyStartColumns = 0;
  stickyEndColumns = 0;
  #native = false;
  #registrations: Array<() => void> = [];
  #observer: MutationObserver | undefined;
  #resize: ResizeObserver | undefined;
  #frame: number | undefined;
  #table: HTMLTableElement | null = null;
  readonly #geometry = new TableGeometry();
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
    const table = this.#table;
    if (!table || !this.isConnected) return;
    this.#geometry.marker(
      table,
      'data-sticky-regions',
      String(this.stickyHeader || this.stickyFooter),
    );
    this.#geometry.style(table, 'table-layout', this.layout === 'fixed' ? 'fixed' : 'auto');
    const sections = tableSections(table, this);
    // Nova body and footer: the last row has no bottom border (`[&_tr:last-child]:border-0`).
    // Cells live in nested shadow roots in the composed tree, so the row position is a marker.
    for (const section of sections) {
      if (section.element.localName === 'thead') continue;
      section.rows.forEach((row, index) => {
        for (const cell of row)
          if (cell.rowSpan === 0 || index + Math.max(1, cell.rowSpan) >= section.rows.length)
            this.#geometry.marker(cell, 'data-last-row', '');
      });
    }
    const { cells, count } = tableColumns(sections);
    const number = (value: number) =>
      Number.isFinite(value) ? Math.max(0, Math.min(count, Math.floor(value))) : 0;
    const start = number(this.stickyStartColumns),
      end = Math.min(number(this.stickyEndColumns), count - start);
    // Read all natural cell coordinates together, before applying any sticky offsets.
    const bounds = table.getBoundingClientRect();
    const rtl = this.direction === 'rtl';
    const pinned = cells.flatMap((record) => {
      const side = record.end <= start ? 'start' : record.start >= count - end ? 'end' : null;
      if (!side) return [];
      const rect = record.cell.getBoundingClientRect();
      const offset =
        (side === 'start') !== rtl ? rect.left - bounds.left : bounds.right - rect.right;
      return [{ ...record, side, offset: Math.max(0, offset) }];
    });
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
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.#table) this.#registerParts();
    if (changed.has('selectionPresentation'))
      for (const row of this.querySelectorAll('tp-table-row')) row.requestUpdate();
    if (
      ['layout', 'stickyHeader', 'stickyFooter', 'stickyStartColumns', 'stickyEndColumns'].some(
        (key) => changed.has(key as keyof TpTable),
      )
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
    this.#registerParts();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#resize?.disconnect();
    if (this.#frame !== undefined)
      this.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#geometry.clear();
    for (const cleanup of this.#registrations.splice(0)) cleanup();
    super.disconnectedCallback();
  }
  protected override render() {
    return this.renderPart(
      'table',
      { layout: this.layout, selectionPresentation: this.selectionPresentation },
      {
        properties: { class: 'root', role: 'region', 'aria-label': this.label, tabindex: 0 },
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
