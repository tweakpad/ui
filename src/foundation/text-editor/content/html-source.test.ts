/**
 * HTML source for the content tests (node environment, where no `DOMParser` exists): builds
 * structural trees (`content/dom.ts`) from HTML strings with the Markdown owner's restricted tag
 * lexer. It builds what a browser builds for well-formed input, which closes every non-void
 * element and nests elements only where the HTML tree builder keeps them, and like a browser it
 * decodes character references, lowercases names, keeps the first of repeated attributes and
 * drops a line feed right after a `pre` start tag; it is no HTML tree builder for other input.
 * The real parsing path runs in the browser. A `*.test.ts` module stays out of the build; the
 * suite at the end keeps the file from counting as an empty one.
 */
import { describe, expect, it } from 'vitest';
import { lexHtml, VOID_ELEMENTS } from '../../markdown/html.js';
import {
  isElementLike,
  isTextLike,
  type AttributeLike,
  type ElementLike,
  type NodeLike,
} from './dom.js';

export class SourceText implements NodeLike {
  readonly nodeType = 3;
  constructor(readonly data: string) {}
}

export class SourceComment implements NodeLike {
  readonly nodeType = 8;
  constructor(readonly data: string) {}
}

export class SourceElement implements ElementLike {
  readonly nodeType = 1;
  readonly childNodes: NodeLike[] = [];
  readonly attributes: AttributeLike[] = [];

  constructor(readonly localName: string) {}

  getAttribute(name: string): string | null {
    const key = name.toLowerCase();
    return this.attributes.find((attribute) => attribute.name === key)?.value ?? null;
  }

  setAttribute(name: string, value: string): void {
    if (this.getAttribute(name) === null) this.attributes.push({ name: name.toLowerCase(), value });
  }
}

/** Elements whose start tag drops a line feed right after it. */
const LEADING_NEWLINE = new Set(['pre', 'listing', 'textarea']);

/**
 * The body of a document holding `html`: its content, with the attributes of an `html` or `body`
 * tag in the source on the body itself.
 */
export function htmlSource(html: string): SourceElement {
  const body = new SourceElement('body');
  const stack: SourceElement[] = [body];
  let newline = false;
  for (const token of lexHtml(html)) {
    const parent = stack[stack.length - 1]!;
    const dropNewline = newline;
    newline = false;
    switch (token.kind) {
      case 'text': {
        const value = dropNewline ? token.value.replace(/^\r?\n/u, '') : token.value;
        if (value) parent.childNodes.push(new SourceText(value));
        break;
      }
      case 'open': {
        if (token.name === 'html' || token.name === 'body') {
          for (const [name, value] of token.attributes) body.setAttribute(name, value);
          break;
        }
        const element = new SourceElement(token.name);
        for (const [name, value] of token.attributes) element.setAttribute(name, value);
        parent.childNodes.push(element);
        // A slash does not close a non-void element in HTML.
        if (!VOID_ELEMENTS.has(token.name)) {
          stack.push(element);
          newline = LEADING_NEWLINE.has(token.name);
        }
        break;
      }
      case 'close': {
        if (token.name === 'html' || token.name === 'body') break;
        let index = stack.length - 1;
        while (index > 0 && stack[index]!.localName !== token.name) index -= 1;
        if (index > 0) stack.length = index;
        break;
      }
      case 'comment':
        parent.childNodes.push(new SourceComment(token.raw.replace(/^<!--|-->$/gu, '')));
        break;
      default:
        break;
    }
  }
  return body;
}

/** The markup of a structural tree, for inspecting what `htmlSource` built. */
export function outerHtml(node: NodeLike): string {
  if (isTextLike(node)) return node.data;
  if (!isElementLike(node)) return '';
  const attributes = Array.from(node.attributes)
    .map(({ name, value }) => ` ${name}="${value}"`)
    .join('');
  const children = Array.from(node.childNodes).map(outerHtml).join('');
  return VOID_ELEMENTS.has(node.localName)
    ? `<${node.localName}${attributes}>`
    : `<${node.localName}${attributes}>${children}</${node.localName}>`;
}

describe('HTML source for the content tests', () => {
  it('builds elements, void elements, text and comments', () => {
    const body = htmlSource(
      '<p class="a" CLASS="b">x<br>y<!-- note --></p><hr><img src=a.png alt=\'b\'>',
    );
    expect(outerHtml(body)).toBe(
      '<body><p class="a">x<br>y</p><hr><img src="a.png" alt="b"></body>',
    );
    const comment = (body.childNodes[0] as SourceElement).childNodes[3]!;
    expect([comment.nodeType, (comment as SourceComment).data]).toEqual([8, ' note ']);
  });

  it('decodes character references and keeps the attributes of html and body on the body', () => {
    const body = htmlSource(
      '<html dir="rtl"><body class="c"><p>a&nbsp;&amp;&lt;b&#62;</p></body></html>',
    );
    expect(body.getAttribute('dir')).toBe('rtl');
    expect(body.getAttribute('class')).toBe('c');
    expect(((body.childNodes[0] as SourceElement).childNodes[0] as SourceText).data).toBe(
      'a\u00a0&<b>',
    );
  });

  it('drops the line feed after a pre start tag, as the HTML parser does', () => {
    const body = htmlSource('<pre>\nfirst\n</pre><pre><code>\nkept</code></pre>');
    expect(outerHtml(body)).toBe('<body><pre>first\n</pre><pre><code>\nkept</code></pre></body>');
  });

  it('closes elements left open by a later close tag of an outer element', () => {
    expect(outerHtml(htmlSource('<div><span>a</div>b'))).toBe(
      '<body><div><span>a</span></div>b</body>',
    );
  });
});
