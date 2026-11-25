import { describe, expect, it } from 'vitest';
import { scrollEdgeMask } from '../../../src/presentation/recipes/shared/scroll-edge.js';

const box = { width: 320, height: 200 };
const none = { size: 24, strength: 0 };
const full = { size: 24, strength: 1 };
const bands = (left = none, right = none, top = none, bottom = none) => ({
  left,
  right,
  top,
  bottom,
});
const visible = { left: 0, top: 0, width: 320, height: 200 };
/** The four opaque strips around a 320×200 box, before any island. */
const FRAME_SIZES = '448px 64px,448px 64px,64px 200px,64px 200px';
const FRAME_POSITIONS = '-64px -64px,-64px 200px,-64px 0px,320px 0px';

describe('scroll container masks', () => {
  it('keeps a band at its width and place while only its strength changes', () => {
    const half = scrollEdgeMask(
      box,
      visible,
      bands(none, none, { size: 24, strength: 0.5 }),
      [],
      'none',
    );
    const whole = scrollEdgeMask(box, visible, bands(none, none, full), [], 'none');
    expect(half.image).toContain('to bottom,#000 0px,#000 0px,rgb(0 0 0 / 0.5) 0px');
    expect(whole.image).toContain('to bottom,#000 0px,#000 0px,transparent 0px');
    for (const mask of [half, whole]) expect(mask.image).toContain('#000 24px');
  });
  it('eases each band in and out, so the fade starts without a visible line', () => {
    const mask = scrollEdgeMask(box, visible, bands(none, none, full), [], 'none');
    // Smoothstep: the first step past the edge and the last before full opacity stay close to them.
    expect(mask.image).toContain('transparent 0px,rgb(0 0 0 / 0.043) 3px');
    expect(mask.image).toContain('rgb(0 0 0 / 0.957) 21px,#000 24px');
  });
  it('fades each banded edge of the container over its border box', () => {
    const mask = scrollEdgeMask(box, visible, bands(none, full, none, full), [], 'none');
    expect(mask.size).toBe(`${FRAME_SIZES},320px 200px,320px 200px`);
    expect(mask.position).toBe(`${FRAME_POSITIONS},0px 0px,0px 0px`);
    expect(mask.composite).toBe('add,add,add,add,intersect,add');
    expect(mask.image).toContain('#000 296px,rgb(0 0 0 / 0.957) 299px');
    expect(mask.image).toContain('transparent 320px,#000 320px,#000 320px)');
    expect(mask.image).toContain('#000 176px,rgb(0 0 0 / 0.957) 179px');
    expect(mask.image).toContain('transparent 200px,#000 200px,#000 200px)');
  });
  it('keeps everything outside the border box opaque, so its own focus ring never fades', () => {
    const mask = scrollEdgeMask(box, visible, bands(full, full, full, full), [], 'none');
    const layers = mask.image.split('),').slice(0, 4);
    for (const layer of layers) expect(layer).toBe('linear-gradient(#000,#000');
    expect(mask.size.startsWith(FRAME_SIZES)).toBe(true);
    expect(mask.position.startsWith(FRAME_POSITIONS)).toBe(true);
  });
  it('keeps an inset focus ring of the container opaque', () => {
    const mask = scrollEdgeMask(box, visible, bands(full, full, full, full), [], 'none', 2);
    expect(mask.size.startsWith('448px 66px,448px 66px,66px 200px,66px 200px')).toBe(true);
    expect(mask.position.startsWith('-64px -64px,-64px 198px,-64px 0px,318px 0px')).toBe(true);
  });
  it('leaves an edge without a band opaque', () => {
    const mask = scrollEdgeMask(box, visible, bands(none, none, full, none), [], 'none');
    expect(mask.image).toContain(
      'linear-gradient(to right,#000 0px,#000 0px,#000 320px,#000 320px)',
    );
    expect(mask.image).toContain('to bottom,#000 0px,#000 0px,transparent 0px');
  });
  it('starts the bands inside the chrome and keeps the chrome opaque', () => {
    const mask = scrollEdgeMask(
      box,
      { left: 0, top: 40, width: 320, height: 120 },
      bands(none, none, full, full),
      [],
      'none',
    );
    expect(mask.image).toContain('to bottom,#000 0px,#000 40px,transparent 40px');
    expect(mask.image).toContain('#000 64px,#000 136px');
    expect(mask.image).toContain('transparent 160px,#000 160px,#000 200px)');
  });
  it('adds opaque islands over the edge product and intersects an authored mask', () => {
    const mask = scrollEdgeMask(
      { width: 100, height: 80 },
      { left: 0, top: 0, width: 100, height: 80 },
      bands(none, full, none, { size: 20, strength: 1 }),
      [{ left: 10, top: 60, width: 30, height: 20 }],
      'url("authored.svg")',
    );
    expect(mask.size.endsWith('30px 20px,100px 80px,100px 80px,auto')).toBe(true);
    expect(mask.position.endsWith('10px 60px,0px 0px,0px 0px,0 0')).toBe(true);
    expect(mask.composite).toBe('add,add,add,add,add,intersect,intersect,add');
    expect(mask.image).toContain('url("authored.svg")');
  });
});
