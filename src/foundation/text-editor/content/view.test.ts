import { describe, expect, it, vi } from 'vitest';
import { isVocabularyClass } from '../adapters/shared/vocabulary.test.js';
import type { TextEditorBlockDefinition, TextEditorInlineDefinition } from '../nodes.js';
import { serializeHtml } from './html.js';
import type { TextEditorPortableDocument, TextEditorPortableInline } from './portable.js';
import { isPreviewFormat, renderPortablePreview } from './view.js';

// A structural document: the preview builds DOM only through the target's owner document, so a
// Node test inspects the tree it builds, with no DOM library.

class FakeText {
  parent: FakeElement | null = null;
  constructor(readonly data: string) {}
}

class FakeStyle {
  readonly values = new Map<string, string>();
  setProperty(name: string, value: string): void {
    this.values.set(name, value);
  }
}

class FakeElement {
  parent: FakeElement | null = null;
  readonly attributes = new Map<string, string>();
  readonly childNodes: (FakeElement | FakeText)[] = [];
  readonly style = new FakeStyle();
  constructor(
    readonly localName: string,
    readonly ownerDocument: FakeDocument,
  ) {}
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  append(...nodes: (FakeElement | FakeText)[]): void {
    for (const node of nodes) {
      node.parent = this;
      this.childNodes.push(node);
    }
  }
  replaceChildren(...nodes: (FakeElement | FakeText)[]): void {
    for (const child of this.childNodes) child.parent = null;
    this.childNodes.length = 0;
    this.append(...nodes);
  }
  addEventListener(): never {
    throw new Error('The preview adds no listener.');
  }
}

class FakeDocument {
  readonly created: (FakeElement | FakeText)[] = [];
  createElement(name: string): FakeElement {
    const element = new FakeElement(name, this);
    this.created.push(element);
    return element;
  }
  createTextNode(data: string): FakeText {
    const node = new FakeText(data);
    this.created.push(node);
    return node;
  }
}

const VOID = new Set(['br', 'hr', 'img', 'input', 'col']);
const escape = (value: string) =>
  value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/"/gu, '&quot;');

/** The tree as HTML, attributes in the order they were set, inline styles last. */
function html(node: FakeElement | FakeText): string {
  if (node instanceof FakeText) return escape(node.data);
  const attributes = [...node.attributes].map(([name, value]) =>
    value === '' ? ` ${name}` : ` ${name}="${escape(value)}"`,
  );
  const style = [...node.style.values].map(([name, value]) => `${name}: ${value}`).join('; ');
  const open = `<${node.localName}${attributes.join('')}${style ? ` style="${style}"` : ''}>`;
  return VOID.has(node.localName)
    ? open
    : `${open}${node.childNodes.map(html).join('')}</${node.localName}>`;
}

function elements(root: FakeElement): FakeElement[] {
  return [
    root,
    ...root.childNodes.flatMap((child) => (child instanceof FakeElement ? elements(child) : [])),
  ];
}

function render(
  document: TextEditorPortableDocument,
  nodes?: Parameters<typeof renderPortablePreview>[2],
) {
  const owner = new FakeDocument();
  const target = owner.createElement('div');
  target.setAttribute('part', 'text-editor-content');
  const root = renderPortablePreview(
    document,
    target as unknown as Element,
    nodes,
  ) as unknown as FakeElement;
  return { owner, target, root };
}

const text = (value: string, marks?: Record<string, unknown>): TextEditorPortableInline =>
  (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }) as never;
const br: TextEditorPortableInline = { type: 'hard-break' };
const cell = (value: string, extra: Record<string, unknown> = {}) => ({
  ...extra,
  paragraphs: [{ content: [text(value)] }],
});

// Definitions local to these tests.
const callout: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'callout',
  content: 'inline',
  element: 'aside',
  attrs: { tone: { type: 'enum', values: ['note', 'warning'], default: 'note' } },
  presents: 'callout',
  tool: { label: 'Callout' },
};
const frame = vi.fn();
const embed: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'embed',
  content: 'none',
  element: 'iframe',
  attrs: { url: { type: 'string', default: '' }, wide: { type: 'boolean', default: false } },
  text: ({ attrs }) => String(attrs.url),
  view: frame,
  tool: { label: 'Embed' },
};
const mention: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'mention',
  element: 'span',
  attrs: { person: { type: 'number', default: null }, label: { type: 'string', default: '' } },
  text: (attrs) => `@${String(attrs.label)}`,
  view: frame,
};
const nodes = [callout, embed, mention];

const garden: TextEditorPortableDocument = {
  blocks: [
    { type: 'heading', id: 'h', level: 2, align: 'center', content: [text('Spring planting')] },
    {
      type: 'paragraph',
      id: 'p',
      content: [
        text('Sow '),
        text('early', { link: 'https://example.org/sow', bold: true }),
        text(' and', { link: 'https://example.org/sow' }),
        text(' often', { textColor: 'green', highlight: 'yellow', italic: true }),
        br,
        text('x', { code: true }),
        text('2', { superscript: true }),
        text('n', { subscript: true, underline: true, strike: true }),
        { type: 'custom', name: 'mention', attrs: { person: 7, label: 'Ada' } },
      ],
    },
    { type: 'quote', id: 'q', align: 'end', content: [text('Slow growth'), br] },
    { type: 'code', id: 'c', language: 'sh', text: 'ls\n' },
    {
      type: 'list-ordered',
      id: 'o1',
      start: 4,
      content: [text('Dig')],
      children: [{ type: 'list-bullet', id: 'b1', align: 'justify', content: [], children: [] }],
    },
    { type: 'list-ordered', id: 'o2', content: [text('Plant')], children: [] },
    { type: 'list-task', id: 't1', checked: true, content: [text('Water')], children: [] },
    { type: 'list-task', id: 't2', checked: false, content: [text('Weed')], children: [] },
    { type: 'divider', id: 'd' },
    { type: 'image', id: 'i', src: 'fern.png', alt: 'A fern', width: 320 },
    {
      type: 'custom',
      id: 'k',
      name: 'callout',
      attrs: { tone: 'warning' },
      content: [text('Frost tonight')],
    },
    {
      type: 'table',
      id: 't',
      headerRow: true,
      headerColumn: true,
      widths: [80, 120],
      rows: [
        { cells: [cell('Plant'), cell('Light', { background: 'blue', align: 'center' })] },
        { cells: [cell('Moss', { rowSpan: 2 }), cell('Shade')] },
        { cells: [cell('Part')] },
      ],
    },
    { type: 'custom', id: 'e', name: 'embed', attrs: { url: 'https://example.org/v', wide: true } },
  ],
};

describe('preview (uwg-te-req-pres-5, uwg-te-req-pres-2)', () => {
  it('renders the blocks in the class vocabulary with their semantic elements', () => {
    const { root } = render(garden, { nodes });
    const block = 'dir="auto"';
    expect(html(root)).toBe(
      [
        '<div>',
        `<h2 class="tp-te-heading" ${block} style="text-align: center">Spring planting</h2>`,
        `<p class="tp-te-paragraph" ${block}>Sow <a class="tp-te-link"><strong class="tp-te-bold">early</strong> and</a>`,
        '<span class="tp-te-color" data-color="green"><mark class="tp-te-highlight" data-color="yellow"><em class="tp-te-italic"> often</em></mark></span>',
        '<br><code class="tp-te-code">x</code><sup class="tp-te-sup">2</sup>',
        '<u class="tp-te-underline"><s class="tp-te-strike"><sub class="tp-te-sub">n</sub></s></u>',
        '<span class="tp-te-inline-mention" data-type="mention" data-person="7" data-label="Ada">@Ada</span></p>',
        `<blockquote class="tp-te-quote" ${block} style="text-align: end">Slow growth<br><br></blockquote>`,
        `<pre class="tp-te-code-block" ${block}><code>ls\n<br></code></pre>`,
        '<ol class="tp-te-list tp-te-list-ordered" start="4">',
        `<li class="tp-te-item" ${block}><p class="tp-te-paragraph" ${block}>Dig</p>`,
        '<ul class="tp-te-list tp-te-list-bullet">',
        `<li class="tp-te-item" ${block}><p class="tp-te-paragraph" ${block} style="text-align: justify"><br></p></li>`,
        '</ul></li>',
        `<li class="tp-te-item" ${block}><p class="tp-te-paragraph" ${block}>Plant</p></li>`,
        '</ol>',
        '<ul class="tp-te-list tp-te-list-task">',
        `<li class="tp-te-item tp-te-task-item tp-te-checked" ${block}><span class="tp-te-task-marker" inert><input type="checkbox" tabindex="-1" checked></span><p class="tp-te-paragraph" ${block}>Water</p></li>`,
        `<li class="tp-te-item tp-te-task-item" ${block}><span class="tp-te-task-marker" inert><input type="checkbox" tabindex="-1"></span><p class="tp-te-paragraph" ${block}>Weed</p></li>`,
        '</ul>',
        `<hr class="tp-te-divider" ${block}>`,
        `<div class="tp-te-image-host" ${block}><img class="tp-te-image" src="fern.png" alt="A fern" width="320" draggable="false"></div>`,
        `<aside class="tp-te-block-callout tp-te-callout" ${block} data-type="callout" data-tone="warning">Frost tonight</aside>`,
        '<div class="tp-te-table-wrapper"><table class="tp-te-table">',
        '<colgroup><col style="width: 80px"><col style="width: 120px"></colgroup><tbody>',
        `<tr><th class="tp-te-cell tp-te-header-cell"><p class="tp-te-paragraph" ${block}>Plant</p></th>`,
        `<th class="tp-te-cell tp-te-header-cell" data-background="blue" style="text-align: center"><p class="tp-te-paragraph" ${block}>Light</p></th></tr>`,
        `<tr><th class="tp-te-cell tp-te-header-cell" rowspan="2"><p class="tp-te-paragraph" ${block}>Moss</p></th>`,
        `<td class="tp-te-cell"><p class="tp-te-paragraph" ${block}>Shade</p></td></tr>`,
        `<tr><td class="tp-te-cell"><p class="tp-te-paragraph" ${block}>Part</p></td></tr>`,
        '</tbody></table></div>',
        // The embed previews as a plain element: an iframe never renders, nor does its view.
        `<div class="tp-te-block-embed" ${block} data-type="embed" data-url="https://example.org/v" data-wide="true">https://example.org/v</div>`,
        // The engines keep an empty paragraph after a final atom block or table.
        `<p class="tp-te-paragraph" ${block}><br></p>`,
        '</div>',
      ].join(''),
    );
    expect(frame).not.toHaveBeenCalled();
  });

  it('describes a custom node with the data- attributes that the HTML profile writes', () => {
    const widget: TextEditorPortableDocument = {
      blocks: [
        {
          type: 'custom',
          id: 'b1',
          name: 'widget',
          attrs: { id: 'x', Mixed_Case: 'y', type: 'z', ok: 'v', unset: null },
        },
      ],
    };
    const element = render(widget).root.childNodes[0] as FakeElement;
    expect([...element.attributes]).toEqual([
      ['class', 'tp-te-block-widget'],
      ['dir', 'auto'],
      ['data-type', 'widget'],
      ['data-ok', 'v'],
    ]);
    // The profile holds the block identifier in data-id and the same description.
    expect(serializeHtml(widget)).toBe('<div data-id="b1" data-type="widget" data-ok="v"></div>');
  });

  it('is inert: nothing editable, listened to, navigable or in the tab order', () => {
    const { root } = render(garden, { nodes });
    const all = elements(root);
    expect(all.filter((element) => element.attributes.has('contenteditable'))).toEqual([]);
    expect(all.filter((element) => element.attributes.has('href'))).toEqual([]);
    expect(
      all.filter((element) => ['iframe', 'script', 'button'].includes(element.localName)),
    ).toEqual([]);
    const boxes = all.filter((element) => element.localName === 'input');
    expect(
      boxes.map((box) => [box.attributes.get('tabindex'), box.parent?.attributes.has('inert')]),
    ).toEqual([
      ['-1', true],
      ['-1', true],
    ]);
    // No identifier reaches the preview, and no class outside the vocabulary.
    expect(
      all.filter((element) => element.attributes.has('data-id') || element.attributes.has('id')),
    ).toEqual([]);
    const classes = all.flatMap((element) => element.attributes.get('class')?.split(' ') ?? []);
    expect(classes.filter((name) => !isVocabularyClass(name))).toEqual([]);
  });

  it('writes nothing outside the target and replaces what the target held', () => {
    const owner = new FakeDocument();
    const target = owner.createElement('div');
    target.setAttribute('part', 'text-editor-content');
    target.append(owner.createTextNode('old content'));
    const before = owner.created.length;
    const root = renderPortablePreview(garden, target as unknown as Element, {
      nodes,
    }) as unknown as FakeElement;
    const inside = (node: FakeElement | FakeText): boolean =>
      node.parent === target || (node.parent !== null && inside(node.parent));
    expect(owner.created.slice(before).filter((node) => !inside(node))).toEqual([]);
    expect(target.childNodes).toEqual([root]);
    expect([...target.attributes]).toEqual([['part', 'text-editor-content']]);
    expect(target.style.values.size).toBe(0);
  });

  it('gives an empty textblock and an empty last line the line box the editing root gives them', () => {
    const { root } = render({
      blocks: [
        { type: 'paragraph', id: 'a', content: [] },
        { type: 'paragraph', id: 'b', content: [text('end'), br] },
        { type: 'code', id: 'c', text: '' },
        { type: 'heading', id: 'h', level: 9 as never, content: [] },
      ],
    });
    expect(html(root)).toBe(
      [
        '<div>',
        '<p class="tp-te-paragraph" dir="auto"><br></p>',
        '<p class="tp-te-paragraph" dir="auto">end<br><br></p>',
        '<pre class="tp-te-code-block" dir="auto"><code><br></code></pre>',
        '<h1 class="tp-te-heading" dir="auto"><br></h1>',
        '</div>',
      ].join(''),
    );
  });

  it('previews html, markdown and text, never json', () => {
    expect((['html', 'markdown', 'text', 'json'] as const).map(isPreviewFormat)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });
});
