import type { TableSection } from './parts.js';

/** Logical native-table coordinates; rowspan occupancy is scoped to each row region. */
export function tableColumns(sections: TableSection[]): {
  cells: Array<{ cell: HTMLTableCellElement; start: number; end: number }>;
  count: number;
} {
  const cells: Array<{ cell: HTMLTableCellElement; start: number; end: number }> = [];
  let count = 0;
  for (const section of sections) {
    if (!section) continue;
    const occupied: number[] = [];
    for (const [rowIndex, row] of [...section.rows].entries()) {
      let column = 0;
      for (const cell of row) {
        while ((occupied[column] ?? 0) > rowIndex) column++;
        const end = column + Math.max(1, cell.colSpan);
        const until = cell.rowSpan === 0 ? section.rows.length : rowIndex + cell.rowSpan;
        for (let at = column; at < end; at++) occupied[at] = until;
        cells.push({ cell, start: column, end });
        count = Math.max(count, end);
        column = end;
      }
    }
  }
  return { cells, count };
}

/** Own only measured geometry, and restore author declarations on release. */
export class TableGeometry {
  #styles = new Map<
    HTMLElement,
    Map<string, { value: string; priority: string; applied: string }>
  >();
  #markers = new Map<HTMLElement, Map<string, string | null>>();
  style(element: HTMLElement, key: string, value: string): void {
    let record = this.#styles.get(element);
    if (!record) this.#styles.set(element, (record = new Map()));
    if (!record.has(key))
      record.set(key, {
        value: element.style.getPropertyValue(key),
        priority: element.style.getPropertyPriority(key),
        applied: value,
      });
    element.style.setProperty(key, value);
    record.get(key)!.applied = element.style.getPropertyValue(key);
  }
  marker(element: HTMLElement, key: string, value: string): void {
    let record = this.#markers.get(element);
    if (!record) this.#markers.set(element, (record = new Map()));
    if (!record.has(key)) record.set(key, element.getAttribute(key));
    element.setAttribute(key, value);
  }
  clear(): void {
    for (const [element, record] of this.#styles)
      for (const [key, old] of record) {
        if (element.style.getPropertyValue(key) !== old.applied) continue;
        if (old.value) element.style.setProperty(key, old.value, old.priority);
        else element.style.removeProperty(key);
      }
    for (const [element, record] of this.#markers)
      for (const [key, old] of record) {
        if (old === null) element.removeAttribute(key);
        else element.setAttribute(key, old);
      }
    this.#styles.clear();
    this.#markers.clear();
  }
}
