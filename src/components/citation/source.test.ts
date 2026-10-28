import { describe, expect, it } from 'vitest';
import {
  allowedUrl,
  DEFAULT_LINK_PROTOCOLS,
  linkProtocols,
  parseMarkdown,
  resolveMarkdown,
} from '../../foundation/markdown/index.js';
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

  it('V-830: accepts the links that the shared Markdown link policy allows', () => {
    expect(DEFAULT_LINK_PROTOCOLS).toEqual(['http:', 'https:', 'mailto:', 'tel:']);
    expect(linkProtocols(null)).toBe(DEFAULT_LINK_PROTOCOLS);
    const addresses = [
      '/a',
      'b/c',
      '#note',
      'https://a.example',
      'HTTP://a.example',
      'mailto:x@a.example',
      'tel:+1',
      'javascript:alert(1)',
      'JavaScript:x',
      'vbscript:x',
      'data:text/html,x',
      'file:///etc/hosts',
      'ftp://a.example',
    ];
    for (const href of addresses) {
      const accepted = acceptedAddress(href);
      expect(accepted, href).toBe(allowedUrl(href, linkProtocols(null)));
      expect(accepted, href).toBe(!/^(?:javascript|vbscript|data|file|ftp):/i.test(href));
      // The resolve step keeps the same links in markdown.
      const [paragraph] = resolveMarkdown(parseMarkdown(`[x](${href})`)).root.children as {
        children: { type: string }[];
      }[];
      expect(
        paragraph!.children.some((node) => node.type === 'link'),
        href,
      ).toBe(accepted);
    }
    expect(acceptedAddress('java\nscript:x')).toBe(
      allowedUrl('java\nscript:x', DEFAULT_LINK_PROTOCOLS),
    );
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
