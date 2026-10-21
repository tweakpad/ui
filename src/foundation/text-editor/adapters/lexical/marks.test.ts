/**
 * Marks and links at a caret, over ranges, block selections and cell ranges on Lexical (Widgets
 * `uwg-te-tab-actions` r1, `uwg-te-lis-up-i2`, `uwg-te-req-tables-5`, `uwg-te-req-engine-4`,
 * `uwg-te-req-engine-5`).
 */
import * as lexical from 'lexical';
import { describe, expect, it, vi } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import { corpusNodes } from '../../content/corpus.test.js';
import type { TextEditorExecuteOptions } from '../../engine.js';
import type { TextEditorTextRange } from '../../model.js';
import { keyEvent } from '../shared/test-helpers.test.js';
import { headlessLexical, typeText, type Headless } from './lexical-stubs.test.js';

const OPTIONS: TextEditorExecuteOptions = { reason: 'imperative-action' };

const run = (headless: Headless, ...actions: TextEditorAction[]) =>
  headless.instance.execute(actions, OPTIONS);

const html = (headless: Headless) => headless.instance.getContent('html') as string;

/** Types text as the engine's controlled insertion does, one character per update. */
function type(headless: Headless, text: string): void {
  for (const character of text) {
    headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
    headless.editor.read(() => undefined);
  }
}

const caretAt = (block: string, offset: number): TextEditorAction => ({
  type: 'selection.set',
  selection: { kind: 'text', anchor: { block, offset } },
});

const BOLD: TextEditorAction = { type: 'mark.toggle', mark: 'bold' };
const BLUE: TextEditorAction = { type: 'mark.color', mark: 'text-color', color: 'blue' };
const CLEAR: TextEditorAction = { type: 'mark.clear' };

const TABLE =
  '<p data-id="p1">calm sea</p><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr><tr><td><p>c</p></td><td><p>d</p></td></tr></tbody></table><p data-id="p2">tide</p>';
const ROW: TextEditorAction = {
  type: 'selection.set',
  selection: {
    kind: 'cells',
    table: 't1',
    range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
  },
};

describe('uwg-te-tab-actions r1: mark, color and clear over cell ranges and block selections', () => {
  it('bold, a color and clear act on the runs of the cells of a cell range', () => {
    const headless = headlessLexical({ html: TABLE });
    expect(run(headless, ROW)).toBe(true);
    for (const action of [BOLD, BLUE, CLEAR]) expect(headless.instance.can(action)).toBe(true);
    expect(run(headless, BOLD)).toBe(true);
    expect(html(headless)).toContain(
      '<tr><td><p><strong>a</strong></p></td><td><p><strong>b</strong></p></td></tr><tr><td><p>c</p></td><td><p>d</p></td></tr>',
    );
    // The cell range stays selected, and its marks are the runs of its cells.
    expect(headless.instance.getState().selection.kind).toBe('cells');
    expect(headless.instance.getState().marks.bold).toBe('on');
    expect(run(headless, BLUE)).toBe(true);
    expect(html(headless)).toContain(
      '<td><p><span data-color="blue"><strong>a</strong></span></p></td><td><p><span data-color="blue"><strong>b</strong></span></p></td>',
    );
    // Bold covers every run, so the toggle turns it off; clear removes the color.
    expect(run(headless, BOLD)).toBe(true);
    expect(run(headless, CLEAR)).toBe(true);
    expect(html(headless)).toContain('<td><p>a</p></td><td><p>b</p></td>');
    expect(headless.instance.getState().selection.kind).toBe('cells');
  });

  it('bold, a color and clear act on the runs of the blocks of a block selection', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">calm <em>sea</em></p><hr data-id="d1"><pre data-id="k1"><code>let x;</code></pre><p data-id="p2">tide</p>',
    });
    expect(
      run(headless, { type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } }),
    ).toBe(true);
    expect(headless.instance.can(BOLD)).toBe(true);
    expect(run(headless, BOLD, BLUE)).toBe(true);
    expect(html(headless)).toContain(
      '<p data-id="p1"><span data-color="blue"><strong>calm <em>sea</em></strong></span></p>',
    );
    expect(headless.instance.getState().selection).toEqual({ kind: 'blocks', ids: ['p1'] });
    expect(run(headless, CLEAR)).toBe(true);
    expect(html(headless)).toContain('<p data-id="p1">calm sea</p>');
    // A divider and a code block hold no markable text: nothing to act on.
    run(headless, { type: 'selection.set', selection: { kind: 'blocks', ids: ['d1', 'k1'] } });
    for (const action of [BOLD, BLUE, CLEAR]) expect(headless.instance.can(action)).toBe(false);
    // Code-block text is skipped where other text is selected with it.
    run(headless, { type: 'selection.set', selection: { kind: 'blocks', ids: ['k1', 'p2'] } });
    expect(headless.instance.can(BOLD)).toBe(true);
    expect(run(headless, BOLD)).toBe(true);
    expect(html(headless)).toContain(
      '<pre data-id="k1"><code>let x;</code></pre>\n<p data-id="p2"><strong>tide</strong></p>',
    );
  });

  it('link.unset removes the links of a block selection; link.set has no text to link there', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">see <a href="https://a.example/">docs</a></p><p data-id="p2">x</p>',
    });
    run(headless, { type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } });
    expect(headless.instance.can({ type: 'link.set', href: 'https://b.example/' })).toBe(false);
    expect(headless.instance.can({ type: 'link.unset' })).toBe(true);
    expect(run(headless, { type: 'link.unset' })).toBe(true);
    expect(html(headless)).toContain('<p data-id="p1">see docs</p>');
  });
});

describe('uwg-te-lis-up-i2: caret colors are carried like caret formats', () => {
  const SOURCE =
    '<p data-id="p1">calm <span data-color="blue">deep sea</span> tide <mark data-color="green">foam</mark></p>';

  it('bold at a caret in a blue run keeps the blue in the text typed next', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, caretAt('p1', 7), BOLD);
    expect(headless.instance.getState().marks).toMatchObject({ bold: 'on', textColor: 'blue' });
    type(headless, 'X');
    expect(html(headless)).toBe(
      '<p data-id="p1">calm <span data-color="blue">de<strong>X</strong>ep sea</span> tide <mark data-color="green">foam</mark></p>',
    );
  });

  it('a text color at a caret in a green highlight keeps the green', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, caretAt('p1', 22), {
      type: 'mark.color',
      mark: 'text-color',
      color: 'red',
    });
    expect(headless.instance.getState().marks).toMatchObject({
      textColor: 'red',
      highlight: 'green',
    });
    type(headless, 'X');
    expect(html(headless)).toBe(
      '<p data-id="p1">calm <span data-color="blue">deep sea</span> tide <mark data-color="green">foa</mark><span data-color="red"><mark data-color="green">X</mark></span><mark data-color="green">m</mark></p>',
    );
  });

  it('link text inserted at a caret in a blue run is blue, and so is text typed after it', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, caretAt('p1', 7), {
      type: 'link.set',
      href: 'https://a.example/',
      text: 'L',
    });
    expect(headless.instance.getState().marks.textColor).toBe('blue');
    type(headless, 'X');
    expect(html(headless)).toBe(
      '<p data-id="p1">calm <span data-color="blue">de</span><a href="https://a.example/"><span data-color="blue">L</span></a><span data-color="blue">Xep sea</span> tide <mark data-color="green">foam</mark></p>',
    );
  });

  it('after inserted link text the caret keeps its colors for the engine’s own insertion', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, caretAt('p1', 7), { type: 'link.set', href: 'https://a.example/', text: 'L' });
    typeText(headless, 'X');
    expect(html(headless)).toBe(
      '<p data-id="p1">calm <span data-color="blue">de</span><a href="https://a.example/"><span data-color="blue">L</span></a><span data-color="blue">Xep sea</span> tide <mark data-color="green">foam</mark></p>',
    );
  });

  it('text inserted at a block start before a blue, yellow and bold link run is plain', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1"><a href="https://a.example/"><span data-color="blue"><mark data-color="yellow"><strong>Every</strong></mark></span></a> word</p>',
    });
    run(headless, caretAt('p1', 0), { type: 'text.insert', text: 'xy' });
    expect(html(headless)).toBe(
      '<p data-id="p1">xy<a href="https://a.example/"><span data-color="blue"><mark data-color="yellow"><strong>Every</strong></mark></span></a> word</p>',
    );
  });

  it('after a run the caret takes its marks and colors, never its link', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1"><a href="https://a.example/"><span data-color="blue"><strong>Every</strong></span></a> word</p>',
    });
    run(headless, caretAt('p1', 5));
    expect(headless.instance.getState().marks).toMatchObject({ bold: 'on', textColor: 'blue' });
    type(headless, 'x');
    expect(html(headless)).toBe(
      '<p data-id="p1"><a href="https://a.example/"><span data-color="blue"><strong>Every</strong></span></a><span data-color="blue"><strong>x</strong></span> word</p>',
    );
  });

  it('at the start of a marked run after plain text the caret is plain', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">calm <span data-color="blue"><strong>deep</strong></span></p>',
    });
    run(headless, caretAt('p1', 5));
    expect(headless.instance.getState().marks).toMatchObject({ bold: 'off', textColor: null });
    type(headless, 'x');
    expect(html(headless)).toBe(
      '<p data-id="p1">calm x<span data-color="blue"><strong>deep</strong></span></p>',
    );
  });

  it('the space after an inserted inline node takes the caret colors', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1"><span data-color="blue">deep</span></p>',
      nodes: corpusNodes,
    });
    run(headless, caretAt('p1', 4), {
      type: 'inline.insert',
      kind: 'mention',
      attrs: { person: 'p7', label: 'Ana' },
    });
    type(headless, 'X');
    // The space and the text typed after it are blue.
    expect(html(headless)).toMatch(/<\/span><span data-color="blue"> X<\/span><\/p>$/u);
  });

  it('a click places a caret that takes the colors of the text before it', () => {
    const headless = headlessLexical({ html: SOURCE });
    // The engine's own selection change from the DOM takes the format and the style of the text
    // node; the adapter's listener then gives it the colors of the text before the caret.
    headless.editor.update(
      () => {
        const p = lexical.$getRoot().getFirstChild() as lexical.ElementNode;
        const blue = p.getChildAtIndex(1) as lexical.TextNode;
        const selection = lexical.$createRangeSelection();
        selection.anchor.set(blue.getKey(), 2, 'text');
        selection.focus.set(blue.getKey(), 2, 'text');
        selection.format = blue.getFormat();
        selection.style = blue.getStyle();
        lexical.$setSelection(selection);
        headless.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
      },
      { discrete: true },
    );
    run(headless, BOLD);
    type(headless, 'X');
    expect(html(headless)).toContain('<span data-color="blue">de<strong>X</strong>ep sea</span>');
  });
});

describe('uwg-te-lis-up-i2: typing after a hard break before a marked run is plain', () => {
  for (const [label, run_, open, close] of [
    ['inline code', '<code>cd</code>', '<code>', '</code>'],
    ['bold', '<strong>cd</strong>', '<strong>', '</strong>'],
    ['a color', '<span data-color="red">cd</span>', '<span data-color="red">', '</span>'],
  ] as const)
    it(`after a hard break before ${label}, typed text is plain`, () => {
      const headless = headlessLexical({ html: `<p data-id="p1">ab<br>${run_}</p>` });
      run(headless, caretAt('p1', 3));
      const state = headless.instance.getState();
      expect(state.caret?.inCode).toBe(false);
      expect(state.marks).toMatchObject({ code: 'off', bold: 'off', textColor: null });
      type(headless, 'Q');
      expect(html(headless)).toBe(`<p data-id="p1">ab<br>Q${open}cd${close}</p>`);
    });

  it('at a textblock start the caret takes none of the run after it', () => {
    const headless = headlessLexical({ html: '<p data-id="p1"><code>cd</code></p>' });
    run(headless, caretAt('p1', 0));
    expect(headless.instance.getState().caret?.inCode).toBe(false);
    type(headless, 'Q');
    expect(html(headless)).toBe('<p data-id="p1">Q<code>cd</code></p>');
  });
});

describe('uwg-te-req-engine-4: Mod+A, then a key', () => {
  it('typing over the selection of Mod+A is plain text in one fresh paragraph', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1"><strong>a</strong>b</p><h2 data-id="h1">c</h2>',
    });
    run(headless, caretAt('p1', 0));
    headless.editor.dispatchCommand(lexical.SELECT_ALL_COMMAND, keyEvent('a').event);
    headless.editor.read(() => undefined);
    type(headless, 'Q');
    expect(html(headless)).toMatch(/^<p data-id="gen\d{4}">Q<\/p>$/u);
    expect(headless.instance.getState().marks.bold).toBe('off');
  });

  it('a paste over the selection of Mod+A inserts at the caret of one fresh paragraph', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1"><strong>a</strong>b</p><h2 data-id="h1">c</h2>',
    });
    headless.editor.dispatchCommand(lexical.SELECT_ALL_COMMAND, keyEvent('a').event);
    headless.editor.read(() => undefined);
    // The engine's paste handler tells keyboard and input events from clipboard events by class.
    vi.stubGlobal('InputEvent', class InputEvent {});
    vi.stubGlobal('KeyboardEvent', class KeyboardEvent {});
    vi.stubGlobal('DragEvent', class DragEvent {});
    vi.stubGlobal('ClipboardEvent', class ClipboardEvent {});
    const data: Record<string, string> = { 'text/plain': 'pasted' };
    headless.editor.dispatchCommand(lexical.PASTE_COMMAND, {
      type: 'paste',
      clipboardData: {
        types: Object.keys(data),
        getData: (format: string) => data[format] ?? '',
      },
      preventDefault: () => undefined,
    } as never);
    headless.editor.read(() => undefined);
    headless.editor.read(() => undefined);
    vi.unstubAllGlobals();
    expect(headless.recording.of('error').map(({ error }) => String(error))).toEqual([]);
    expect(html(headless)).toMatch(/^<p data-id="gen\d{4}">pasted<\/p>$/u);
  });

  it('Enter over the selection of Mod+A gives two empty paragraphs, the caret in the second', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">ab</p><p data-id="p2">c</p>' });
    headless.editor.dispatchCommand(lexical.SELECT_ALL_COMMAND, keyEvent('a').event);
    headless.editor.read(() => undefined);
    headless.editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
    headless.editor.read(() => undefined);
    const blocks = headless.instance.getBlocks().ordered();
    expect(blocks).toMatchObject([
      { kind: 'paragraph', empty: true },
      { kind: 'paragraph', empty: true },
    ]);
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: blocks[1]!.id, offset: 0 },
    });
  });
});

describe('uwg-te-req-engine-5: can equals execute for marks and links', () => {
  it('link.set at a caret outside a link without text answers false in can and execute', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    run(headless, caretAt('p1', 4));
    const action: TextEditorAction = { type: 'link.set', href: 'https://a.example/' };
    expect(headless.instance.can(action)).toBe(false);
    expect(run(headless, action)).toBe(false);
  });

  it('a mark toggle, a color or clear over a range of empty paragraphs answers false in both', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">calm</p><p data-id="p2"></p><p data-id="p3"></p><p data-id="p4">x</p>',
    });
    run(headless, {
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p2', offset: 0 },
        head: { block: 'p3', offset: 0 },
      },
    });
    for (const action of [BOLD, BLUE, CLEAR]) {
      expect(headless.instance.can(action)).toBe(false);
      expect(run(headless, action)).toBe(false);
    }
  });
});

describe('uwg-te-tab-actions r1: the link at the selection', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const html = (headless: Headless) =>
    (headless.instance.getContent('html') as string).replace(/\n/gu, '');
  const caret = (block: string, offset: number): TextEditorAction => ({
    type: 'selection.set',
    selection: { kind: 'text', anchor: { block, offset } },
  });
  const range = (
    anchor: { block: string; offset: number },
    head: { block: string; offset: number },
  ): TextEditorAction => ({ type: 'selection.set', selection: { kind: 'text', anchor, head } });

  const SOURCE = '<p data-id="p1">see <a href="https://old.example/">docs</a> now</p>';

  for (const offset of [4, 6, 8])
    it(`at p1:${offset} link.set changes the link, link.unset removes it`, () => {
      const set = headlessLexical({ html: SOURCE });
      run(set, caret('p1', offset));
      const action: TextEditorAction = { type: 'link.set', href: 'https://new.example/' };
      expect(set.instance.can(action)).toBe(true);
      expect(run(set, action)).toBe(true);
      expect(html(set)).toBe('<p data-id="p1">see <a href="https://new.example/">docs</a> now</p>');
      expect(set.instance.getState().selection).toMatchObject({ head: { offset } });
      const unset = headlessLexical({ html: SOURCE });
      run(unset, caret('p1', offset));
      expect(unset.instance.can({ type: 'link.unset' })).toBe(true);
      expect(run(unset, { type: 'link.unset' })).toBe(true);
      expect(html(unset)).toBe('<p data-id="p1">see docs now</p>');
    });

  it('link.set with text at a link replaces the link’s text', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, caret('p1', 8), { type: 'link.set', href: 'https://new.example/', text: 'L' });
    expect(html(headless)).toBe('<p data-id="p1">see <a href="https://new.example/">L</a> now</p>');
  });

  it('link.set over a range keeps the range selected', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, range({ block: 'p1', offset: 0 }, { block: 'p1', offset: 3 }), {
      type: 'link.set',
      href: 'https://new.example/',
    });
    expect(headless.instance.getState().selection).toMatchObject({
      anchor: { offset: 0 },
      head: { offset: 3 },
      empty: false,
    });
  });
});

describe('uwg-te-req-blocks-1: marks over a range that reaches into code', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const html = (headless: Headless) =>
    (headless.instance.getContent('html') as string).replace(/\n/gu, '');
  const range = (
    anchor: { block: string; offset: number },
    head: { block: string; offset: number },
  ): TextEditorAction => ({ type: 'selection.set', selection: { kind: 'text', anchor, head } });

  it('a range from a paragraph into a code block marks the paragraph’s text only', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">calm sea</p><pre data-id="k1"><code>let x = 1;</code></pre>',
    });
    run(headless, range({ block: 'p1', offset: 0 }, { block: 'k1', offset: 3 }));
    const bold: TextEditorAction = { type: 'mark.toggle', mark: 'bold' };
    expect(headless.instance.can(bold)).toBe(true);
    expect(headless.instance.can({ type: 'mark.color', mark: 'highlight', color: 'pink' })).toBe(
      true,
    );
    expect(run(headless, bold)).toBe(true);
    expect(html(headless)).toBe(
      '<p data-id="p1"><strong>calm sea</strong></p><pre data-id="k1"><code>let x = 1;</code></pre>',
    );
    run(headless, range({ block: 'k1', offset: 0 }, { block: 'k1', offset: 3 }));
    expect(headless.instance.can(bold)).toBe(false);
  });
});

describe('uwg-te-req-engine-5: link.unset with a range answers from the linked text of the range', () => {
  const SOURCE =
    '<p data-id="p1">first</p><p data-id="p2">second <a href="https://a.example/">link</a></p><pre data-id="c1"><code>code</code></pre><table data-id="t1"><tbody><tr><td><p>ab</p></td><td><p><a href="https://c.example/">cd</a></p></td></tr></tbody></table><p data-id="p3"></p>';
  const cell = (column: number) => ({ row: 0, column, paragraph: 0 });
  const SELECTIONS: readonly (readonly [string, TextEditorAction | null])[] = [
    ['nothing selected', null],
    ['a caret', caretAt('p1', 2)],
    ['a block selection', { type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } }],
    [
      'a cell range',
      {
        type: 'selection.set',
        selection: {
          kind: 'cells',
          table: 't1',
          range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
        },
      },
    ],
  ];
  const REFUSED: readonly (readonly [string, TextEditorAction])[] = [
    ['a range without a link', { type: 'link.unset', range: { block: 'p1', from: 0, to: 3 } }],
    ['an empty range', { type: 'link.unset', range: { block: 'p1', from: 2, to: 2 } }],
    [
      'a range in a cell without a link',
      { type: 'link.unset', range: { block: 't1', cell: cell(0), from: 0, to: 2 } },
    ],
  ];
  for (const [selected, selection] of SELECTIONS)
    for (const [label, action] of REFUSED)
      it(`V-039: with ${selected}, ${label} answers false in can and execute`, () => {
        const headless = headlessLexical({ html: SOURCE });
        if (selection) expect(run(headless, selection)).toBe(true);
        const before = html(headless);
        expect(headless.instance.can(action)).toBe(false);
        expect(run(headless, action)).toBe(false);
        expect(html(headless)).toBe(before);
      });

  it('V-039: a range that holds linked text applies, removing the link from that text only', () => {
    const headless = headlessLexical({ html: SOURCE });
    const action: TextEditorAction = { type: 'link.unset', range: { block: 'p2', from: 3, to: 9 } };
    expect(headless.instance.can(action)).toBe(true);
    expect(run(headless, action)).toBe(true);
    expect(html(headless)).toContain(
      '<p data-id="p2">second li<a href="https://a.example/">nk</a></p>',
    );
    // A range that ends where a link starts holds none of its text.
    const edge: TextEditorAction = { type: 'link.unset', range: { block: 'p2', from: 0, to: 9 } };
    expect(headless.instance.can(edge)).toBe(false);
    expect(run(headless, edge)).toBe(false);
  });
});

describe('uwg-te-req-evt-1: link actions with a range keep the selection they found', () => {
  const SOURCE =
    '<p data-id="p1">first</p><p data-id="p2">second <a href="https://a.example/">link</a></p><p data-id="p3">third</p><table data-id="t1"><tbody><tr><td><p>ab</p></td><td><p>cd</p></td></tr></tbody></table><p data-id="p4">end</p>';
  const SELECTIONS: readonly (readonly [string, TextEditorAction | null])[] = [
    ['nothing selected', null],
    ['a caret', caretAt('p3', 2)],
    [
      'a range',
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 'p1', offset: 1 },
          head: { block: 'p3', offset: 3 },
        },
      },
    ],
    ['a block selection', { type: 'selection.set', selection: { kind: 'blocks', ids: ['p3'] } }],
    [
      'a cell range',
      {
        type: 'selection.set',
        selection: {
          kind: 'cells',
          table: 't1',
          range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
        },
      },
    ],
  ];
  const ACTIONS: readonly (readonly [string, TextEditorAction])[] = [
    [
      'link.set over a range',
      { type: 'link.set', href: 'https://b.example/', range: { block: 'p1', from: 0, to: 3 } },
    ],
    [
      'link.set over a range with text',
      {
        type: 'link.set',
        href: 'https://b.example/',
        text: 'XY',
        range: { block: 'p1', from: 0, to: 3 },
      },
    ],
    ['link.unset over a range', { type: 'link.unset', range: { block: 'p2', from: 7, to: 11 } }],
  ];
  for (const [selected, selection] of SELECTIONS)
    for (const [label, action] of ACTIONS)
      it(`V-039: with ${selected}, ${label} leaves the selection as it was`, () => {
        const headless = headlessLexical({ html: SOURCE });
        if (selection) expect(run(headless, selection)).toBe(true);
        const before = headless.instance.getState().selection;
        expect(run(headless, action)).toBe(true);
        expect(headless.instance.getState().selection).toEqual(before);
      });

  it('V-039: with nothing selected, blocks.insert after a link action still goes to the end', () => {
    const headless = headlessLexical({ html: SOURCE });
    run(headless, {
      type: 'link.set',
      href: 'https://b.example/',
      range: { block: 'p1', from: 0, to: 3 },
    });
    expect(headless.instance.getState().selection).toEqual({ kind: 'none' });
    expect(run(headless, { type: 'blocks.insert', kind: 'divider' })).toBe(true);
    const blocks = headless.instance.getBlocks().ordered();
    const last = blocks.findIndex(({ id }) => id === 'p4');
    expect(blocks[last + 1]?.kind).toBe('divider');
  });
});

describe('uwg-te-req-surfaces-3: link.set with a collapsed range is a point', () => {
  const SOURCE =
    '<p data-id="p1">first <strong>bold</strong> <span data-color="blue">blue</span> <code>cd</code> <a href="https://a.example/">link</a></p><p data-id="p2"></p><table data-id="t1"><tbody><tr><td><p>ab</p></td><td><p>cd</p></td></tr></tbody></table><p data-id="p3">x</p>';
  const point = (block: string, offset: number) => ({ block, from: offset, to: offset });
  const link = (range: TextEditorTextRange, text?: string): TextEditorAction => ({
    type: 'link.set',
    href: 'https://b.example/',
    range,
    ...(text === undefined ? {} : { text }),
  });

  for (const [label, range] of [
    ['in plain text', point('p1', 2)],
    ['inside a link', point('p1', 21)],
    ['at the end of a link', point('p1', 23)],
    ['in an empty paragraph', point('p2', 0)],
    ['in a cell', { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, from: 1, to: 1 }],
  ] as const)
    for (const text of [undefined, ''])
      it(`V-039: without text ${label} it answers false in can and execute (text ${JSON.stringify(text)})`, () => {
        const headless = headlessLexical({ html: SOURCE });
        run(headless, caretAt('p3', 1));
        const before = html(headless);
        const action = link(range, text);
        expect(headless.instance.can(action)).toBe(false);
        expect(run(headless, action)).toBe(false);
        expect(html(headless)).toBe(before);
      });

  for (const [label, range, expected, caret] of [
    [
      'in plain text',
      point('p1', 2),
      '<p data-id="p1">fi<a href="https://b.example/">Q</a>rst <strong>bold</strong>',
      3,
    ],
    [
      'after bold text',
      point('p1', 10),
      '<strong>bold</strong><a href="https://b.example/"><strong>Q</strong></a> ',
      11,
    ],
    [
      'after blue text',
      point('p1', 15),
      '<span data-color="blue">blue</span><a href="https://b.example/"><span data-color="blue">Q</span></a> ',
      16,
    ],
    [
      'after inline code',
      point('p1', 18),
      '<code>cd</code><a href="https://b.example/"><code>Q</code></a> ',
      19,
    ],
    [
      'at the start of a block',
      point('p1', 0),
      '<p data-id="p1"><a href="https://b.example/">Q</a>first ',
      1,
    ],
    [
      'inside a link',
      point('p1', 21),
      '<a href="https://a.example/">li</a><a href="https://b.example/">Q</a><a href="https://a.example/">nk</a></p>',
      22,
    ],
    [
      'at the start of a link',
      point('p1', 19),
      '<code>cd</code> <a href="https://b.example/">Q</a><a href="https://a.example/">link</a></p>',
      20,
    ],
    [
      'at the end of a link',
      point('p1', 23),
      '<a href="https://a.example/">link</a><a href="https://b.example/">Q</a></p>',
      24,
    ],
  ] as const)
    it(`V-039: with text ${label} it inserts linked text taking the caret's marks, the caret after it`, () => {
      const headless = headlessLexical({ html: SOURCE });
      const action = link(range, 'Q');
      expect(headless.instance.can(action)).toBe(true);
      expect(run(headless, action)).toBe(true);
      expect(html(headless)).toContain(expected);
      expect(headless.instance.getState().selection).toEqual({
        kind: 'text',
        anchor: { block: 'p1', offset: caret },
        head: { block: 'p1', offset: caret },
        empty: true,
      });
    });

  it('V-039: with text in an empty paragraph or a cell it inserts the linked text there', () => {
    const empty = headlessLexical({ html: SOURCE });
    expect(run(empty, link(point('p2', 0), 'Q'))).toBe(true);
    expect(html(empty)).toContain('<p data-id="p2"><a href="https://b.example/">Q</a></p>');
    const cell = { row: 0, column: 1, paragraph: 0 };
    const inCell = headlessLexical({ html: SOURCE });
    expect(run(inCell, link({ block: 't1', cell, from: 1, to: 1 }, 'Q'))).toBe(true);
    expect(html(inCell)).toContain('<td><p>c<a href="https://b.example/">Q</a>d</p></td>');
    expect(inCell.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell, offset: 2 },
    });
  });
});

describe('uwg-te-tab-actions r1, uwg-te-req-engine-5: link.set over text that a link partly holds', () => {
  const SOURCE =
    '<p data-id="p1">pre <a href="https://a.example/">link</a> post</p><p data-id="p2">x</p>';
  const A = 'https://a.example/';
  const B = 'https://b.example/';
  const at = (from: number, to: number): TextEditorTextRange => ({ block: 'p1', from, to });
  const select = (anchor: number, head: number): TextEditorAction => ({
    type: 'selection.set',
    selection: {
      kind: 'text',
      anchor: { block: 'p1', offset: anchor },
      head: { block: 'p1', offset: head },
    },
  });
  const first = (headless: Headless) => html(headless).split('</p>')[0] + '</p>';

  it('a range links exactly its text: the parts of the link outside it keep their destination', () => {
    const cases: [TextEditorTextRange, string, string][] = [
      [at(5, 7), B, `pre <a href="${A}">l</a><a href="${B}">in</a><a href="${A}">k</a> post`],
      [at(2, 6), B, `pr<a href="${B}">e li</a><a href="${A}">nk</a> post`],
      [at(6, 10), B, `pre <a href="${A}">li</a><a href="${B}">nk p</a>ost`],
      [at(2, 10), B, `pr<a href="${B}">e link p</a>ost`],
      [at(4, 8), B, `pre <a href="${B}">link</a> post`],
      // Text linked to the same destination joins the link beside it.
      [at(2, 6), A, `pr<a href="${A}">e link</a> post`],
      [at(6, 10), A, `pre <a href="${A}">link p</a>ost`],
    ];
    for (const [range, href, expected] of cases) {
      const headless = headlessLexical({ html: SOURCE });
      const action: TextEditorAction = { type: 'link.set', href, range };
      expect(headless.instance.can(action)).toBe(true);
      expect(run(headless, action)).toBe(true);
      expect(first(headless), JSON.stringify(range)).toBe(`<p data-id="p1">${expected}</p>`);
    }
  });

  it('a selection that reaches into a link links the selected text; inside one link, the whole link', () => {
    const cases: [TextEditorAction, string][] = [
      [select(2, 6), `pr<a href="${B}">e li</a><a href="${A}">nk</a> post`],
      [select(10, 6), `pre <a href="${A}">li</a><a href="${B}">nk p</a>ost`],
      [select(5, 7), `pre <a href="${B}">link</a> post`],
    ];
    for (const [selection, expected] of cases) {
      const headless = headlessLexical({ html: SOURCE });
      expect(run(headless, selection, { type: 'link.set', href: B })).toBe(true);
      expect(first(headless)).toBe(`<p data-id="p1">${expected}</p>`);
    }
  });

  it('a range strictly inside a link is one undo step, which restores the link', () => {
    for (const range of [at(5, 7), at(4, 7), at(5, 8)]) {
      const headless = headlessLexical({ html: SOURCE });
      expect(headless.instance.getState().history.undo).toBe(false);
      expect(run(headless, { type: 'link.set', href: B, range })).toBe(true);
      expect(headless.instance.getState().history.undo, JSON.stringify(range)).toBe(true);
      expect(run(headless, { type: 'history.undo' })).toBe(true);
      expect(first(headless)).toBe(`<p data-id="p1">pre <a href="${A}">link</a> post</p>`);
      expect(headless.instance.getState().history).toEqual({ undo: false, redo: true });
    }
  });
});
