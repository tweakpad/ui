import { describe, expect, it } from 'vitest';
import { metricsFont, OUTLINE_TEXT_PROPERTIES, outlineTextStyle } from './text-outline.js';

const style = (values: Record<string, string>) => ({
  getPropertyValue: (name: string) => values[name] ?? '',
});

describe('text outline', () => {
  it('copies every property that shapes or places glyphs onto the outline text', () => {
    const css = outlineTextStyle(
      style({
        'font-family': 'Inter, sans-serif',
        'font-size': '24px',
        'font-weight': '600',
        'letter-spacing': '0.5px',
        'font-feature-settings': '"ss01"',
        color: 'red',
      }),
    );
    expect(css).toBe(
      'font-family:Inter, sans-serif;font-size:24px;font-weight:600;font-feature-settings:"ss01";letter-spacing:0.5px',
    );
    expect(css).not.toContain('color');
    expect(OUTLINE_TEXT_PROPERTIES).toContain('text-transform');
  });

  it('builds the canvas font from style, weight, size and family', () => {
    expect(
      metricsFont(
        style({
          'font-style': 'italic',
          'font-weight': '700',
          'font-size': '32px',
          'font-family': 'Georgia',
        }),
      ),
    ).toBe('italic 700 32px Georgia');
    expect(metricsFont(style({ 'font-size': '16px', 'font-family': 'serif' }))).toBe('16px serif');
  });
});
