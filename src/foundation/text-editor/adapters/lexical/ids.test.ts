/**
 * Block identifiers on Lexical (Widgets `uwg-te-req-content-7`, `uwg-te-lis-up-i2`,
 * `uwg-te-req-perf-1`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { $blockId, $holders } from './ids.js';
import { headlessLexical } from './lexical-stubs.test.js';
import type { LexicalElementLike } from './modules.js';

const ids = (headless: ReturnType<typeof headlessLexical>) =>
  headless.editor.read(() => $holders(headless.rt).map((holder) => $blockId(headless.rt, holder)));

const paragraphs = (count: number) => ({
  root: {
    type: 'root',
    version: 1,
    children: Array.from({ length: count }, (_, index) => ({
      type: 'paragraph',
      version: 1,
      $: { 'tp-id': `b${String(index).padStart(4, '0')}` },
      children: [{ type: 'text', version: 1, text: `Line ${index}` }],
    })),
  },
});

describe('uwg-te-req-content-7: identifier repair in the update', () => {
  it('V-590: one text insert in a 2,000-block rootless editor visits at most 2 holders', () => {
    const headless = headlessLexical({
      initialContent: { content: paragraphs(2000), format: 'json' },
    });
    const { editor, rt } = headless;
    editor.update(
      () => (lexical.$getRoot().getChildAtIndex(1000) as unknown as LexicalElementLike).selectEnd(),
      { discrete: true },
    );
    rt.idVisits = 0;
    rt.idVisited.clear();
    editor.update(
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) selection.insertText('x');
      },
      { discrete: true },
    );
    expect(rt.idVisited.size).toBeLessThanOrEqual(2);
    expect(rt.idVisits).toBeLessThanOrEqual(2);
    // A split writes three holders, all of them dirty: the split block, the new one and the
    // following block, whose sibling link changed; the new one is visited again after its
    // identifier was written. The rest of the 2,000 are never visited.
    rt.idVisits = 0;
    rt.idVisited.clear();
    editor.update(
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) selection.insertParagraph();
      },
      { discrete: true },
    );
    expect(rt.idVisited.size).toBe(3);
    expect(rt.idVisits).toBeLessThanOrEqual(4);
    expect(new Set(ids(headless)).size).toBe(2001);
  });

  it('a copy of a block gets a fresh identifier while the existing block keeps its own', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">one</p><p data-id="p2">two</p>' });
    const { editor, recording } = headless;
    editor.update(
      () => {
        const copy = lexical.$parseSerializedNode({
          type: 'paragraph',
          version: 1,
          $: { 'tp-id': 'p1' },
          children: [{ type: 'text', version: 1, text: 'pasted' }],
        } as never);
        lexical.$getRoot().getFirstChild()!.insertBefore(copy);
      },
      { discrete: true },
    );
    const [copy, ...rest] = ids(headless);
    expect(rest).toEqual(['p1', 'p2']);
    expect(copy).toMatch(/^gen\d{4}$/);
    expect(recording.of('diagnostic')).toEqual([]);
  });

  it('a holder without a valid identifier gets one; a cell paragraph or a wrapper item keeps none', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">one</p><table data-id="t1"><tbody><tr><td><p>c</p></td></tr></tbody></table>',
    });
    const { editor, rt } = headless;
    editor.update(
      () => {
        const root = lexical.$getRoot();
        const bad = lexical.$createParagraphNode();
        lexical.$setState(bad, rt.states.id as never, 'not valid!' as never);
        root.append(bad);
        // A block identifier on a cell paragraph is dropped.
        const cell = (
          root.getChildAtIndex(1) as unknown as LexicalElementLike
        ).getFirstChild() as unknown as LexicalElementLike;
        const paragraph = (
          cell.getFirstChild() as unknown as LexicalElementLike
        ).getFirstChild() as unknown as LexicalElementLike;
        lexical.$setState(paragraph as never, rt.states.id as never, 'p1' as never);
      },
      { discrete: true },
    );
    // The empty paragraph after the final table comes before the appended one.
    expect(ids(headless)).toEqual([
      'p1',
      't1',
      expect.stringMatching(/^gen\d{4}$/),
      expect.stringMatching(/^gen\d{4}$/),
    ]);
    const native = JSON.stringify(headless.instance.getContent('json'));
    expect(native.match(/"tp-id"/g)).toHaveLength(4);
  });

  it('identifiers survive undo and redo, and the index follows them', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">one</p><p data-id="p2">two</p>' });
    const { instance, editor } = headless;
    instance.execute([{ type: 'blocks.duplicate', ids: ['p1'] }], { reason: 'imperative-action' });
    const copy = ids(headless)[1]!;
    instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' });
    expect(ids(headless)).toEqual(['p1', 'p2']);
    instance.execute([{ type: 'history.redo' }], { reason: 'hotkey' });
    expect(ids(headless)).toEqual(['p1', copy, 'p2']);
    instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' });
    // A node that copies p1 after the undo still gets a fresh identifier.
    editor.update(
      () => {
        lexical.$getRoot().append(
          lexical.$parseSerializedNode({
            type: 'paragraph',
            version: 1,
            $: { 'tp-id': 'p1' },
            children: [],
          } as never),
        );
      },
      { discrete: true },
    );
    const after = ids(headless);
    expect(after.slice(0, 2)).toEqual(['p1', 'p2']);
    expect(after[2]).not.toBe('p1');
  });

  it('a generator that keeps returning taken identifiers still gives a new block a fresh identifier', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">one</p>',
      createId: () => 'p1',
    });
    const { editor } = headless;
    editor.update(
      () => {
        lexical.$getRoot().getFirstChild()?.selectEnd();
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) selection.insertParagraph();
      },
      { discrete: true },
    );
    const held = ids(headless);
    expect(held).toHaveLength(2);
    expect(held[0]).toBe('p1');
    expect(held[1]).toMatch(/^[a-z0-9]{10}$/u);
    expect(headless.recording.of('error')).toEqual([]);
  });
});

describe('uwg-te-lis-up-i2: splits keep identifiers with content', () => {
  const enter = (headless: ReturnType<typeof headlessLexical>) =>
    headless.editor.update(
      () => {
        headless.editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
      },
      { discrete: true },
    );

  it('Enter at the start of a non-empty block inserts the empty block before it', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">one</p><h2 data-id="h1">Tides</h2>',
    });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'caret', block: 'h1', position: 'start' } }],
      { reason: 'imperative-action' },
    );
    enter(headless);
    const [first, fresh, heading] = ids(headless);
    expect([first, heading]).toEqual(['p1', 'h1']);
    expect(headless.instance.getContent('html')).toBe(
      `<p data-id="p1">one</p>\n<p data-id="${fresh}"></p>\n<h2 data-id="h1">Tides</h2>`,
    );
    expect(headless.instance.getState().selection).toMatchObject({
      anchor: { block: 'h1', offset: 0 },
    });
  });

  it('Enter at the start of a list item inserts an empty item before it', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p></li></ul>',
    });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'caret', block: 'b', position: 'start' } }],
      { reason: 'imperative-action' },
    );
    enter(headless);
    const [a, fresh, b] = ids(headless);
    expect([a, b]).toEqual(['a', 'b']);
    expect(headless.instance.getContent('html')).toBe(
      `<ul><li data-id="a"><p>a</p></li><li data-id="${fresh}"><p></p></li><li data-id="b"><p>b</p></li></ul>`,
    );
  });

  it('Enter in the middle keeps the identifier on the first part', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">one two</p>' });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'text', anchor: { block: 'p1', offset: 3 } } }],
      { reason: 'imperative-action' },
    );
    enter(headless);
    const [first, second] = ids(headless);
    expect(first).toBe('p1');
    expect(headless.instance.getContent('html')).toBe(
      `<p data-id="p1">one</p>\n<p data-id="${second}">&nbsp;two</p>`,
    );
  });
});
