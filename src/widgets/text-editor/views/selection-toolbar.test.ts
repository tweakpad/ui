import { describe, expect, it } from 'vitest';
import { rect } from '../../../foundation/positioning.js';
import type { TextEditorSelection } from '../../../foundation/text-editor/model.js';
import {
  selectionAnchor,
  selectionToolbarVisible,
  unionRect,
  type SelectionToolbarVisibility,
} from './selection-toolbar.js';

const point = { block: 'a', offset: 0 };
const text = (empty = false): TextEditorSelection => ({
  kind: 'text',
  anchor: point,
  head: empty ? point : { block: 'a', offset: 4 },
  empty,
});

const shown: SelectionToolbarVisibility = {
  ready: true,
  editable: true,
  placed: true,
  selection: text(),
  hasText: true,
  focusInside: true,
  composing: false,
  pointerSelecting: false,
  dragging: false,
  surfaceOpen: false,
};

const dom = (x: number, y: number, width: number, height: number) =>
  ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
  }) as DOMRectReadOnly;

describe('selection toolbar visibility (uwg-te-req-surfaces-1)', () => {
  it('shows for a text selection holding more than whitespace and for a cell range', () => {
    expect(selectionToolbarVisible(shown)).toBe(true);
    expect(
      selectionToolbarVisible({
        ...shown,
        hasText: false,
        selection: {
          kind: 'cells',
          table: 't',
          range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
        },
      }),
    ).toBe(true);
  });

  it('hides for a caret, whitespace, blocks and no selection', () => {
    expect(selectionToolbarVisible({ ...shown, selection: text(true) })).toBe(false);
    expect(selectionToolbarVisible({ ...shown, hasText: false })).toBe(false);
    expect(selectionToolbarVisible({ ...shown, selection: { kind: 'blocks', ids: ['a'] } })).toBe(
      false,
    );
    expect(selectionToolbarVisible({ ...shown, selection: { kind: 'none' } })).toBe(false);
  });

  it('hides as soon as any condition fails', () => {
    for (const failing of [
      { ready: false },
      { editable: false },
      { placed: false },
      { focusInside: false },
      { composing: true },
      { pointerSelecting: true },
      { dragging: true },
      { surfaceOpen: true },
    ] as Partial<SelectionToolbarVisibility>[])
      expect(selectionToolbarVisible({ ...shown, ...failing }), JSON.stringify(failing)).toBe(
        false,
      );
  });
});

describe('selection toolbar anchor (uwg-te-req-surfaces-1, Foundation §10.2)', () => {
  it('unions the rectangles, and is empty without any', () => {
    expect(unionRect([rect(10, 10, 20, 10), rect(0, 20, 5, 10)])).toEqual(rect(0, 10, 30, 20));
    expect(unionRect([])).toEqual(rect(0, 0, 0, 0));
  });

  it('reads the selection rectangles at every pass, one stable anchor with its context', () => {
    let rects = [dom(10, 10, 20, 10)];
    const context = { localName: 'div' } as unknown as Element;
    const anchor = selectionAnchor(
      () => rects,
      () => context,
    );
    expect(anchor.getClientRectangles?.()).toEqual([rect(10, 10, 20, 10)]);
    rects = [dom(10, 10, 20, 10), dom(0, 20, 50, 10)];
    expect(anchor.getBoundingRectangle()).toEqual(rect(0, 10, 50, 20));
    expect(anchor.getClientRectangles?.()).toHaveLength(2);
    expect(anchor.contextElement).toBe(context);
  });
});
