import { describe, expect, it } from 'vitest';
import { scrollEdgeMask } from '../../../src/presentation/recipes/shared/scroll-edge.js';

describe('content scroll masks', () => {
  it('covers a viewport left of an RTL content border box, without a border-box-sized opaque layer', () => {
    const mask = scrollEdgeMask(
      { left: -100, top: 80, width: 320, height: 160 },
      { left: 24, right: 24, top: 24, bottom: 24 },
      [],
      'none',
    );
    expect(mask.position).toBe('-100px 80px,-100px 80px');
    expect(mask.size).toBe('320px 160px,320px 160px');
    expect(mask.composite).toBe('intersect,add');
    expect(mask.image).not.toContain('linear-gradient(#000,#000)');
  });
  it('adds opaque sticky/focus islands over the edge product and intersects an authored mask', () => {
    const mask = scrollEdgeMask(
      { left: 0, top: 0, width: 100, height: 80 },
      { left: 0, right: 24, top: 0, bottom: 20 },
      [{ left: 0, top: 0, width: 100, height: 20 }],
      'url("authored.svg")',
    );
    expect(mask.size).toBe('100px 20px,100px 80px,100px 80px,auto');
    expect(mask.composite).toBe('add,intersect,intersect,add');
    expect(mask.image).toContain('url("authored.svg")');
  });
  it('covers the whole content along an axis without bands, so scrolling it shows no stale edge', () => {
    const mask = scrollEdgeMask(
      { left: 300, top: 0, width: 400, height: 200 },
      { left: 0, right: 0, top: 0, bottom: 24 },
      [],
      'none',
      { width: 1200, height: 2000 },
    );
    expect(mask.position).toBe('0px 0px,0px 0px');
    expect(mask.size).toBe('1200px 200px,1200px 200px');
    expect(mask.image).toContain('#000 176px,transparent 200px');
  });
  it('extends only the sides without a band', () => {
    const mask = scrollEdgeMask(
      { left: 300, top: 0, width: 400, height: 200 },
      { left: 24, right: 0, top: 0, bottom: 0 },
      [],
      'none',
      { width: 1200, height: 200 },
    );
    expect(mask.position).toBe('300px 0px,300px 0px');
    expect(mask.size).toBe('900px 200px,900px 200px');
    expect(mask.image).toContain('transparent 0px,#000 24px,#000 900px');
  });
  it('keeps the visible rect on axes that fade, with or without the content size', () => {
    const rect = { left: 10, top: 20, width: 100, height: 80 };
    const bands = { left: 8, right: 8, top: 8, bottom: 8 };
    expect(scrollEdgeMask(rect, bands, [], 'none', { width: 500, height: 500 })).toEqual(
      scrollEdgeMask(rect, bands, [], 'none'),
    );
  });
});
