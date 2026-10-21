import { describe, expect, it } from 'vitest';
import {
  blockRects,
  caretOnEdgeLine,
  caretPositionAt,
  caretRect,
  characterLength,
  characterTieAfter,
  clientRect,
  elementRect,
  isRightToLeft,
  rangeRects,
  taskContentRects,
  textPointOnLines,
  tieOffset,
  unionRect,
  type TextEditorLineLookups,
  type TextEditorRangeLike,
} from './dom-geometry.js';

// Structural fakes: rectangles, ranges and elements with the members geometry reads. The real
// measurements run in the browser, on the parity page.

function rect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  const data = {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
  return { ...data, toJSON: () => data };
}

const plain = (value: DOMRectReadOnly | null | undefined) =>
  value && { left: value.left, top: value.top, width: value.width, height: value.height };

const rangeOf = (rects: readonly DOMRectReadOnly[]): TextEditorRangeLike =>
  ({ getClientRects: () => rects }) as unknown as TextEditorRangeLike;

type Style = Partial<Record<keyof CSSStyleDeclaration, string>>;

class FakeRange {
  #element: FakeElement | null = null;
  selectNodeContents(element: FakeElement) {
    this.#element = element;
  }
  getClientRects() {
    return this.#element?.textRects ?? [];
  }
}

const fakeDocument = {
  defaultView: {
    getComputedStyle: (element: FakeElement) => element.style,
  },
  createRange: () => new FakeRange(),
  getSelection() {
    throw new Error('geometry never reads the document selection');
  },
};

class FakeElement {
  isConnected = true;
  readonly ownerDocument = fakeDocument;
  lineBreak: FakeElement | null = null;
  textRects: readonly DOMRectReadOnly[] = [];

  constructor(
    public box: DOMRectReadOnly | null,
    public style: Style = {},
  ) {}

  getClientRects() {
    return this.box ? [this.box] : [];
  }
  getBoundingClientRect() {
    return this.box ?? rect(0, 0, 0, 0);
  }
  querySelector(selector: string) {
    return selector === 'br' ? this.lineBreak : null;
  }
}

const element = (fake: FakeElement) => fake as unknown as Element;

describe('range rectangles (uwg-te-req-engine-10, uwg-te-tab-engine r6)', () => {
  it('keeps one rectangle per line fragment, in line order, without element boxes', () => {
    const paragraphBox = rect(0, 0, 300, 48);
    const a = rect(0, 2, 100, 20);
    const b = rect(100, 4, 50, 16);
    const c = rect(0, 26, 80, 20);
    const caretEdge = rect(150, 2, 0, 20);
    const strongBox = rect(100, 4, 50, 16);
    const rects = rangeRects(rangeOf([paragraphBox, c, a, caretEdge, b, strongBox]));
    expect(rects).toEqual([a, b, c]);
    expect(rects[1]).toBe(b);
    expect(Object.isFrozen(rects)).toBe(true);
  });

  it('keeps an atom block that holds no text, and gives nothing for nothing', () => {
    const image = rect(0, 60, 200, 120);
    expect(rangeRects(rangeOf([rect(0, 0, 90, 20), image]))).toHaveLength(2);
    expect(rangeRects(rangeOf([]))).toEqual([]);
    expect(rangeRects(rangeOf([rect(4, 4, 0, 18)]))).toEqual([]);
  });
});

describe('caret rectangle (uwg-te-req-engine-10: an empty block has the height of its line)', () => {
  const padded: Style = {
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderTopWidth: '0px',
    lineHeight: '24px',
    direction: 'ltr',
  };

  it('puts the caret of an empty block in its line box, at the inline position of its br', () => {
    const block = new FakeElement(rect(10, 100, 300, 32), padded);
    block.lineBreak = new FakeElement(rect(160, 105, 0, 18));
    expect(plain(caretRect({ range: null, block: element(block), empty: true }))).toEqual({
      left: 160,
      top: 104,
      width: 0,
      height: 24,
    });
    // A range that measures nothing, as in an empty block, does not change that.
    const range = rangeOf([]);
    expect(caretRect({ range, block: element(block), empty: true })?.height).toBe(24);
  });

  it('takes the content box height for a normal line height and the start edge without a br', () => {
    const block = new FakeElement(rect(10, 100, 300, 32), { ...padded, lineHeight: 'normal' });
    expect(plain(caretRect({ range: null, block: element(block), empty: true }))).toEqual({
      left: 18,
      top: 104,
      width: 0,
      height: 24,
    });
    const rtl = new FakeElement(rect(10, 100, 300, 32), { ...padded, direction: 'rtl' });
    expect(caretRect({ range: null, block: element(rtl), empty: true })?.left).toBe(302);
  });

  it('uses the first rectangle of the collapsed range in a block with text', () => {
    const block = new FakeElement(rect(0, 0, 300, 24), padded);
    const caret = rect(50, 10, 0, 18);
    expect(
      caretRect({
        range: rangeOf([rect(40, 10, 0, 0), caret]),
        block: element(block),
        empty: false,
      }),
    ).toBe(caret);
    expect(
      plain(caretRect({ range: rangeOf([rect(50, 10, 2, 18)]), block: null, empty: false })),
    ).toEqual({ left: 50, top: 10, width: 0, height: 18 });
    expect(caretRect({ range: rangeOf([]), block: element(block), empty: false })).toBeNull();
    expect(caretRect({ range: null, block: null, empty: false })).toBeNull();
  });

  it('measures nothing for a hidden or disconnected block', () => {
    const hidden = new FakeElement(null, padded);
    expect(caretRect({ range: null, block: element(hidden), empty: true })).toBeNull();
    const detached = new FakeElement(rect(0, 0, 100, 24), padded);
    detached.isConnected = false;
    expect(caretRect({ range: null, block: element(detached), empty: true })).toBeNull();
  });
});

describe('block rectangles (uwg-te-tab-engine r6)', () => {
  it('spans the nested items, measures the own text element and its first line', () => {
    const item = new FakeElement(rect(0, 0, 400, 90));
    const paragraph = new FakeElement(rect(20, 0, 380, 60), { lineHeight: '24px' });
    const wrapper = new FakeElement(rect(0, 90, 400, 60));
    const rects = blockRects({
      element: element(item),
      content: element(paragraph),
      nested: [element(wrapper)],
    });
    expect(plain(rects?.box)).toEqual({ left: 0, top: 0, width: 400, height: 150 });
    expect(rects?.content).toBe(paragraph.box);
    expect(plain(rects?.firstLine)).toEqual({ left: 20, top: 0, width: 380, height: 24 });
    expect(Object.isFrozen(rects)).toBe(true);
  });

  it('takes the first text line under a normal line height, and the content box when empty', () => {
    const paragraph = new FakeElement(rect(0, 40, 300, 50), {
      lineHeight: 'normal',
      paddingTop: '2px',
    });
    paragraph.textRects = [rect(0, 64, 120, 19), rect(0, 42, 200, 19)];
    expect(plain(blockRects({ element: element(paragraph) })?.firstLine)).toEqual({
      left: 0,
      top: 42,
      width: 300,
      height: 19,
    });
    paragraph.textRects = [];
    expect(blockRects({ element: element(paragraph) })?.firstLine.height).toBe(48);
    expect(blockRects({ element: element(paragraph) })?.box).toBe(paragraph.box);
  });

  it('measures nothing for an element without a layout box', () => {
    expect(blockRects({ element: element(new FakeElement(null)) })).toBeNull();
    const item = new FakeElement(rect(0, 0, 100, 20));
    expect(
      blockRects({ element: element(item), content: element(new FakeElement(null)) }),
    ).toBeNull();
    expect(elementRect(element(item))).toBe(item.box);
    item.isConnected = false;
    expect(elementRect(element(item))).toBeNull();
  });

  it('unites rectangles', () => {
    expect(unionRect([])).toBeNull();
    const only = rect(1, 2, 3, 4);
    expect(unionRect([only])).toBe(only);
    expect(plain(unionRect([rect(10, 10, 10, 10), rect(0, 30, 5, 5)]))).toEqual({
      left: 0,
      top: 10,
      width: 20,
      height: 25,
    });
  });
});

describe('caret position under a point (uwg-te-req-engine-10)', () => {
  interface FakeNode {
    readonly nodeType: number;
    getRootNode(): unknown;
  }
  function shadowTree() {
    const document = {
      nodeType: 9,
      calls: [] as unknown[][],
      caretPositionFromPoint: undefined as
        ((x: number, y: number, options?: CaretPositionFromPointOptions) => unknown) | undefined,
      caretRangeFromPoint: undefined as ((x: number, y: number) => unknown) | undefined,
      getSelection() {
        throw new Error('geometry never reads the document selection');
      },
    };
    const outerHost: FakeNode = { nodeType: 1, getRootNode: () => document };
    const outer = { nodeType: 11, host: outerHost };
    const innerHost: FakeNode = { nodeType: 1, getRootNode: () => outer };
    const inner = { nodeType: 11, host: innerHost };
    const text = { nodeType: 3 };
    const elsewhere = { nodeType: 3 };
    const root = {
      nodeType: 1,
      ownerDocument: document,
      getRootNode: () => inner,
      contains: (node: unknown) => node === root || node === text,
    };
    return { document, outer, inner, text, elsewhere, root: root as unknown as Element };
  }

  it('passes every enclosing shadow root to caretPositionFromPoint and keeps positions in the root', () => {
    const tree = shadowTree();
    tree.document.caretPositionFromPoint = (x, y, options) => {
      tree.document.calls.push([x, y, options]);
      return { offsetNode: tree.text, offset: 3 };
    };
    expect(caretPositionAt(tree.root, 12, 34)).toEqual({ node: tree.text, offset: 3 });
    expect(tree.document.calls).toEqual([[12, 34, { shadowRoots: [tree.inner, tree.outer] }]]);
    tree.document.caretPositionFromPoint = () => ({ offsetNode: tree.elsewhere, offset: 0 });
    expect(caretPositionAt(tree.root, 12, 34)).toBeNull();
    tree.document.caretPositionFromPoint = () => null;
    expect(caretPositionAt(tree.root, 12, 34)).toBeNull();
  });

  it('falls back to caretRangeFromPoint, and resolves nothing without either', () => {
    const tree = shadowTree();
    tree.document.caretRangeFromPoint = (x, y) => {
      tree.document.calls.push([x, y]);
      return { startContainer: tree.text, startOffset: 1 };
    };
    expect(caretPositionAt(tree.root, 5, 6)).toEqual({ node: tree.text, offset: 1 });
    expect(tree.document.calls).toEqual([[5, 6]]);
    tree.document.caretRangeFromPoint = undefined;
    expect(caretPositionAt(tree.root, 5, 6)).toBeNull();
  });
});

describe('client rectangles of computed boxes (uwg-te-req-engine-10)', () => {
  it('are the window’s DOMRectReadOnly, or frozen plain data without one, never negative', () => {
    class Rect {
      constructor(
        readonly x: number,
        readonly y: number,
        readonly width: number,
        readonly height: number,
      ) {}
    }
    const view = { DOMRectReadOnly: Rect as unknown as typeof DOMRectReadOnly };
    const made = clientRect({ left: 4, top: 6, right: 14, bottom: 26 }, view);
    expect(made).toBeInstanceOf(Rect);
    expect(made).toMatchObject({ x: 4, y: 6, width: 10, height: 20 });
    const data = clientRect({ left: 4, top: 6, right: 2, bottom: 26 }, null);
    expect(plain(data)).toEqual({ left: 4, top: 6, width: 0, height: 20 });
    expect(Object.isFrozen(data)).toBe(true);
    expect(data.toJSON()).toMatchObject({ right: 4, bottom: 26 });
  });

  it('a task item’s content and first line start at its marker’s inline end; its box stays whole', () => {
    const rects = {
      box: rect(0, 0, 200, 40),
      content: rect(0, 0, 200, 20),
      firstLine: rect(0, 0, 200, 20),
    };
    const marker = { left: 0, top: 2, right: 24, bottom: 18 };
    const ltr = taskContentRects(rects, marker, false, null);
    expect(ltr.box).toBe(rects.box);
    expect(plain(ltr.content)).toEqual({ left: 24, top: 0, width: 176, height: 20 });
    expect(plain(ltr.firstLine)).toEqual({ left: 24, top: 0, width: 176, height: 20 });
    const end = { left: 176, top: 2, right: 200, bottom: 18 };
    expect(plain(taskContentRects(rects, end, true, null).content)).toEqual({
      left: 0,
      top: 0,
      width: 176,
      height: 20,
    });
    expect(Object.isFrozen(ltr)).toBe(true);
  });
});

describe('a point at a character’s centre (uwg-te-req-engine-10: pointAt)', () => {
  /** Each character 10 pixels wide on a line from y 0 to 20; a surrogate pair is one glyph. */
  function textNode(data: string, direction = 'ltr') {
    const units: number[] = [0];
    for (let index = 0; index < data.length; index += 1) {
      const pair = characterLength(data, index) === 2;
      units.push(units[index]! + 10);
      if (pair) {
        units.push(units[index]! + 10);
        index += 1;
      }
    }
    const ownerDocument = {
      defaultView: { getComputedStyle: (element: { style: Style }) => element.style },
      createRange: () => {
        let start = 0;
        let end = 0;
        return {
          setStart: (_node: unknown, offset: number) => void (start = offset),
          setEnd: (_node: unknown, offset: number) => void (end = offset),
          getBoundingClientRect: () => {
            const left = units[start]!;
            return rect(left, 0, units[end]! - left, 20);
          },
        };
      },
    };
    const text = { data, ownerDocument, parentElement: { style: { direction }, ownerDocument } };
    return text as unknown as Text;
  }

  it('counts a surrogate pair as one character', () => {
    expect(characterLength('a😀', 0)).toBe(1);
    expect(characterLength('a😀', 1)).toBe(2);
    expect(characterLength('a😀', 3)).toBe(0);
  });

  it('a tie goes to the offset after the character, from its centre on in the inline direction', () => {
    expect(characterTieAfter(15, 10, rect(10, 0, 10, 20), false)).toBe(true);
    expect(characterTieAfter(14.9, 10, rect(10, 0, 10, 20), false)).toBe(false);
    expect(characterTieAfter(15, 10, rect(10, 0, 10, 20), true)).toBe(true);
    expect(characterTieAfter(16, 10, rect(10, 0, 10, 20), true)).toBe(false);
    expect(characterTieAfter(15, 30, rect(10, 0, 10, 20), false)).toBe(false);
    expect(characterTieAfter(10, 10, rect(10, 0, 0, 20), false)).toBe(false);
  });

  it('resolves a text node offset, never splitting a surrogate pair', () => {
    const text = textNode('a😀b');
    expect(tieOffset(text, 0, 5, 10)).toBe(1);
    expect(tieOffset(text, 0, 4, 10)).toBe(0);
    // The pair is one glyph from 10 to 20: at its centre the offset after it is 3, never 2.
    expect(tieOffset(text, 1, 15, 10)).toBe(3);
    expect(tieOffset(text, 1, 14, 10)).toBe(1);
    expect(tieOffset(text, 4, 45, 10)).toBe(4);
    expect(tieOffset(textNode('ab', 'rtl'), 0, 5, 10)).toBe(1);
    expect(tieOffset(textNode('ab', 'rtl'), 0, 6, 10)).toBe(0);
  });
});

describe('uwg-te-req-engine-10: a text point under a client point lies on its textblock’s lines', () => {
  // A paragraph whose text box runs from x 10 to 310 and y 100 to 148; a task item whose text
  // starts after its marker at x 34; a cell paragraph inside its cell's 8-pixel padding.
  const paragraph = rect(10, 100, 300, 48);
  const cellParagraph = new FakeElement(rect(408, 208, 84, 20));
  const lookups: TextEditorLineLookups = {
    blockRects: (id) =>
      id === 'p1'
        ? { box: paragraph, content: paragraph, firstLine: rect(10, 100, 300, 24) }
        : id === 'task'
          ? {
              box: rect(10, 200, 300, 24),
              content: rect(34, 200, 276, 24),
              firstLine: rect(34, 200, 276, 24),
            }
          : null,
    paragraphElement: (table, cell) =>
      table === 't1' && cell.row === 0 && cell.column === 0 && cell.paragraph === 0
        ? element(cellParagraph)
        : null,
  };
  const point = { block: 'p1', offset: 3 };
  const inCell = { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 1 };

  it('keeps the point the engine resolved inside the box of its lines, edges included', () => {
    expect(textPointOnLines(point, lookups, 20, 110)).toBe(point);
    // Past the end of a short line, still on that line.
    expect(textPointOnLines(point, lookups, 300, 147)).toBe(point);
    expect(textPointOnLines(point, lookups, 10, 100)).toBe(point);
    expect(textPointOnLines(point, lookups, 310, 148)).toBe(point);
    expect(textPointOnLines(inCell, lookups, 450, 218)).toBe(inCell);
    const task = { block: 'task', offset: 0 };
    expect(textPointOnLines(task, lookups, 40, 210)).toBe(task);
  });

  it('answers null between blocks, in a cell’s padding, over a marker and without a box', () => {
    expect(textPointOnLines(point, lookups, 20, 92)).toBeNull();
    expect(textPointOnLines(point, lookups, 20, 156)).toBeNull();
    expect(textPointOnLines(point, lookups, 4, 110)).toBeNull();
    expect(textPointOnLines(inCell, lookups, 450, 204)).toBeNull();
    expect(textPointOnLines(inCell, lookups, 404, 218)).toBeNull();
    expect(textPointOnLines({ block: 'task', offset: 0 }, lookups, 20, 210)).toBeNull();
    expect(textPointOnLines({ block: 'gone', offset: 0 }, lookups, 20, 110)).toBeNull();
    const elsewhere = { ...inCell, cell: { row: 1, column: 0, paragraph: 0 } };
    expect(textPointOnLines(elsewhere, lookups, 450, 218)).toBeNull();
    expect(textPointOnLines(null, lookups, 20, 110)).toBeNull();
  });
});

describe('uwg-te-req-tables-5: a caret on the first or the last line of a textblock', () => {
  // Three 20-pixel lines from y 104, after a 4-pixel padding; each caret 16 pixels high.
  const block = new FakeElement(rect(0, 100, 200, 68), {
    paddingTop: '4px',
    paddingBottom: '4px',
    lineHeight: '20px',
  });
  const line = (index: number) => ({
    left: 50,
    right: 50,
    top: 106 + 20 * index,
    bottom: 122 + 20 * index,
  });

  it('places a caret by its centre on the first line, the last line or neither', () => {
    expect(caretOnEdgeLine(line(0), element(block), 'first')).toBe(true);
    expect(caretOnEdgeLine(line(0), element(block), 'last')).toBe(false);
    expect(caretOnEdgeLine(line(1), element(block), 'first')).toBe(false);
    expect(caretOnEdgeLine(line(1), element(block), 'last')).toBe(false);
    expect(caretOnEdgeLine(line(2), element(block), 'first')).toBe(false);
    expect(caretOnEdgeLine(line(2), element(block), 'last')).toBe(true);
  });

  it('holds for a caret taller than its line and in an empty block; nothing measured is no edge', () => {
    // A 20-pixel caret on the second of two 16-pixel lines.
    const tight = new FakeElement(rect(0, 0, 200, 32), { lineHeight: '16px' });
    const second = { left: 0, right: 0, top: 14, bottom: 34 };
    expect(caretOnEdgeLine(second, element(tight), 'first')).toBe(false);
    expect(caretOnEdgeLine(second, element(tight), 'last')).toBe(true);
    const empty = new FakeElement(rect(0, 0, 200, 24), { lineHeight: 'normal' });
    const caret = caretRect({ range: null, block: element(empty), empty: true });
    expect(caretOnEdgeLine(caret, element(empty), 'first')).toBe(true);
    expect(caretOnEdgeLine(caret, element(empty), 'last')).toBe(true);
    expect(caretOnEdgeLine(null, element(block), 'first')).toBe(false);
    expect(caretOnEdgeLine(line(0), null, 'first')).toBe(false);
    expect(caretOnEdgeLine(line(0), element(new FakeElement(null)), 'first')).toBe(false);
  });

  it('reads an element’s inline direction from its computed style', () => {
    expect(isRightToLeft(element(new FakeElement(rect(0, 0, 1, 1), { direction: 'rtl' })))).toBe(
      true,
    );
    expect(isRightToLeft(element(new FakeElement(rect(0, 0, 1, 1), { direction: 'ltr' })))).toBe(
      false,
    );
    expect(isRightToLeft(null)).toBe(false);
  });
});
