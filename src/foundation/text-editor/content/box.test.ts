import { describe, expect, it } from 'vitest';
import { contentBox, cssPixels, type TextEditorBoxStyle } from './box.js';

/** A computed style that holds the given lengths, every other one empty, and records each read. */
function computedStyle(lengths: Partial<Record<keyof TextEditorBoxStyle, string>>) {
  const reads: string[] = [];
  const style = new Proxy({} as TextEditorBoxStyle, {
    get(_target, property) {
      reads.push(String(property));
      return lengths[property as keyof TextEditorBoxStyle] ?? '';
    },
  });
  return { style, reads };
}

const BORDER = Object.freeze({ left: 10, top: 20, right: 210, bottom: 120 });

describe('content box (uwg-te-req-engine-10, uwg-te-req-pres-5)', () => {
  it('uwg-te-req-engine-10: the content box is the border box inset by the border width and the padding of each side', () => {
    const { style, reads } = computedStyle({
      borderTopWidth: '2px',
      borderRightWidth: '3px',
      borderBottomWidth: '0px',
      borderLeftWidth: '1px',
      paddingTop: '4.5px',
      paddingRight: '12px',
      paddingBottom: '6px',
      paddingLeft: '8px',
    });
    expect(contentBox(BORDER, style)).toEqual({ left: 19, top: 26.5, right: 195, bottom: 114 });
    // Only the border widths and the paddings are read.
    expect([...new Set(reads)].sort()).toEqual([
      'borderBottomWidth',
      'borderLeftWidth',
      'borderRightWidth',
      'borderTopWidth',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
      'paddingTop',
    ]);
  });

  it('uwg-te-req-engine-10: without a computed style the border box is the content box', () => {
    expect(contentBox(BORDER, null)).toBe(BORDER);
  });

  it('uwg-te-req-pres-5: a length that does not compute to pixels insets nothing', () => {
    const { style } = computedStyle({ paddingLeft: 'auto', borderTopWidth: 'medium' });
    expect(contentBox(BORDER, style)).toEqual(BORDER);
    expect([cssPixels(undefined), cssPixels(''), cssPixels('normal'), cssPixels('NaN')]).toEqual([
      0, 0, 0, 0,
    ]);
    expect([cssPixels('20px'), cssPixels('2.25px'), cssPixels('-1px')]).toEqual([20, 2.25, -1]);
  });
});
