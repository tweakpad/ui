import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { tablePresentation } from '../../presentation/families/table.js';

/** Public composition units keep native elements in the flattened table tree. */
abstract class TablePart extends TpElement {
  static override presentation = tablePresentation;
  static nativeTag = '';
  static partName = '';
  static nativeRole = '';
  static override properties = {
    ...TpElement.properties,
    colSpan: { type: Number, attribute: 'colspan', reflect: true },
    rowSpan: { type: Number, attribute: 'rowspan', reflect: true },
    scope: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: contents;
        background: inherit;
        vertical-align: middle;
      }

      slot {
        background: inherit;
      }

      /*
       * The host has no box, so ordinary CSS on it reaches the native element by inheritance.
       * More specific than the recipe, whose cell values serve authored native tables.
       */
      :host [part] {
        text-align: inherit;
      }

      :host [part]:is(th, td) {
        white-space: inherit;
        vertical-align: inherit;
        inline-size: inherit;
        min-inline-size: inherit;
        max-inline-size: inherit;
      }
    `,
  ];
  /** How many columns a head or cell spans. */
  colSpan = 1;
  /** How many rows a head or cell spans; zero spans the rest of its region. */
  rowSpan = 1;
  /** Which cells a head labels: its column by default, or its row for the cell that names a row. */
  scope = 'col';
  /** Marks a row as selected, painted when the table's `selection-presentation` is `row`. */
  selected = false;
  /** The native table element this constituent renders. */
  get nativeElement(): HTMLElement | null {
    return this.shadowRoot?.querySelector((this.constructor as typeof TablePart).nativeTag) ?? null;
  }
  protected override render() {
    const { nativeTag, partName, nativeRole } = this.constructor as typeof TablePart;
    const cell = nativeTag === 'th' || nativeTag === 'td';
    return this.renderPart(
      partName,
      { selected: this.selected },
      {
        tag: nativeTag,
        properties: {
          role: nativeTag === 'th' && this.scope === 'row' ? 'rowheader' : nativeRole || undefined,
          scope: nativeTag === 'th' ? this.scope : undefined,
          colspan: cell ? Math.max(1, this.colSpan) : undefined,
          rowspan: cell ? Math.max(0, this.rowSpan) : undefined,
          'data-selected': nativeTag === 'tr' && this.selected,
          'data-selection-presentation':
            nativeTag === 'tr' ? this.closest('tp-table')?.selectionPresentation : undefined,
        },
        content: html`<slot></slot>`,
      },
    );
  }
}
/**
 * The header region of a Table; it renders a native `thead`.
 *
 * @slot - The header rows.
 */
export class TpTableHeader extends TablePart {
  static tagName = 'tp-table-header';
  static override nativeTag = 'thead';
  static override partName = 'table-header';
  static override nativeRole = 'rowgroup';
}
/**
 * The body region of a Table; it renders a native `tbody`.
 *
 * @slot - The data rows.
 */
export class TpTableBody extends TablePart {
  static tagName = 'tp-table-body';
  static override nativeTag = 'tbody';
  static override partName = 'table-body';
  static override nativeRole = 'rowgroup';
}
/**
 * The footer region of a Table, for totals and summaries; it renders a native `tfoot`.
 *
 * @slot - The footer rows.
 */
export class TpTableFooter extends TablePart {
  static tagName = 'tp-table-footer';
  static override nativeTag = 'tfoot';
  static override partName = 'table-footer';
  static override nativeRole = 'rowgroup';
}
/**
 * A row of a Table region; it renders a native `tr`.
 *
 * @slot - The row's heads and cells.
 */
export class TpTableRow extends TablePart {
  static tagName = 'tp-table-row';
  static override nativeTag = 'tr';
  static override partName = 'table-row';
  static override nativeRole = 'row';
}
/**
 * A header cell: a column header, or with `scope="row"` the cell that names its row. It renders a native `th`.
 *
 * @slot - The header text.
 */
export class TpTableHead extends TablePart {
  static tagName = 'tp-table-head';
  static override nativeTag = 'th';
  static override partName = 'table-column-header';
  static override nativeRole = 'columnheader';
}
/**
 * A data cell; it renders a native `td`.
 *
 * @slot - The cell content: text or library controls.
 */
export class TpTableCell extends TablePart {
  static tagName = 'tp-table-cell';
  static override nativeTag = 'td';
  static override partName = 'table-cell';
  static override nativeRole = 'cell';
}
/**
 * The Table's caption, which names and describes the table; it renders a native `caption`.
 *
 * @slot - The caption text.
 */
export class TpTableCaption extends TablePart {
  static tagName = 'tp-table-caption';
  static override nativeTag = 'caption';
  static override partName = 'table-caption';
}

export type TableSection = { element: HTMLElement; rows: HTMLTableCellElement[][] };
/** Native and custom compositions use the same geometry and sticky implementation. */
export function tableSections(table: HTMLTableElement, owner: HTMLElement): TableSection[] {
  if (table.parentNode === owner) {
    return [table.tHead, ...table.tBodies, table.tFoot].flatMap((section) =>
      section
        ? [
            {
              element: section,
              rows: [...section.rows].map((row) => [...row.cells]),
            },
          ]
        : [],
    );
  }
  return [...owner.children].flatMap((section) => {
    if (
      !(section instanceof TablePart) ||
      !['thead', 'tbody', 'tfoot'].includes((section.constructor as typeof TablePart).nativeTag) ||
      !section.nativeElement
    )
      return [];
    return [
      {
        element: section.nativeElement,
        rows: [...section.children].flatMap((row) =>
          row instanceof TpTableRow
            ? [
                [...row.children].flatMap((cell) =>
                  cell instanceof TpTableHead || cell instanceof TpTableCell
                    ? cell.nativeElement
                      ? [cell.nativeElement as HTMLTableCellElement]
                      : []
                    : [],
                ),
              ]
            : [],
        ),
      },
    ];
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-table-header': TpTableHeader;
    'tp-table-body': TpTableBody;
    'tp-table-footer': TpTableFooter;
    'tp-table-row': TpTableRow;
    'tp-table-head': TpTableHead;
    'tp-table-cell': TpTableCell;
    'tp-table-caption': TpTableCaption;
  }
}
