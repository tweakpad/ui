import { describe, expect, it } from 'vitest';
import { elementFromPointBelow, leaseDragCursor } from './drag-cursor.js';

/** A document whose body records its children, with top-layer state on created elements. */
function fakeDocument() {
  const children: ReturnType<typeof createElement>[] = [];
  function createElement() {
    const attributes = new Map<string, string>();
    const declarations = new Map<string, [string, string]>();
    const node = {
      isConnected: false,
      open: false,
      declarations,
      attributes,
      style: {
        setProperty: (property: string, value: string, priority = '') =>
          void declarations.set(property, [value, priority]),
      },
      setAttribute: (name: string, value: string) => void attributes.set(name, value),
      hasAttribute: (name: string) => attributes.has(name),
      matches: (selector: string) => selector === ':popover-open' && node.open,
      showPopover: () => void (node.open = true),
      hidePopover: () => void (node.open = false),
      remove: () => {
        node.isConnected = false;
        children.splice(children.indexOf(node), 1);
      },
    };
    return node;
  }
  const below = { name: 'content' };
  const document = {
    nodeType: 9,
    createElement,
    body: {
      append: (node: ReturnType<typeof createElement>) => {
        node.isConnected = true;
        children.push(node);
      },
    },
    elementFromPoint: () => children[0] ?? below,
    elementsFromPoint: () => [...children, below],
  };
  return { document: document as unknown as Document, children, below };
}

describe('the drag cursor (V-587)', () => {
  it('shows the cursor through one transparent top-layer element over the viewport', () => {
    const { document, children } = fakeDocument();
    const release = leaseDragCursor(document, 'grabbing');
    expect(children).toHaveLength(1);
    const layer = children[0]!;
    expect(layer.open).toBe(true);
    expect(layer.attributes.get('popover')).toBe('manual');
    expect(layer.attributes.get('aria-hidden')).toBe('true');
    expect(layer.declarations.get('cursor')).toEqual(['grabbing', 'important']);
    // It covers the viewport, takes the pointer and paints nothing.
    for (const [property, value] of [
      ['position', 'fixed'],
      ['inset', '0'],
      ['pointer-events', 'auto'],
      ['background', 'transparent'],
    ] as const)
      expect(layer.declarations.get(property)).toEqual([value, 'important']);
    release();
    expect(children).toHaveLength(0);
    expect(layer.open).toBe(false);
  });

  it('shows the latest live lease and leaves with the last one', () => {
    const { document, children } = fakeDocument();
    const first = leaseDragCursor(document, 'grabbing');
    const second = leaseDragCursor(document, 'col-resize');
    expect(children).toHaveLength(1);
    expect(children[0]!.declarations.get('cursor')?.[0]).toBe('col-resize');
    second();
    second();
    expect(children[0]!.declarations.get('cursor')?.[0]).toBe('grabbing');
    first();
    expect(children).toHaveLength(0);
  });

  it('hit-tests through the layer while it shows', () => {
    const { document, below } = fakeDocument();
    expect(elementFromPointBelow(document, 1, 1)).toBe(below);
    const release = leaseDragCursor(document, 'grabbing');
    expect(document.elementFromPoint(1, 1)).not.toBe(below);
    expect(elementFromPointBelow(document, 1, 1)).toBe(below);
    release();
    expect(elementFromPointBelow(document, 1, 1)).toBe(below);
  });
});
