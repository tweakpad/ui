import { describe, expect, it } from 'vitest';
import {
  isDocumentScroller,
  scrollport,
  visualViewportBox,
  wheelScrollContainer,
} from './scroll.js';

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

describe('wheelScrollContainer', () => {
  interface Box {
    overflowX?: string;
    overflowY?: string;
    overscrollBehaviorX?: string;
    overscrollBehaviorY?: string;
    direction?: string;
    scrollWidth?: number;
    scrollHeight?: number;
    scrollLeft?: number;
    scrollTop?: number;
  }
  const styles = new Map<object, Box>();
  const document = {
    defaultView: { getComputedStyle: (element: object) => ({ ...base, ...styles.get(element) }) },
  };
  const base = {
    overflowX: 'visible',
    overflowY: 'visible',
    overscrollBehaviorX: 'auto',
    overscrollBehaviorY: 'auto',
    direction: 'ltr',
  };
  const box = (init: Box = {}) => {
    const element = {
      nodeType: 1,
      ownerDocument: document,
      clientWidth: 100,
      clientHeight: 100,
      scrollWidth: init.scrollWidth ?? 100,
      scrollHeight: init.scrollHeight ?? 100,
      scrollLeft: init.scrollLeft ?? 0,
      scrollTop: init.scrollTop ?? 0,
    };
    styles.set(element, init);
    return element as unknown as Element;
  };
  const wheel = (path: unknown[], init: Partial<WheelEvent>) =>
    ({
      deltaX: 0,
      deltaY: 0,
      shiftKey: false,
      composedPath: () => path,
      ...init,
    }) as unknown as WheelEvent;

  it('finds the nearest container that can still scroll in the wheel direction', () => {
    const boundary = box({ overflowY: 'auto', scrollHeight: 400, scrollTop: 50 });
    const list = box({ overflowY: 'auto', scrollHeight: 300, scrollTop: 0 });
    const text = { nodeType: 3 };
    const label = box();
    const path = [text, label, list, boundary, box({ overflowY: 'auto', scrollHeight: 900 })];
    expect(wheelScrollContainer(wheel(path, { deltaY: 10 }), boundary)).toBe(list);
    // At its start, an upward wheel finds nothing below the boundary: the boundary itself and
    // anything past it never count.
    expect(wheelScrollContainer(wheel(path, { deltaY: -10 }), boundary)).toBeNull();
    // Clipped or unscrollable overflow never takes the wheel.
    const clipped = box({ overflowY: 'hidden', scrollHeight: 300 });
    const short = box({ overflowY: 'scroll' });
    expect(wheelScrollContainer(wheel([clipped, short, boundary], { deltaY: 10 }), boundary)).toBe(
      null,
    );
  });

  it('stops at the end of the range, maps Shift to the inline axis and honours RTL', () => {
    const boundary = box();
    const end = box({ overflowY: 'auto', scrollHeight: 300, scrollTop: 199.5 });
    expect(wheelScrollContainer(wheel([end, boundary], { deltaY: 10 }), boundary)).toBeNull();
    expect(wheelScrollContainer(wheel([end, boundary], { deltaY: -10 }), boundary)).toBe(end);

    const row = box({ overflowX: 'auto', scrollWidth: 300 });
    expect(wheelScrollContainer(wheel([row, boundary], { deltaY: 10 }), boundary)).toBeNull();
    expect(
      wheelScrollContainer(wheel([row, boundary], { deltaY: 10, shiftKey: true }), boundary),
    ).toBe(row);
    expect(wheelScrollContainer(wheel([row, boundary], { deltaX: -10 }), boundary)).toBeNull();

    // Right to left: the start is 0 and the end -range.
    const rtl = box({ overflowX: 'auto', scrollWidth: 300, direction: 'rtl' });
    expect(wheelScrollContainer(wheel([rtl, boundary], { deltaX: 10 }), boundary)).toBeNull();
    expect(wheelScrollContainer(wheel([rtl, boundary], { deltaX: -10 }), boundary)).toBe(rtl);
  });

  it('lets a container that contains overscroll keep every wheel on its axis', () => {
    const boundary = box();
    const contained = box({
      overflowY: 'auto',
      overscrollBehaviorY: 'contain',
      scrollHeight: 300,
      scrollTop: 200,
    });
    expect(wheelScrollContainer(wheel([contained, boundary], { deltaY: 10 }), boundary)).toBe(
      contained,
    );
  });
});
