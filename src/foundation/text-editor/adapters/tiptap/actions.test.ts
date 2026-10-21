import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import { defineTextEditorInline } from '../../nodes.js';
import { TEXT_EDITOR_COLORS } from '../../palette.js';
import {
  canonicalize,
  type TextEditorPortableDocument,
  type TextEditorPortableTable,
} from '../../content/portable.js';
import { indentItems, outdentItems, setBlockType } from '../shared/block-edits.js';
import { deleteBlocks, moveBlocks } from '../shared/structure-edits.js';
import { markActionAllowed } from '../shared/selection-state.js';
import { tableEdit } from '../shared/table-edits.js';
import { TP_ACTION_META } from './work.js';
import { fromTiptapJson } from './mapping.js';
import type { TiptapTransactionLike } from './modules.js';
import { sequentialIds, TEST_URLS } from '../shared/test-helpers.test.js';
import {
  html,
  mountTiptap,
  type MountOptions,
  caretAt,
  htmlOf,
  runActions,
} from './tiptap-stubs.test.js';

/** A mounted instance whose dispatched transactions are recorded. */
function editor(markup: string, options: MountOptions = {}) {
  const mounted = mountTiptap({ ...options, content: html(markup) });
  const dispatched: TiptapTransactionLike[] = [];
  const dispatch = mounted.view.dispatch.bind(mounted.view);
  mounted.view.dispatch = (tr) => {
    dispatched.push(tr);
    dispatch(tr);
  };
  const run = (...actions: TextEditorAction[]) =>
    mounted.instance.execute(actions, { reason: 'imperative-action' });
  const select = (block: string, from: number, to = from) =>
    run({
      type: 'selection.set',
      selection: { kind: 'text', anchor: { block, offset: from }, head: { block, offset: to } },
    });
  const content = () => mounted.instance.getContent('html');
  return { ...mounted, dispatched, run, select, content };
}

describe('Tiptap execute and can (uwg-te-req-engine-5)', () => {
  it('V-019: can is a dry run that never throws, dispatches nothing and answers false for malformed actions', () => {
    const { instance, dispatched, context } = editor('<p data-id="p1">calm</p>');
    const before = instance.getState();
    const malformed = [
      { type: 'mark.blink' },
      { type: 'mark.toggle', mark: 'blink' },
      { type: 'mark.color', mark: 'highlight', color: 'teal' },
      { type: 'blocks.delete', ids: [] },
      { type: 'text.delete', range: { block: 'p1', from: 3, to: 1 } },
      { type: 'content.set', content: '<p>x</p>', format: 'rtf', history: 'push' },
      null,
      'mark.toggle',
    ] as unknown as TextEditorAction[];
    for (const action of malformed) expect(instance.can(action)).toBe(false);
    const valid: TextEditorAction[] = [
      { type: 'text.insert', text: 'x', range: { block: 'p1', from: 0, to: 0 } },
      { type: 'blocks.delete', ids: ['p1'] },
      { type: 'block.set-type', kind: 'heading', attrs: { level: 2 }, ids: ['p1'] },
      { type: 'blocks.insert', kind: 'divider' },
      { type: 'content.set', content: '<p>x</p>', format: 'html', history: 'push' },
    ];
    for (const action of valid) expect(instance.can(action)).toBe(true);
    // Until a selection is placed, actions on the selection do not apply .
    expect(instance.can({ type: 'text.insert', text: 'x' })).toBe(false);
    expect(instance.can({ type: 'blocks.delete', ids: ['missing'] })).toBe(false);
    expect(instance.can({ type: 'history.undo' })).toBe(false);
    expect(dispatched).toEqual([]);
    expect(context.calls).toEqual(['ready']);
    expect(instance.getState()).toBe(before);
    expect(instance.getContent('html')).toBe('<p data-id="p1">calm</p>');
  });

  it('V-039, V-040, V-041, V-042, V-043 and V-044: a list applies as one transaction with the action meta and a closed history', () => {
    const { run, select, dispatched, instance, context } = editor('<p data-id="p1">calm sea</p>');
    select('p1', 0, 4);
    dispatched.length = 0;
    expect(
      run(
        { type: 'mark.toggle', mark: 'bold' },
        { type: 'mark.color', mark: 'text-color', color: 'blue' },
      ),
    ).toBe(true);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]!.getMeta(TP_ACTION_META)).toEqual({
      reason: 'imperative-action',
      type: 'mark.toggle',
    });
    expect(context.changes.at(-1)).toEqual({
      cause: 'action',
      reason: 'imperative-action',
      sourceEvent: undefined,
      action: 'mark.toggle',
    });
    expect(instance.getState().history.undo).toBe(true);
    expect(run({ type: 'history.undo' })).toBe(true);
    expect(instance.getContent('html')).toBe('<p data-id="p1">calm sea</p>');
  });

  it('a list whose second action does not apply changes nothing (atomic)', () => {
    const { run, select, dispatched, content } = editor('<p data-id="p1">calm</p>');
    select('p1', 0, 4);
    dispatched.length = 0;
    expect(
      run({ type: 'mark.toggle', mark: 'bold' }, { type: 'blocks.delete', ids: ['missing'] }),
    ).toBe(false);
    expect(dispatched).toEqual([]);
    expect(content()).toBe('<p data-id="p1">calm</p>');
  });

  it('history actions stand alone; selection.set alone adds no undo step and notifies state only', () => {
    const { run, select, instance, context } = editor('<p data-id="p1">calm</p>');
    expect(run({ type: 'history.undo' }, { type: 'mark.toggle', mark: 'bold' })).toBe(false);
    const calls = context.calls.length;
    expect(select('p1', 1, 3)).toBe(true);
    // The selection, then the focus that applying moves into the root: state notifications only.
    expect(context.calls.slice(calls).every((call) => call === 'state')).toBe(true);
    expect(context.calls.length).toBeGreaterThan(calls);
    expect(instance.getState().history.undo).toBe(false);
  });

  it('read-only rejects every change but content.set; selection.set still applies', () => {
    const { run, select, instance } = editor('<p data-id="p1">calm</p>', { editable: false });
    expect(run({ type: 'text.insert', text: 'x' })).toBe(false);
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
    expect(select('p1', 0, 2)).toBe(true);
    expect(run({ type: 'content.set', content: 'storm', format: 'text', history: 'push' })).toBe(
      true,
    );
    expect(instance.getContent('text')).toBe('storm');
  });

  it('an action ends its history event: input after it is a separate undo step', () => {
    const { run, select, view, instance } = editor('<p data-id="p1">calm</p>');
    select('p1', 4);
    run({ type: 'text.insert', text: ' sea' });
    view.dispatch(view.state.tr.insertText('!'));
    run({ type: 'history.undo' });
    expect(instance.getContent('text')).toBe('calm sea');
    run({ type: 'history.undo' });
    expect(instance.getContent('text')).toBe('calm');
  });
});

describe('Tiptap marks and links (uwg-te-tab-actions r1)', () => {
  it('V-039: mark.toggle turns each mark on over the selection and off when it covers it', () => {
    const marks = [
      ['bold', '<strong>calm</strong>'],
      ['italic', '<em>calm</em>'],
      ['underline', '<u>calm</u>'],
      ['strike', '<s>calm</s>'],
      ['code', '<code>calm</code>'],
      ['superscript', '<sup>calm</sup>'],
      ['subscript', '<sub>calm</sub>'],
    ] as const;
    for (const [mark, markup] of marks) {
      const { run, select, content } = editor('<p data-id="p1">calm sea</p>');
      select('p1', 0, 4);
      expect(run({ type: 'mark.toggle', mark })).toBe(true);
      expect(content()).toBe(`<p data-id="p1">${markup} sea</p>`);
      expect(run({ type: 'mark.toggle', mark })).toBe(true);
      expect(content()).toBe('<p data-id="p1">calm sea</p>');
    }
  });

  it('V-039: superscript and subscript exclude each other; inline code keeps out other marks', () => {
    const { run, select, content, instance } = editor('<p data-id="p1">calm sea</p>');
    select('p1', 0, 4);
    run({ type: 'mark.toggle', mark: 'superscript' });
    run({ type: 'mark.toggle', mark: 'subscript' });
    expect(content()).toBe('<p data-id="p1"><sub>calm</sub> sea</p>');
    run({ type: 'mark.toggle', mark: 'code' });
    expect(content()).toBe('<p data-id="p1"><code>calm</code> sea</p>');
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
  });

  it('V-039: mark.color sets each palette name and clears with null, on both channels', () => {
    for (const color of TEXT_EDITOR_COLORS) {
      const { run, select, content } = editor('<p data-id="p1">calm</p>');
      select('p1', 0, 4);
      run({ type: 'mark.color', mark: 'text-color', color });
      run({ type: 'mark.color', mark: 'highlight', color });
      expect(content()).toContain(`data-color="${color}"`);
      run({ type: 'mark.color', mark: 'text-color', color: null });
      run({ type: 'mark.color', mark: 'highlight', color: null });
      expect(content()).toBe('<p data-id="p1">calm</p>');
    }
  });

  it('V-039: at a caret the marks change what typed text takes, not the document', () => {
    const { run, select, content, instance, dispatched } = editor('<p data-id="p1">calm</p>');
    select('p1', 4);
    dispatched.length = 0;
    run({ type: 'mark.toggle', mark: 'bold' });
    expect(content()).toBe('<p data-id="p1">calm</p>');
    expect(instance.getState().contentVersion).toBe(1);
    run({ type: 'text.insert', text: ' sea' });
    expect(content()).toBe('<p data-id="p1">calm<strong> sea</strong></p>');
  });

  it('V-039: mark.clear removes every mark but links', () => {
    const { run, select, content } = editor(
      '<p data-id="p1"><a href="https://harbor.example/"><strong><em>calm</em></strong></a> sea</p>',
    );
    select('p1', 0, 8);
    expect(run({ type: 'mark.clear' })).toBe(true);
    expect(content()).toBe('<p data-id="p1"><a href="https://harbor.example/">calm</a> sea</p>');
  });

  it('V-039: link.set links the selection, a range or the whole link at the caret, and inserts text at a caret', () => {
    const { run, select, content, instance } = editor('<p data-id="p1">calm sea</p>');
    select('p1', 0, 4);
    expect(run({ type: 'link.set', href: 'https://a.example/' })).toBe(true);
    expect(content()).toBe('<p data-id="p1"><a href="https://a.example/">calm</a> sea</p>');
    // The range stays selected.
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p1', offset: 4 },
    });
    select('p1', 2);
    run({ type: 'link.set', href: 'https://b.example/' });
    expect(content()).toBe('<p data-id="p1"><a href="https://b.example/">calm</a> sea</p>');
    run({ type: 'link.set', href: 'https://c.example/', range: { block: 'p1', from: 5, to: 8 } });
    expect(content()).toContain('<a href="https://c.example/">sea</a>');
    expect(instance.can({ type: 'link.set', href: 'javascript:alert(1)' })).toBe(false);
    // A caret at the edge of a link is at that link.
    select('p1', 4);
    expect(run({ type: 'link.set', href: 'https://e.example/' })).toBe(true);
    expect(content()).toContain('<a href="https://e.example/">calm</a>');
    // At a caret outside any link, text inserts as linked text.
    const plain = editor('<p data-id="p1">calm sea</p>');
    plain.select('p1', 8);
    expect(plain.run({ type: 'link.set', href: 'https://d.example/', text: ' now' })).toBe(true);
    expect(plain.content()).toContain('<a href="https://d.example/"> now</a>');
    plain.select('p1', 2);
    expect(plain.run({ type: 'link.set', href: 'https://d.example/' })).toBe(false);
  });

  it('V-039: link.unset removes the whole link at the caret or over a range', () => {
    const { run, select, content, instance } = editor(
      '<p data-id="p1"><a href="https://a.example/">calm</a> sea</p>',
    );
    select('p1', 2);
    expect(run({ type: 'link.unset' })).toBe(true);
    expect(content()).toBe('<p data-id="p1">calm sea</p>');
    expect(instance.can({ type: 'link.unset' })).toBe(false);
  });
});

describe('Tiptap block attributes (uwg-te-tab-actions r2)', () => {
  it('V-040: block.set-type turns a block into each textblock kind, keeping its identifier', () => {
    const kinds = [
      [{ kind: 'heading', attrs: { level: 1 } }, '<h1 data-id="p1">tide</h1>'],
      [{ kind: 'heading', attrs: { level: 6 } }, '<h6 data-id="p1">tide</h6>'],
      [{ kind: 'quote' }, '<blockquote data-id="p1"><p>tide</p></blockquote>'],
      [
        { kind: 'code', attrs: { language: 'ts' } },
        '<pre data-id="p1"><code class="language-ts">tide</code></pre>',
      ],
      [{ kind: 'list-bullet' }, '<ul><li data-id="p1"><p>tide</p></li></ul>'],
      [{ kind: 'list-ordered' }, '<ol><li data-id="p1"><p>tide</p></li></ol>'],
      [
        { kind: 'list-task' },
        '<ul data-type="task"><li data-id="p1" data-checked="false"><p>tide</p></li></ul>',
      ],
    ] as const;
    for (const [action, markup] of kinds) {
      const { run, select, content, dispatched } = editor('<p data-id="p1">tide</p>');
      select('p1', 2);
      dispatched.length = 0;
      expect(run({ type: 'block.set-type', ...action })).toBe(true);
      expect(dispatched).toHaveLength(1);
      expect(content()).toBe(markup);
    }
  });

  it('V-040: toggle turns blocks already of the kind into paragraphs; the caret keeps its point', () => {
    const { run, select, content, instance } = editor('<h2 data-id="h1">tide</h2>');
    select('h1', 3);
    run({ type: 'block.set-type', kind: 'heading', attrs: { level: 2 }, toggle: true });
    expect(content()).toBe('<p data-id="h1">tide</p>');
    expect(instance.getState().selection).toMatchObject({ anchor: { block: 'h1', offset: 3 } });
  });

  it('V-040: block.set-attrs changes the attributes of a block kind; others fail', () => {
    const { run, content, instance } = editor(
      '<ul data-type="task"><li data-id="t1" data-checked="false"><p>bail</p></li></ul><pre data-id="c1"><code>x</code></pre><img data-id="i1" src="https://a.example/a.png" alt="A">',
    );
    expect(run({ type: 'block.set-attrs', id: 't1', attrs: { checked: true } })).toBe(true);
    expect(run({ type: 'block.set-attrs', id: 'c1', attrs: { language: 'rust' } })).toBe(true);
    expect(
      run({
        type: 'block.set-attrs',
        id: 'i1',
        attrs: { src: 'https://b.example/b.png', alt: 'B', width: 64 },
      }),
    ).toBe(true);
    expect(content()).toContain('data-checked="true"');
    expect(content()).toContain('class="language-rust"');
    expect(content()).toContain('src="https://b.example/b.png"');
    expect(instance.can({ type: 'block.set-attrs', id: 't1', attrs: { checked: 'yes' } })).toBe(
      false,
    );
    expect(
      instance.can({ type: 'block.set-attrs', id: 'i1', attrs: { src: 'javascript:x' } }),
    ).toBe(false);
    expect(instance.can({ type: 'block.set-attrs', id: 'c1', attrs: { level: 2 } })).toBe(false);
  });

  it('V-040: block.align writes each value and null restores the start', () => {
    for (const align of ['center', 'end', 'justify'] as const) {
      const { run, content } = editor(
        '<p data-id="p1">tide</p><ul><li data-id="l1"><p>rope</p></li></ul>',
      );
      expect(run({ type: 'block.align', align, ids: ['p1', 'l1'] })).toBe(true);
      expect(content()).toBe(
        `<p data-id="p1" style="text-align: ${align}">tide</p>\n<ul><li data-id="l1"><p style="text-align: ${align}">rope</p></li></ul>`,
      );
      run({ type: 'block.align', align: null, ids: ['p1', 'l1'] });
      expect(content()).toBe(
        '<p data-id="p1">tide</p>\n<ul><li data-id="l1"><p>rope</p></li></ul>',
      );
    }
  });

  it('V-040: block.indent nests under the previous item; block.outdent unnests with following siblings', () => {
    const { run, content, instance } = editor(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul>',
    );
    expect(instance.can({ type: 'block.indent', ids: ['a'] })).toBe(false);
    // The first item is skipped; the others nest.
    expect(run({ type: 'block.indent', ids: ['a', 'b', 'c'] })).toBe(true);
    expect(content()).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
    expect(run({ type: 'block.outdent', ids: ['b'] })).toBe(true);
    expect(content()).toBe(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p><ul><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
    expect(run({ type: 'block.outdent', ids: ['a'] })).toBe(true);
    expect(content()).toBe(
      '<p data-id="a">a</p>\n<ul><li data-id="b"><p>b</p><ul><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
  });
});

describe('Tiptap blocks (uwg-te-tab-actions r3, uwg-te-req-blocks-1, uwg-te-req-blocks-4)', () => {
  it('V-041: blocks.insert at each place, replacing an empty paragraph at the selection point', () => {
    const { run, content, select, instance } = editor(
      '<p data-id="p1">a</p><p data-id="p2"></p><p data-id="p3">z</p>',
    );
    run({ type: 'blocks.insert', kind: 'divider', at: { after: 'p1' }, select: 'none' });
    expect(content()).toBe(
      '<p data-id="p1">a</p>\n<hr data-id="n000000001">\n<p data-id="p2"></p>\n<p data-id="p3">z</p>',
    );
    run({ type: 'blocks.insert', kind: 'heading', attrs: { level: 2 }, at: { before: 'p1' } });
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 'n000000002', offset: 0 },
    });
    expect(content().startsWith('<h2 data-id="n000000002"></h2>')).toBe(true);
    run({ type: 'blocks.insert', kind: 'quote', at: { replace: 'n000000002' }, select: 'end' });
    expect(content().startsWith('<blockquote data-id="n000000003"><p></p></blockquote>')).toBe(
      true,
    );
    select('p2', 0);
    run({ type: 'blocks.insert', kind: 'code', attrs: { language: 'ts' } });
    expect(content()).toContain(
      '<hr data-id="n000000001">\n<pre data-id="n000000004"><code class="language-ts"></code></pre>\n<p data-id="p3">z</p>',
    );
    expect(content()).not.toContain('data-id="p2"');
    run({
      type: 'blocks.insert',
      kind: 'paragraph',
      at: { parent: null, index: 0 },
      select: 'block',
    });
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['n000000005'] });
  });

  it('V-041: without select, a textblock or table takes the caret at its start and an atom is selected', () => {
    const { run, instance } = editor('<p data-id="p1">a</p>');
    // The divider ends the document, so a trailing paragraph (n000000002) follows it.
    run({ type: 'blocks.insert', kind: 'divider', at: { after: 'p1' } });
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['n000000001'] });
    run({
      type: 'blocks.insert',
      kind: 'table',
      attrs: { rows: 2, columns: 2, headerRow: true },
      at: { after: 'p1' },
    });
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'n000000003', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
    run({ type: 'blocks.insert', kind: 'paragraph', at: { before: 'p1' } });
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 'n000000004', offset: 0 },
    });
  });

  it('V-041: an inserted list item takes the kind of the list it lands in; an atom splits a list', () => {
    const { run, content } = editor(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p></li></ul>',
    );
    run({ type: 'blocks.insert', kind: 'list-ordered', at: { after: 'a' } });
    expect(content()).toBe(
      '<ul><li data-id="a"><p>a</p></li><li data-id="n000000001"><p></p></li><li data-id="b"><p>b</p></li></ul>',
    );
    run({ type: 'blocks.insert', kind: 'divider', at: { after: 'a' } });
    expect(content()).toBe(
      '<ul><li data-id="a"><p>a</p></li></ul>\n<hr data-id="n000000002">\n<ul><li data-id="n000000001"><p></p></li><li data-id="b"><p>b</p></li></ul>',
    );
  });

  it('V-041: blocks.move keeps identifiers, nested items travel along and a text selection keeps its points', () => {
    const { run, select, content, instance } = editor(
      '<p data-id="p1">one</p><ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul><p data-id="p2">two</p>',
    );
    select('b', 1);
    expect(run({ type: 'blocks.move', ids: ['a'], to: { parent: null, index: 2 } })).toBe(true);
    expect(content()).toBe(
      '<p data-id="p1">one</p>\n<p data-id="p2">two</p>\n<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul>',
    );
    expect(instance.getState().selection).toMatchObject({ anchor: { block: 'b', offset: 1 } });
    expect(instance.can({ type: 'blocks.move', ids: ['a'], to: { parent: 'b', index: 0 } })).toBe(
      false,
    );
    run({ type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } });
    run({ type: 'blocks.move', ids: ['p1'], to: { parent: null, index: 1 } });
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['p1'] });
  });

  it('V-041: blocks.duplicate copies with fresh identifiers after the last block and selects the copies', () => {
    const { run, content, instance } = editor('<p data-id="p1">one</p><p data-id="p2">two</p>');
    expect(run({ type: 'blocks.duplicate', ids: ['p1', 'p2'] })).toBe(true);
    expect(content()).toBe(
      '<p data-id="p1">one</p>\n<p data-id="p2">two</p>\n<p data-id="n000000001">one</p>\n<p data-id="n000000002">two</p>',
    );
    expect(instance.getState().selection).toEqual({
      kind: 'blocks',
      ids: ['n000000001', 'n000000002'],
    });
  });

  it('V-041: blocks.delete puts the caret at the end of the block before, else the start after, else in a fresh paragraph', () => {
    const { run, instance, content } = editor(
      '<p data-id="p1">one</p><p data-id="p2">two</p><p data-id="p3">six</p>',
    );
    run({ type: 'blocks.delete', ids: ['p2'] });
    expect(instance.getState().selection).toMatchObject({ anchor: { block: 'p1', offset: 3 } });
    run({ type: 'blocks.delete', ids: ['p1'] });
    expect(instance.getState().selection).toMatchObject({ anchor: { block: 'p3', offset: 0 } });
    run({ type: 'blocks.delete', ids: ['p3'] });
    expect(content()).toBe('<p data-id="n000000001"></p>');
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 'n000000001', offset: 0 },
    });
  });
});

describe('Tiptap text and inline nodes (uwg-te-tab-actions r4)', () => {
  const mention = defineTextEditorInline({
    name: 'mention',
    attrs: { person: { type: 'string', default: null } },
    element: 'span',
    text: (attrs) => `@${String(attrs.person)}`,
  });

  it('V-042: text.insert at the selection or over a range, a line feed a hard break; text.delete', () => {
    const { run, select, content, instance } = editor(
      '<p data-id="p1">calm sea</p><pre data-id="c1"><code>x</code></pre>',
    );
    select('p1', 4);
    run({ type: 'text.insert', text: '\nblue' });
    expect(content().startsWith('<p data-id="p1">calm<br>blue sea</p>')).toBe(true);
    expect(instance.getState().selection).toMatchObject({ anchor: { block: 'p1', offset: 9 } });
    run({ type: 'text.insert', text: 'grey', range: { block: 'p1', from: 5, to: 9 } });
    expect(content().startsWith('<p data-id="p1">calm<br>grey sea</p>')).toBe(true);
    run({ type: 'text.insert', text: '\ny', range: { block: 'c1', from: 1, to: 1 } });
    expect(content()).toContain('<code>x\ny</code>');
    run({ type: 'text.delete', range: { block: 'p1', from: 4, to: 9 } });
    expect(content().startsWith('<p data-id="p1">calm sea</p>')).toBe(true);
  });

  it('V-042: inline.insert adds the node and one space, the caret after both', () => {
    const { run, select, content, instance } = editor('<p data-id="p1">hi @an</p>', {
      nodes: [mention],
    });
    select('p1', 6);
    expect(
      run({
        type: 'inline.insert',
        kind: 'mention',
        attrs: { person: 'ana' },
        range: { block: 'p1', from: 3, to: 6 },
      }),
    ).toBe(true);
    expect(content()).toBe(
      '<p data-id="p1">hi <span data-type="mention" data-person="ana">@ana</span>&nbsp;</p>',
    );
    expect(instance.getState().selection).toMatchObject({ anchor: { block: 'p1', offset: 5 } });
    expect(instance.can({ type: 'inline.insert', kind: 'unknown', attrs: {} })).toBe(false);
  });
});

describe('Tiptap content and selection actions (uwg-te-tab-actions r5, r6)', () => {
  const paragraph = (text: string) => ({
    type: 'paragraph' as const,
    content: [{ type: 'text' as const, text }],
  });

  it('V-043: a text-range fragment merges its first and last paragraphs into the text around', () => {
    const { run, select, content, instance } = editor('<p data-id="p1">calm sea</p>');
    select('p1', 5);
    expect(
      run({
        type: 'content.insert',
        content: { kind: 'range', blocks: [paragraph('deep'), paragraph('blue ')] },
        at: { kind: 'text', anchor: { block: 'p1', offset: 5 } },
      }),
    ).toBe(true);
    expect(content()).toBe('<p data-id="p1">calm deep</p>\n<p data-id="n000000003">blue sea</p>');
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 'n000000003', offset: 5 },
    });
  });

  it('V-043: a blocks fragment inserts blocks after the block at the point, with fresh identifiers', () => {
    const { run, content } = editor('<p data-id="p1">calm</p><p data-id="p2"></p>');
    run({
      type: 'content.insert',
      content: { kind: 'blocks', blocks: [{ ...paragraph('pasted'), id: 'p1' }] },
      at: { kind: 'text', anchor: { block: 'p1', offset: 2 } },
    });
    expect(content()).toBe(
      '<p data-id="p1">calm</p>\n<p data-id="n000000001">pasted</p>\n<p data-id="p2"></p>',
    );
    run({
      type: 'content.insert',
      content: { kind: 'blocks', blocks: [{ type: 'divider' }] },
      at: { kind: 'caret', block: 'p2', position: 'start' },
    });
    expect(content()).toBe(
      '<p data-id="p1">calm</p>\n<p data-id="n000000001">pasted</p>\n<hr data-id="n000000002">',
    );
  });

  it('V-044: selection.set sets text, caret, block and cell selections; undo and redo step once', () => {
    const { run, instance } = editor(
      '<p data-id="p1">calm</p><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>',
    );
    run({ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } });
    expect(instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'p1', offset: 4 },
      head: { block: 'p1', offset: 4 },
      empty: true,
    });
    run({ type: 'selection.set', selection: { kind: 'blocks', ids: ['t1', 'p1'] } });
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['p1', 't1'] });
    run({
      type: 'selection.set',
      selection: {
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
      },
    });
    expect(instance.getState().selection).toEqual({
      kind: 'cells',
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
    });
    run({
      type: 'selection.set',
      selection: { kind: 'caret', block: 't1', cell: { row: 0, column: 1 }, position: 'end' },
    });
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 },
    });
    run({ type: 'text.insert', text: 'x' });
    run({ type: 'text.insert', text: 'y' });
    expect(run({ type: 'history.undo' })).toBe(true);
    expect(instance.getContent('text')).toContain('bx');
    expect(run({ type: 'history.redo' })).toBe(true);
    expect(instance.getContent('text')).toContain('bxy');
    expect(
      instance.can({ type: 'selection.set', selection: { kind: 'blocks', ids: ['zz'] } }),
    ).toBe(false);
  });

  it('V-044 unit part: a programmatic caret inside a marked run continues the run', () => {
    const { run, content } = editor(
      '<p data-id="p1"><strong><span data-color="blue">blue</span></strong> sea</p>',
    );
    run({ type: 'selection.set', selection: { kind: 'text', anchor: { block: 'p1', offset: 2 } } });
    run({ type: 'text.insert', text: 'Q' });
    expect(content()).toBe(
      '<p data-id="p1"><span data-color="blue"><strong>blQue</strong></span> sea</p>',
    );
  });
});

describe('Tiptap results equal the shared edits (uwg-te-req-engine-12)', () => {
  const context = { urls: TEST_URLS, nodes: [], createId: sequentialIds('s', 9) };
  /** The portable document of an instance's native JSON. */
  const portable = (instance: { getContent(format: 'json'): unknown }) =>
    canonicalize(fromTiptapJson(instance.getContent('json'))).document;

  it('block structure edits apply the shared result', () => {
    const markup =
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul><p data-id="p1">one</p>';
    const cases: [
      TextEditorAction,
      (document: TextEditorPortableDocument) => TextEditorPortableDocument | null,
    ][] = [
      [
        { type: 'blocks.move', ids: ['b'], to: { parent: null, index: 2 } },
        (document) => moveBlocks(document, ['b'], { parent: null, index: 2 }, context),
      ],
      [
        { type: 'blocks.delete', ids: ['a'] },
        (document) => deleteBlocks(document, ['a'], context)?.document ?? null,
      ],
      [{ type: 'block.indent', ids: ['d'] }, (document) => indentItems(document, ['d'], context)],
      [{ type: 'block.outdent', ids: ['b'] }, (document) => outdentItems(document, ['b'], context)],
      [{ type: 'block.outdent', ids: ['a'] }, (document) => outdentItems(document, ['a'], context)],
      [
        { type: 'block.set-type', kind: 'quote', ids: ['c'] },
        (document) => setBlockType(document, ['c'], { kind: 'quote' }, context),
      ],
    ];
    for (const [action, shared] of cases) {
      const { run, instance } = editor(markup);
      const expected = shared(portable(instance));
      expect(run(action)).toBe(true);
      expect(portable(instance)).toEqual(expected);
    }
  });

  it('table structure edits apply the shared table edit', () => {
    const markup =
      '<table data-id="t1"><thead><tr><th><p>A</p></th><th><p>B</p></th><th><p>C</p></th></tr></thead><tbody><tr><td><p>1</p></td><td><p>2</p></td><td><p>3</p></td></tr><tr><td><p>4</p></td><td><p>5</p></td><td><p>6</p></td></tr></tbody></table><p data-id="p1">x</p>';
    const options = { move: true, merge: true };
    const range = { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } };
    const actions: TextEditorAction[] = [
      { type: 'table.insert-row', table: 't1', index: 1 },
      { type: 'table.insert-column', table: 't1', index: 3 },
      { type: 'table.delete-columns', table: 't1', from: 0, to: 1 },
      { type: 'table.move-row', table: 't1', from: 2, to: 1 },
      { type: 'table.duplicate-column', table: 't1', index: 1 },
      { type: 'table.merge-cells', table: 't1', range },
      { type: 'table.set-header', table: 't1', column: true },
      { type: 'table.background', table: 't1', target: { column: 2 }, color: 'green' },
      { type: 'table.column-widths', table: 't1', widths: [20, 90, 120] },
    ];
    for (const action of actions) {
      const { run, instance } = editor(markup);
      const before = portable(instance);
      const table = before.blocks[0] as TextEditorPortableTable;
      const edit = tableEdit('t1', table, action, options);
      expect(edit, action.type).not.toBeNull();
      expect(run(action)).toBe(true);
      expect(portable(instance).blocks[0]).toEqual(
        canonicalize({ blocks: [edit!.table] }).document.blocks[0],
      );
    }
  });
});

describe('Tiptap mark actions in code follow the shared rule (uwg-te-req-blocks-1, uwg-te-req-engine-12)', () => {
  const kinds = [
    { type: 'mark.toggle', mark: 'bold' },
    { type: 'mark.toggle', mark: 'code' },
    { type: 'mark.color', mark: 'text-color', color: 'blue' },
    { type: 'mark.color', mark: 'highlight', color: 'yellow' },
    { type: 'mark.clear' },
    { type: 'link.set', href: 'https://harbor.example/' },
  ] as const satisfies readonly TextEditorAction[];

  /** What `markActionAllowed` answers for an action in a scope. */
  const allowed = (
    action: (typeof kinds)[number],
    scope: { codeBlock: boolean; inlineCode: boolean },
  ) => markActionAllowed(action.type, action.type === 'mark.toggle' ? action.mark : null, scope);

  it('in a code block no mark action and no link applies; in inline code only code, clear and links', () => {
    const block = editor('<pre data-id="c1"><code>let x</code></pre>');
    block.select('c1', 0, 3);
    for (const action of kinds)
      expect(block.instance.can(action), action.type).toBe(
        allowed(action, { codeBlock: true, inlineCode: false }),
      );
    const inline = editor('<p data-id="p1"><code>let</code> x</p>');
    inline.select('p1', 0, 3);
    for (const action of kinds)
      expect(inline.instance.can(action), JSON.stringify(action)).toBe(
        allowed(action, { codeBlock: false, inlineCode: true }),
      );
  });
});

describe('uwg-te-req-blocks-1: actions before a selection is placed', () => {
  it('while no selection is placed, actions on the selection do not apply; selection.set places one', () => {
    const { instance } = mountTiptap({ content: html('<p data-id="p1">calm</p>') });
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
    expect(instance.can({ type: 'text.insert', text: 'x' })).toBe(false);
    expect(
      runActions(
        instance,
        { type: 'selection.set', selection: caretAt('p1', 0) },
        { type: 'text.insert', text: 'x' },
      ),
    ).toBe(true);
    expect(htmlOf(instance)).toBe('<p data-id="p1">xcalm</p>');
  });
});
