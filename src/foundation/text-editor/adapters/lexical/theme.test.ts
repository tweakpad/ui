/**
 * The vocabulary on Lexical: the theme and the DOM render overrides (Widgets `uwg-te-tab-vocabulary`,
 * `uwg-te-req-pres-2`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { headlessLexical, realLexicalModules } from './lexical-stubs.test.js';
import type {
  LexicalElementLike,
  LexicalListItemLike,
  LexicalListLike,
  LexicalTextLike,
} from './modules.js';
import { paintCell, paintList, paintText, syncListItem } from './render.js';
import { lexicalTheme } from './theme.js';

/** A small element: classes, attributes, children and the queries the overrides use. */
class El {
  readonly attrs = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly kids: El[] = [];
  parent: El | null = null;
  text = '';
  type = '';
  tabIndex = 0;
  draggable = true;
  checked = false;
  listeners: string[] = [];
  readonly ownerDocument = { createElement: (tag: string) => new El(tag) };
  constructor(readonly tagName: string) {}
  readonly classList = {
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) =>
      void (on ? this.classes.add(name) : this.classes.delete(name)),
  };
  set className(value: string) {
    this.classes.clear();
    for (const name of value.split(/\s+/)) if (name) this.classes.add(name);
  }
  get firstElementChild(): El | null {
    return this.kids[0] ?? null;
  }
  get childNodes(): unknown[] {
    return this.text ? [this.text] : this.kids;
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
  append(...children: El[]) {
    for (const child of children) {
      child.parent = this;
      this.kids.push(child);
    }
  }
  prepend(child: El) {
    child.parent = this;
    this.kids.unshift(child);
  }
  remove() {
    if (this.parent) this.parent.kids.splice(this.parent.kids.indexOf(this), 1);
    this.parent = null;
  }
  querySelector(selector: string): El | null {
    const scoped = /^:scope > \.(.+)$/.exec(selector);
    if (scoped) return this.kids.find((kid) => kid.classes.has(scoped[1]!)) ?? null;
    for (const kid of this.kids) {
      if (kid.tagName === selector) return kid;
      const found = kid.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  addEventListener(type: string) {
    this.listeners.push(type);
  }
}

const element = (tag: string) => new El(tag) as unknown as HTMLElement & El;

describe('uwg-te-tab-vocabulary: the theme', () => {
  it('one theme object per namespace, not frozen, since the engine caches class lists on it', () => {
    const theme = lexicalTheme(realLexicalModules.lexical);
    expect(lexicalTheme(realLexicalModules.lexical)).toBe(theme);
    expect(lexicalTheme({ ...realLexicalModules.lexical })).not.toBe(theme);
    expect(Object.isFrozen(theme)).toBe(false);
  });

  it('holds the vocabulary keys', () => {
    expect(lexicalTheme(realLexicalModules.lexical)).toEqual({
      paragraph: 'tp-te-paragraph',
      heading: Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((level) => [`h${level}`, 'tp-te-heading']),
      ),
      quote: 'tp-te-quote',
      code: 'tp-te-code-block',
      list: {
        ul: 'tp-te-list',
        ol: 'tp-te-list tp-te-list-ordered',
        checklist: 'tp-te-list-task',
        listitem: 'tp-te-item',
        listitemChecked: 'tp-te-task-item tp-te-checked',
        listitemUnchecked: 'tp-te-task-item',
        nested: { listitem: 'tp-te-nested-item' },
      },
      link: 'tp-te-link',
      text: {
        bold: 'tp-te-bold',
        italic: 'tp-te-italic',
        underline: 'tp-te-underline',
        strikethrough: 'tp-te-strike',
        underlineStrikethrough: 'tp-te-underline tp-te-strike',
        code: 'tp-te-code',
        subscript: 'tp-te-sub',
        superscript: 'tp-te-sup',
      },
      hr: 'tp-te-divider',
      hrSelected: '',
      table: 'tp-te-table',
      tableScrollableWrapper: 'tp-te-table-wrapper',
      tableCell: 'tp-te-cell',
      tableCellHeader: 'tp-te-header-cell',
      tableCellSelected: 'tp-te-cell-selected',
      tableSelection: 'tp-te-table-selection',
      blockCursor: 'tp-te-block-cursor',
    });
  });
});

describe('uwg-te-req-pres-2: the render overrides', () => {
  const html =
    '<p data-id="p1"><span data-color="blue">blue</span> <mark data-color="green"><span data-color="red">both</span></mark></p>' +
    '<ul data-type="task"><li data-id="t1" data-checked="true"><p>done</p><ul data-type="task"><li data-id="t2" data-checked="false"><p>open</p></li></ul></li></ul>' +
    '<ul><li data-id="b1"><p>bullet</p></li></ul>' +
    '<table data-id="tb"><tbody><tr><td data-background="pink"><p>c</p></td></tr></tbody></table>';

  it('colors paint names: the color on its run, the highlight on its outer element', () => {
    const { editor, rt } = headlessLexical({ html });
    editor.read(() => {
      const [blue, , both] = (
        lexical.$getRoot().getFirstChild() as unknown as LexicalElementLike
      ).getChildren() as LexicalTextLike[];
      const plain = element('span');
      plain.text = 'blue';
      paintText(rt, blue!, plain);
      expect([...plain.classes]).toEqual(['tp-te-color']);
      expect(plain.getAttribute('data-color')).toBe('blue');
      const outer = element('mark');
      const inner = element('span');
      inner.text = 'both';
      outer.append(inner);
      paintText(rt, both!, outer);
      expect([...outer.classes, outer.getAttribute('data-color')]).toEqual([
        'tp-te-highlight',
        'green',
      ]);
      expect([...inner.classes, inner.getAttribute('data-color')]).toEqual(['tp-te-color', 'red']);
      expect(outer.hasAttribute('style') || inner.hasAttribute('style')).toBe(false);
    });
  });

  it('a task item holds a native checkbox in a non-editable marker; every item has dir="auto"', () => {
    const { editor, rt } = headlessLexical({ html });
    editor.read(() => {
      const list = lexical.$getRoot().getChildAtIndex(1) as unknown as LexicalListLike;
      const [task, wrapper] = list.getChildren() as LexicalListItemLike[];
      const dom = element('li');
      dom.setAttribute('role', 'checkbox');
      dom.setAttribute('aria-checked', 'true');
      dom.setAttribute('tabindex', '-1');
      syncListItem(rt, task!, dom, 'Done');
      expect(Object.fromEntries(dom.attrs)).toEqual({ dir: 'auto' });
      const marker = dom.firstElementChild!;
      expect([...marker.classes, marker.getAttribute('contenteditable')]).toEqual([
        'tp-te-task-marker',
        'false',
      ]);
      const input = marker.firstElementChild!;
      expect([
        input.type,
        input.tabIndex,
        input.draggable,
        input.checked,
        input.getAttribute('aria-label'),
      ]).toEqual(['checkbox', -1, false, true, 'Done']);
      expect(input.listeners).toEqual(['click']);
      // A wrapper item holds no marker and no task classes.
      const wrapperDom = element('li');
      wrapperDom.className = 'tp-te-item tp-te-task-item tp-te-nested-item';
      syncListItem(rt, wrapper!, wrapperDom, 'Done');
      expect([...wrapperDom.classes]).toEqual(['tp-te-item', 'tp-te-nested-item']);
      expect(wrapperDom.kids).toEqual([]);
      expect(wrapperDom.getAttribute('dir')).toBe('auto');
    });
  });

  it('a task list carries only the task class, a bullet list the bullet class', () => {
    const { editor } = headlessLexical({ html });
    editor.read(() => {
      const task = lexical.$getRoot().getChildAtIndex(1) as unknown as LexicalListLike;
      const bullet = lexical.$getRoot().getChildAtIndex(2) as unknown as LexicalListLike;
      const taskDom = element('ul');
      taskDom.className = 'tp-te-list tp-te-list-bullet tp-te-list-task';
      paintList(task, taskDom);
      expect([...taskDom.classes]).toEqual(['tp-te-list', 'tp-te-list-task']);
      const bulletDom = element('ul');
      bulletDom.className = 'tp-te-list tp-te-list-task';
      paintList(bullet, bulletDom);
      expect([...bulletDom.classes]).toEqual(['tp-te-list', 'tp-te-list-bullet']);
    });
  });

  it('a cell background is a data-background name', () => {
    const { editor, rt } = headlessLexical({ html });
    editor.read(() => {
      const table = lexical.$getRoot().getChildAtIndex(3) as unknown as LexicalElementLike;
      const cell = (table.getFirstChild() as unknown as LexicalElementLike).getFirstChild()!;
      const dom = element('td');
      paintCell(rt, cell, dom);
      expect(dom.getAttribute('data-background')).toBe('pink');
    });
  });
});
