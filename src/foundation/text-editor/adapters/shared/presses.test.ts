/**
 * Tests of the shared press rules of the engine adapters (Widgets `uwg-te-req-engine-4`): the DOM
 * selection inside an editing root, through the shadow roots around it, whether the document's
 * selection states its direction, the press that follows a change the engine did not write into the
 * DOM, and the anchor of a range that a press made.
 */
import { describe, expect, it } from 'vitest';
import type { TextEditorTextPoint } from '../../model.js';
import {
  domSelectionDirected,
  domSelectionIn,
  reversesToPressAnchor,
  TextEditorPressRead,
} from './presses.js';
import {
  fakeContainer,
  fakeSelection,
  FakeDocument,
  type FakeElement,
  type FakeSelection,
} from './test-helpers.test.js';

/** An editing root with one child, connected in a fake document, and a node outside it. */
function lightTree() {
  const container = fakeContainer();
  const document = container.ownerDocument;
  const root = document.createElement('div');
  const inner = document.createElement('span');
  const outside = document.createElement('span');
  container.append(root, outside);
  root.append(inner);
  return { document, root, inner, outside, element: root as unknown as Element };
}

/**
 * An editing root inside a shadow root: the host lies in the document, the document's selection
 * names the host as a retargeted selection does, and its composed ranges reach the root's child.
 * `own` gives the shadow root a selection of its own, as some browsers keep one.
 */
function shadowTree(own: FakeSelection | null = null) {
  const document = new FakeDocument();
  const host = document.createElement('div');
  const inner = document.createElement('p');
  const shadow = {
    nodeType: 11,
    host,
    ...(own ? { getSelection: () => own } : {}),
  };
  const root = {
    ownerDocument: document,
    getRootNode: () => shadow,
    contains: (node: unknown) => node === inner,
  };
  return { document, host, inner, shadow, element: root as unknown as Element };
}

/** A document selection retargeted to a host, whose composed ranges give a range of a node. */
function composed(
  host: FakeElement,
  node: unknown,
  start: number,
  end: number,
  direction: string,
  seen: unknown[][] = [],
): FakeSelection {
  return {
    ...fakeSelection(host, 0, host, 0, direction),
    getComposedRanges: (options) => {
      seen.push([...(options?.shadowRoots ?? [])]);
      return [{ startContainer: node, startOffset: start, endContainer: node, endOffset: end }];
    },
  };
}

describe('uwg-te-req-engine-4: the DOM selection inside an editing root', () => {
  it('reads the anchor and focus of a selection in the root, either way round', () => {
    const { document, inner, element } = lightTree();
    document.selection = fakeSelection(inner, 3);
    expect(domSelectionIn(element)).toEqual({
      anchorNode: inner,
      anchorOffset: 3,
      focusNode: inner,
      focusOffset: 3,
    });
    document.selection = fakeSelection(inner, 4, inner, 1);
    expect(domSelectionIn(element)).toMatchObject({ anchorOffset: 4, focusOffset: 1 });
  });

  it('gives none without a selection, or for a selection that leaves the root', () => {
    const { document, inner, outside, element } = lightTree();
    expect(domSelectionIn(element)).toBeNull();
    document.selection = { ...fakeSelection(inner, 0), rangeCount: 0 };
    expect(domSelectionIn(element)).toBeNull();
    document.selection = fakeSelection(outside, 1);
    expect(domSelectionIn(element)).toBeNull();
    document.selection = fakeSelection(inner, 0, outside, 1);
    expect(domSelectionIn(element)).toBeNull();
  });

  it('in a shadow tree, reads the composed range with the stated direction', () => {
    const { document, host, inner, shadow, element } = shadowTree();
    const seen: unknown[][] = [];
    document.selection = composed(host, inner, 1, 4, 'backward', seen);
    expect(domSelectionIn(element)).toEqual({
      anchorNode: inner,
      anchorOffset: 4,
      focusNode: inner,
      focusOffset: 1,
    });
    expect(seen).toEqual([[shadow]]);
    // A range without a direction runs forward, from its start.
    document.selection = composed(host, inner, 1, 4, 'none');
    expect(domSelectionIn(element)).toMatchObject({ anchorOffset: 1, focusOffset: 4 });
  });

  it('prefers the shadow root’s own selection, unless it names nodes outside the root', () => {
    const own = fakeSelection(null, 0);
    const tree = shadowTree(own);
    Object.assign(own, { anchorNode: tree.inner, anchorOffset: 4, focusNode: tree.inner });
    Object.assign(own, { focusOffset: 1 });
    tree.document.selection = composed(tree.host, tree.inner, 1, 4, 'none');
    expect(domSelectionIn(tree.element)).toMatchObject({ anchorOffset: 4, focusOffset: 1 });
    // A shadow root whose selection is the document's, retargeted to the host.
    const retargeted = shadowTree(fakeSelection(null, 0));
    Object.assign(retargeted.shadow, {
      getSelection: () => retargeted.document.selection,
    });
    retargeted.document.selection = composed(retargeted.host, retargeted.inner, 2, 2, 'none');
    expect(domSelectionIn(retargeted.element)).toMatchObject({ anchorOffset: 2, focusOffset: 2 });
  });

  it('tells whether the document’s selection states its direction', () => {
    const { document, inner, element } = lightTree();
    expect(domSelectionDirected(element)).toBe(false);
    for (const [direction, directed] of [
      ['none', false],
      ['forward', true],
      ['backward', true],
    ] as const) {
      document.selection = fakeSelection(inner, 1, inner, 2, direction);
      expect(domSelectionDirected(element), direction).toBe(directed);
    }
  });
});

describe('uwg-te-req-engine-4: a press after a change the engine did not write into the DOM', () => {
  const same = (a: string, b: string) => a === b;

  it('reads the press that ends with the engine’s selection unchanged, once', () => {
    const read = new TextEditorPressRead<string>();
    read.changed(false);
    read.pressed('start');
    expect(read.released('start', same)).toBe(true);
    read.pressed('start');
    expect(read.released('start', same)).toBe(false);
  });

  it('leaves a press after a change the engine wrote, or with no change at all', () => {
    const read = new TextEditorPressRead<string>();
    read.pressed('start');
    expect(read.released('start', same)).toBe(false);
    read.changed(false);
    read.changed(true);
    read.pressed('start');
    expect(read.released('start', same)).toBe(false);
  });

  it('leaves a press during which the engine changed its selection, and the presses after it', () => {
    const read = new TextEditorPressRead<string>();
    read.changed(false);
    read.pressed('start');
    expect(read.released('cells', same)).toBe(false);
    read.pressed('cells');
    expect(read.released('cells', same)).toBe(false);
  });

  it('leaves a release without a press in the root', () => {
    const read = new TextEditorPressRead<string>();
    read.changed(false);
    expect(read.released('start', same)).toBe(false);
    read.pressed('start');
    expect(read.released('start', same)).toBe(true);
  });
});

describe('uwg-te-req-engine-4: the anchor of a range that a press made', () => {
  const at = (block: string, offset: number): TextEditorTextPoint => ({ block, offset });
  const cell = (block: string, offset: number, row: number): TextEditorTextPoint => ({
    block,
    offset,
    cell: { row, column: 0, paragraph: 0 },
  });

  it('turns a range whose head is the press point backward', () => {
    expect(reversesToPressAnchor({ anchor: at('p1', 0), head: at('h1', 2) }, at('h1', 2))).toBe(
      true,
    );
    expect(
      reversesToPressAnchor({ anchor: cell('t1', 0, 0), head: cell('t1', 2, 1) }, cell('t1', 2, 1)),
    ).toBe(true);
  });

  it('keeps a range whose anchor is the press point, one that misses it, and a caret', () => {
    expect(reversesToPressAnchor({ anchor: at('h1', 2), head: at('p1', 0) }, at('h1', 2))).toBe(
      false,
    );
    expect(reversesToPressAnchor({ anchor: at('p1', 0), head: at('h1', 2) }, at('h1', 1))).toBe(
      false,
    );
    expect(reversesToPressAnchor({ anchor: at('h1', 2), head: at('h1', 2) }, at('h1', 2))).toBe(
      false,
    );
    expect(
      reversesToPressAnchor({ anchor: cell('t1', 0, 0), head: cell('t1', 2, 1) }, cell('t1', 2, 0)),
    ).toBe(false);
  });
});
