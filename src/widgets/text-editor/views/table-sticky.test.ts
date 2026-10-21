import { describe, expect, it, vi } from 'vitest';
import { headerSticks, stickyEdge, TextEditorTableSticky } from './table-sticky.js';

describe('sticky table header', () => {
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
});
