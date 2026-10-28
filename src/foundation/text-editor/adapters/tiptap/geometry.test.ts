import { describe, expect, it } from 'vitest';
import type { TextEditorPortableDraft } from '../../content/portable.js';
import { TiptapGeometry } from './geometry.js';
import { cellAt, holderIndex, pointToPos } from './mapping.js';
import type { TiptapEditorStateLike, TiptapViewLike } from './modules.js';
import { blockSelection } from './selection.js';
import { ruleView } from './tiptap-stubs.test.js';

/** An element as the view renders it, laid out at a fixed rectangle. */
class FakeElement {
  readonly nodeType = 1;
  readonly isConnected = true;
  readonly children: FakeElement[] = [];
  constructor(
    readonly tagName: string,
    readonly pos: number,
    readonly top = pos,
  ) {}
  getClientRects() {
    return [this.getBoundingClientRect()];
  }
  querySelector() {
    return null;
  }
  getBoundingClientRect() {
    const rect = {
      x: 0,
      y: this.top,
      width: 100,
      height: 10,
      left: 0,
      top: this.top,
      right: 100,
      bottom: this.top + 10,
    };
    return { ...rect, toJSON: () => rect } as DOMRectReadOnly;
  }
}

/**
 * A structural view over a state: `nodeDOM` gives one element per node position, `posAtDOM` the
 * position inside the element's node, `posAtCoords` the position given by `y`.
 */
function fakeView(state: TiptapEditorStateLike): TiptapViewLike {
  const elements = new Map<number, FakeElement>();
  state.doc.descendants((node, pos) => {
    const element = new FakeElement(node.type.name === 'table' ? 'DIV' : node.type.name, pos);
    if (node.type.name === 'table') element.children.push(new FakeElement('TABLE', pos));
    elements.set(pos, element);
    return true;
  });
  const dom = {
    contains: (node: unknown) => [...elements.values()].includes(node as FakeElement),
    ownerDocument: {},
  };
  return {
    state,
    dom,
    nodeDOM: (pos: number) => elements.get(pos) ?? null,
    posAtDOM: (node: FakeElement) => node.pos + 1,
    posAtCoords: ({ top }: { top: number }) => ({ pos: top, inside: -1 }),
  } as unknown as TiptapViewLike;
}

/** A table cell holding one paragraph of text. */
const cellOf = (text: string) => ({ paragraphs: [{ content: [{ type: 'text' as const, text }] }] });

const draft: TextEditorPortableDraft = {
  blocks: [
    { type: 'paragraph', id: 'p1', content: [{ type: 'text', text: 'calm' }] },
    {
      type: 'list-bullet',
      id: 'i1',
      content: [{ type: 'text', text: 'one' }],
      children: [
        { type: 'list-bullet', id: 'i2', content: [{ type: 'text', text: 'two' }], children: [] },
      ],
    },
    {
      type: 'table',
      id: 't1',
      headerRow: false,
      headerColumn: false,
      rows: [{ cells: [{ paragraphs: [{ content: [] }] }, { paragraphs: [{ content: [] }] }] }],
    },
  ],
};

describe('Tiptap lookups (uwg-te-tab-engine r6, uwg-te-req-engine-10)', () => {
  const { view: test, env } = ruleView(draft);
  const view = fakeView(test.state);
  const geometry = new TiptapGeometry(env, () => view);
  const element = (id: string) => geometry.blockElement(id) as unknown as FakeElement | null;

  it('resolves a block to its element: a list item to its item, a table to its scroll wrapper', () => {
    expect(element('p1')?.tagName).toBe('paragraph');
    expect(element('i2')?.tagName).toBe('listItem');
    expect(element('t1')?.tagName).toBe('DIV');
    expect(element('nope')).toBeNull();
    const tables = geometry.tableElements('t1')!;
    expect((tables.table as unknown as FakeElement).tagName).toBe('TABLE');
    expect(tables.scroller).toBe(geometry.blockElement('t1'));
    expect(geometry.tableElements('p1')).toBeNull();
  });

  it('maps elements back to blocks and cells, and a cell to its element', () => {
    expect(geometry.blockAt(element('i2') as unknown as Node)).toBe('i2');
    expect(geometry.blockAt(element('p1') as unknown as Node)).toBe('p1');
    const cell = geometry.cellElement('t1', { row: 0, column: 1 }) as unknown as FakeElement;
    expect(cell.tagName).toBe('tableCell');
    expect(geometry.cellAt(cell as unknown as Node)).toEqual({
      table: 't1',
      cell: { row: 0, column: 1 },
    });
    expect(geometry.blockAt(cell as unknown as Node)).toBe('t1');
    expect(geometry.blockAt({} as Node)).toBeNull();
  });

  it('pointAt resolves a client point through the view to the text point under it', () => {
    const pos = pointToPos(test.state.doc, { block: 'i2', offset: 2 })!;
    expect(geometry.pointAt(0, pos)).toEqual({ block: 'i2', offset: 2 });
    // A point between blocks has no text point.
    expect(geometry.pointAt(0, 0)).toBeNull();
  });

  it('measures a block selection as one rectangle per block and blocks through the shared rules', () => {
    const selected = blockSelection(env.modules, test.state.doc, ['p1', 'i1'])!;
    const withBlocks = fakeView(test.state.apply(test.state.tr.setSelection(selected)));
    const rects = new TiptapGeometry(env, () => withBlocks).selectionRects();
    expect(rects.map((rect) => rect.top)).toEqual([0, element('i1')!.pos]);
    expect(geometry.blockRects('nope')).toBeNull();
  });
});

describe('uwg-te-req-engine-10: a point at the centre of a character', () => {
  /** A paragraph `a😀b`: one 10-pixel glyph per character, the surrogate pair one glyph. */
  const TEXT = 'a😀b';
  const EDGES = [0, 10, 20, 20, 30];

  /** A range over the paragraph's text node, measured by glyph edges. */
  class GlyphRange {
    start = 0;
    end = 0;
    setStart(_node: unknown, offset: number) {
      this.start = offset;
    }
    setEnd(_node: unknown, offset: number) {
      this.end = offset;
    }
    getBoundingClientRect(): DOMRectReadOnly {
      const left = EDGES[this.start]!;
      const right = EDGES[this.end]!;
      const rect = {
        x: left,
        y: 0,
        left,
        right,
        top: 0,
        bottom: 20,
        width: right - left,
        height: 20,
      };
      return { ...rect, toJSON: () => rect } as DOMRectReadOnly;
    }
    getClientRects() {
      return [this.getBoundingClientRect()];
    }
  }

  function glyphGeometry() {
    const { view: test, env } = ruleView({
      blocks: [{ type: 'paragraph', id: 'p1', content: [{ type: 'text', text: TEXT }] }],
    });
    const ownerDocument = {
      createRange: () => new GlyphRange(),
      defaultView: { getComputedStyle: (element: { style: object }) => element.style },
    };
    const text = {
      nodeType: 3,
      data: TEXT,
      ownerDocument,
      parentElement: { style: { direction: 'ltr' }, ownerDocument },
    };
    // The paragraph's element holds its one line of glyphs.
    const paragraph = new FakeElement('paragraph', 0, 0);
    const view = {
      state: test.state,
      dom: { ownerDocument, contains: () => true },
      nodeDOM: (pos: number) => (pos === 0 ? paragraph : null),
      domAtPos: (pos: number) => ({ node: text, offset: pos - 1 }),
      // The offset before the glyph under the point, as a browser may answer at a tie.
      posAtCoords: ({ left }: { left: number }) => {
        let offset = 0;
        EDGES.forEach((edge, at) => {
          if (at < TEXT.length && edge <= left && EDGES[at + 1] !== edge) offset = at;
        });
        return { pos: 1 + offset, inside: -1 };
      },
    };
    return new TiptapGeometry(env, () => view as unknown as TiptapViewLike);
  }

  it('a point at or past the centre of a character resolves after it, a surrogate pair as one character', () => {
    const geometry = glyphGeometry();
    expect(geometry.pointAt(4, 10)).toEqual({ block: 'p1', offset: 0 });
    expect(geometry.pointAt(5, 10)).toEqual({ block: 'p1', offset: 1 });
    expect(geometry.pointAt(12, 10)).toEqual({ block: 'p1', offset: 1 });
    expect(geometry.pointAt(15, 10)).toEqual({ block: 'p1', offset: 3 });
    expect(geometry.pointAt(25, 10)).toEqual({ block: 'p1', offset: 4 });
  });
});

describe('uwg-te-req-engine-10: the caret rectangle', () => {
  /** A DOM node as the view's positions give it: a text node or an element. */
  interface FakeNode {
    readonly nodeType: number;
    readonly name: string;
  }

  /** A range that measures only in text nodes, one 10-pixel column per character. */
  class FakeRange {
    start: { node: FakeNode; offset: number } | null = null;
    end: { node: FakeNode; offset: number } | null = null;
    setStart(node: FakeNode, offset: number) {
      this.start = { node, offset };
    }
    setEnd(node: FakeNode, offset: number) {
      this.end = { node, offset };
    }
    getClientRects() {
      const { start, end } = this;
      if (!start || !end || start.node.nodeType !== 3) return [];
      const left = start.offset * 10;
      const right = end.offset * 10;
      const rect = {
        left,
        right,
        top: 0,
        bottom: 20,
        width: right - left,
        height: 20,
        x: left,
        y: 0,
      };
      return [{ ...rect, toJSON: () => rect }];
    }
  }

  const element: FakeNode = { nodeType: 1, name: 'p' };
  const plain: FakeNode = { nodeType: 3, name: 'plain ' };
  const bold: FakeNode = { nodeType: 3, name: 'bold' };

  /** A paragraph `plain <strong>bold</strong>` and a view whose DOM positions are the engine's. */
  function geometryAt(caret: number) {
    const { view: test, env } = ruleView(
      {
        blocks: [
          {
            type: 'paragraph',
            id: 'p1',
            content: [
              { type: 'text', text: 'plain ' },
              { type: 'text', text: 'bold', marks: { bold: true } },
            ],
          },
        ],
      },
      caret,
    );
    const view = {
      state: test.state,
      dom: { ownerDocument: { createRange: () => new FakeRange() }, contains: () => true },
      nodeDOM: () => ({ nodeType: 1 }),
      // Side 0 answers an element position at a node boundary, as the engine's view does.
      domAtPos: (pos: number, side = 0) => {
        const offset = pos - 1;
        if (offset < 6)
          return offset === 0 && side <= 0 ? { node: element, offset: 0 } : { node: plain, offset };
        if (offset === 6)
          return side < 0
            ? { node: plain, offset: 6 }
            : side > 0
              ? { node: bold, offset: 0 }
              : { node: element, offset: 1 };
        if (offset === 10)
          return side <= 0 && side !== -1
            ? { node: element, offset: 2 }
            : { node: bold, offset: 4 };
        return { node: bold, offset: offset - 6 };
      },
      posAtCoords: ({ left }: { left: number }) => ({ pos: 1 + Math.floor(left / 10), inside: -1 }),
    };
    return new TiptapGeometry(env, () => view as unknown as TiptapViewLike);
  }

  it('the caret rectangle measures at a block start, a mark boundary and a block end', () => {
    for (const caret of [1, 7, 11]) {
      const rect = geometryAt(caret).caretRect();
      expect(rect, String(caret)).not.toBeNull();
      expect(rect!.height).toBe(20);
    }
  });
});

describe('uwg-te-req-engine-10: pointAt on the lines of text', () => {
  it('a point the view resolves into a textblock but outside its box, between blocks or in a cell’s padding, is null', () => {
    const { view: test, env } = ruleView(draft);
    const { doc } = test.state;
    const base = fakeView(test.state);
    let resolved = 0;
    const view = {
      ...base,
      posAtCoords: () => ({ pos: resolved, inside: -1 }),
    } as unknown as TiptapViewLike;
    const geometry = new TiptapGeometry(env, () => view);
    for (const point of [
      { block: 'p1', offset: 2 },
      { block: 'i2', offset: 1 },
      { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 0 },
    ]) {
      resolved = pointToPos(doc, point, env.tables)!;
      // The textblock's element lies at its position, 100 pixels wide and 10 high.
      const top = doc.resolve(resolved).before();
      expect(geometry.pointAt(50, top + 5)).toEqual(point);
      // Above it: the gap before the block, or the cell's top padding; beside it.
      expect(geometry.pointAt(50, top - 2)).toBeNull();
      expect(geometry.pointAt(150, top + 5)).toBeNull();
    }
  });
});

describe('uwg-te-req-tables-5: the rectangles of a cell range touching a merged cell', () => {
  const merged: TextEditorPortableDraft = {
    blocks: [
      {
        type: 'table',
        id: 't1',
        headerRow: false,
        headerColumn: false,
        rows: [
          { cells: ['a', 'b', 'c', 'd'].map((text) => cellOf(text)) },
          { cells: [cellOf('e'), { ...cellOf('F'), rowSpan: 2, colSpan: 2 }, cellOf('g')] },
          { cells: [cellOf('h'), cellOf('i')] },
          { cells: ['j', 'k', 'l', 'm'].map((text) => cellOf(text)) },
        ],
      },
    ],
  };

  it('measures every cell of the range grown over the merged cell, one rectangle each', () => {
    const { view: test, env } = ruleView(merged);
    const { doc } = test.state;
    const holder = holderIndex(doc).byId.get('t1')!;
    const at = (row: number, column: number) =>
      cellAt(holder.node, holder.pos, { row, column }, env.tables!)!.pos;
    const selection = env.tables!.CellSelection.create(doc, at(2, 0), at(3, 1));
    const view = fakeView(test.state.apply(test.state.tr.setSelection(selection)));
    const rects = new TiptapGeometry(env, () => view).selectionRects();
    expect(rects.map((rect) => rect.top)).toEqual([
      at(1, 0),
      at(1, 1),
      at(2, 0),
      at(3, 0),
      at(3, 1),
      at(3, 2),
    ]);
  });

  it('an empty cell paragraph is one line, both first and last; an unmeasured one is neither', () => {
    const { view: test, env } = ruleView(draft);
    const geometry = new TiptapGeometry(env, () => fakeView(test.state));
    const point = { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 };
    expect(geometry.onEdgeLine(point, 'first')).toBe(true);
    expect(geometry.onEdgeLine(point, 'last')).toBe(true);
    expect(geometry.onEdgeLine({ block: 'p1', offset: 9 }, 'first')).toBe(false);
  });
});
