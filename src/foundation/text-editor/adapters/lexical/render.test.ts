/**
 * The rendered DOM of the Lexical adapter (Widgets `uwg-te-tab-vocabulary`, `uwg-te-req-pres-2`,
 * `uwg-te-req-tables-1`, `uwg-te-req-engine-12`). The DOM work runs on a small element model, as
 * the engine's render hooks hand it over; the browser batches measure the layout.
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { corpusNodes } from '../../content/corpus.test.js';
import { defineTextEditorBlock } from '../../nodes.js';
import { cssRules, fakeContainer, type FakeElement } from '../shared/test-helpers.test.js';
import { LEXICAL_BASE_CSS } from './css.js';
import { createLexicalEngine } from './index.js';
import {
  headlessLexical,
  realLexicalModules,
  recordingContext,
  stubLexicalModules,
} from './lexical-stubs.test.js';
import { LEXICAL_FORMAT } from './mapping.js';
import type {
  LexicalDomOverrideConfigLike,
  LexicalListLike,
  LexicalNodeLike,
  TextEditorLexicalModules,
} from './modules.js';
import {
  arrangeText,
  clearTablePaint,
  lexicalRenderExtension,
  paintCodeBlock,
  paintDivider,
  paintList,
  repaintContentStops,
  sizeTable,
  syncListItem,
} from './render.js';
import { releaseEngineRootStyle } from './state.js';

// A small DOM

class Text {
  readonly nodeType = 3;
  parentNode: Elem | null = null;
  constructor(public data: string) {}
}

class Elem {
  readonly nodeType = 1;
  readonly tagName: string;
  readonly kids: (Elem | Text)[] = [];
  readonly attrs = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly styles = new Map<string, string>();
  parentNode: Elem | null = null;
  readonly ownerDocument = { createElement: (tag: string) => new Elem(tag) };
  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }
  readonly classList = {
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) =>
      void (on ? this.classes.add(name) : this.classes.delete(name)),
  };
  readonly style = {
    getPropertyValue: (name: string) => this.styles.get(name) ?? '',
    setProperty: (name: string, value: string) => void this.styles.set(name, value),
    removeProperty: (name: string) => void this.styles.delete(name),
  };
  draggable = true;
  get childNodes() {
    return [...this.kids];
  }
  set className(value: string) {
    this.classes.clear();
    for (const name of value.split(/\s+/u)) if (name) this.classes.add(name);
  }
  set textContent(value: string) {
    this.replaceChildren(new Text(value));
  }
  getAttributeNames() {
    return [...this.attrs.keys()];
  }
  replaceChildren(...nodes: (Elem | Text)[]) {
    for (const kid of this.kids) kid.parentNode = null;
    this.kids.length = 0;
    this.append(...nodes);
  }
  get firstChild() {
    return this.kids[0] ?? null;
  }
  get firstElementChild(): Elem | null {
    return (this.kids.find((kid) => kid instanceof Elem) as Elem | undefined) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  hasAttribute(name: string) {
    return this.attrs.has(name);
  }
  removeAttribute(name: string) {
    this.attrs.delete(name);
  }
  append(...nodes: (Elem | Text)[]) {
    for (const node of nodes) {
      if (node.parentNode) node.parentNode.kids.splice(node.parentNode.kids.indexOf(node), 1);
      node.parentNode = this;
      this.kids.push(node);
    }
  }
  remove() {
    if (this.parentNode) this.parentNode.kids.splice(this.parentNode.kids.indexOf(this), 1);
    this.parentNode = null;
  }
  replaceWith(node: Elem) {
    const parent = this.parentNode!;
    node.parentNode = parent;
    parent.kids.splice(parent.kids.indexOf(this), 1, node);
    this.parentNode = null;
  }
  contains(node: Elem | Text | null): boolean {
    for (let current = node; current; current = current.parentNode)
      if (current === this) return true;
    return false;
  }
  querySelector(selector: string): Elem | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  querySelectorAll(selector: string): Elem[] {
    const tests = selector.split(',').map((part) => part.trim());
    const found: Elem[] = [];
    const visit = (element: Elem) => {
      for (const kid of element.kids) {
        if (!(kid instanceof Elem)) continue;
        if (
          tests.some((test) =>
            test.startsWith('.')
              ? kid.classes.has(test.slice(1))
              : kid.tagName === test.toUpperCase(),
          )
        )
          found.push(kid);
        visit(kid);
      }
    };
    visit(this);
    return found;
  }
  /** The element as markup: tag, sorted classes and attributes, children. */
  markup(): string {
    const classes = [...this.classes].sort().join(' ');
    const attrs = [...this.attrs].map(([name, value]) => ` ${name}="${value}"`).join('');
    const inside = this.kids.map((kid) => (kid instanceof Elem ? kid.markup() : kid.data)).join('');
    const tag = this.tagName.toLowerCase();
    return `<${tag}${classes ? ` class="${classes}"` : ''}${attrs}>${inside}</${tag}>`;
  }
}

/** The text element the engine renders for a format: an outer element when it has one. */
function engineText(outer: string | null, inner: string, classes: string[], text: string) {
  const innerElement = new Elem(inner);
  innerElement.classList.add(...classes);
  innerElement.append(new Text(text));
  if (!outer) return innerElement;
  const outerElement = new Elem(outer);
  if (outer === 'code') outerElement.setAttribute('spellcheck', 'false');
  outerElement.append(innerElement);
  return outerElement;
}

const asHtml = (element: Elem) => element as unknown as HTMLElement;

describe('uwg-te-tab-vocabulary: tp-te-code, tp-te-sub and tp-te-sup sit on the semantic element', () => {
  it('inline code carries tp-te-code on the code element, without spellcheck', () => {
    const dom = engineText('code', 'span', ['tp-te-code'], 'x');
    arrangeText(asHtml(dom), LEXICAL_FORMAT.code);
    expect(dom.markup()).toBe('<code class="tp-te-code"><span>x</span></code>');
  });

  it('subscript and superscript carry their class on the sub and sup elements', () => {
    const sub = engineText('sub', 'strong', ['tp-te-bold', 'tp-te-sub'], 'x');
    arrangeText(asHtml(sub), LEXICAL_FORMAT.subscript | LEXICAL_FORMAT.bold);
    expect(sub.markup()).toBe('<sub class="tp-te-sub"><strong class="tp-te-bold">x</strong></sub>');
    const sup = engineText('sup', 'span', ['tp-te-sup'], 'y');
    arrangeText(asHtml(sup), LEXICAL_FORMAT.superscript);
    expect(sup.markup()).toBe('<sup class="tp-te-sup"><span>y</span></sup>');
  });

  it('a highlighted subscript gets a sub element around its text, and loses it with the mark', () => {
    const dom = engineText('mark', 'em', ['tp-te-italic', 'tp-te-sub'], 'x');
    const format = LEXICAL_FORMAT.highlight | LEXICAL_FORMAT.subscript | LEXICAL_FORMAT.italic;
    arrangeText(asHtml(dom), format);
    expect(dom.markup()).toBe(
      '<mark><em class="tp-te-italic"><sub class="tp-te-sub">x</sub></em></mark>',
    );
    // Arranged again with the same format, it stays as it is.
    arrangeText(asHtml(dom), format);
    expect(dom.markup()).toBe(
      '<mark><em class="tp-te-italic"><sub class="tp-te-sub">x</sub></em></mark>',
    );
    // Superscript instead: the element follows; neither: the text returns to the inner element.
    arrangeText(asHtml(dom), LEXICAL_FORMAT.highlight | LEXICAL_FORMAT.superscript);
    expect(dom.markup()).toBe(
      '<mark><em class="tp-te-italic"><sup class="tp-te-sup">x</sup></em></mark>',
    );
    arrangeText(asHtml(dom), LEXICAL_FORMAT.highlight);
    expect(dom.markup()).toBe('<mark><em class="tp-te-italic">x</em></mark>');
  });
});

describe('uwg-te-req-a11y-1: struck text is a deletion', () => {
  it('the element carrying tp-te-strike has the deletion role, as the other engine’s s element has', () => {
    const plain = engineText(null, 'span', ['tp-te-strike'], 'x');
    arrangeText(asHtml(plain), LEXICAL_FORMAT.strike);
    expect(plain.markup()).toBe('<span class="tp-te-strike" role="deletion">x</span>');
    const nested = engineText('mark', 'strong', ['tp-te-bold', 'tp-te-strike'], 'y');
    arrangeText(
      asHtml(nested),
      LEXICAL_FORMAT.highlight | LEXICAL_FORMAT.bold | LEXICAL_FORMAT.strike,
    );
    expect(nested.markup()).toBe(
      '<mark><strong class="tp-te-bold tp-te-strike" role="deletion">y</strong></mark>',
    );
    // Without the format the role goes.
    arrangeText(asHtml(nested), LEXICAL_FORMAT.highlight | LEXICAL_FORMAT.bold);
    expect(nested.markup()).toBe('<mark><strong class="tp-te-bold tp-te-strike">y</strong></mark>');
  });
});

describe('uwg-te-req-pres-2: direction', () => {
  it('a list and a table wrapper carry no dir; the engine writes dir="auto" on them at the top', () => {
    const { editor } = headlessLexical({ html: '<ul><li data-id="a"><p>one</p></li></ul>' });
    editor.read(() => {
      const list = lexical.$getRoot().getFirstChild() as unknown as LexicalListLike;
      const dom = new Elem('ul');
      dom.setAttribute('dir', 'auto');
      paintList(list, asHtml(dom));
      expect(dom.hasAttribute('dir')).toBe(false);
    });
    const wrapper = new Elem('div');
    wrapper.setAttribute('dir', 'auto');
    const table = new Elem('table');
    wrapper.append(table);
    sizeTable(asHtml(wrapper), undefined);
    expect(wrapper.hasAttribute('dir')).toBe(false);
  });

  it('a list item keeps dir="auto" after the engine’s direction step, which removes dir from every element below the top level', () => {
    const captured: { klass: unknown; config: LexicalDomOverrideConfigLike<LexicalNodeLike> }[] =
      [];
    const real: TextEditorLexicalModules = realLexicalModules;
    const modules: TextEditorLexicalModules = {
      ...real,
      html: {
        ...real.html,
        domOverride: (klasses, config) => {
          captured.push({ klass: klasses[0], config });
          return real.html.domOverride(klasses, config);
        },
      },
    };
    const { editor, rt } = headlessLexical({
      modules,
      html: '<ul><li data-id="a"><p>שלום עולם</p></li></ul>',
    });
    captured.length = 0;
    lexicalRenderExtension(rt, { taskCheckbox: 'Done' });
    const item = captured.find((entry) => entry.klass === modules.list.ListItemNode)?.config;
    expect(item).toBeDefined();
    editor.read(() => {
      const list = lexical.$getRoot().getFirstChild() as lexical.ElementNode;
      const node = list.getFirstChild() as unknown as LexicalNodeLike;
      const dom = new Elem('li');
      // The engine creates the element, then sets its direction, then runs the decorate hooks;
      // below the top level its direction step removes `dir`. The same order holds on updates.
      item!.$createDOM?.(node, () => asHtml(dom), editor as never);
      dom.removeAttribute('dir');
      item!.$decorateDOM?.(node, null, asHtml(dom), editor as never);
      expect(dom.getAttribute('dir')).toBe('auto');
    });
  });

  it('table rows and cells carry no dir, so they are laid out in the widget’s direction', () => {
    const captured: { klass: unknown; config: LexicalDomOverrideConfigLike<LexicalNodeLike> }[] =
      [];
    const real: TextEditorLexicalModules = realLexicalModules;
    const modules: TextEditorLexicalModules = {
      ...real,
      html: {
        ...real.html,
        domOverride: (klasses, config) => {
          captured.push({ klass: klasses[0], config });
          return real.html.domOverride(klasses, config);
        },
      },
    };
    const { editor, rt } = headlessLexical({
      modules,
      html: '<table data-id="t1"><tbody><tr><td><p>שלום</p></td></tr></tbody></table>',
    });
    captured.length = 0;
    lexicalRenderExtension(rt, { taskCheckbox: 'Done' });
    const row = captured.find((entry) => entry.klass === modules.table!.TableRowNode)?.config;
    const cell = captured.find((entry) => entry.klass === modules.table!.TableCellNode)?.config;
    expect(row?.$decorateDOM).toBeTypeOf('function');
    expect(cell?.$decorateDOM).toBeTypeOf('function');
    editor.read(() => {
      const table = lexical.$getRoot().getFirstChild() as lexical.ElementNode;
      const rowNode = table.getFirstChild() as lexical.ElementNode;
      const cellNode = rowNode.getFirstChild() as unknown as LexicalNodeLike;
      for (const [config, node, tag] of [
        [row!, rowNode as unknown as LexicalNodeLike, 'tr'],
        [cell!, cellNode, 'td'],
      ] as const) {
        const dom = new Elem(tag);
        // The engine's direction step has run when the decorate hook runs.
        dom.setAttribute('dir', 'auto');
        config.$decorateDOM?.(node, null, asHtml(dom), editor as never);
        expect(dom.hasAttribute('dir')).toBe(false);
      }
    });
  });

  it('a divider carries dir="auto"', () => {
    const hr = new Elem('hr');
    paintDivider(asHtml(hr));
    expect(hr.getAttribute('dir')).toBe('auto');
  });

  it('a custom block that presents a callout carries tp-te-callout beside its own class', () => {
    const document = { createElement: (tag: string) => new Elem(tag) };
    const modules: TextEditorLexicalModules = {
      ...realLexicalModules,
      lexical: { ...realLexicalModules.lexical, $getDocument: () => document as never },
    };
    const note = defineTextEditorBlock({
      name: 'note',
      content: 'inline',
      element: 'aside',
      presents: 'callout',
      tool: { label: 'Note' },
    });
    const { editor } = headlessLexical({
      modules,
      html: '<aside data-type="note" data-id="n1">Frost</aside>',
      nodes: [note],
    });
    editor.read(() => {
      const node = lexical.$getRoot().getFirstChild() as unknown as {
        createDOM(config: never, editor: never): Elem;
      };
      const element = node.createDOM({} as never, editor as never);
      expect(element.tagName.toLowerCase()).toBe('aside');
      expect([...element.classes]).toEqual(['tp-te-block-note', 'tp-te-callout']);
    });
  });

  it('an image host and a custom atom host carry dir="auto"; an inline node does not', () => {
    const document = { createElement: (tag: string) => new Elem(tag) };
    const modules: TextEditorLexicalModules = {
      ...realLexicalModules,
      lexical: { ...realLexicalModules.lexical, $getDocument: () => document as never },
    };
    const { editor } = headlessLexical({
      modules,
      html: '<p data-id="p1">a <span data-type="mention" data-label="Ana">@Ana</span></p><figure data-type="embed" data-id="e1" data-url="https://a.example/"></figure><img data-id="i1" src="https://a.example/a.png" alt="">',
      nodes: corpusNodes,
    });
    editor.read(() => {
      const [paragraph, embed, image] = lexical.$getRoot().getChildren();
      const dom = (node: lexical.LexicalNode | null | undefined) =>
        (node as unknown as { createDOM(config: never, editor: never): Elem }).createDOM(
          {} as never,
          editor as never,
        );
      expect(dom(embed).getAttribute('dir')).toBe('auto');
      expect(dom(image).getAttribute('dir')).toBe('auto');
      const mention = (paragraph as lexical.ElementNode)
        .getChildren()
        .find((child) => lexical.$isDecoratorNode(child));
      expect(dom(mention).hasAttribute('dir')).toBe(false);
    });
  });
});

describe('uwg-te-tab-vocabulary: the engine’s wrapper item of a nested list', () => {
  it('draws no marker of its own', () => {
    expect(LEXICAL_BASE_CSS).toMatch(
      /\[data-lexical-editor\] \.tp-te-nested-item \{\s*list-style-type: none;\s*\}/u,
    );
  });
});

describe('uwg-te-req-pres-2: nested lists are laid out in the widget’s direction', () => {
  it('a list in the wrapper item takes the editing root’s direction, never the one the item’s dir="auto" resolves', () => {
    // The wrapper item holds no text of its own, so its `dir="auto"` resolves left-to-right also in
    // a right-to-left widget; the list in it takes the direction the root inherits instead.
    const rules = cssRules(LEXICAL_BASE_CSS);
    expect(rules.get('[data-lexical-editor]:dir(ltr)')?.get('--tp-te-direction')).toBe('ltr');
    expect(rules.get('[data-lexical-editor]:dir(rtl)')?.get('--tp-te-direction')).toBe('rtl');
    expect(rules.get('[data-lexical-editor] .tp-te-list .tp-te-list')?.get('direction')).toBe(
      'var(--tp-te-direction)',
    );
    for (const [selector, declarations] of rules)
      if (/tp-te-(?:nested-|task-)?item|tp-te-paragraph|^\[data-lexical-editor\]$/u.test(selector))
        expect(declarations.has('direction'), selector).toBe(false);
  });
});

describe('uwg-te-req-tables-1: base CSS and table sizing', () => {
  const css = LEXICAL_BASE_CSS;

  it('the table wrapper scrolls horizontally', () => {
    expect(css).toMatch(
      /\[data-lexical-editor\] \.tp-te-table-wrapper \{\s*overflow-x: auto;\s*\}/u,
    );
  });

  it('the code block is a block; it renders no spellcheck attribute', () => {
    expect(css).toMatch(/\[data-lexical-editor\] \.tp-te-code-block \{[^}]*display: block;/u);
    const code = new Elem('code');
    code.setAttribute('spellcheck', 'false');
    paintCodeBlock(asHtml(code));
    expect(code.hasAttribute('spellcheck')).toBe(false);
  });

  it('the caret is hidden while a cell range is selected', () => {
    expect(css).toMatch(
      /\[data-lexical-editor\]:has\(\.tp-te-table-selection\) \{\s*caret-color: transparent;\s*\}/u,
    );
  });

  it('a table without widths has no minimum; with widths, their sum', () => {
    const wrapper = new Elem('div');
    const table = new Elem('table');
    wrapper.append(table);
    sizeTable(asHtml(wrapper), undefined);
    expect(Object.fromEntries(table.styles)).toEqual({});
    sizeTable(asHtml(wrapper), [100, 48, 60]);
    expect(Object.fromEntries(table.styles)).toEqual({ width: '208px' });
    sizeTable(asHtml(wrapper), undefined);
    expect(Object.fromEntries(table.styles)).toEqual({});
  });
});

describe('uwg-te-tab-vocabulary: a block-selected table is not painted as a cell range', () => {
  function tableDom() {
    const wrapper = new Elem('div');
    const table = new Elem('table');
    table.classList.add('tp-te-table', 'tp-te-table-selection');
    for (let index = 0; index < 2; index += 1) {
      const cell = new Elem('td');
      cell.classList.add('tp-te-cell', 'tp-te-cell-selected');
      table.append(cell);
    }
    wrapper.append(table);
    return { wrapper, table };
  }

  it('without a cell range of the table its cells and table lose the cell-range paint', () => {
    const root = new Elem('div');
    const first = tableDom();
    const second = tableDom();
    root.append(first.wrapper, second.wrapper);
    clearTablePaint(asHtml(root), asHtml(second.wrapper));
    expect(root.querySelectorAll('.tp-te-cell-selected')).toHaveLength(2);
    expect(first.table.classes.has('tp-te-table-selection')).toBe(false);
    expect(second.table.classes.has('tp-te-table-selection')).toBe(true);
    clearTablePaint(asHtml(root), null);
    expect(root.querySelectorAll('.tp-te-cell-selected, .tp-te-table-selection')).toEqual([]);
  });
});

describe('uwg-te-req-engine-12: the root computes the user-select and word-break of the other engine', () => {
  it('the engine’s inline user-select and word-break leave the root; its white-space stays', () => {
    const root = new Elem('div');
    root.style.setProperty('user-select', 'text');
    root.style.setProperty('white-space', 'pre-wrap');
    root.style.setProperty('word-break', 'break-word');
    releaseEngineRootStyle(asHtml(root));
    expect(Object.fromEntries(root.styles)).toEqual({ 'white-space': 'pre-wrap' });
  });

  it('a mount leaves only the engine’s white-space on its root', () => {
    const { modules } = stubLexicalModules();
    const container = fakeContainer();
    createLexicalEngine(modules).mount(
      container as unknown as HTMLElement,
      recordingContext().context,
    );
    const root = container.children[0] as FakeElement;
    expect(Object.fromEntries(root.styles)).toEqual({ 'white-space': 'pre-wrap' });
  });
});

describe('uwg-te-req-prop-3, node-001228: content stops while the root is no tab stop', () => {
  /** An element of a content tree: its class, attributes, children and `disabled`. */
  const node = (tagName: string, className: string, ...children: object[]) => {
    const attributes = new Map<string, string>(className ? [['class', className]] : []);
    return {
      tagName,
      children,
      disabled: false,
      attributes,
      getAttribute: (name: string) => attributes.get(name) ?? null,
      hasAttribute: (name: string) => attributes.has(name),
      setAttribute: (name: string, value: string) => void attributes.set(name, value),
      removeAttribute: (name: string) => void attributes.delete(name),
    };
  };

  it('repaints links, table wrappers and task checkboxes from the runtime’s answer', () => {
    const { rt } = headlessLexical({ html: '<p>calm</p>' });
    const link = node('A', 'tp-te-link');
    const wrapper = node('DIV', 'tp-te-table-wrapper', node('TABLE', 'tp-te-table'));
    const checkbox = node('INPUT', '');
    const loose = node('INPUT', '');
    const root = node(
      'DIV',
      '',
      node('P', 'tp-te-paragraph', link),
      wrapper,
      node(
        'UL',
        'tp-te-list',
        node('LI', 'tp-te-item', node('SPAN', 'tp-te-task-marker', checkbox)),
      ),
      loose,
    );
    rt.contentStopsActive = false;
    repaintContentStops(rt, root as unknown as Element);
    expect([link.getAttribute('tabindex'), wrapper.getAttribute('tabindex')]).toEqual(['-1', '-1']);
    expect([checkbox.disabled, loose.disabled]).toEqual([true, false]);
    rt.contentStopsActive = true;
    repaintContentStops(rt, root as unknown as Element);
    expect([link.hasAttribute('tabindex'), wrapper.hasAttribute('tabindex')]).toEqual([
      false,
      false,
    ]);
    expect(checkbox.disabled).toBe(false);
  });

  it('a task item rendered while the stops are not active has a disabled checkbox', () => {
    const { editor, rt } = headlessLexical({
      html: '<ul data-type="task"><li data-id="t1" data-checked="false"><p>open</p></li></ul>',
    });
    const input = { ...node('INPUT', ''), checked: false };
    const marker = { querySelector: () => input };
    const dom = {
      ...node('LI', 'tp-te-item tp-te-task-item'),
      classList: { contains: () => true, toggle: () => true },
      querySelector: () => marker,
    };
    editor.read(() => {
      const list = lexical.$getRoot().getFirstChild() as unknown as LexicalListLike;
      const item = list.getChildren()[0] as never;
      rt.contentStopsActive = false;
      syncListItem(rt, item, dom as unknown as HTMLElement, 'Done');
      expect(input.disabled).toBe(true);
      rt.contentStopsActive = true;
      syncListItem(rt, item, dom as unknown as HTMLElement, 'Done');
      expect(input.disabled).toBe(false);
    });
  });
});
