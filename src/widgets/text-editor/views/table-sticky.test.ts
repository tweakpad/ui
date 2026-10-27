import { describe, expect, it, vi } from 'vitest';
import {
  headerSticks,
  stickyClip,
  stickyEdge,
  stickyOffset,
  TextEditorTableSticky,
} from './table-sticky.js';

describe('sticky table header', () => {
  it('clips the copy to the part of the wrapper the table covers, never its reserved space', () => {
    // A table narrower than its wrapper, which reserves 28 px for the quick-add Buttons.
    expect(stickyClip({ left: 105, right: 621 }, { left: 105, right: 593 })).toEqual({
      left: 105,
      right: 593,
      width: 488,
    });
    // Right to left: the reserved space lies at the left.
    expect(stickyClip({ left: 89, right: 605 }, { left: 117, right: 605 })).toEqual({
      left: 117,
      right: 605,
      width: 488,
    });
    // A wider table scrolled inside its wrapper: the wrapper's visible width.
    expect(stickyClip({ left: 100, right: 400 }, { left: 20, right: 900 })).toEqual({
      left: 100,
      right: 400,
      width: 300,
    });
    // Scrolled entirely out of the wrapper: nothing to show.
    expect(stickyClip({ left: 100, right: 400 }, { left: 420, right: 900 }).width).toBe(0);
  });

  it('sticks to the viewport top while the viewport scrolls, else under the toolbar or at the page top', () => {
    expect(stickyEdge({ scrolls: true, viewportTop: 120, toolbarBottom: 40 })).toBe(120);
    expect(stickyEdge({ scrolls: false, viewportTop: 120, toolbarBottom: 40 })).toBe(40);
    expect(stickyEdge({ scrolls: false, viewportTop: 120, toolbarBottom: -10 })).toBe(0);
    expect(stickyEdge({ scrolls: false, viewportTop: 120, toolbarBottom: null })).toBe(0);
  });

  it('sticks while the header is above the edge and the last row still extends below it', () => {
    const header = { top: 80, bottom: 110 };
    expect(headerSticks({ edge: 100, header, last: 300 })).toBe(true);
    expect(headerSticks({ edge: 70, header, last: 300 })).toBe(false);
    expect(headerSticks({ edge: 100, header, last: 125 })).toBe(false);
  });

  it('shifts the copy from its inline start: the left edge, or the right edge right to left', () => {
    // A table 977 wide, scrolled 40 within a 516 wide wrapper at x 47.
    const clip = { left: 47, right: 563 };
    expect(stickyOffset({ left: 7, right: 984 }, clip, false)).toBe(-40);
    expect(stickyOffset({ left: -374, right: 603 }, clip, true)).toBe(40);
    expect(stickyOffset({ left: -414, right: 563 }, clip, true, 2)).toBe(0);
  });

  it('wants a pass only when enabled with an element and a ready instance', () => {
    let enabled = false;
    const geometry = { addLayer: vi.fn(() => () => {}), invalidate: vi.fn() };
    const sticky = new TextEditorTableSticky({
      geometry: geometry as never,
      enabled: () => enabled,
      instance: () => ({}) as never,
      viewport: () => null,
      toolbar: () => null,
    });
    expect(geometry.addLayer).toHaveBeenCalledWith(sticky);
    sticky.bind({} as Element);
    expect(sticky.wanted()).toBe(false);
    enabled = true;
    expect(sticky.wanted()).toBe(true);
    sticky.contentChanged();
    expect(geometry.invalidate).toHaveBeenCalledWith('content');
  });

  it('reads only the rows of the table at the edge while scrolling, and nothing without a header table', () => {
    let scroll = 0;
    const reads: string[] = [];
    const box = (name: string, top: number, height: number) => () => {
      reads.push(name);
      const y = top - scroll;
      return { top: y, bottom: y + height, height, left: 100, right: 500, width: 400, x: 100, y };
    };
    // Three tables with a header row, 300 px tall at 100, 600 and 1100 px in the scrolled
    // content, and one without a header row between them.
    const tables = new Map(
      [100, 600, 1100, 1500].map((top, index) => {
        const id = `t${index}`;
        const header = {
          getBoundingClientRect: box(`${id} header`, top, 30),
          cells: [{ getBoundingClientRect: box(`${id} cell`, top, 30) }],
        };
        const last = { getBoundingClientRect: box(`${id} last`, top + 270, 30) };
        const table = {
          rows: [header, {}, last],
          getBoundingClientRect: box(`${id} table`, top, 300),
        };
        return [id, { table, scroller: { getBoundingClientRect: box(`${id} wrapper`, top, 300) } }];
      }),
    );
    let headers = new Set(['t0', 't1', 't2']);
    const blocks = [
      { id: 'p', kind: 'paragraph' },
      ...[...tables.keys()].map((id) => ({ id, kind: 'table' })),
    ];
    const instance = {
      getBlocks: () => ({ ordered: () => blocks }),
      getTable: (id: string) => ({ headerRow: headers.has(id) }),
      tableElements: (id: string) => tables.get(id) ?? null,
    };
    const viewport = {
      scrollHeight: 2000,
      clientHeight: 500,
      get scrollTop() {
        return scroll;
      },
      getBoundingClientRect: () => {
        reads.push('viewport');
        return { top: 0, bottom: 500 };
      },
    };
    vi.stubGlobal('getComputedStyle', () => ({ direction: 'ltr' }));
    const sticky = new TextEditorTableSticky({
      geometry: { addLayer: () => () => {}, invalidate: () => {} } as never,
      enabled: () => true,
      instance: () => instance as never,
      viewport: () => viewport as never,
      toolbar: () => null,
    });
    const pass = (...reasons: string[]) =>
      sticky.measure({
        toOverlay: (rect: DOMRectReadOnly) => ({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }),
        reasons: new Set(reasons),
      } as never);
    // The first pass measures where every header table lies; none sticks at the top.
    expect(pass('resize')).toBeNull();
    expect(reads.filter((read) => read.endsWith('header'))).toEqual([
      't0 header',
      't1 header',
      't2 header',
    ]);
    // Scrolled 650 px: the first table is past, the second's header sticks; only its rows are read.
    scroll = 650;
    reads.length = 0;
    expect(pass('scroll')).toMatchObject({ table: 't1', box: { top: 0, height: 30 }, width: 400 });
    expect(reads).toEqual([
      'viewport',
      't1 header',
      't1 last',
      't1 table',
      't1 wrapper',
      't1 cell',
    ]);
    // Between the second and the third table nothing sticks, and nothing below the edge is read.
    scroll = 960;
    reads.length = 0;
    expect(pass('scroll', 'state')).toBeNull();
    expect(reads).toEqual(['viewport']);
    // An edit measures the tables again.
    sticky.contentChanged();
    reads.length = 0;
    pass('content');
    expect(reads.filter((read) => read.endsWith('header')).length).toBeGreaterThanOrEqual(3);
    // Without a table with a header row a pass reads nothing at all.
    headers = new Set();
    sticky.contentChanged();
    reads.length = 0;
    expect(pass('content')).toBeNull();
    expect(reads).toEqual([]);
    vi.unstubAllGlobals();
  });
});
