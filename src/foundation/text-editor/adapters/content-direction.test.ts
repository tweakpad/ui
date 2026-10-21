/**
 * Logical alignment and direction of content on both engine adapters and in the preview (node
 * environment; Widgets `uwg-te-req-pres-2`, `uwg-te-tab-content-model` r11,
 * `uwg-te-req-content-3`, `uwg-te-req-engine-12`).
 *
 * Alignment is stored and written as a logical value: `start` (the default, left out), `center`,
 * `end` or `justify`, never `left` or `right`. HTML that names a physical alignment maps it by
 * the direction its elements set, else by the direction of the widget: in a right-to-left widget
 * `right` is the start and `left` the end, whether the HTML is the initial content, set later or
 * pasted. Right-to-left text keeps its logical alignment through every format, the same on both
 * engines. The preview renders every block with `dir="auto"`, so each block resolves its own
 * direction from its text, and writes logical `text-align` values only.
 */
import { describe, expect, it } from 'vitest';
import { readClipboardHtml, serializeHtml } from '../content/html.js';
import { htmlSource } from '../content/html-source.test.js';
import type { TextEditorPortableDocument } from '../content/portable.js';
import { renderPortablePreview } from '../content/view.js';
import { CONTENT_ENGINES, idSequence } from './content-engines.test.js';
import { resolvedDirection } from './shared/content.js';

/** Foreign HTML with physical and logical alignments, without a direction of its own. */
const PHYSICAL = [
  '<p data-id="d000000001" style="text-align: right">right</p>',
  '<p data-id="d000000002" style="text-align: left">left</p>',
  '<h2 data-id="d000000003" style="text-align: end">end</h2>',
  '<blockquote data-id="d000000004" style="text-align: center"><p>center</p></blockquote>',
  '<ul><li data-id="d000000005"><p style="text-align: right">item</p></li></ul>',
  '<table data-id="d000000006"><tbody><tr><td style="text-align: left"><p>cell</p></td></tr></tbody></table>',
  '<div dir="ltr"><p data-id="d000000007" style="text-align: right">own direction</p></div>',
].join('');

/** What each direction of the widget reads `PHYSICAL` as. */
const LOGICAL = {
  ltr: [
    '<p data-id="d000000001" style="text-align: end">right</p>',
    '<p data-id="d000000002">left</p>',
    '<h2 data-id="d000000003" style="text-align: end">end</h2>',
    '<blockquote data-id="d000000004" style="text-align: center"><p>center</p></blockquote>',
    '<ul><li data-id="d000000005"><p style="text-align: end">item</p></li></ul>',
    '<table data-id="d000000006"><tbody><tr><td><p>cell</p></td></tr></tbody></table>',
    '<p data-id="d000000007" style="text-align: end">own direction</p>',
  ].join('\n'),
  rtl: [
    '<p data-id="d000000001">right</p>',
    '<p data-id="d000000002" style="text-align: end">left</p>',
    '<h2 data-id="d000000003" style="text-align: end">end</h2>',
    '<blockquote data-id="d000000004" style="text-align: center"><p>center</p></blockquote>',
    '<ul><li data-id="d000000005"><p>item</p></li></ul>',
    '<table data-id="d000000006"><tbody><tr><td style="text-align: end"><p>cell</p></td></tr></tbody></table>',
    '<p data-id="d000000007" style="text-align: end">own direction</p>',
  ].join('\n'),
} as const;

/** Right-to-left text at every alignment, in a list, a quote and a table cell. */
const RTL_TEXT = [
  '<p data-id="r000000001">مرحبا بكم</p>',
  '<p data-id="r000000002" style="text-align: end">שלום עולם</p>',
  '<h3 data-id="r000000003" style="text-align: center">عنوان</h3>',
  '<p data-id="r000000004" style="text-align: justify">نص مضبوط</p>',
  '<ol><li data-id="r000000005"><p>أولا</p><ol><li data-id="r000000006"><p style="text-align: end">ثانيا</p></li></ol></li></ol>',
  '<ul data-type="task"><li data-id="r000000007" data-checked="true"><p>משימה</p></li></ul>',
  '<blockquote data-id="r000000008"><p>اقتباس</p></blockquote>',
  '<table data-id="r000000009"><tbody><tr><td style="text-align: end"><p>خلية</p></td><td><p>cell</p></td></tr></tbody></table>',
  '<p data-id="r000000010">mixed English and عربي</p>',
].join('\n');

describe('the direction of the widget (uwg-te-req-pres-2)', () => {
  it('an element resolves its direction through :dir(), else left-to-right', () => {
    expect(resolvedDirection({ matches: (s: string) => s === ':dir(rtl)' })).toBe('rtl');
    expect(resolvedDirection({ matches: () => false })).toBe('ltr');
    expect(
      resolvedDirection({
        matches: () => {
          throw new SyntaxError('unknown selector');
        },
      }),
    ).toBe('ltr');
    expect(resolvedDirection(null)).toBe('ltr');
    expect(resolvedDirection({})).toBe('ltr');
  });
});

describe.each(CONTENT_ENGINES)('$name: logical alignment and direction', (engine) => {
  it.each(['ltr', 'rtl'] as const)(
    'in a %s widget, physical alignment of initial and set HTML maps to logical values',
    (direction) => {
      const initial = engine.mount({ content: PHYSICAL, format: 'html' }, { direction });
      expect(initial.getContent('html')).toBe(LOGICAL[direction]);
      const set = engine.mount({ content: '', format: 'html' }, { direction });
      set.setContent(PHYSICAL, 'html');
      expect(set.getContent('html')).toBe(LOGICAL[direction]);
    },
  );

  it.each(['ltr', 'rtl'] as const)(
    'in a %s widget, a pasted fragment read in that direction keeps its logical alignment',
    (direction) => {
      // Whole blocks, so that no pasted block merges into the paragraph at the point.
      const payload = `<div data-text-editor-fragment="blocks">${PHYSICAL}</div>`;
      const { fragment } = readClipboardHtml(htmlSource(payload), {
        direction,
        createId: idSequence('p'),
      });
      const instance = engine.mount(
        { content: '<p data-id="e000000001"></p>', format: 'html' },
        { direction },
      );
      expect(
        instance.execute(
          [
            {
              type: 'content.insert',
              content: fragment,
              at: { kind: 'text', anchor: { block: 'e000000001', offset: 0 } },
            },
          ],
          { reason: 'input-paste', focus: false },
        ),
      ).toBe(true);
      const html = instance.getContent('html') as string;
      expect(html).not.toMatch(/text-align: (?:left|right)/u);
      expect(html.match(/text-align: \w+/gu)).toEqual(
        LOGICAL[direction].match(/text-align: \w+/gu),
      );
    },
  );

  it('right-to-left text keeps its logical alignment through HTML, JSON and Markdown', () => {
    const instance = engine.mount({ content: RTL_TEXT, format: 'html' }, { direction: 'rtl' });
    expect(instance.getContent('html')).toBe(RTL_TEXT);
    const json = JSON.parse(JSON.stringify(instance.getContent('json'))) as unknown;
    const again = engine.mount({ content: json, format: 'json' }, { direction: 'rtl' });
    expect(again.getContent('html')).toBe(RTL_TEXT);
    // Markdown keeps the text and the structure; alignment is one of its documented losses.
    const markdown = instance.getContent('markdown') as string;
    expect(markdown).toContain('مرحبا بكم');
    expect(markdown).not.toMatch(/left|right/u);
  });

  it('alignment actions store logical values only', () => {
    const instance = engine.mount({ content: RTL_TEXT, format: 'html' }, { direction: 'rtl' });
    for (const align of ['center', 'end', 'justify', 'start'] as const) {
      expect(
        instance.execute([{ type: 'block.align', align, ids: ['r000000001'] }], {
          reason: 'imperative-action',
          focus: false,
        }),
      ).toBe(true);
      const first = (instance.getContent('html') as string).split('\n')[0];
      expect(first).toBe(
        align === 'start'
          ? '<p data-id="r000000001">مرحبا بكم</p>'
          : `<p data-id="r000000001" style="text-align: ${align}">مرحبا بكم</p>`,
      );
    }
  });
});

describe('logical alignment across engines (uwg-te-req-engine-12)', () => {
  it.each(['ltr', 'rtl'] as const)(
    'in a %s widget both engines read the same content',
    (direction) => {
      const [first, second] = CONTENT_ENGINES.map((engine) =>
        engine.mount({ content: PHYSICAL, format: 'html' }, { direction }),
      );
      for (const format of ['html', 'markdown', 'text'] as const)
        expect(first!.getContent(format), format).toBe(second!.getContent(format));
    },
  );
});

// A structural document for the preview, which builds DOM through its target's owner document.

class PreviewText {
  constructor(readonly data: string) {}
}

class PreviewElement {
  readonly attributes = new Map<string, string>();
  readonly children: (PreviewElement | PreviewText)[] = [];
  readonly styles = new Map<string, string>();
  readonly style = { setProperty: (name: string, value: string) => this.styles.set(name, value) };
  constructor(
    readonly localName: string,
    readonly ownerDocument: PreviewDocument,
  ) {}
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  append(...nodes: (PreviewElement | PreviewText)[]): void {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes: (PreviewElement | PreviewText)[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }
  *elements(): Generator<PreviewElement> {
    for (const child of this.children)
      if (child instanceof PreviewElement) {
        yield child;
        yield* child.elements();
      }
  }
}

class PreviewDocument {
  createElement(name: string): PreviewElement {
    return new PreviewElement(name, this);
  }
  createTextNode(data: string): PreviewText {
    return new PreviewText(data);
  }
}

describe('the preview in a right-to-left widget (uwg-te-req-pres-2)', () => {
  const preview = (document: TextEditorPortableDocument) => {
    const target = new PreviewDocument().createElement('div');
    renderPortablePreview(document, target as unknown as Element);
    return [...target.elements()];
  };

  it('every block resolves its own direction; lists, tables and the root carry none', () => {
    const instance = CONTENT_ENGINES[0].mount(
      { content: RTL_TEXT, format: 'html' },
      { direction: 'rtl' },
    );
    const json = instance.getContent('json');
    const portable = CONTENT_ENGINES[0].fromNative(json);
    const elements = preview(portable);
    const blocks = elements.filter((element) =>
      ['p', 'h3', 'blockquote', 'li'].includes(element.localName),
    );
    expect(blocks.length).toBeGreaterThan(10);
    for (const element of blocks)
      expect(element.attributes.get('dir'), element.localName).toBe('auto');
    for (const element of elements.filter((item) =>
      ['ol', 'ul', 'table', 'tbody', 'tr', 'td', 'th'].includes(item.localName),
    ))
      expect(element.attributes.has('dir'), element.localName).toBe(false);
    // The root of the preview carries no direction: it follows the widget's.
    const target = new PreviewDocument().createElement('div');
    const root = renderPortablePreview(
      portable,
      target as unknown as Element,
    ) as unknown as PreviewElement;
    expect(root.attributes.has('dir')).toBe(false);
  });

  it('writes logical text-align values only, as the HTML profile does', () => {
    const portable = CONTENT_ENGINES[1].fromNative(
      CONTENT_ENGINES[1].mount({ content: RTL_TEXT, format: 'html' }).getContent('json'),
    );
    const aligns = preview(portable).flatMap((element) => {
      const value = element.styles.get('text-align');
      return value ? [value] : [];
    });
    expect(aligns).toEqual(['end', 'center', 'justify', 'end', 'end']);
    expect(serializeHtml(portable).match(/text-align: \w+/gu)).toEqual(
      aligns.map((value) => `text-align: ${value}`),
    );
  });
});
