import { describe, expect, it } from 'vitest';
import { ContentSecurityService } from './content-security.js';
import { adoptStyleText, SuppressionFallbackStyle } from './generated-style.js';

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

/** An element whose inline style records its declarations, under `parent` in `document`. */
function fakeElement(document: Document, parent: unknown = null) {
  const declarations = new Map<string, string>();
  const style = {
    getPropertyValue: (property: string) => declarations.get(property) ?? '',
    setProperty: (property: string, value: string) => void declarations.set(property, value),
    removeProperty: (property: string) => {
      const value = declarations.get(property) ?? '';
      declarations.delete(property);
      return value;
    },
  };
  const element = { nodeType: 1, ownerDocument: document, parentNode: parent, style };
  return { element: element as unknown as HTMLElement, declarations };
}

describe('SuppressionFallbackStyle', () => {
  const MECHANICS = { 'white-space': 'pre-wrap', 'overflow-wrap': 'break-word' };

  it('writes its declarations only while the owner’s policy suppresses generated styles', () => {
    const { document } = fakeDocument();
    const scope = fakeElement(document);
    const host = fakeElement(document, scope.element);
    const content = fakeElement(document);
    const fallback = new SuppressionFallbackStyle(host.element, content.element, MECHANICS);
    fallback.connect();
    expect(fallback.written).toBe(false);
    expect([...content.declarations]).toEqual([]);

    const policy = new ContentSecurityService(scope.element, { disableStyleElements: true });
    expect(fallback.written).toBe(true);
    expect(Object.fromEntries(content.declarations)).toEqual(MECHANICS);

    policy.update({ nonce: 'n' });
    expect([...content.declarations]).toEqual([]);
    policy.update({ disableStyleElements: true });
    expect(Object.fromEntries(content.declarations)).toEqual(MECHANICS);
    policy.dispose();
    expect([...content.declarations]).toEqual([]);
    fallback.dispose();
  });

  it('keeps what it wrote while disconnected, follows the policy again on connect and removes only its own values on dispose', () => {
    const { document } = fakeDocument();
    const host = fakeElement(document);
    const content = fakeElement(document);
    const policy = new ContentSecurityService(document, { disableStyleElements: true });
    const fallback = new SuppressionFallbackStyle(host.element, content.element, MECHANICS);
    fallback.connect();
    expect(Object.fromEntries(content.declarations)).toEqual(MECHANICS);

    fallback.disconnect();
    policy.update({});
    expect(Object.fromEntries(content.declarations)).toEqual(MECHANICS);
    fallback.connect();
    expect([...content.declarations]).toEqual([]);

    policy.update({ disableStyleElements: true });
    content.declarations.set('white-space', 'normal');
    fallback.dispose();
    expect(Object.fromEntries(content.declarations)).toEqual({ 'white-space': 'normal' });
    policy.update({ disableStyleElements: true });
    fallback.connect();
    expect(Object.fromEntries(content.declarations)).toEqual({ 'white-space': 'normal' });
    policy.dispose();
  });
});
