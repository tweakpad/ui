/**
 * The palette in content (`ccx-paint`, `ccx-scope`, Widgets `uwg-te-req-pres-3`): every name of
 * `TEXT_EDITOR_COLORS` as a text color, a highlight and a cell background renders in the preview
 * on the classes and attributes that the adapters render, and each of them is painted by the
 * recipe through the hue's content color roles under the content part.
 */
import { describe, expect, it } from 'vitest';
import { serializeHtml } from '../../foundation/text-editor/content/html.js';
import type {
  TextEditorPortableDocument,
  TextEditorPortableInline,
} from '../../foundation/text-editor/content/portable.js';
import { renderPortablePreview } from '../../foundation/text-editor/content/view.js';
import { TEXT_EDITOR_COLORS } from '../../foundation/text-editor/palette.js';
import { textEditorAppearance } from '../../presentation/recipes/text-editor.js';

class PreviewText {
  constructor(readonly data: string) {}
}

class PreviewElement {
  readonly attributes = new Map<string, string>();
  readonly children: (PreviewElement | PreviewText)[] = [];
  readonly style = { setProperty: () => undefined };
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
  get classes(): string[] {
    return (this.attributes.get('class') ?? '').split(' ').filter(Boolean);
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

const run = (text: string, marks: Record<string, unknown>): TextEditorPortableInline =>
  ({ type: 'text', text, marks }) as TextEditorPortableInline;

/** Every hue as text color, highlight, both, a linked run and a cell background. */
const document: TextEditorPortableDocument = {
  blocks: [
    {
      type: 'paragraph',
      id: 'c000000001',
      content: TEXT_EDITOR_COLORS.flatMap((hue, index) => [
        run(`${hue} `, { textColor: hue }),
        run(`${hue} mark `, { highlight: hue }),
        run(`${hue} on `, {
          textColor: hue,
          highlight: TEXT_EDITOR_COLORS[(index + 1) % TEXT_EDITOR_COLORS.length],
        }),
        run(`${hue} link `, { link: `#${hue}`, textColor: hue }),
      ]),
    },
    {
      type: 'table',
      id: 'c000000002',
      headerRow: true,
      headerColumn: false,
      rows: [
        {
          cells: TEXT_EDITOR_COLORS.map((hue) => ({
            background: hue,
            paragraphs: [{ content: [{ type: 'text', text: hue }] }],
          })),
        },
      ],
    },
  ],
};

/** A selector list split at its top-level commas. */
function selectorList(list: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      selectors.push(current.trim());
      current = '';
    } else current += char;
  }
  return [...selectors, current.trim()];
}

/** The selectors of the content part's rules, each split into its selector list. */
const contentSelectors = (textEditorAppearance['text-editor-content'] ?? []).flatMap((rule) =>
  selectorList(rule.selector ?? '&').map((selector) => ({ selector, rule })),
);

/** The rule that paints an element of a class with a hue in an attribute. */
const paintOf = (className: string, attribute: string, hue: string) =>
  contentSelectors.find(({ selector }) => selector === `& .${className}[${attribute}="${hue}"]`)
    ?.rule.declarations;

describe('ccx-paint: the palette in content', () => {
  const target = new PreviewDocument().createElement('div');
  renderPortablePreview(document, target as unknown as Element);
  const elements = [...target.elements()];

  it('the preview renders every hue on the content color classes', () => {
    const named = (className: string, attribute: string) =>
      new Set(
        elements
          .filter((element) => element.classes.includes(className))
          .map((element) => element.attributes.get(attribute)),
      );
    expect(named('tp-te-color', 'data-color')).toEqual(new Set(TEXT_EDITOR_COLORS));
    expect(named('tp-te-highlight', 'data-color')).toEqual(new Set(TEXT_EDITOR_COLORS));
    expect(named('tp-te-cell', 'data-background')).toEqual(new Set(TEXT_EDITOR_COLORS));
    // The portable HTML of the same document carries the same names.
    const html = serializeHtml(document);
    for (const hue of TEXT_EDITOR_COLORS) {
      expect(html).toContain(`<span data-color="${hue}">`);
      expect(html).toContain(`<mark data-color="${hue}">`);
      expect(html).toContain(`data-background="${hue}"`);
    }
  });

  it('the recipe paints each rendered color through its content roles, never a literal', () => {
    for (const element of elements) {
      const hue = element.attributes.get('data-color') ?? element.attributes.get('data-background');
      if (!hue) continue;
      const className = element.classes.find((name) =>
        ['tp-te-color', 'tp-te-highlight', 'tp-te-cell'].includes(name),
      )!;
      const paint = paintOf(
        className,
        className === 'tp-te-cell' ? 'data-background' : 'data-color',
        hue,
      );
      expect(paint, `${className} ${hue}`).toBeDefined();
      expect(paint!['color']).toBe(`var(--tp-content-${hue}-foreground)`);
      if (className !== 'tp-te-color')
        expect(paint!['background-color']).toBe(`var(--tp-content-${hue})`);
    }
  });

  it('colored link text takes the color: the color sits inside the link, and the recipe lets a nested link inherit it', () => {
    const links = elements.filter((element) => element.classes.includes('tp-te-link'));
    expect(links).toHaveLength(TEXT_EDITOR_COLORS.length);
    for (const link of links)
      expect([...link.elements()].some((element) => element.classes.includes('tp-te-color'))).toBe(
        true,
      );
    for (const selector of [
      '& :is(.tp-te-color, .tp-te-highlight)[data-color] .tp-te-link',
      '& .tp-te-cell[data-background] .tp-te-link',
      '& .tp-te-color[data-color] .tp-te-highlight[data-color]',
    ])
      expect(
        contentSelectors.find((entry) => entry.selector === selector)?.rule.declarations,
        selector,
      ).toEqual({ color: 'inherit' });
  });
});
