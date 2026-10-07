import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './block.js';
import { decodeEntities } from './entities.js';
import { completeMarkdown } from './repair.js';
import { resolveMarkdown } from './resolve.js';
import { Slugger } from './slug.js';
import { allowedUrl } from './url.js';
import type { MarkdownContent, MarkdownNode, MarkdownRoot } from './types.js';

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

describe('Markdown block structure (CommonMark)', () => {
  it.each([
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
  ])('%j', (source, expected) => expect(md(source)).toBe(expected));

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
  it.each([
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
    [
      '<foo@bar.example.com>',
      '<p><a href="mailto:foo@bar.example.com">foo@bar.example.com</a></p>',
    ],
    ['<a><bab><c2c>', '<p><a><bab><c2c></p>'],
    ['foo <!-- this is a --\ncomment -->', '<p>foo <!-- this is a --\ncomment --></p>'],
    ['[foo][bar]\n\n[bar]: /url "title"', '<p><a href="/url" title="title">foo</a></p>'],
    ['[Foo][]\n\n[foo]: /url', '<p><a href="/url">Foo</a></p>'],
    ['[bar][foo\\!]\n\n[foo!]: /url', '<p>[bar][foo!]</p>'],
  ])('%j', (source, expected) => expect(md(source)).toBe(expected));
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

describe('Markdown parser robustness', () => {
  const corpus = [
    '# Title\n\nSome *emph* and **strong** with `code` and [link](http://a.b "t").',
    '> quote\n> - list\n>   1. nested\n\n```ts\nconst a = 1;\n```',
    '| a | b |\n| - | :-: |\n| `x` | ~~y~~ |\n\n- [x] done\n- [ ] todo',
    'Footnote[^n].\n\n[^n]: Body\n    continued.\n\n<details>\n<summary>S</summary>\n\nHidden\n\n</details>',
    '***bold italic*** _a_ __b__ ![img](x.png) <span>raw</span> &amp; \\* www.x.com',
  ].join('\n\n');
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
