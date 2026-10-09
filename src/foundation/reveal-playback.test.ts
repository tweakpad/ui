import { describe, expect, it } from 'vitest';
import { cssTimeMs, transitionSpan } from './reveal-playback.js';

describe('CSS time parsing', () => {
  it('reads seconds and milliseconds, and 0 for anything else', () => {
    expect(cssTimeMs('0.56s')).toBe(560);
    expect(cssTimeMs(' 560ms ')).toBe(560);
    expect(cssTimeMs('2s')).toBe(2000);
    expect(cssTimeMs('0s')).toBe(0);
    expect(cssTimeMs('auto')).toBe(0);
    expect(cssTimeMs('')).toBe(0);
  });

  it('spans the longest duration plus delay across a transition list', () => {
    expect(
      transitionSpan({
        transitionDuration: '0.2s, 500ms',
        transitionDelay: '100ms',
      } as CSSStyleDeclaration),
    ).toBe(600);
    expect(
      transitionSpan({ transitionDuration: '0s', transitionDelay: '0s' } as CSSStyleDeclaration),
    ).toBe(0);
  });
});
