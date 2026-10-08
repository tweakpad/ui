/**
 * Line grouping for Text motion (Foundation §18.19 `tm-lines`): pieces in document order are
 * grouped by their block position, so any inline direction groups the same way.
 */
export interface PieceBox {
  readonly top: number;
  readonly bottom: number;
}

/**
 * The line index of each box, in order. A box starts a new line when it overlaps the current
 * line by less than half of the smaller height (a superscript or larger glyph still shares it).
 */
export function groupLines(boxes: readonly PieceBox[]): number[] {
  const lines: number[] = [];
  let line = -1;
  let top = 0;
  let bottom = 0;
  for (const box of boxes) {
    const height = Math.max(0, box.bottom - box.top);
    const overlap = Math.min(bottom, box.bottom) - Math.max(top, box.top);
    if (line < 0 || overlap < Math.min(height, bottom - top) / 2) {
      line++;
      top = box.top;
      bottom = box.bottom;
    } else {
      top = Math.min(top, box.top);
      bottom = Math.max(bottom, box.bottom);
    }
    lines.push(line);
  }
  return lines;
}
