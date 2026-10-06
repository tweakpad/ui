import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { tablePresentation } from '../../presentation/families/table.js';

/** Public composition units keep native elements in the flattened table tree. */
abstract class TablePart extends TpElement {
  static presentationTagName = 'tp-table';
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
      }

      slot {
        background: inherit;
      }

      [part] {
        text-align: inherit;
      }
    `,
  ];
  colSpan = 1;
  rowSpan = 1;
  scope = 'col';
  selected = false;
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
export class TpTableHeader extends TablePart {
  static tagName = 'tp-table-header';
  static override nativeTag = 'thead';
  static override partName = 'table-header';
  static override nativeRole = 'rowgroup';
}
export class TpTableBody extends TablePart {
  static tagName = 'tp-table-body';
  static override nativeTag = 'tbody';
  static override partName = 'table-body';
  static override nativeRole = 'rowgroup';
}
export class TpTableFooter extends TablePart {
  static tagName = 'tp-table-footer';
  static override nativeTag = 'tfoot';
  static override partName = 'table-footer';
  static override nativeRole = 'rowgroup';
}
export class TpTableRow extends TablePart {
  static tagName = 'tp-table-row';
  static override nativeTag = 'tr';
  static override partName = 'table-row';
  static override nativeRole = 'row';
}
export class TpTableHead extends TablePart {
  static tagName = 'tp-table-head';
  static override nativeTag = 'th';
  static override partName = 'table-column-header';
  static override nativeRole = 'columnheader';
}
export class TpTableCell extends TablePart {
  static tagName = 'tp-table-cell';
  static override nativeTag = 'td';
  static override partName = 'table-cell';
  static override nativeRole = 'cell';
}
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
