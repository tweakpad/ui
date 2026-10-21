import { describe, expect, it } from 'vitest';
import { adoptStyleText } from './generated-style.js';

/** A constructed sheet that records the text it was given. */
class FakeSheet {
  text = '';
  replaceSync(text: string): void {
    this.text = text;
  }
}

interface FakeNode {
  parent?: FakeNode[] | undefined;
  remove(): void;
}

/** A document whose comments are counted and whose window constructs recording sheets. */
function fakeDocument() {
  const comments: FakeNode[] = [];
  const sheets: FakeSheet[] = [];
  class Sheet extends FakeSheet {
    constructor() {
      super();
      sheets.push(this);
    }
  }
  const document = {
    nodeType: 9,
    createComment(): FakeNode {
      const comment: FakeNode = {
        remove() {
          const index = comment.parent?.indexOf(comment) ?? -1;
          if (index >= 0) comment.parent!.splice(index, 1);
          comment.parent = undefined;
        },
      };
      comments.push(comment);
      return comment;
    },
    defaultView: { CSSStyleSheet: Sheet },
  } as unknown as Document;
  return { document, comments, sheets };
}

/** A shadow root with adopted sheets and the boundary comments appended to it. */
function fakeRoot(document: Document) {
  const children: FakeNode[] = [];
  const root = {
    nodeType: 11,
    ownerDocument: document,
    adoptedStyleSheets: [] as FakeSheet[],
    append(node: FakeNode) {
      children.push(node);
      node.parent = children;
    },
  };
  return { root: root as unknown as ShadowRoot, children, adopted: () => root.adoptedStyleSheets };
}

const owner = (document: Document) => ({ ownerDocument: document }) as unknown as HTMLElement;

describe('adoptStyleText', () => {
  it('shares one resource between adoptions of one text in one root until the last release', () => {
    const { document, comments, sheets } = fakeDocument();
    const { root, children, adopted } = fakeRoot(document);
    const first = adoptStyleText(owner(document), root, '.a { color: red }');
    const second = adoptStyleText(owner(document), root, '.a { color: red }');
    expect(comments).toHaveLength(1);
    expect(children).toHaveLength(1);
    expect(adopted()).toHaveLength(1);
    expect(adopted()[0]).toBe(sheets[0]);
    expect(sheets.map((sheet) => sheet.text)).toEqual(['.a { color: red }']);

    first();
    expect(children).toHaveLength(1);
    expect(adopted()).toHaveLength(1);

    second();
    expect(children).toHaveLength(0);
    expect(adopted()).toHaveLength(0);

    // The disposed entry is gone: the next adoption creates a new resource.
    const third = adoptStyleText(owner(document), root, '.a { color: red }');
    expect(comments).toHaveLength(2);
    expect(adopted()).toHaveLength(1);
    third();
    expect(adopted()).toHaveLength(0);
  });

  it('gives each root its own resource', () => {
    const { document, comments, sheets } = fakeDocument();
    const a = fakeRoot(document);
    const b = fakeRoot(document);
    const releaseA = adoptStyleText(owner(document), a.root, '.b {}');
    const releaseB = adoptStyleText(owner(document), b.root, '.b {}');
    expect(comments).toHaveLength(2);
    expect([a.children.length, b.children.length]).toEqual([1, 1]);
    expect([a.adopted().length, b.adopted().length]).toEqual([1, 1]);
    // The constructed sheet itself stays shared per document.
    expect(sheets).toHaveLength(1);

    releaseA();
    expect([a.children.length, a.adopted().length]).toEqual([0, 0]);
    expect([b.children.length, b.adopted().length]).toEqual([1, 1]);
    releaseB();
    expect([b.children.length, b.adopted().length]).toEqual([0, 0]);
  });

  it('ignores a release called twice', () => {
    const { document } = fakeDocument();
    const { root, children, adopted } = fakeRoot(document);
    const first = adoptStyleText(owner(document), root, '.c {}');
    const second = adoptStyleText(owner(document), root, '.c {}');
    first();
    first();
    expect(children).toHaveLength(1);
    expect(adopted()).toHaveLength(1);
    second();
    second();
    expect(children).toHaveLength(0);
    expect(adopted()).toHaveLength(0);
  });
});
