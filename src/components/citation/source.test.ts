import { describe, expect, it } from 'vitest';
import { acceptedAddress, addressHost } from './source.js';

describe('citation addresses (CL Citation q1, q2)', () => {
  it('accepts relative, fragment and web, mail and phone addresses only', () => {
    for (const href of [
      '/a',
      'b/c',
      '#note',
      'https://a.example',
      'http://a.example',
      'mailto:x@a.example',
      'tel:+1',
    ])
      expect(acceptedAddress(href), href).toBe(true);
    for (const href of [
      null,
      undefined,
      '',
      '  ',
      'javascript:alert(1)',
      'java\nscript:x',
      'data:text/html,x',
      'ftp://a.example',
    ])
      expect(acceptedAddress(href), String(href)).toBe(false);
  });

  it('names the host of absolute web addresses only', () => {
    const base = 'https://docs.example/page';
    expect(addressHost('https://www.tides.example/turbines', base)).toBe('tides.example');
    expect(addressHost('//grid.example/storage', base)).toBe('grid.example');
    expect(addressHost('#note', base)).toBe('');
    expect(addressHost('/relative', base)).toBe('');
    expect(addressHost('mailto:x@a.example', base)).toBe('');
    expect(addressHost('javascript:alert(1)', base)).toBe('');
  });
});
