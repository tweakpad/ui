import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './block.js';
import { decodeEntities } from './entities.js';
import { completeMarkdown } from './repair.js';
import {
  DEFAULT_MARKDOWN_ELEMENTS,
  IMAGE_URL_ATTRIBUTES,
  isAlwaysRemovedAttribute,
  LINK_URL_ATTRIBUTES,
  mergeElementPolicy,
  resolveMarkdown,
} from './resolve.js';
import { serializeMarkdown } from './serialize.js';
import { Slugger } from './slug.js';
import {
  allowedUrl,
  DEFAULT_IMAGE_PROTOCOLS,
  DEFAULT_LINK_PROTOCOLS,
  imageProtocols,
  linkProtocols,
} from './url.js';
import type {
  MarkdownContent,
  MarkdownElement,
  MarkdownNode,
  MarkdownRoot,
  MarkdownUrlPolicy,
} from './types.js';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** CommonMark-style HTML for asserting tree shape against spec examples. */
function serialize(node: MarkdownNode, tight = false): string {
  const children = (nodes: readonly MarkdownNode[], childTight = false) =>
    nodes.map((child) => serialize(child, childTight)).join('');
  const blocks = (nodes: readonly MarkdownNode[], childTight = false) =>
    nodes.map((child) => serialize(child, childTight)).join('\n');
  switch (node.type) {
    case 'root':
      return blocks(node.children);
    case 'paragraph':
      return tight ? children(node.children) : `<p>${children(node.children)}</p>`;
    case 'heading':
      return `<h${node.depth}>${children(node.children)}</h${node.depth}>`;
    case 'thematicBreak':
      return '<hr />';
    case 'blockquote':
      return `<blockquote>\n${blocks(node.children)}\n</blockquote>`.replace('>\n\n<', '>\n<');
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const start = node.ordered && node.start !== 1 ? ` start="${node.start}"` : '';
      return `<${tag}${start}>\n${node.children.map((item) => serialize(item, !node.spread)).join('\n')}\n</${tag}>`;
    }
    case 'listItem': {
      const task = node.checked === null ? '' : `[${node.checked ? 'x' : ' '}] `;
      const inner = node.children.map((child) => serialize(child, tight));
      if (!inner.length) return '<li></li>';
      const first = node.children[0]?.type === 'paragraph' && tight;
      const body = tight
        ? inner.reduce((text, part, index) => {
            const previousInline = index > 0 && node.children[index - 1]!.type === 'paragraph';
            const currentInline = node.children[index]!.type === 'paragraph';
            return text + (index === 0 ? '' : previousInline && currentInline ? '\n' : '\n') + part;
          }, '')
        : `\n${inner.join('\n')}\n`;
      const lead = first || !tight ? '' : '\n';
      const tail = tight && node.children.at(-1)?.type !== 'paragraph' ? '\n' : '';
      return `<li>${task}${lead}${body}${tail}</li>`;
    }
    case 'code':
      return `<pre><code${node.lang ? ` class="language-${node.lang}"` : ''}>${escape(node.value)}${node.value ? '\n' : ''}</code></pre>`;
    case 'html':
      return node.value;
    case 'table': {
      const [head, ...body] = node.children;
      const cell = (tag: string, index: number, content: string) =>
        `<${tag}${node.align[index] ? ` align="${node.align[index]}"` : ''}>${content}</${tag}>`;
      const row = (tag: string) => (r: (typeof node.children)[number]) =>
        `<tr>${r.children.map((c, index) => cell(tag, index, children(c.children))).join('')}</tr>`;
      return `<table><thead>${row('th')(head!)}</thead>${body.length ? `<tbody>${body.map(row('td')).join('')}</tbody>` : ''}</table>`;
    }
    case 'footnoteDefinition':
      return `<fn ${node.label}>${blocks(node.children)}</fn>`;
    case 'text':
      return escape(node.value);
    case 'emphasis':
      return `<em>${children(node.children)}</em>`;
    case 'strong':
      return `<strong>${children(node.children)}</strong>`;
    case 'delete':
      return `<del>${children(node.children)}</del>`;
    case 'inlineCode':
      return `<code>${escape(node.value)}</code>`;
    case 'break':
      return '<br />\n';
    case 'link':
      return `<a href="${escape(node.url)}"${node.title ? ` title="${escape(node.title)}"` : ''}>${children(node.children)}</a>`;
    case 'image':
      return `<img src="${escape(node.url)}" alt="${escape(node.alt)}"${node.title ? ` title="${escape(node.title)}"` : ''} />`;
    case 'footnoteReference':
      return `[^${node.label}]`;
    case 'element':
      return `<${node.tagName}${Object.entries(node.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')}>${children(node.children as MarkdownContent[])}</${node.tagName}>`;
    default:
      return `{${node.type}}`;
  }
}

const md = (source: string) => serialize(parseMarkdown(source));

/** CommonMark block examples: source and the HTML of its tree. */
const BLOCK_CASES: readonly (readonly [string, string])[] = [
  ['# foo', '<h1>foo</h1>'],
  ['###### foo', '<h6>foo</h6>'],
  ['####### foo', '<p>####### foo</p>'],
  ['#5 bolt', '<p>#5 bolt</p>'],
  ['## foo ##', '<h2>foo</h2>'],
  ['# foo#', '<h1>foo#</h1>'],
  ['Foo *bar*\n=========', '<h1>Foo <em>bar</em></h1>'],
  ['Foo\n---', '<h2>Foo</h2>'],
  ['***\n---\n___', '<hr />\n<hr />\n<hr />'],
  ['+++', '<p>+++</p>'],
  [
    '    a simple\n      indented code block',
    '<pre><code>a simple\n  indented code block\n</code></pre>',
  ],
  ['```\n<\n >\n```', '<pre><code>&lt;\n &gt;\n</code></pre>'],
  [
    '```ruby startline=3\ndef foo(x)\n```',
    '<pre><code class="language-ruby">def foo(x)\n</code></pre>',
  ],
  ['```\naaa', '<pre><code>aaa\n</code></pre>'],
  ['> # Foo\n> bar\n> baz', '<blockquote>\n<h1>Foo</h1>\n<p>bar\nbaz</p>\n</blockquote>'],
  ['> bar\nbaz', '<blockquote>\n<p>bar\nbaz</p>\n</blockquote>'],
  ['- one\n\n two', '<ul>\n<li>one</li>\n</ul>\n<p>two</p>'],
  ['- foo\n- bar\n+ baz', '<ul>\n<li>foo</li>\n<li>bar</li>\n</ul>\n<ul>\n<li>baz</li>\n</ul>'],
  [
    '1. foo\n2. bar\n3) baz',
    '<ol>\n<li>foo</li>\n<li>bar</li>\n</ol>\n<ol start="3">\n<li>baz</li>\n</ol>',
  ],
  [
    'The number of windows in my house is\n14.  The number of doors is 6.',
    '<p>The number of windows in my house is\n14.  The number of doors is 6.</p>',
  ],
  [
    '- a\n- b\n\n- c',
    '<ul>\n<li>\n<p>a</p>\n</li>\n<li>\n<p>b</p>\n</li>\n<li>\n<p>c</p>\n</li>\n</ul>',
  ],
  ['  aaa\n bbb', '<p>aaa\nbbb</p>'],
  ['[foo]: /url "title"\n\n[foo]', '<p><a href="/url" title="title">foo</a></p>'],
  ['[foo]: /url\n===\n[foo]', '<p>===\n<a href="/url">foo</a></p>'],
  ['<div>\n*hello*\n</div>', '<div>\n*hello*\n</div>'],
  ['aaa\n\n\nbbb', '<p>aaa</p>\n<p>bbb</p>'],
];

/** CommonMark inline examples: source and the HTML of its tree. */
const INLINE_CASES: readonly (readonly [string, string])[] = [
  ['*foo bar*', '<p><em>foo bar</em></p>'],
  ['a * foo bar*', '<p>a * foo bar*</p>'],
  ['foo*bar*', '<p>foo<em>bar</em></p>'],
  ['_foo_bar', '<p>_foo_bar</p>'],
  ['**foo bar**', '<p><strong>foo bar</strong></p>'],
  ['*foo**bar**baz*', '<p><em>foo<strong>bar</strong>baz</em></p>'],
  ['***strong emph***', '<p><em><strong>strong emph</strong></em></p>'],
  ['*foo**bar*', '<p><em>foo**bar</em></p>'],
  ['**foo*', '<p>*<em>foo</em></p>'],
  ['*(**foo**)*', '<p><em>(<strong>foo</strong>)</em></p>'],
  ['`foo`', '<p><code>foo</code></p>'],
  ['`` foo ` bar ``', '<p><code>foo ` bar</code></p>'],
  ['` `` `', '<p><code>``</code></p>'],
  ['`foo   bar \nbaz`', '<p><code>foo   bar  baz</code></p>'],
  ['```foo``', '<p>```foo``</p>'],
  ['\\*not emphasized*', '<p>*not emphasized*</p>'],
  ['foo\\\nbar', '<p>foo<br />\nbar</p>'],
  ['foo  \nbar', '<p>foo<br />\nbar</p>'],
  ['&nbsp; &amp; &copy; &AElig;', '<p>  &amp; © Æ</p>'],
  ['&#35; &#1234; &#x22;', '<p># Ӓ &quot;</p>'],
  ['&MadeUpEntity;', '<p>&amp;MadeUpEntity;</p>'],
  ['[link](/uri "title")', '<p><a href="/uri" title="title">link</a></p>'],
  ['[link](</my uri>)', '<p><a href="/my uri">link</a></p>'],
  ['[link](foo(and(bar)))', '<p><a href="foo(and(bar))">link</a></p>'],
  ['[link]()', '<p><a href="">link</a></p>'],
  ['[link [foo [bar]]](/uri)', '<p><a href="/uri">link [foo [bar]]</a></p>'],
  [
    '[link *foo **bar** `#`*](/uri)',
    '<p><a href="/uri">link <em>foo <strong>bar</strong> <code>#</code></em></a></p>',
  ],
  ['[foo [bar](/uri)](/uri)', '<p>[foo <a href="/uri">bar</a>](/uri)</p>'],
  ['*[foo*](/uri)', '<p>*<a href="/uri">foo*</a></p>'],
  ['![foo *bar*](/url "title")', '<p><img src="/url" alt="foo bar" title="title" /></p>'],
  ['<http://foo.bar.baz>', '<p><a href="http://foo.bar.baz">http://foo.bar.baz</a></p>'],
  ['<foo@bar.example.com>', '<p><a href="mailto:foo@bar.example.com">foo@bar.example.com</a></p>'],
  ['<a><bab><c2c>', '<p><a><bab><c2c></p>'],
  ['foo <!-- this is a --\ncomment -->', '<p>foo <!-- this is a --\ncomment --></p>'],
  ['[foo][bar]\n\n[bar]: /url "title"', '<p><a href="/url" title="title">foo</a></p>'],
  ['[Foo][]\n\n[foo]: /url', '<p><a href="/url">Foo</a></p>'],
  ['[bar][foo\\!]\n\n[foo!]: /url', '<p>[bar][foo!]</p>'],
];

describe('Markdown block structure (CommonMark)', () => {
  it.each(BLOCK_CASES)('%j', (source, expected) => expect(md(source)).toBe(expected));

  it('keeps tight and loose lists apart', () => {
    expect(parseMarkdown('- a\n- b').children[0]).toMatchObject({ type: 'list', spread: false });
    expect(parseMarkdown('- a\n\n- b').children[0]).toMatchObject({ type: 'list', spread: true });
  });

  it('records source offsets for top-level blocks', () => {
    const source = '# A\n\npara\ngraph\n\n- x';
    const offsets = parseMarkdown(source).children.map((node) =>
      source.slice(node.position!.start.offset, node.position!.end.offset),
    );
    expect(offsets).toEqual(['# A', 'para\ngraph', '- x']);
  });

  it('normalizes line breaks and replaces NUL', () => {
    expect(md('a\r\nb\rc')).toBe('<p>a\nb\nc</p>');
    expect(md('a\0b')).toBe('<p>a�b</p>');
  });

  it('renders an empty source as no blocks', () => {
    expect(parseMarkdown('').children).toEqual([]);
    expect(parseMarkdown('\n\n  \n').children).toEqual([]);
  });
});

describe('Markdown inline structure (CommonMark)', () => {
  it.each(INLINE_CASES)('%j', (source, expected) => expect(md(source)).toBe(expected));
});

describe('Markdown GitHub Flavored Markdown extensions', () => {
  it('parses tables with alignment', () => {
    expect(md('| foo | bar |\n| :-- | --: |\n| baz | bim |')).toBe(
      '<table><thead><tr><th align="left">foo</th><th align="right">bar</th></tr></thead><tbody><tr><td align="left">baz</td><td align="right">bim</td></tr></tbody></table>',
    );
  });
  it('keeps escaped pipes in cells and pads short rows', () => {
    expect(md('| f\\|oo |\n| ------ |\n| `b\\|az` |')).toBe(
      '<table><thead><tr><th>f|oo</th></tr></thead><tbody><tr><td><code>b|az</code></td></tr></tbody></table>',
    );
    expect(md('| a | b |\n| - | - |\n| c |')).toBe(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td></td></tr></tbody></table>',
    );
  });
  it('requires matching header and delimiter widths, and ends at another block', () => {
    expect(md('| a | b |\n| - |')).toBe('<p>| a | b |\n| - |</p>');
    expect(md('| a |\n| - |\n| b |\n> q')).toBe(
      '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>\n<blockquote>\n<p>q</p>\n</blockquote>',
    );
  });
  it('keeps a paragraph before the header row', () => {
    expect(md('intro\n| a |\n| - |')).toBe(
      '<p>intro</p>\n<table><thead><tr><th>a</th></tr></thead></table>',
    );
  });
  it('parses task list items', () => {
    expect(md('- [ ] foo\n- [x] bar')).toBe('<ul>\n<li>[ ] foo</li>\n<li>[x] bar</li>\n</ul>');
    expect(parseMarkdown('- [x] bar').children[0]).toMatchObject({
      children: [{ checked: true }],
    });
  });
  it('parses strikethrough', () => {
    expect(md('~~Hi~~ Hello, ~there~ world!')).toBe(
      '<p><del>Hi</del> Hello, <del>there</del> world!</p>',
    );
    expect(md('This ~~has a\n\nnew paragraph~~.')).toBe(
      '<p>This ~~has a</p>\n<p>new paragraph~~.</p>',
    );
    expect(md('This will ~~~not~~~ strike.')).toBe('<p>This will ~~~not~~~ strike.</p>');
  });
  it('parses extended autolinks', () => {
    expect(md('Visit www.commonmark.org/help for more.')).toBe(
      '<p>Visit <a href="http://www.commonmark.org/help">www.commonmark.org/help</a> for more.</p>',
    );
    expect(md('Visit www.commonmark.org.')).toBe(
      '<p>Visit <a href="http://www.commonmark.org">www.commonmark.org</a>.</p>',
    );
    expect(md('(www.google.com/search?q=Markup+(business))')).toBe(
      '<p>(<a href="http://www.google.com/search?q=Markup+(business)">www.google.com/search?q=Markup+(business)</a>)</p>',
    );
    expect(md('foo@bar.baz')).toBe('<p><a href="mailto:foo@bar.baz">foo@bar.baz</a></p>');
    expect(md('https://example.com/a_b')).toBe(
      '<p><a href="https://example.com/a_b">https://example.com/a_b</a></p>',
    );
    expect(md('[www.x.com](/u)')).toBe('<p><a href="/u">www.x.com</a></p>');
  });
  it('parses footnote references and definitions', () => {
    const root = parseMarkdown('Note[^1] and [^missing].\n\n[^1]: The *note*.');
    expect(serialize(root)).toBe(
      '<p>Note[^1] and [^missing].</p>\n<fn 1><p>The <em>note</em>.</p></fn>',
    );
    expect((root.children[0] as { children: MarkdownContent[] }).children[1]).toMatchObject({
      type: 'footnoteReference',
      label: '1',
    });
  });
});

/** Documents that mix every construct, for robustness and round trips. */
const ROBUSTNESS_SOURCES = [
  '# Title\n\nSome *emph* and **strong** with `code` and [link](http://a.b "t").',
  '> quote\n> - list\n>   1. nested\n\n```ts\nconst a = 1;\n```',
  '| a | b |\n| - | :-: |\n| `x` | ~~y~~ |\n\n- [x] done\n- [ ] todo',
  'Footnote[^n].\n\n[^n]: Body\n    continued.\n\n<details>\n<summary>S</summary>\n\nHidden\n\n</details>',
  '***bold italic*** _a_ __b__ ![img](x.png) <span>raw</span> &amp; \\* www.x.com',
];

describe('Markdown parser robustness', () => {
  const corpus = ROBUSTNESS_SOURCES.join('\n\n');
  it('never throws on any truncation', () => {
    for (let end = 0; end <= corpus.length; end++)
      expect(() => resolveMarkdown(parseMarkdown(corpus.slice(0, end)))).not.toThrow();
  });
  it('never throws on pathological nesting', () => {
    expect(() => parseMarkdown('*'.repeat(5000) + 'a' + '_'.repeat(5000))).not.toThrow();
    expect(() => parseMarkdown('['.repeat(3000) + 'a' + ']'.repeat(3000))).not.toThrow();
    expect(() => parseMarkdown('> '.repeat(500) + 'a')).not.toThrow();
  });
});

describe('Markdown character references', () => {
  it('decodes HTML 4 names and numeric references only', () => {
    expect(decodeEntities('&hellip; &euro; &diams; &#0; &#x110000; &bogus;')).toBe(
      '… € ♦ � � &bogus;',
    );
  });
});

const resolved = (source: string, options = {}) => resolveMarkdown(parseMarkdown(source), options);
const rendered = (source: string, options = {}) => serialize(resolved(source, options).root);

describe('Markdown resolve step', () => {
  it('admits only allowed elements and attributes from raw HTML', () => {
    expect(rendered('a <kbd title="t" onclick="x()">K</kbd> <b style="x">B</b>')).toBe(
      '<p>a <kbd title="t">K</kbd> <b>B</b></p>',
    );
    expect(rendered('a <span>x</span>')).toBe('<p>a &lt;span&gt;x&lt;/span&gt;</p>');
    expect(
      rendered('<tp-badge variant="secondary">New</tp-badge>', {
        elements: { 'tp-badge': ['variant'] },
      }),
    ).toBe('<p><tp-badge variant="secondary">New</tp-badge></p>');
    expect(rendered('a <b>x</b>', { elements: { b: false } })).toBe(
      '<p>a &lt;b&gt;x&lt;/b&gt;</p>',
    );
  });
  it('wraps blocks between an allowed open and close HTML block', () => {
    expect(rendered('<details>\n<summary>S</summary>\n\n*Hidden*\n\n</details>')).toBe(
      '<details><summary>S</summary><p><em>Hidden</em></p></details>',
    );
    expect(rendered('<tp-alert>\n\nBody\n\n</tp-alert>', { elements: { 'tp-alert': [] } })).toBe(
      '<tp-alert><p>Body</p></tp-alert>',
    );
  });
  it('shows an unclosed allowed tag as text', () => {
    expect(rendered('a <b>bold')).toBe('<p>a &lt;b&gt;bold</p>');
  });
  it('blocks URLs outside the policy and reports them', () => {
    const result = resolved(
      '[x](javascript:alert(1)) ![alt](data:image/png;base64,AA) [ok](/a) [m](mailto:a@b.c)',
    );
    expect(serialize(result.root)).toBe(
      '<p>x alt <a href="/a">ok</a> <a href="mailto:a@b.c">m</a></p>',
    );
    expect(result.diagnostics.map((d) => d.code)).toEqual(['markdown-url', 'markdown-url']);
    expect(rendered('<a href="java\tscript:x">y</a>', { elements: { a: ['href'] } })).toBe(
      '<p><a>y</a></p>',
    );
    expect(rendered('[x](ftp://h/f)', { urls: { links: ['ftp:'] } })).toBe(
      '<p><a href="ftp://h/f">x</a></p>',
    );
  });
  it('turns GitHub alerts into alert nodes', () => {
    const root = resolved('> [!WARNING]\n> Careful *now*.').root;
    expect(root.children[0]).toMatchObject({ type: 'alert', kind: 'warning' });
    expect(serialize(root)).toBe('{alert}');
    expect(resolved('> [!note]').root.children[0]).toMatchObject({
      type: 'alert',
      kind: 'note',
      children: [],
    });
    expect(resolved('> [!NOTE] inline').root.children[0]).toMatchObject({ type: 'blockquote' });
  });
  it('numbers footnotes by first reference and drops unreferenced ones', () => {
    const root = resolved('B[^b] A[^a] B[^b]\n\n[^a]: a\n[^b]: b\n\n[^c]: c').root;
    const footnotes = root.children.at(-1) as {
      type: string;
      children: { label: string; index: number; references: number }[];
    };
    expect(footnotes.type).toBe('footnotes');
    expect(footnotes.children.map((f) => [f.label, f.index, f.references])).toEqual([
      ['b', 1, 2],
      ['a', 2, 1],
    ]);
    const paragraph = root.children[0] as {
      children: { type: string; index?: number; occurrence?: number }[];
    };
    expect(
      paragraph.children
        .filter((n) => n.type === 'footnoteReference')
        .map((n) => [n.index, n.occurrence]),
    ).toEqual([
      [1, 1],
      [2, 1],
      [1, 2],
    ]);
  });
  it('assigns prefixed, de-duplicated heading identifiers', () => {
    const ids = resolved('# Hello, World!\n# Hello World\n## émoji ✨ Ünïcode', {
      idPrefix: 'doc-',
    }).root.children.map((h) => (h as { identifier?: string }).identifier);
    expect(ids).toEqual(['doc-hello-world', 'doc-hello-world-1', 'doc-émoji--ünïcode']);
  });
  it('resolves reference nodes from adapter trees', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'linkReference',
              identifier: 'a',
              label: 'A',
              children: [{ type: 'text', value: 'A' }],
            },
            { type: 'linkReference', identifier: 'z', label: 'Z', children: [] },
          ],
        },
        { type: 'definition', identifier: 'a', url: '/a', title: null },
      ],
    } as unknown as MarkdownRoot;
    expect(serialize(resolveMarkdown(tree).root)).toBe('<p><a href="/a">A</a>[Z]</p>');
  });
});

describe('Markdown streaming completion', () => {
  it.each([
    ['Some **bold', 'Some **bold**'],
    ['Some *it', 'Some *it*'],
    ['a ~~del', 'a ~~del~~'],
    ['use `code', 'use `code`'],
    ['**bold `co', '**bold `co`**'],
    ['see [docs](http://exa', 'see docs'],
    ['see [doc', 'see doc'],
    ['img ![alt](x', 'img '],
    ['trailing **', 'trailing '],
    ['2 * 3', '2 * 3'],
    ['snake_case', 'snake_case'],
    ['done **x** and *y*', 'done **x** and *y*'],
    ['para\n\n**open', 'para\n\n**open**'],
  ])('%j', (source, expected) => expect(completeMarkdown(source)).toBe(expected));

  it('leaves an open code fence alone', () => {
    expect(completeMarkdown('```ts\nconst *a')).toBe('```ts\nconst *a');
  });
  it('only touches the final block', () => {
    expect(completeMarkdown('**a\n\nb')).toBe('**a\n\nb');
  });
});

describe('Markdown utilities', () => {
  it('slugs in document order', () => {
    const slugger = new Slugger();
    expect(['a', 'a', 'a-1', 'a'].map((t) => slugger.slug(t))).toEqual([
      'a',
      'a-1',
      'a-1-1',
      'a-2',
    ]);
  });
  it('checks URL protocols', () => {
    expect(allowedUrl('#x', [])).toBe(true);
    expect(allowedUrl('/a:b', [])).toBe(true);
    expect(allowedUrl('JAVASCRIPT:x', ['http:'])).toBe(false);
    expect(allowedUrl('HTTPS://x', ['https:'])).toBe(true);
  });
});

/** A tree without source positions, for comparing trees across a round trip. */
function withoutPositions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPositions);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'position')
      .map(([key, entry]) => [key, withoutPositions(entry)]),
  );
}

/** Parses `source`, writes the tree and parses the written markdown again. */
function roundTrip(source: string): { tree: unknown; again: unknown; markdown: string } {
  const tree = parseMarkdown(source);
  const markdown = serializeMarkdown(tree);
  return {
    tree: withoutPositions(tree),
    again: withoutPositions(parseMarkdown(markdown)),
    markdown,
  };
}

/** A deterministic random number generator. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** Markdown made of random fragments that need care when they are written back. */
function randomSource(random: () => number): string {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const inline = (depth: number): string => {
    let out = '';
    for (let count = 1 + Math.floor(random() * 6); count > 0; count--) {
      const roll = random();
      if (roll < 0.2)
        out += pick(['a', 'b', 'tide', 'x1', '2', '10', 'é', '中', '😀', 'snake_case']);
      else if (roll < 0.32) out += pick([...'*_~`[]()!<>&#\\|:"\'-+.=^/@{};?$%,']);
      else if (roll < 0.4) out += pick([' ', '  ', '\t', '\u00a0']);
      else if (roll < 0.46)
        out += pick([
          '&#32;',
          '&amp;',
          '&#10;',
          '&nbsp;',
          '&#97;',
          '&#42;',
          '&copy;',
          '&bogus;',
          '&#9;',
          '&lt;',
        ]);
      else if (roll < 0.52)
        out += pick([
          '\\*',
          '\\_',
          '\\[',
          '\\]',
          '\\`',
          '\\\\',
          '\\#',
          '\\<',
          '\\&',
          '\\!',
          '\\|',
          '\\~',
        ]);
      else if (depth > 2) out += pick(['a', 'b']);
      else if (roll < 0.62) {
        const delimiter = pick(['*', '_', '**', '__', '~~', '~', '***']);
        out += `${delimiter}${inline(depth + 1)}${delimiter}`;
      } else if (roll < 0.67) {
        const fence = pick(['`', '``', '```']);
        out += `${fence}${pick(['x', ' a ', '`', 'a`b', ' ', '*a*', '|'])}${fence}`;
      } else if (roll < 0.74) {
        const title = random() < 0.3 ? ` "${pick(['t', 'a"b', 'x\\y', ''])}"` : '';
        const url = pick([
          '/u',
          'https://example.com/a_b',
          'a b',
          'x(y)',
          'x)y',
          '',
          '#f',
          'a\\)b',
          'a&amp;b',
        ]);
        out += `${random() < 0.2 ? '!' : ''}[${inline(depth + 1)}](${url}${title})`;
      } else if (roll < 0.78)
        out += pick(['<http://x.y>', '<a@b.c>', 'www.x.com', 'http://x.y/z', '<mailto:a@b.c>']);
      else if (roll < 0.82) out += pick(['[^1]', '[^a]', '[^ A ]', '[^nope]', '[^1](x)']);
      else if (roll < 0.87)
        out += pick(['<b>', '</b>', '<span a="1">', '<!-- c -->', '<kbd>', '<?p?>']);
      else if (roll < 0.93) out += pick(['\\\n', '  \n', '\n', '\n ', ' \n', '\n\t']);
      else out += pick(['[', ']', '[x]', '[x]:', '![', '](', ')', '[a][b]', '[]']);
    }
    return out;
  };
  const line = (): string => inline(1).replace(/\n+$/, '');
  const block = (depth: number): string => {
    const roll = random();
    if (roll < 0.3 || depth > 3) return inline(0).replace(/\n+$/, '');
    if (roll < 0.38)
      return `${'#'.repeat(1 + Math.floor(random() * 7))}${pick([' ', '', '  '])}${line()}${pick(['', ' #', '#'])}`;
    if (roll < 0.42) return `${line()}\n${pick(['===', '---', '-'])}`;
    if (roll < 0.5)
      return document(depth + 1)
        .split('\n')
        .map((text) => `> ${text}`)
        .join('\n');
    if (roll < 0.62) {
      const marker = random() < 0.4 ? pick(['1.', '2.', '1)', '10.']) : pick(['-', '*', '+']);
      const pad = ' '.repeat(marker.length + 1);
      return Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
        const task = random() < 0.25 ? pick(['[ ] ', '[x] ', '[ ]', '[x]']) : '';
        const body =
          random() < 0.25
            ? document(depth + 1)
            : random() < 0.3
              ? pick([
                  '--',
                  '-',
                  '- -',
                  '***',
                  '1.',
                  '[ ]',
                  '#',
                  '>',
                  '|',
                  '==',
                  '<div>',
                  '[^1]:',
                  '\u00a0<b>',
                  '',
                ])
              : line();
        return `${marker} ${task}${body
          .split('\n')
          .map((text, index) => (index && text ? pad + text : text))
          .join('\n')}`;
      }).join(random() < 0.3 ? '\n\n' : '\n');
    }
    if (roll < 0.68) {
      const fence = pick(['```', '~~~', '````']);
      return `${fence}${pick(['', 'js', 'js title="a"', ' x', 'a`b'])}\n${pick(['code', '```', 'a\n\nb', '  x', ''])}\n${fence}`;
    }
    if (roll < 0.72)
      return pick([
        '    code',
        '<div>\n*x*\n</div>',
        '<!-- c -->',
        '<details>\n<summary>S</summary>\n\nx\n\n</details>',
        '<pre>\na\n\nb\n</pre>',
      ]);
    if (roll < 0.76) return pick(['***', '---', '___', '* * *']);
    if (roll < 0.88) {
      const width = 1 + Math.floor(random() * 3);
      const row = (): string =>
        `| ${Array.from({ length: width }, () => line().replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ')} |`;
      const delimiter = `| ${Array.from({ length: width }, () => pick(['---', ':--', '--:', ':-:'])).join(' | ')} |`;
      return [row(), delimiter, ...Array.from({ length: Math.floor(random() * 3) }, row)].join(
        '\n',
      );
    }
    return `[^${pick(['1', 'a', 'x-y'])}]: ${line()}${random() < 0.3 ? `\n\n    ${line()}` : ''}`;
  };
  const document = (depth: number): string =>
    Array.from({ length: 1 + Math.floor(random() * 4) }, () => block(depth)).join(
      pick(['\n\n', '\n']),
    );
  return document(0);
}

/** CommonMark and GitHub Flavored Markdown samples, with the shapes that need care. */
const SAMPLES = [
  '# Heading one\n\nSetext two\n---\n\nSetext\none\n===',
  'Line one\\\nline two  \nline three',
  '- tight\n- list\n  - nested\n    1. ordered\n    2. ordered',
  '1. loose\n\n2. list with\n\n   a second paragraph',
  '3) starts at three\n4) four\n\n0. zero',
  '- a\n+ b\n* c\n\n1. one\n1) two',
  '- [x] done\n- [ ] open\n- [ ] \n- [X] upper\n- \\[ ] not a task',
  '* --\n-\n  --\n- - -',
  '> Quote with **strong**\n>\n> second paragraph\n> - and a list',
  '> [!NOTE]\n> The resolver reads this marker.',
  '```ts title="tide.ts" {2}\nexport const tide = `high`;\n```',
  '````md\n```js\nnested fence\n```\n````',
  '~~~\ncode with ``` inside\n~~~\n\n```a`b\nbacktick in the info string\n```',
  '    indented code\n    block',
  '<div>\n*not emphasis*\n</div>\n\nafter\n\n<!-- comment -->',
  '***\n\n---\n\n___',
  '| left | center | right | none |\n| :--- | :----: | ----: | ---- |\n| `a\\|b` | **b** | [c](/c) | d |',
  'intro\n| a |\n| - |\n| b |\n\n- item\n  | x |\n  | - |\n  - after',
  'Two notes[^1] and[^note].\n\n[^1]: First.\n\n[^note]: Second, with\n\n    a continued paragraph.',
  '2. [^a]: first\n\n\t)\n\n[^a]: x',
  '*em* _em_ **strong** __strong__ ***both*** ~~del~~ ~del~ ~~a ~b~ c~~',
  'intra*word*emphasis, snake_case_words, 2*3*4 and a * b',
  '**bold *nested* bold** and *em **nested** em* and ****é*__ï__**',
  'a***x***b, a***x**y*, *a*_b_ and _a_*b*',
  '`code` `` co`de `` ` ` `` ` `` and `a\\`',
  '[link](/url "title") [empty]() [angle](</a b>) [parens](a(b)c) ![image](/i.png "t")',
  '<https://example.com> <user@example.com> www.example.com https://example.com/path?q=1.',
  '[<https://a.example>](/b) and \\![not an image](/c)',
  'Escapes: \\* \\_ \\` \\[ \\] \\# \\< \\& \\\\ \\| \\! [[]((\\))',
  'Entities: &amp; &copy; &#35; &#x22; &nbsp; &bogus; AT&T',
  'Raw <span title="t">inline</span> html, <!-- comments --> and <?p?>.',
  'Hard\\\nbreak, soft\nbreak and\\\n\\\ntwo breaks',
  '\\# not a heading\n\n1\\. not a list\n\n\\- not a bullet\n\n\\> not a quote\n\n[^]:',
  '&#32;leading, trailing&#32;\n\na&#32;&#32;\nb\n\na&#10;&#10;b\n\n*&#32;spaced&#32;* &#97;*"q"*',
  '\u00a0\n\n\u00a0<b>\n\n- \u00a0<div>',
  'a\n\\~\\~\\~x\n\\~\\~\\~ and \\*\\*\\*\nb\\*\\* c**d**',
];

const paragraphOf = (children: unknown[]): MarkdownRoot =>
  ({ type: 'root', children: [{ type: 'paragraph', children }] }) as MarkdownRoot;
const text = (value: string) => ({ type: 'text', value });

/** Text and how it is written: only characters that would be read as syntax are escaped. */
const ESCAPES: readonly (readonly [string, string])[] = [
  ['a * b', 'a * b'],
  ['2*3', '2*3'],
  ['2*3*4', '2\\*3\\*4'],
  ['snake_case_name', 'snake_case_name'],
  ['_a_', '\\_a\\_'],
  ['~~a~~', '\\~\\~a\\~\\~'],
  ['# not a heading', '\\# not a heading'],
  ['#hashtag', '#hashtag'],
  ['1. not a list', '1\\. not a list'],
  ['2024. A year', '2024\\. A year'],
  ['- not a list', '\\- not a list'],
  ['> not a quote', '\\> not a quote'],
  ['a\n---', 'a\n\\---'],
  ['a\n2. b', 'a\n2. b'],
  ['a | b', 'a | b'],
  ['use `code` here', 'use \\`code` here'],
  ['a ` b', 'a ` b'],
  ['[a]', '[a]'],
  ['[a](b)', '[a\\](b)'],
  ['<b>x</b>', '\\<b>x\\</b>'],
  ['a < b > c', 'a < b > c'],
  ['AT&T', 'AT&T'],
  ['&amp;', '\\&amp;'],
  ['a\\b', 'a\\b'],
  ['a\\*', 'a\\\\*'],
  ['*', '\\*'],
  ['**', '**'],
  ['---', '\\---'],
  ['see (1)', 'see (1)'],
  ['50% off: yes!', '50% off: yes!'],
  [' leading', '&#32;leading'],
  ['trailing ', 'trailing&#32;'],
  ['two  \nspaces', 'two  &#32;\nspaces'],
];

describe('serializeMarkdown (uwg-te-md-req-serializer)', () => {
  it('V-152: parsing the output reproduces every parsed tree without positions', () => {
    const sources = [
      ...BLOCK_CASES.map(([source]) => source),
      ...INLINE_CASES.map(([source]) => source),
      ...ROBUSTNESS_SOURCES,
      ROBUSTNESS_SOURCES.join('\n\n'),
      ...SAMPLES,
    ];
    for (const source of sources) {
      const { tree, again, markdown } = roundTrip(source);
      expect(again, `${JSON.stringify(source)} written as ${JSON.stringify(markdown)}`).toEqual(
        tree,
      );
    }
  });

  it('V-152: parsing the output reproduces generated trees', () => {
    const random = seeded(152);
    for (let count = 0; count < 600; count++) {
      const source = randomSource(random);
      const { tree, again, markdown } = roundTrip(source);
      expect(again, `${JSON.stringify(source)} written as ${JSON.stringify(markdown)}`).toEqual(
        tree,
      );
    }
  });

  it('V-152: is deterministic and never throws', () => {
    const random = seeded(153);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
    const types = [
      'root',
      'paragraph',
      'heading',
      'thematicBreak',
      'blockquote',
      'list',
      'listItem',
      'code',
      'html',
      'table',
      'tableRow',
      'tableCell',
      'footnoteDefinition',
      'footnotes',
      'alert',
      'element',
      'text',
      'emphasis',
      'strong',
      'delete',
      'inlineCode',
      'break',
      'link',
      'image',
      'footnoteReference',
      'definition',
      'widget',
      '',
    ];
    const values: unknown[] = [
      '',
      'a*b_c',
      'x\n# y\n\n- z',
      '<b>',
      'https://example.com/a b',
      '"q" \\ &amp;',
      0,
      -1,
      1.5,
      7,
      1e12,
      Number.NaN,
      null,
      true,
      ['left', 'sideways', null, 3],
      { href: 'x"&y', 'bad name': 'v', onclick: 'x()', n: 2 },
      'note',
      'WARNING',
      'js`x',
      'B',
      '\u00a0',
      '[^1]',
    ];
    const keys = [
      'value',
      'depth',
      'ordered',
      'start',
      'spread',
      'checked',
      'lang',
      'meta',
      'url',
      'title',
      'alt',
      'label',
      'identifier',
      'tagName',
      'attributes',
      'align',
      'kind',
    ];
    const tree = (depth: number): unknown => {
      if (depth > 6 || random() < 0.08) return pick([null, 7, 'text', undefined, true, [], {}]);
      const node: Record<string, unknown> = { type: pick(types) };
      for (const key of keys) if (random() < 0.25) node[key] = pick(values);
      node.children =
        random() < 0.85
          ? Array.from({ length: Math.floor(random() * 4) }, () => tree(depth + 1))
          : pick(['x', 5, null, {}]);
      return node;
    };
    for (let count = 0; count < 600; count++) {
      const value = tree(0) as MarkdownRoot;
      const markdown = serializeMarkdown(value);
      expect(typeof markdown).toBe('string');
      expect(serializeMarkdown(value)).toBe(markdown);
      expect(() => parseMarkdown(markdown)).not.toThrow();
    }
    // Values that are not trees still give text.
    const cycle: { type: string; children: unknown[] } = { type: 'paragraph', children: [] };
    cycle.children.push({ type: 'text', value: 'loop' }, cycle);
    const unreadable = {
      type: 'root',
      get children(): unknown[] {
        throw new Error('unreadable');
      },
    };
    const trap = new Proxy(
      {},
      {
        get() {
          throw new Error('trap');
        },
      },
    );
    let deep: unknown = { type: 'text', value: 'deep' };
    for (let level = 0; level < 20000; level++) deep = { type: 'emphasis', children: [deep] };
    for (const value of [cycle, unreadable, trap, null, undefined, 42, 'root'])
      expect(() => serializeMarkdown(value as MarkdownRoot)).not.toThrow();
    expect(serializeMarkdown(cycle as MarkdownRoot)).toBe('loop\n');
    expect(serializeMarkdown({ type: 'root', children: [deep] } as MarkdownRoot)).toBe('deep\n');
  });

  it('V-152: writes an html node as its value and an unknown node as its children or value', () => {
    const blocks = (children: unknown[]) => ({ type: 'root', children }) as MarkdownRoot;
    expect(serializeMarkdown(blocks([{ type: 'html', value: '<div>\n*kept*\n</div>' }]))).toBe(
      '<div>\n*kept*\n</div>\n',
    );
    expect(
      serializeMarkdown(
        paragraphOf([text('a '), { type: 'html', value: '<b class="x">' }, text('b')]),
      ),
    ).toBe('a <b class="x">b\n');
    expect(serializeMarkdown(blocks([{ type: 'widget', children: [text('inside')] }]))).toBe(
      'inside\n',
    );
    expect(serializeMarkdown(blocks([{ type: 'widget', value: 'two *stars* here' }]))).toBe(
      'two \\*stars\\* here\n',
    );
    expect(serializeMarkdown(paragraphOf([text('@'), { type: 'mention', value: 'river' }]))).toBe(
      '@river\n',
    );
    expect(
      serializeMarkdown(
        paragraphOf([{ type: 'chip', children: [{ type: 'strong', children: [text('bold')] }] }]),
      ),
    ).toBe('**bold**\n');
  });

  it('V-152: keeps a table intact when a cell holds a line break, a pipe or a line ending', () => {
    const row = (...cells: unknown[][]) => ({
      type: 'tableRow',
      children: cells.map((children) => ({ type: 'tableCell', children })),
    });
    const table = {
      type: 'root',
      children: [
        {
          type: 'table',
          align: ['left', null],
          children: [
            row([text('Gauge')], [text('Reading')]),
            row([text('a|b')], [text('one'), { type: 'break' }, text('two')]),
            row([text('x\ny')], [{ type: 'inlineCode', value: 'c|d' }]),
          ],
        },
      ],
    } as MarkdownRoot;
    const markdown = serializeMarkdown(table);
    expect(markdown).toBe(
      '| Gauge | Reading |\n| :-- | --- |\n| a\\|b | one<br>two |\n| x&#10;y | `c\\|d` |\n',
    );
    const [again] = parseMarkdown(markdown).children;
    expect(again).toMatchObject({ type: 'table', align: ['left', null] });
    const cells = (again as { children: { children: { children: unknown[] }[] }[] }).children.map(
      (tableRow) => tableRow.children.map((cell) => withoutPositions(cell.children)),
    );
    expect(cells).toEqual([
      [[text('Gauge')], [text('Reading')]],
      [[text('a|b')], [text('one'), { type: 'html', value: '<br>' }, text('two')]],
      [[text('x\ny')], [{ type: 'inlineCode', value: 'c|d' }]],
    ]);
  });

  it('V-152: escapes only characters that would be read as syntax at their position', () => {
    for (const [value, written] of ESCAPES) {
      expect(serializeMarkdown(paragraphOf([text(value)])), JSON.stringify(value)).toBe(
        `${written}\n`,
      );
      expect(withoutPositions(parseMarkdown(written)), JSON.stringify(written)).toEqual(
        withoutPositions(paragraphOf([text(value)])),
      );
    }
  });

  it('writes each construct in one usual form', () => {
    const source = [
      'Title\n=====',
      '* one\n* two',
      '1) first\n2) second',
      '+ [x] done',
      '<https://example.com> and [www.example.com](http://www.example.com)',
      '~~~js\nconst fence = "```";\n~~~',
      '| a |\n|:-:|\n| b |',
      '___',
    ].join('\n\n');
    expect(serializeMarkdown(parseMarkdown(source))).toBe(
      [
        '# Title',
        '- one\n- two',
        '1. first\n2. second',
        '- [x] done',
        '<https://example.com> and [www.example.com](http://www.example.com)',
        '```js\nconst fence = "```";\n```',
        '| a |\n| :-: |\n| b |',
        '***\n',
      ].join('\n\n'),
    );
  });

  it('writes alerts as GitHub alerts', () => {
    const quote = resolveMarkdown(
      parseMarkdown('> [!WARNING]\n> Check the *gauge* first.\n>\n> - then the valve'),
    ).root;
    const markdown = serializeMarkdown(quote);
    expect(markdown).toBe('> [!WARNING]\n> Check the *gauge* first.\n>\n> - then the valve\n');
    expect(withoutPositions(resolveMarkdown(parseMarkdown(markdown)).root)).toEqual(
      withoutPositions(quote),
    );
    // Another first block follows a blank quote line.
    const code = resolveMarkdown(parseMarkdown('> [!TIP]\n> ```sh\n> make\n> ```')).root;
    expect(serializeMarkdown(code)).toBe('> [!TIP]\n>\n> ```sh\n> make\n> ```\n');
    expect(withoutPositions(resolveMarkdown(parseMarkdown(serializeMarkdown(code))).root)).toEqual(
      withoutPositions(code),
    );
  });

  it('writes admitted elements as raw HTML and the footnotes section as its definitions', () => {
    const elements = { 'tp-badge': ['variant'], span: ['data-color'] };
    const source = [
      'Status <tp-badge variant="a&amp;b &quot;c&quot;">New</tp-badge> and <span data-color="blue" onclick="x()">tide</span>.[^tide]',
      '<details>\n<summary>More</summary>\n\nHidden *content*.\n\n</details>',
      '[^tide]: Measured at *noon*.',
    ].join('\n\n');
    const { root } = resolveMarkdown(parseMarkdown(source), { elements });
    const markdown = serializeMarkdown(root);
    expect(markdown).toBe(
      [
        'Status <tp-badge variant="a&amp;b &quot;c&quot;">New</tp-badge> and <span data-color="blue">tide</span>.[^tide]',
        '<details>\n\n<summary>More</summary>\n\nHidden *content*.\n\n</details>',
        '[^tide]: Measured at *noon*.\n',
      ].join('\n\n'),
    );
    expect(withoutPositions(resolveMarkdown(parseMarkdown(markdown), { elements }).root)).toEqual(
      withoutPositions(root),
    );
  });
});

describe('shared policies (uwg-te-md-req-policy)', () => {
  it('V-153: the exported definitions give the results resolveMarkdown gives', () => {
    const policy = {
      a: ['href', 'action', 'formaction', 'cite', 'xlink:href', 'data', 'onclick', 'srcdoc'],
      img: ['src', 'poster', 'srcset', 'alt', 'style', 'onerror'],
      x: ['style', 'title', 'data-color'],
    };
    const cases: readonly (readonly [string, string, string])[] = [
      ['a', 'href', 'https://a.example'],
      ['a', 'href', 'javascript:alert(1)'],
      ['a', 'href', '#tides'],
      ['a', 'href', '/relative'],
      ['a', 'href', 'mailto:a@b.example'],
      ['a', 'href', 'tel:+1'],
      ['a', 'href', 'data:text/html,x'],
      ['a', 'href', 'ftp://a.example'],
      ['a', 'action', 'javascript:x'],
      ['a', 'formaction', 'https://a.example'],
      ['a', 'cite', 'data:x'],
      ['a', 'xlink:href', 'javascript:x'],
      ['a', 'data', 'http://a.example'],
      ['a', 'onclick', 'x()'],
      ['a', 'srcdoc', '<b>x</b>'],
      ['a', 'title', 'not in the policy'],
      ['img', 'src', 'https://a.example/i.png'],
      ['img', 'src', 'data:image/png;base64,AA'],
      ['img', 'src', '/chart.png'],
      ['img', 'poster', 'javascript:x'],
      ['img', 'srcset', 'http://a.example/i.png 1x'],
      ['img', 'alt', 'javascript:x'],
      ['img', 'style', 'width:120px'],
      ['img', 'onerror', 'x()'],
      ['x', 'style', 'text-align:center'],
      ['x', 'title', 'kept'],
      ['x', 'data-color', 'blue'],
      ['x', 'onmouseover', 'x()'],
    ];
    const policies: (MarkdownUrlPolicy | null)[] = [
      null,
      { links: ['https:'], images: ['https:', 'data:'] },
    ];
    for (const urls of policies) {
      const allowed = mergeElementPolicy(policy);
      for (const [tag, name, value] of cases) {
        const listed = allowed.get('*')!.has(name) || allowed.get(tag)!.has(name);
        const protocols = LINK_URL_ATTRIBUTES.includes(name)
          ? linkProtocols(urls)
          : IMAGE_URL_ATTRIBUTES.includes(name)
            ? imageProtocols(urls)
            : null;
        const expected =
          !isAlwaysRemovedAttribute(name) &&
          listed &&
          (protocols === null || allowedUrl(value, protocols));
        const source =
          tag === 'img' ? `<img ${name}="${value}">` : `<${tag} ${name}="${value}">v</${tag}>`;
        const paragraph = resolveMarkdown(parseMarkdown(source), { elements: policy, urls }).root
          .children[0] as { children: MarkdownElement[] };
        const element = paragraph.children.find((node) => node.type === 'element');
        expect(element, source).toBeDefined();
        expect(name in element!.attributes, `${source} with ${JSON.stringify(urls)}`).toBe(
          expected,
        );
      }
      // Link and image destinations in markdown syntax pass the same protocol lists.
      for (const url of [
        'https://a.example',
        'http://a.example',
        'mailto:a@b.example',
        'tel:+1',
        'javascript:x',
        'data:image/png;base64,AA',
        'ftp://a.example',
        '/relative',
        '#fragment',
      ]) {
        const [paragraph] = resolveMarkdown(parseMarkdown(`[x](${url}) ![y](${url})`), { urls })
          .root.children as { children: { type: string }[] }[];
        const types = paragraph!.children.map((node) => node.type);
        expect(types.includes('link'), url).toBe(allowedUrl(url, linkProtocols(urls)));
        expect(types.includes('image'), url).toBe(allowedUrl(url, imageProtocols(urls)));
      }
    }
    expect([...mergeElementPolicy(null).keys()].sort()).toEqual(
      Object.keys(DEFAULT_MARKDOWN_ELEMENTS).sort(),
    );
    expect(linkProtocols(null)).toBe(DEFAULT_LINK_PROTOCOLS);
    expect(imageProtocols(undefined)).toBe(DEFAULT_IMAGE_PROTOCOLS);
    expect(linkProtocols({ images: ['https:'] })).toBe(DEFAULT_LINK_PROTOCOLS);
    expect(DEFAULT_LINK_PROTOCOLS).toEqual(['http:', 'https:', 'mailto:', 'tel:']);
    expect(DEFAULT_IMAGE_PROTOCOLS).toEqual(['http:', 'https:', 'blob:']);
    expect(LINK_URL_ATTRIBUTES).toEqual([
      'href',
      'action',
      'formaction',
      'cite',
      'xlink:href',
      'data',
    ]);
    expect(IMAGE_URL_ATTRIBUTES).toEqual(['src', 'poster', 'srcset']);
    // Every name that starts with `on` is removed, as the resolve step removes it.
    expect(['onclick', 'ONLOAD', 'one', 'style', 'srcdoc'].every(isAlwaysRemovedAttribute)).toBe(
      true,
    );
    expect(['title', 'stylesheet', 'srcdocs', 'data-on'].some(isAlwaysRemovedAttribute)).toBe(
      false,
    );
  });

  it('V-153: the shared definitions cannot be changed by a consumer', () => {
    for (const list of [
      DEFAULT_LINK_PROTOCOLS,
      DEFAULT_IMAGE_PROTOCOLS,
      LINK_URL_ATTRIBUTES,
      IMAGE_URL_ATTRIBUTES,
    ])
      expect(Object.isFrozen(list)).toBe(true);
    expect(Object.isFrozen(DEFAULT_MARKDOWN_ELEMENTS)).toBe(true);
    expect(
      Object.values(DEFAULT_MARKDOWN_ELEMENTS).every((attributes) => Object.isFrozen(attributes)),
    ).toBe(true);
  });

  it('V-216: the new exports resolve from the package entry', async () => {
    const entry = await import('./index.js');
    expect(entry.serializeMarkdown).toBe(serializeMarkdown);
    expect(entry.isAlwaysRemovedAttribute).toBe(isAlwaysRemovedAttribute);
    expect(entry.LINK_URL_ATTRIBUTES).toBe(LINK_URL_ATTRIBUTES);
    expect(entry.IMAGE_URL_ATTRIBUTES).toBe(IMAGE_URL_ATTRIBUTES);
    expect(entry.linkProtocols).toBe(linkProtocols);
    expect(entry.imageProtocols).toBe(imageProtocols);
    expect(entry.allowedUrl).toBe(allowedUrl);
    expect(entry.DEFAULT_LINK_PROTOCOLS).toBe(DEFAULT_LINK_PROTOCOLS);
    expect(entry.DEFAULT_IMAGE_PROTOCOLS).toBe(DEFAULT_IMAGE_PROTOCOLS);
    expect(entry.DEFAULT_MARKDOWN_ELEMENTS).toBe(DEFAULT_MARKDOWN_ELEMENTS);
    expect(entry.mergeElementPolicy).toBe(mergeElementPolicy);
    expect(entry.resolveMarkdown).toBe(resolveMarkdown);
    expect(entry.parseMarkdown).toBe(parseMarkdown);
  });
});
