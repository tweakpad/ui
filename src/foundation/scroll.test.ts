import { describe, expect, it } from 'vitest';
import { isDocumentScroller, scrollport, visualViewportBox } from './scroll.js';

function layout() {
  const view = { innerWidth: 800, innerHeight: 600, scrollX: 5, scrollY: 40 };
  const document: Record<string, unknown> = { defaultView: view };
  const scroller = (top: number, left: number) =>
    ({
      ownerDocument: document,
      clientWidth: 790,
      clientHeight: 590,
      clientTop: 1,
      clientLeft: 2,
      scrollTop: 40,
      scrollLeft: 5,
      getBoundingClientRect: () => ({ top, left }),
    }) as unknown as HTMLElement;
  const root = scroller(0, 0);
  document.scrollingElement = root;
  return { view, root, panel: scroller(10, 20) };
}

describe('scrollport', () => {
  it('measures the document scrolling element as the window at the viewport origin', () => {
    const { root } = layout();
    expect(isDocumentScroller(root)).toBe(true);
    expect(scrollport(root)).toEqual({
      isDocument: true,
      top: 0,
      left: 0,
      width: 800,
      height: 600,
      scrollTop: 40,
      scrollLeft: 5,
    });
  });

  it('measures any other root as its padding box past the border, where it sits', () => {
    const { panel } = layout();
    expect(isDocumentScroller(panel)).toBe(false);
    expect(scrollport(panel)).toEqual({
      isDocument: false,
      top: 11,
      left: 22,
      width: 790,
      height: 590,
      scrollTop: 40,
      scrollLeft: 5,
    });
  });

  it('reads the visual viewport, falling back to the window size', () => {
    expect(visualViewportBox({ innerWidth: 800, innerHeight: 600 } as Window)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    expect(
      visualViewportBox({
        innerWidth: 800,
        innerHeight: 600,
        visualViewport: { offsetLeft: 10, offsetTop: 20, width: 400, height: 300 },
      } as unknown as Window),
    ).toEqual({ x: 10, y: 20, width: 400, height: 300 });
  });
});
