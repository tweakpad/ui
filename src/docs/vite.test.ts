import { describe, expect, it } from 'vitest';
import { literalCode } from './vite.js';

const page = (newline: string) =>
  [
    '---',
    'title: Badge',
    'tag: tp-badge',
    '---',
    '',
    '<Preview',
    '  title="Badge"',
    '  code={`<tp-badge>',
    '  New',
    '</tp-badge>`}',
    '/>',
    '',
  ].join(newline);

describe('literal code plugin', () => {
  it('rewrites template literals to one-line strings and keeps the frontmatter by default', () => {
    const result = literalCode().transform(page('\n'), '/docs/components/badge.mdx');
    expect(result?.code).toContain('code={"<tp-badge>\\n  New\\n</tp-badge>"}');
    expect(result?.code.startsWith('---\ntitle: Badge')).toBe(true);
  });

  it('strips the frontmatter on request, with either line ending', () => {
    for (const newline of ['\n', '\r\n']) {
      const result = literalCode({ frontmatter: 'strip' }).transform(
        page(newline),
        '/docs/components/badge.mdx',
      );
      expect(result?.code, JSON.stringify(newline)).not.toContain('title: Badge');
      expect(result?.code.trimStart().startsWith('<Preview')).toBe(true);
    }
  });

  it('leaves a page read as text and other files alone', () => {
    const plugin = literalCode({ frontmatter: 'strip' });
    expect(plugin.transform(page('\n'), '/docs/components/badge.mdx?raw')).toBeUndefined();
    expect(plugin.transform('const a = 1;', '/src/a.ts')).toBeUndefined();
  });
});
