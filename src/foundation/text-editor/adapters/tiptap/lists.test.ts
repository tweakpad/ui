import { describe, expect, it } from 'vitest';
import type {
  TextEditorPortableBlock,
  TextEditorPortableDraft,
  TextEditorPortableListItem,
} from '../../content/portable.js';
import { adjacentListJoins, listEnter, listTab } from './lists.js';
import { pointToPos } from './mapping.js';
import { taskItemView, type NodeViewProps } from './schema.js';
import {
  ruleView,
  TIPTAP_MODULES,
  caretAt,
  htmlOf,
  keyedTiptap,
  selectIn,
  shapeOf,
} from './tiptap-stubs.test.js';
import type { TestView } from './tiptap-stubs.test.js';
import { portableOf, type TiptapEnv } from './work.js';

type Kind = TextEditorPortableListItem['type'];

const item = (
  id: string,
  text: string,
  children: TextEditorPortableListItem[] = [],
  type: Kind = 'list-bullet',
): TextEditorPortableListItem =>
  ({
    type,
    id,
    content: text ? [{ type: 'text', text }] : [],
    children,
    ...(type === 'list-task' ? { checked: false } : {}),
  }) as TextEditorPortableListItem;

/** The block tree of the view's document as identifiers, nested items in brackets. */
function shape(env: TiptapEnv, view: TestView): unknown[] {
  const visit = (blocks: readonly TextEditorPortableBlock[]): unknown[] =>
    blocks.map((block) =>
      'children' in block && block.children.length > 0
        ? [block.id, visit(block.children)]
        : block.id,
    );
  return visit(portableOf(view.state.doc, env).blocks);
}

/** A view with the caret at a text point. */
function at(draft: TextEditorPortableDraft, block: string, offset = 0) {
  const mounted = ruleView(draft);
  const pos = pointToPos(mounted.view.state.doc, { block, offset })!;
  const { view } = mounted;
  view.dispatch(
    view.state.tr.setSelection(TIPTAP_MODULES.state.TextSelection.create(view.state.doc, pos)),
  );
  return mounted;
}

const undo = (view: TestView) => TIPTAP_MODULES.history.undo(view.state, (tr) => view.dispatch(tr));

describe('Tiptap list keys (uwg-te-req-parity-1, uwg-te-req-key-3)', () => {
  const list = { blocks: [item('i1', 'one'), item('i2', 'two'), item('i3', 'three')] };

  it('Tab nests the item as the last nested item of its previous sibling; Shift+Tab unnests it', () => {
    const { view, env } = at(list, 'i2', 1);
    expect(listTab(env, view, false)).toBe(true);
    expect(shape(env, view)).toEqual([['i1', ['i2']], 'i3']);
    expect(view.state.selection.$head.parent.textContent).toBe('two');
    expect(listTab(env, view, true)).toBe(true);
    expect(shape(env, view)).toEqual(['i1', 'i2', 'i3']);
  });

  it('Tab on a first item is consumed without effect', () => {
    const { view, env } = at(list, 'i1');
    const before = view.state.doc;
    expect(listTab(env, view, false)).toBe(true);
    expect(view.state.doc).toBe(before);
  });

  it('unnesting a nested item places it after its parent, its following siblings becoming its items', () => {
    const { view, env } = at(
      { blocks: [item('i1', 'one', [item('a', 'a'), item('b', 'b'), item('c', 'c')])] },
      'b',
    );
    expect(listTab(env, view, true)).toBe(true);
    expect(shape(env, view)).toEqual([
      ['i1', ['a']],
      ['b', ['c']],
    ]);
  });

  it('unnesting a top-level item turns it into a paragraph, its nested items following', () => {
    const { view, env } = at(
      { blocks: [item('i1', 'one', [item('a', 'a')]), item('i2', 'two')] },
      'i1',
    );
    expect(listTab(env, view, true)).toBe(true);
    const blocks = portableOf(view.state.doc, env).blocks;
    expect(blocks.map((block) => [block.type, block.id])).toEqual([
      ['paragraph', 'i1'],
      ['list-bullet', 'a'],
      ['list-bullet', 'i2'],
    ]);
  });

  it('Tab outside a list item is left to the widget', () => {
    const { view, env } = at({ blocks: [{ type: 'paragraph', id: 'p1', content: [] }] }, 'p1');
    expect(listTab(env, view, false)).toBe(false);
  });

  it('Enter in an empty nested item unnests it by one level, keeping its identifier', () => {
    const { view, env } = at({ blocks: [item('i1', 'one', [item('a', 'a'), item('e', '')])] }, 'e');
    expect(listEnter(env, view)).toBe(true);
    expect(shape(env, view)).toEqual([['i1', ['a']], 'e']);
    expect(view.state.selection.$head.parent.textContent).toBe('');
  });

  it('Enter in an empty top-level item turns it into a paragraph after the list, splitting it', () => {
    const { view, env } = at(
      { blocks: [item('i1', 'one'), item('e', ''), item('i3', 'three')] },
      'e',
    );
    expect(listEnter(env, view)).toBe(true);
    const blocks = portableOf(view.state.doc, env).blocks;
    expect(blocks.map((block) => [block.type, block.id])).toEqual([
      ['list-bullet', 'i1'],
      ['paragraph', 'e'],
      ['list-bullet', 'i3'],
    ]);
    // Two lists in the engine: the paragraph splits the list.
    expect(view.state.doc.childCount).toBe(3);
    // Enter in a non-empty item is the engine's split.
    const other = at({ blocks: [item('i1', 'one')] }, 'i1', 1);
    expect(listEnter(other.env, other.view)).toBe(false);
  });

  it('each list key change is an undo step of its own', () => {
    const { view, env } = at(list, 'i2', 1);
    view.dispatch(view.state.tr.insertText('x'));
    listTab(env, view, false);
    undo(view);
    expect(shape(env, view)).toEqual(['i1', 'i2', 'i3']);
    expect(view.state.doc.textContent).toBe('onetxwothree');
  });
});

describe('Tiptap adjacent lists (uwg-te-lis-up-i2: lists of one kind merge)', () => {
  it('adjacent lists of one kind merge after a change; lists of different kinds stay apart', () => {
    const { view, env } = ruleView({
      blocks: [
        item('i1', 'one'),
        { type: 'paragraph', id: 'p1', content: [] },
        item('i2', 'two'),
        item('o1', 'first', [], 'list-ordered'),
      ],
    });
    expect(view.state.doc.childCount).toBe(4);
    const paragraphPos = view.state.doc.child(0).nodeSize;
    view.dispatch(view.state.tr.delete(paragraphPos, paragraphPos + 2));
    expect(view.state.doc.childCount).toBe(2);
    expect(view.state.doc.child(0).childCount).toBe(2);
    expect(shape(env, view)).toEqual(['i1', 'i2', 'o1']);
    expect(adjacentListJoins(view.state.doc)).toEqual([]);
  });

  it('nested lists of one kind merge inside their item', () => {
    const { view } = ruleView({
      blocks: [item('i1', 'one', [item('a', 'a'), item('b', 'b')])],
    });
    const parent = view.state.doc.child(0).child(0);
    const nested = parent.child(1);
    // Replace the nested list with two lists of one item each: the plugin merges them again.
    const start = 2 + parent.child(0).nodeSize;
    const split = [
      nested.type.create(null, [nested.child(0)]),
      nested.type.create(null, [nested.child(1)]),
    ];
    view.dispatch(view.state.tr.replaceWith(start, start + nested.nodeSize, split));
    const merged = view.state.doc.child(0).child(0);
    expect(merged.childCount).toBe(2);
    expect(merged.child(1).childCount).toBe(2);
  });
});

/** A minimal element for the task item view, in Node. */
class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, (event: { preventDefault(): void }) => void>();
  className = '';
  dir = '';
  type = '';
  tabIndex = 0;
  checked = false;
  constructor(readonly tagName: string) {}
  readonly classList = {
    toggle: (name: string, on: boolean) => {
      const names = new Set(this.className.split(' ').filter(Boolean));
      if (on) names.add(name);
      else names.delete(name);
      this.className = [...names].join(' ');
    },
  };
  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  addEventListener(type: string, listener: (event: { preventDefault(): void }) => void): void {
    this.listeners.set(type, listener);
  }
  removeEventListener(type: string): void {
    this.listeners.delete(type);
  }
  contains(node: unknown): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }
}

describe('Tiptap task item view (uwg-te-req-blocks-7, uwg-te-tab-vocabulary r4)', () => {
  it('renders a native checkbox out of the focus order in a non-editable marker, named from the strings', () => {
    const { view } = ruleView({ blocks: [item('t1', 'done', [], 'list-task')] });
    const node = view.state.doc.child(0).child(0);
    const document = { createElement: (tag: string) => new FakeElement(tag) };
    const rendered = taskItemView({ taskCheckbox: 'Done' })({
      node,
      view: { dom: { ownerDocument: document } },
      HTMLAttributes: {},
    } as unknown as NodeViewProps);
    const li = rendered.dom as unknown as FakeElement;
    expect(li.tagName).toBe('li');
    expect(li.className).toBe('tp-te-item tp-te-task-item');
    expect(li.dir).toBe('auto');
    const [marker, content] = li.children;
    expect(marker!.className).toBe('tp-te-task-marker');
    expect(marker!.attributes.get('contenteditable')).toBe('false');
    const checkbox = marker!.children[0]!;
    expect(checkbox).toMatchObject({
      tagName: 'input',
      type: 'checkbox',
      tabIndex: -1,
      checked: false,
    });
    expect(checkbox.attributes.get('aria-label')).toBe('Done');
    // No hidden label copy and no style.
    expect(marker!.children).toHaveLength(1);
    expect([...checkbox.attributes.keys(), ...marker!.attributes.keys()]).not.toContain('style');
    expect(rendered.contentDOM).toBe(content);
    // The native toggle is cancelled; the widget toggles the item.
    let prevented = false;
    checkbox.listeners.get('click')!({ preventDefault: () => (prevented = true) });
    expect(prevented).toBe(true);
    // A checked node checks the box and adds the class.
    const checked = node.type.create({ ...node.attrs, checked: true }, node.content);
    expect(rendered.update!(checked)).toBe(true);
    expect(li.className).toBe('tp-te-item tp-te-task-item tp-te-checked');
    expect(checkbox.checked).toBe(true);
    expect(li.attributes.get('data-checked')).toBe('true');
    expect(
      rendered.ignoreMutation!({ type: 'attributes', target: checkbox as unknown as Node }),
    ).toBe(true);
    rendered.destroy!();
    expect(checkbox.listeners.has('click')).toBe(false);
  });
});

describe('uwg-te-req-parity-1, uwg-te-req-key-3: Tab over a mixed selection', () => {
  it('Tab nests the list items a mixed selection touches; outside lists it is not consumed', () => {
    const source =
      '<p data-id="p">calm</p><ul><li data-id="a"><p>one</p></li><li data-id="b"><p>two</p></li></ul><p data-id="q">tide</p>';
    const mixed = keyedTiptap(source);
    selectIn(mixed.instance, {
      kind: 'text',
      anchor: { block: 'p', offset: 1 },
      head: { block: 'b', offset: 1 },
    });
    expect(mixed.keys.press('Tab')).toBe(true);
    expect(shapeOf(mixed.instance)).toBe(
      '<p data-id="p">calm</p>\n<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul>\n<p data-id="q">tide</p>',
    );
    const outside = keyedTiptap(source);
    selectIn(outside.instance, caretAt('q', 1));
    expect(outside.keys.press('Tab')).toBe(false);
    const first = keyedTiptap(source);
    selectIn(first.instance, caretAt('a', 1));
    expect(first.keys.press('Tab')).toBe(true);
    expect(htmlOf(first.instance)).toBe(
      source.replace('</p><ul>', '</p>\n<ul>').replace('</ul><p', '</ul>\n<p'),
    );
  });
});
