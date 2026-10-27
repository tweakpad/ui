import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  TextEditorBlockDefinition,
  TextEditorInlineDefinition,
  TextEditorNodeDefinition,
} from '../nodes.js';
import { TEXT_EDITOR_COLORS } from '../palette.js';
import { parseHtmlDocument, PARSED_STYLE_ATTRIBUTE, renameStyleAttributes } from './dom.js';
import { htmlSource } from './html-source.test.js';
import {
  importHtml,
  readClipboardHtml,
  serializeHtml,
  writeClipboardHtml,
  type TextEditorHtmlReadOptions,
} from './html.js';
import type {
  TextEditorPortableBlock,
  TextEditorPortableDocument,
  TextEditorPortableInline,
  TextEditorPortableMarks,
} from './portable.js';

/** Identifiers `n1`, `n2`, … in the order they are asked for. */
const sequence = () => {
  let next = 0;
  return () => `n${(next += 1)}`;
};

const text = (value: string, marks?: TextEditorPortableMarks): TextEditorPortableInline =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
const br: TextEditorPortableInline = { type: 'hard-break' };
const p = (id: string, content: readonly TextEditorPortableInline[]): TextEditorPortableBlock => ({
  type: 'paragraph',
  id,
  content,
});

/** The document that HTML reads as, with identifiers from `sequence`. */
const read = (html: string, options: TextEditorHtmlReadOptions = {}) =>
  importHtml(htmlSource(html), { createId: sequence(), ...options });
const blocks = (html: string, options: TextEditorHtmlReadOptions = {}) =>
  read(html, options).document.blocks;

/** The HTML of a document, checked to read back as the same document and the same HTML. */
function written(
  document: TextEditorPortableDocument,
  nodes?: readonly TextEditorNodeDefinition[],
): string {
  const html = serializeHtml(document, { nodes });
  const back = importHtml(htmlSource(html), { nodes });
  expect(back.document).toEqual(document);
  expect(serializeHtml(back.document, { nodes })).toBe(html);
  return html;
}

// Definitions local to these tests (the shipped examples are documentation, not library code).
const callout: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'callout',
  content: 'inline',
  element: 'aside',
  attrs: {
    tone: { type: 'enum', values: ['note', 'tip'], default: 'note' },
    count: { type: 'number', default: null },
    open: { type: 'boolean', default: false },
  },
  tool: { label: 'Callout' },
};
const pageBreak: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'page-break',
  content: 'none',
  element: 'hr',
  attrs: { kind: { type: 'string', default: 'solid' } },
  tool: { label: 'Page break' },
};
const video: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'video',
  content: 'none',
  element: 'iframe',
  attrs: { clip: { type: 'string', default: '' } },
  tool: { label: 'Video' },
};
const mention: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'mention',
  element: 'span',
  attrs: { id: { type: 'string', default: null }, label: { type: 'string', default: '' } },
  text: (attrs) => `@${String(attrs.label)}`,
};
const nodes: readonly TextEditorNodeDefinition[] = [callout, pageBreak, video, mention];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HTML profile (uwg-te-req-content-2)', () => {
  it('V-114: writes the blocks of content model rows 1 to 6', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        p('p1', [text('First'), br, text('second line')]),
        { type: 'heading', id: 'h3', level: 3, align: 'end', content: [text('Heading')] },
        { type: 'quote', id: 'q', align: 'justify', content: [text('Quote'), br, text('lines')] },
        { type: 'code', id: 'c', language: 'js', text: 'a < b && c\n' },
        {
          type: 'list-ordered',
          id: 'o1',
          start: 5,
          content: [text('five')],
          children: [{ type: 'list-bullet', id: 'b1', content: [text('nested')], children: [] }],
        },
        { type: 'list-ordered', id: 'o2', content: [text('six')], children: [] },
        {
          type: 'list-task',
          id: 't1',
          checked: true,
          align: 'center',
          content: [text('done')],
          children: [],
        },
        { type: 'list-task', id: 't2', checked: false, content: [text('open')], children: [] },
        { type: 'divider', id: 'd' },
        {
          type: 'image',
          id: 'i',
          src: 'https://example.org/a.png?x=1&y=2',
          alt: 'A "big" one',
          width: 320,
        },
      ],
    };
    expect(written(document)).toBe(
      [
        '<p data-id="p1">First<br>second line</p>',
        '<h3 data-id="h3" style="text-align: end">Heading</h3>',
        '<blockquote data-id="q" style="text-align: justify"><p>Quote<br>lines</p></blockquote>',
        '<pre data-id="c"><code class="language-js">a &lt; b &amp;&amp; c\n</code></pre>',
        '<ol start="5"><li data-id="o1"><p>five</p><ul><li data-id="b1"><p>nested</p></li></ul></li><li data-id="o2"><p>six</p></li></ol>',
        '<ul data-type="task"><li data-id="t1" data-checked="true"><p style="text-align: center">done</p></li><li data-id="t2" data-checked="false"><p>open</p></li></ul>',
        '<hr data-id="d">',
        '<img data-id="i" src="https://example.org/a.png?x=1&amp;y=2" alt="A &quot;big&quot; one" width="320">',
      ].join('\n'),
    );
  });

  it('V-116: nests marks a > span[data-color] > mark > strong > em > u > s > sup|sub > code', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        p('m', [
          text('all', {
            link: '#tides',
            textColor: 'red',
            highlight: 'blue',
            bold: true,
            italic: true,
            underline: true,
            strike: true,
            superscript: true,
          }),
          text('code', { link: '#tides', code: true }),
          text(' low', { subscript: true }),
        ]),
      ],
    };
    expect(written(document)).toBe(
      '<p data-id="m"><a href="#tides"><span data-color="red"><mark data-color="blue"><strong><em><u><s><sup>all</sup></s></u></em></strong></mark></span><code>code</code></a><sub> low</sub></p>',
    );
  });

  it('V-116: writes every palette name as a text color and as a highlight', () => {
    const content = TEXT_EDITOR_COLORS.flatMap((color) => [
      text(color, { textColor: color }),
      text(' '),
      text(color, { highlight: color }),
      text(' '),
    ]);
    const html = written({ blocks: [p('colors', content.slice(0, -1))] });
    for (const color of TEXT_EDITOR_COLORS) {
      expect(html).toContain(`<span data-color="${color}">${color}</span>`);
      expect(html).toContain(`<mark data-color="${color}">${color}</mark>`);
    }
  });

  it('V-121: runs and edge spaces survive collapsing; outside code a tab or no-break space is a space, inside code both stay', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        p('a', [text('  lead, two  inner,\tthree\u00a0 ends  ')]),
        p('b', [text(' x '), br, text('  y')]),
        p('c', [text('one '), text(' bold ', { bold: true }), text(' two')]),
        p('s', [text('   ')]),
        { type: 'code', id: 'k', text: '\tindent  and\u00a0kept ' },
      ],
    };
    const html = serializeHtml(document);
    expect(html).toBe(
      [
        '<p data-id="a">&nbsp; lead, two &nbsp;inner, three &nbsp;ends &nbsp;</p>',
        '<p data-id="b">&nbsp;x&nbsp;<br>&nbsp; y</p>',
        '<p data-id="c">one <strong>&nbsp;bold </strong>&nbsp;two</p>',
        '<p data-id="s">&nbsp; &nbsp;</p>',
        '<pre data-id="k"><code>\tindent  and&nbsp;kept </code></pre>',
      ].join('\n'),
    );
    const back = importHtml(htmlSource(html)).document;
    expect(back).toEqual({
      blocks: [p('a', [text('  lead, two  inner, three  ends  ')]), ...document.blocks.slice(1)],
    });
    expect(serializeHtml(back)).toBe(html);
  });

  it('writes a second br after a hard break that ends a block, and none in an empty block', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        p('x', [text('end'), br]),
        p('y', []),
        { type: 'heading', id: 'z', level: 1, content: [br] },
        { type: 'quote', id: 'q', content: [] },
      ],
    };
    expect(written(document)).toBe(
      [
        '<p data-id="x">end<br><br></p>',
        '<p data-id="y"></p>',
        '<h1 data-id="z"><br><br></h1>',
        '<blockquote data-id="q"><p></p></blockquote>',
      ].join('\n'),
    );
  });

  it('V-115: writes column widths, the header row in thead, the header column with row scope, spans, backgrounds and alignment', () => {
    const cell = (value: string, extra: object = {}) => ({
      ...extra,
      paragraphs: [{ content: [text(value)] }],
    });
    const document: TextEditorPortableDocument = {
      blocks: [
        {
          type: 'table',
          id: 't',
          headerRow: true,
          headerColumn: true,
          widths: [100, 80.5],
          rows: [
            { cells: [cell('Corner'), cell('Head', { align: 'center' })] },
            {
              cells: [
                cell('Rows', { rowSpan: 2 }),
                {
                  background: 'blue',
                  paragraphs: [{ content: [text('one')] }, { content: [text('two')] }],
                },
              ],
            },
            { cells: [cell('x', { align: 'end' })] },
          ],
        },
      ],
    };
    expect(written(document)).toBe(
      '<table data-id="t"><colgroup><col style="width: 100px"><col style="width: 80.5px"></colgroup><thead><tr><th scope="row"><p>Corner</p></th><th style="text-align: center"><p>Head</p></th></tr></thead><tbody><tr><th scope="row" rowspan="2"><p>Rows</p></th><td data-background="blue"><p>one</p><p>two</p></td></tr><tr><td style="text-align: end"><p>x</p></td></tr></tbody></table>',
    );
  });

  it('V-115: every combination of header row and header column reads back, a table of one row included', () => {
    for (const headerRow of [false, true])
      for (const headerColumn of [false, true])
        for (const rows of [1, 2])
          for (const columns of [1, 2])
            written({
              blocks: [
                {
                  type: 'table',
                  id: 't',
                  headerRow,
                  headerColumn,
                  rows: Array.from({ length: rows }, (_, row) => ({
                    cells: Array.from({ length: columns }, (__, column) => ({
                      paragraphs: [{ content: [text(`${row}.${column}`)] }],
                    })),
                  })),
                },
              ],
            });
  });

  it('writes custom nodes as their definition element with the node name in data-type and attributes as data- attributes', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        {
          type: 'custom',
          id: 'c1',
          name: 'callout',
          attrs: { tone: 'tip', count: 3, open: true },
          content: [text('Look '), br],
        },
        { type: 'custom', id: 'c2', name: 'page-break', attrs: { kind: 'dashed' } },
        { type: 'custom', id: 'c3', name: 'video', attrs: { clip: 'harbor-tour' } },
        p('p', [
          text('Hi '),
          { type: 'custom', name: 'mention', attrs: { id: 'u1', label: 'Ada' } },
        ]),
      ],
    };
    expect(written(document, nodes)).toBe(
      [
        '<aside data-id="c1" data-type="callout" data-tone="tip" data-count="3" data-open="true">Look&nbsp;<br><br></aside>',
        '<hr data-id="c2" data-type="page-break" data-kind="dashed">',
        '<iframe data-id="c3" data-type="video" data-clip="harbor-tour"></iframe>',
        '<p data-id="p">Hi <span data-type="mention" data-id="u1" data-label="Ada">@Ada</span></p>',
      ].join('\n'),
    );
    // Without the definitions, an iframe is dropped, an hr is a divider and other elements unwrap.
    const html = serializeHtml(document, { nodes });
    expect(importHtml(htmlSource(html), { createId: sequence() }).document).toEqual({
      blocks: [
        p('n1', [text('Look '), br]),
        { type: 'divider', id: 'c2' },
        p('p', [text('Hi @Ada')]),
      ],
    });
  });

  it('reads custom attributes by their specs and ignores attributes a definition lacks', () => {
    expect(
      blocks(
        '<aside data-type="callout" data-tone="warning" data-count="7" data-open="false" data-extra="x">Text</aside><p><span data-type="mention" data-label="Teo" data-color="red">@Teo</span></p>',
        { nodes },
      ),
    ).toEqual([
      {
        type: 'custom',
        id: 'n1',
        name: 'callout',
        attrs: { tone: 'note', count: 7, open: false },
        content: [text('Text')],
      },
      p('n2', [{ type: 'custom', name: 'mention', attrs: { id: null, label: 'Teo' } }]),
    ]);
  });
});

describe('HTML import (uwg-te-req-content-3)', () => {
  it('V-122: reads b, i and del as aliases, unwraps unknown elements and drops scripts, styles, frames and unknown attributes', () => {
    expect(
      blocks(
        '<p class="lead" title="t"><b>b</b><i>i</i><del>d</del> <x-panel data-x="1">unknown <q>quoted</q></x-panel><script>steal()</script><style>p { color: red }</style><iframe src="https://example.org/frame"></iframe><object data="x.bin"></object><embed src="y.bin"><template><p>hidden</p></template></p>',
      ),
    ).toEqual([
      p('n1', [
        text('b', { bold: true }),
        text('i', { italic: true }),
        text('d', { strike: true }),
        text(' unknown quoted'),
      ]),
    ]);
  });

  it('V-122: a mark without a palette name, or with a name outside it, is a yellow highlight; other colors are dropped', () => {
    expect(
      blocks(
        '<p><mark>plain</mark> <mark data-color="teal">teal</mark> <mark data-color="green">green</mark> <span data-color="teal">teal text</span> <span data-color="pink">pink</span> <span style="color: red">styled</span></p>',
      ),
    ).toEqual([
      p('n1', [
        text('plain', { highlight: 'yellow' }),
        text(' '),
        text('teal', { highlight: 'yellow' }),
        text(' '),
        text('green', { highlight: 'green' }),
        text(' teal text '),
        text('pink', { textColor: 'pink' }),
        text(' styled'),
      ]),
    ]);
  });

  it('V-122: reads the class vocabulary that adapters render', () => {
    const html = [
      '<ul class="tp-te-list tp-te-list-bullet"><li class="tp-te-item" dir="auto"><p class="tp-te-paragraph">one</p></li><li class="tp-te-nested-item"><ul class="tp-te-list tp-te-list-ordered"><li class="tp-te-item"><p>nested</p></li></ul></li></ul>',
      '<ul class="tp-te-list tp-te-list-task"><li class="tp-te-item tp-te-task-item"><span class="tp-te-task-marker"><input type="checkbox"></span><p>open</p></li><li class="tp-te-item tp-te-task-item tp-te-checked"><span class="tp-te-task-marker"><input type="checkbox" checked></span><p>done</p></li></ul>',
      '<code class="tp-te-code-block" data-language="css"><span>a {</span><br><span>}</span></code>',
      '<p><span class="tp-te-italic">i</span><span class="tp-te-underline">u</span><span class="tp-te-strike">s</span><span class="tp-te-sup">sup</span><span class="tp-te-sub">sub</span><span class="tp-te-code">code</span><span class="tp-te-highlight" data-color="green">hl</span><a class="tp-te-link" href="/l">link</a><a class="tp-te-link">no href</a><span class="tp-te-block-cursor"></span></p>',
      '<div class="tp-te-table-wrapper"><table class="tp-te-table"><tbody><tr><td class="tp-te-cell tp-te-header-cell"><p class="tp-te-paragraph">h</p></td></tr></tbody></table></div>',
      '<div class="tp-te-image-host"><img class="tp-te-image" src="/i.png" alt="I" draggable="false"></div>',
    ].join('');
    expect(blocks(html)).toEqual([
      {
        type: 'list-bullet',
        id: 'n1',
        content: [text('one')],
        children: [{ type: 'list-ordered', id: 'n2', content: [text('nested')], children: [] }],
      },
      { type: 'list-task', id: 'n3', checked: false, content: [text('open')], children: [] },
      { type: 'list-task', id: 'n4', checked: true, content: [text('done')], children: [] },
      { type: 'code', id: 'n5', text: 'a {\n}' },
      p('n6', [
        text('i', { italic: true }),
        text('u', { underline: true }),
        text('s', { strike: true }),
        text('sup', { superscript: true }),
        text('sub', { subscript: true }),
        text('code', { code: true }),
        text('hl', { highlight: 'green' }),
        text('link', { link: '/l' }),
        text('no href'),
      ]),
      // A table of one header row has a header column only when its first cell has row scope.
      {
        type: 'table',
        id: 'n7',
        headerRow: true,
        headerColumn: false,
        rows: [{ cells: [{ paragraphs: [{ content: [text('h')] }] }] }],
      },
      { type: 'image', id: 'n8', src: '/i.png', alt: 'I' },
    ]);
  });

  it('V-122: merges text, applies the mark exclusions, makes a ragged table rectangular with positional headers and reads an empty body as one empty paragraph', () => {
    expect(blocks('<p>a<b></b>b<span>c</span></p>')).toEqual([p('n1', [text('abc')])]);
    expect(
      blocks(
        '<p><code><b>x</b><a href="/l">y</a></code><sup>p<sub>q</sub></sup><sub>r<sup>s</sup></sub></p>',
      ),
    ).toEqual([
      p('n1', [
        text('x', { code: true }),
        text('y', { link: '/l', code: true }),
        text('p', { superscript: true }),
        text('qr', { subscript: true }),
        text('s', { superscript: true }),
      ]),
    ]);
    expect(
      blocks(
        '<table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>1</td></tr><tr><td>2</td><td>3</td></tr></table>',
      ),
    ).toEqual([
      {
        type: 'table',
        id: 'n1',
        headerRow: true,
        headerColumn: false,
        rows: [
          { cells: ['A', 'B', 'C'].map((value) => ({ paragraphs: [{ content: [text(value)] }] })) },
          {
            cells: [
              { paragraphs: [{ content: [text('1')] }] },
              { paragraphs: [{ content: [] }] },
              { paragraphs: [{ content: [] }] },
            ],
          },
          {
            cells: [
              { paragraphs: [{ content: [text('2')] }] },
              { paragraphs: [{ content: [text('3')] }] },
              { paragraphs: [{ content: [] }] },
            ],
          },
        ],
      },
    ]);
    const empty = [{ type: 'paragraph', id: 'n1', content: [] }];
    expect(blocks('')).toEqual(empty);
    expect(blocks('<!-- only a comment -->\n  <script>x()</script>')).toEqual(empty);
  });

  it('V-123: reads alignment and width before the shared policies, keeps allowed URLs and removes handlers', () => {
    const result = read(
      [
        '<p style="text-align:center;color:red">centered</p>',
        '<table><colgroup><col style="width:120px"></colgroup><tr><td>w</td></tr></table>',
        '<p><a href="javascript:alert(1)">kept text</a> <a href="#tides">fragment</a> <a href=" /relative ">relative</a> <a href="mailto:crew@example.org">mail</a></p>',
        '<img src="data:image/png;base64,AA"><img src="/chart.png" alt="Chart"><img src="javascript:x" alt="Blocked image">',
        '<p onclick="x()">clicked</p>',
      ].join(''),
    );
    expect(result.document.blocks).toEqual([
      { type: 'paragraph', id: 'n1', align: 'center', content: [text('centered')] },
      {
        type: 'table',
        id: 'n2',
        headerRow: false,
        headerColumn: false,
        widths: [120],
        rows: [{ cells: [{ paragraphs: [{ content: [text('w')] }] }] }],
      },
      p('n3', [
        text('kept text '),
        text('fragment', { link: '#tides' }),
        text(' '),
        text('relative', { link: '/relative' }),
        text(' '),
        text('mail', { link: 'mailto:crew@example.org' }),
      ]),
      { type: 'image', id: 'n4', src: '/chart.png', alt: 'Chart' },
      p('n5', [text('Blocked image')]),
      p('n6', [text('clicked')]),
    ]);
    const html = serializeHtml(result.document);
    expect(html).not.toMatch(/color|onclick|javascript|data:/u);
  });

  it("V-123: the context's URL policy replaces the default protocols", () => {
    const urls = { links: ['https:', 'ftp:'], images: ['https:'] };
    expect(
      blocks(
        '<p><a href="http://plain.example/">http</a> <a href="ftp://files.example/">ftp</a> <a href="mailto:a@example.org">mail</a></p><img src="http://plain.example/i.png" alt="old"><img src="https://secure.example/i.png" alt="new">',
        { urls },
      ),
    ).toEqual([
      p('n1', [text('http '), text('ftp', { link: 'ftp://files.example/' }), text(' mail')]),
      p('n2', [text('old')]),
      { type: 'image', id: 'n3', src: 'https://secure.example/i.png', alt: 'new' },
    ]);
  });

  it('maps left and right to start and end by the direction of the element, its nearest ancestor with dir, or the option', () => {
    const html =
      '<p style="text-align:left">l</p><p style="text-align: RIGHT">r</p><p style="text-align:-webkit-center">c</p><div dir="rtl"><p style="text-align:left">l</p><p style="text-align:right" dir="ltr">r</p><blockquote><p style="text-align: right">q</p></blockquote></div><p dir="auto" style="text-align:right">مرحبا</p><p dir="auto" style="text-align:right">hello</p>';
    const aligns = (direction?: 'ltr' | 'rtl') =>
      blocks(html, { direction }).map((block) => ('align' in block ? block.align : undefined));
    expect(aligns()).toEqual([
      undefined,
      'end',
      'center',
      'end',
      'end',
      undefined,
      undefined,
      'end',
    ]);
    expect(aligns('rtl')).toEqual([
      'end',
      undefined,
      'center',
      'end',
      'end',
      undefined,
      undefined,
      'end',
    ]);
  });

  it('keeps the text of block-level unknown elements apart and joins that of inline ones', () => {
    expect(
      blocks(
        '<div>one</div><div>two <span>three</span></div><section><p>four</p>five</section><div><br></div><article>six<div>seven</div>eight</article>',
      ),
    ).toEqual([
      p('n1', [text('one')]),
      p('n2', [text('two three')]),
      p('n3', [text('four')]),
      p('n4', [text('five')]),
      p('n5', []),
      p('n6', [text('six')]),
      p('n7', [text('seven')]),
      p('n8', [text('eight')]),
    ]);
  });

  it('splits a paragraph or heading at a block inside it; the part holding the first character keeps the identifier', () => {
    expect(
      blocks(
        '<p data-id="keep">before<img src="/a.png" alt="A">after</p><h2 data-id="head"><img src="/b.png" alt="B">tail</h2><p data-id="only"><img src="/c.png" alt="C"></p>',
      ),
    ).toEqual([
      p('keep', [text('before')]),
      { type: 'image', id: 'n1', src: '/a.png', alt: 'A' },
      p('n2', [text('after')]),
      { type: 'image', id: 'n3', src: '/b.png', alt: 'B' },
      { type: 'heading', id: 'head', level: 2, content: [text('tail')] },
      { type: 'image', id: 'n4', src: '/c.png', alt: 'C' },
    ]);
  });

  it('joins the paragraphs of a quote and of a list item before its nested items; other blocks leave them', () => {
    expect(
      blocks(
        '<blockquote data-id="q"><p>one</p>loose text<p>two</p><pre><code>code</code></pre><p>after</p></blockquote><ul><li data-id="i"><p>a</p><p>b</p><ul><li data-id="j">c</li></ul>d</li></ul>',
      ),
    ).toEqual([
      { type: 'quote', id: 'q', content: [text('one'), br, text('loose text'), br, text('two')] },
      { type: 'code', id: 'n1', text: 'code' },
      { type: 'quote', id: 'n2', content: [text('after')] },
      {
        type: 'list-bullet',
        id: 'i',
        content: [text('a'), br, text('b')],
        children: [{ type: 'list-bullet', id: 'j', content: [text('c')], children: [] }],
      },
      p('n3', [text('d')]),
    ]);
  });

  it('fits the blocks in a table cell to paragraphs of their text, a nested table included', () => {
    expect(
      blocks(
        '<table><tr><td style="text-align: center">top<ul><li>first</li><li>second</li></ul><table><tr><td>inner</td><td>cell</td></tr></table><h3>heading</h3></td></tr></table>',
      ),
    ).toEqual([
      {
        type: 'table',
        id: 'n1',
        headerRow: false,
        headerColumn: false,
        rows: [
          {
            cells: [
              {
                align: 'center',
                paragraphs: ['top', 'first', 'second', 'inner\tcell', 'heading'].map((value) => ({
                  content: [text(value)],
                })),
              },
            ],
          },
        ],
      },
    ]);
  });

  it('reads a bold alias with a normal font weight, as office suites wrap copied content, as plain text', () => {
    expect(
      blocks(
        '<b style="font-weight:normal;" id="office-guid"><p>plain</p></b><b style="font-weight: 400">four hundred</b> <strong style="font-weight:700">bold</strong>',
      ),
    ).toEqual([
      p('n1', [text('plain')]),
      p('n2', [text('four hundred '), text('bold', { bold: true })]),
    ]);
  });

  it('reads a list nested directly in a list, and text directly in a list, as items', () => {
    expect(
      blocks(
        '<ol start="0"><li>zero</li><ol><li>nested</li></ol>stray<li>one</li></ol><ul><ul><li>orphan</li></ul></ul>',
      ),
    ).toEqual([
      {
        type: 'list-ordered',
        id: 'n1',
        start: 0,
        content: [text('zero')],
        children: [{ type: 'list-ordered', id: 'n2', content: [text('nested')], children: [] }],
      },
      { type: 'list-ordered', id: 'n3', content: [text('stray')], children: [] },
      { type: 'list-ordered', id: 'n4', content: [text('one')], children: [] },
      { type: 'list-bullet', id: 'n5', content: [text('orphan')], children: [] },
    ]);
  });

  it('parses at call time with the parser it is given, and answers null without one', () => {
    expect(parseHtmlDocument('<p>x</p>')).toBeNull();
    const calls: string[][] = [];
    class FakeParser {
      parseFromString(html: string, type: string) {
        calls.push([html, type]);
        return { body: htmlSource(html) };
      }
    }
    const view = { DOMParser: FakeParser as unknown as typeof DOMParser };
    const body = parseHtmlDocument('<p>one</p>', view)!;
    expect(importHtml(body, { createId: sequence() }).document).toEqual({
      blocks: [p('n1', [text('one')])],
    });
    vi.stubGlobal('DOMParser', FakeParser);
    expect(parseHtmlDocument('<p>two</p>')).not.toBeNull();
    expect(calls).toEqual([
      ['<p>one</p>', 'text/html'],
      ['<p>two</p>', 'text/html'],
    ]);
  });
});

describe('clipboard record (uwg-te-req-content-6)', () => {
  it('records whether the HTML holds a text range or whole blocks', () => {
    for (const kind of ['range', 'blocks'] as const) {
      const fragment = { kind, blocks: [p('a', [text('one')]), p('b', [text('two')])] };
      const html = writeClipboardHtml(fragment);
      expect(html).toBe(
        `<div data-text-editor-fragment="${kind}"><p data-id="a">one</p><p data-id="b">two</p></div>`,
      );
      expect(readClipboardHtml(htmlSource(html)).fragment).toEqual(fragment);
      // As a browser delivers it: a meta element and fragment comments around the record.
      const pasted = `<meta charset="utf-8"><html><body><!--StartFragment-->${html}<!--EndFragment--></body></html>`;
      expect(readClipboardHtml(htmlSource(pasted)).fragment).toEqual(fragment);
    }
  });

  it('HTML without the record, or with another value, reads as a text range', () => {
    const options = { createId: sequence() };
    expect(readClipboardHtml(htmlSource('<p>one</p><p>two</p>'), options).fragment).toEqual({
      kind: 'range',
      blocks: [p('n1', [text('one')]), p('n2', [text('two')])],
    });
    expect(
      readClipboardHtml(
        htmlSource('<div data-text-editor-fragment="tables"><p data-id="x">x</p></div>'),
      ).fragment,
    ).toEqual({ kind: 'range', blocks: [p('x', [text('x')])] });
    expect(
      readClipboardHtml(
        htmlSource(
          '<div data-text-editor-fragment="blocks"><p data-id="x">x</p></div><p>after</p>',
        ),
        { createId: sequence() },
      ).fragment.kind,
    ).toBe('range');
  });
});

describe('mdf-urls: an image the policy rejects', () => {
  it('becomes a paragraph of its alternative text that keeps its identifier, as the native JSON path keeps it', () => {
    expect(
      blocks(
        '<p data-id="a">before</p>\n  <img data-id="blocked" src="javascript:x" alt="Blocked">\n<img data-id="gone" src="data:image/png;base64,AA" alt="">',
      ),
    ).toEqual([p('a', [text('before')]), p('blocked', [text('Blocked')])]);
  });

  it('inside text joins that text, which keeps the paragraph it starts in', () => {
    expect(
      blocks(
        '<p data-id="a">see <img data-id="x" src="javascript:x" alt="this"> here</p>loose <img data-id="y" src="ftp://f.example/i.png" alt="text">',
      ),
    ).toEqual([p('a', [text('see this here')]), p('n1', [text('loose text')])]);
  });
});

describe('style attributes under a strict content-security policy (node-003102)', () => {
  it('renames only the style attributes of tags before parsing, so the inert parse applies no inline style', () => {
    const renamed = (html: string) => renameStyleAttributes(html);
    expect(renamed('<p style="text-align: center">style="x" here</p>')).toBe(
      `<p ${PARSED_STYLE_ATTRIBUTE}="text-align: center">style="x" here</p>`,
    );
    // Case, unquoted values, spacing around `=`, and other attributes kept as written.
    expect(renamed('<TD class=a STYLE = \'width:4px\' title="b>style=c">x</TD>')).toBe(
      `<TD class=a ${PARSED_STYLE_ATTRIBUTE} = 'width:4px' title="b>style=c">x</TD>`,
    );
    expect(renamed('<col style=width:120px><br/>')).toBe(
      `<col ${PARSED_STYLE_ATTRIBUTE}=width:120px><br/>`,
    );
    // Comments, end tags, raw text and a lone `<` are copied unchanged.
    for (const html of [
      '<!-- <p style="x"> -->',
      '</p style="x">',
      '<script>if (a <b style="x") {}</script>',
      '<style>p { color: red }</style>',
      'a < b style=c',
      '<p>no attributes</p>',
    ])
      expect(renamed(html)).toBe(html);
    expect(renamed('<textarea><p style="x"></textarea><p style="y">')).toBe(
      `<textarea><p style="x"></textarea><p ${PARSED_STYLE_ATTRIBUTE}="y">`,
    );
  });

  it('reads the declarations of a renamed style as those of the style attribute', () => {
    const source = htmlSource(
      `<p ${PARSED_STYLE_ATTRIBUTE}="text-align: center; color: red">x</p>`,
    );
    expect(importHtml(source, { createId: sequence() }).document).toEqual({
      blocks: [{ ...p('n1', [text('x')]), align: 'center' }],
    });
  });
});
