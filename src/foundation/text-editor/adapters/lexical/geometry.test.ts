/**
 * Lookups and geometry of the Lexical adapter (Widgets `uwg-te-req-engine-10`,
 * `uwg-te-tab-engine` r6, r9). The measurements run on small structural fakes of the engine's
 * elements and of the document's caret resolution; the browser batches measure the layout.
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { headlessLexical, realLexicalModules, type Headless } from './lexical-stubs.test.js';
import { LexicalGeometry } from './geometry.js';
import type { LexicalDomPointsLike, TextEditorLexicalModules } from './modules.js';
import { FakeDocument } from '../shared/test-helpers.test.js';

/** A rectangle with every member a measurement reads. */
const rect = (left: number, top: number, width: number, height: number) => {
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
};

/**
 * A text node whose characters are each 10 pixels wide on a line from y 0 to 20, a surrogate pair
 * one glyph, in a document that resolves every client point to `position` in it.
 */
function textUnderPoint(data: string, position: () => number) {
  const edges: number[] = [];
  let x = 0;
  for (let index = 0; index < data.length; index += 1) {
    edges[index] = x;
    const code = data.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) edges[(index += 1)] = x;
    x += 10;
  }
  edges[data.length] = x;
  const document = {
    nodeType: 9,
    defaultView: { getComputedStyle: () => ({ direction: 'ltr' }) },
    createRange: () => {
      let start = 0;
      let end = 0;
      return {
        setStart: (_node: unknown, offset: number) => void (start = offset),
        setEnd: (_node: unknown, offset: number) => void (end = offset),
        getBoundingClientRect: () => rect(edges[start]!, 0, edges[end]! - edges[start]!, 20),
      };
    },
    caretPositionFromPoint: () => ({ offsetNode: text, offset: position() }),
  };
  const text = {
    nodeType: 3,
    data,
    parentNode: null,
    ownerDocument: document,
    parentElement: { ownerDocument: document },
  };
  const root = {
    ownerDocument: document,
    getRootNode: () => document,
    contains: () => true,
  };
  return root as unknown as HTMLElement;
}

/**
 * The real modules whose DOM-selection resolution records the DOM offset it receives and resolves
 * it in the first text node of the first block, as the engine resolves a DOM selection there.
 */
function resolvingModules(seen: number[]): TextEditorLexicalModules {
  return {
    ...realLexicalModules,
    lexical: {
      ...realLexicalModules.lexical,
      $createRangeSelectionFromDom: (domSelection: LexicalDomPointsLike | null) => {
        const offset = domSelection?.anchorOffset ?? 0;
        seen.push(offset);
        const block = lexical.$getRoot().getFirstChild() as lexical.ElementNode;
        const key = block.getFirstChild()!.getKey();
        const selection = lexical.$createRangeSelection();
        selection.anchor.set(key, offset, 'text');
        selection.focus.set(key, offset, 'text');
        return selection;
      },
    },
  };
}

/**
 * Gives the element of the first text's textblock a layout box; the engine's other elements have
 * none.
 */
function boxTextblock(headless: Headless, box: ReturnType<typeof rect>): void {
  const key = headless.editor.read(() => {
    const leaf = lexical.$getRoot().getFirstDescendant()!;
    return (lexical.$isTextNode(leaf) ? leaf.getParent()! : leaf).getKey();
  });
  const textblock = {
    isConnected: true,
    ownerDocument: { defaultView: null },
    getClientRects: () => [box],
    getBoundingClientRect: () => box,
    querySelector: () => null,
  };
  headless.editor.getElementByKey = (asked: string) =>
    (asked === key ? textblock : null) as unknown as HTMLElement;
}

describe('uwg-te-req-engine-10: pointAt', () => {
  it('a point at a character’s centre resolves to the offset after the whole character, a surrogate pair included', () => {
    const seen: number[] = [];
    const headless = headlessLexical({
      modules: resolvingModules(seen),
      html: '<p data-id="p1">a😀b</p>',
    });
    let position = 0;
    const root = textUnderPoint('a😀b', () => position);
    headless.editor.getRootElement = () => root;
    boxTextblock(headless, rect(0, 0, 100, 40));
    // The centre of `a`, which the browser resolves before it.
    expect(headless.instance.pointAt(5, 10)).toEqual({ block: 'p1', offset: 1 });
    // Left of the centre stays before it.
    expect(headless.instance.pointAt(4, 10)).toEqual({ block: 'p1', offset: 0 });
    // The centre of the pair goes past both of its code units.
    position = 1;
    expect(headless.instance.pointAt(15, 10)).toEqual({ block: 'p1', offset: 3 });
    // Another line is no tie.
    expect(headless.instance.pointAt(15, 30)).toEqual({ block: 'p1', offset: 1 });
    expect(seen).toEqual([1, 0, 3, 1]);
  });
});

describe('uwg-te-tab-engine r6: blockRects', () => {
  it('the content and first line of a task item start after its marker and the marker’s margin, its box whole', () => {
    const headless = headlessLexical({
      html: '<ul data-type="task"><li data-id="t1" data-checked="false"><p>todo</p></li></ul>',
    });
    const view = {
      getComputedStyle: (element: { readonly style: Record<string, string> }) => element.style,
    };
    const ownerDocument = { defaultView: view, createRange: () => null };
    const marker = {
      isConnected: true,
      ownerDocument,
      style: { marginInlineEnd: '6px' },
      getClientRects: () => [rect(0, 2, 18, 16)],
      getBoundingClientRect: () => rect(0, 2, 18, 16),
    };
    const item = {
      isConnected: true,
      ownerDocument,
      style: { direction: 'ltr', lineHeight: '20px', paddingTop: '0', paddingBottom: '0' },
      getClientRects: () => [rect(0, 0, 200, 40)],
      getBoundingClientRect: () => rect(0, 0, 200, 40),
      querySelector: (selector: string) =>
        selector === ':scope > .tp-te-task-marker' ? marker : null,
    };
    headless.editor.getElementByKey = () => item as unknown as HTMLElement;
    const rects = headless.instance.blockRects('t1');
    expect(rects?.box).toMatchObject({ left: 0, width: 200, height: 40 });
    expect(rects?.content).toMatchObject({ left: 24, right: 200, top: 0 });
    expect(rects?.firstLine).toMatchObject({ left: 24, right: 200 });
  });
});

describe('uwg-te-req-engine-10: pointAt outside text', () => {
  it('a position between blocks or on an atom is outside text: null', () => {
    // The engine resolves the DOM position under the point to an element point on the root,
    // between the first paragraph and the divider.
    const modules: TextEditorLexicalModules = {
      ...realLexicalModules,
      lexical: {
        ...realLexicalModules.lexical,
        $createRangeSelectionFromDom: () =>
          ({ anchor: lexical.$createPoint('root', 1, 'element') }) as never,
      },
    };
    const headless = headlessLexical({
      modules,
      html: '<p data-id="p1">a</p><hr data-id="d1"><p data-id="p2">b</p>',
    });
    const document = new FakeDocument();
    const root = document.createElement('div');
    root.parent = document;
    Object.assign(document, { caretPositionFromPoint: () => ({ offsetNode: root, offset: 1 }) });
    headless.editor.getRootElement = () => root as unknown as HTMLElement;
    expect(headless.instance.pointAt(10, 10)).toBeNull();
  });
});

describe('uwg-te-req-engine-10: pointAt on the lines of text', () => {
  /** The real modules, resolving every DOM position to an offset in the document's first text. */
  const firstText: TextEditorLexicalModules = {
    ...realLexicalModules,
    lexical: {
      ...realLexicalModules.lexical,
      $createRangeSelectionFromDom: (domSelection: LexicalDomPointsLike | null) => {
        const offset = domSelection?.anchorOffset ?? 0;
        const key = lexical.$getRoot().getFirstDescendant()!.getKey();
        const selection = lexical.$createRangeSelection();
        selection.anchor.set(key, offset, 'text');
        selection.focus.set(key, offset, 'text');
        return selection;
      },
    },
  };

  it('a point the engine resolves into a textblock but outside its box, between blocks or in a cell’s padding, is null', () => {
    for (const html of [
      '<p data-id="p1">ab</p><p data-id="p2">cd</p>',
      '<table data-id="t1"><tbody><tr><td><p>ab</p></td><td><p>cd</p></td></tr></tbody></table>',
    ]) {
      const headless = headlessLexical({ modules: firstText, html });
      const root = textUnderPoint('ab', () => 1);
      headless.editor.getRootElement = () => root;
      boxTextblock(headless, rect(0, 0, 100, 20));
      expect(headless.instance.pointAt(14, 10), html).toMatchObject({ offset: 1 });
      // Below the textblock, in the gap before the next block or the cell's bottom padding.
      expect(headless.instance.pointAt(14, 26), html).toBeNull();
      // Beside it.
      expect(headless.instance.pointAt(140, 10), html).toBeNull();
    }
  });
});

describe('uwg-te-req-tables-5: a text point on the first or the last line of its textblock', () => {
  it('an empty cell paragraph is one line, both first and last; an unmeasured one is neither', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p></p></td><td><p>x</p></td></tr></tbody></table>',
    });
    boxTextblock(headless, rect(0, 0, 100, 20));
    const geometry = new LexicalGeometry(headless.rt);
    const point = { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 };
    expect(geometry.onEdgeLine(point, 'first')).toBe(true);
    expect(geometry.onEdgeLine(point, 'last')).toBe(true);
    const other = { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 0 };
    expect(geometry.onEdgeLine(other, 'first')).toBe(false);
  });
});
