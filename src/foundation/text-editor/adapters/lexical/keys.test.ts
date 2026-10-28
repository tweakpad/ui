/**
 * Editing keys on Lexical: lists, code blocks, quotes, Backspace at a block start, normalization,
 * the block cursor and keys beside tables (Widgets `uwg-te-req-parity-1`, `uwg-te-req-blocks-1`,
 * `uwg-te-req-content-7`, `uwg-te-req-engine-9`, `uwg-te-req-key-3`, `uwg-te-req-engine-12`).
 */
import * as lexical from 'lexical';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { corpusNodes } from '../../content/corpus.test.js';
import {
  fakeContainer,
  FakeDocument,
  fakeSelection,
  freshIds,
  keyEvent,
  SELECTION_KEEPING_ACTIONS,
  textRun,
  WHOLE_DOCUMENT_INPUTS,
  WHOLE_DOCUMENTS,
  type FakeElement,
  type WholeDocumentInput,
} from '../shared/test-helpers.test.js';
import { $atomBesideCaret, $verticalToAtom, trackPresses } from './cursor.js';
import { LexicalGeometry } from './geometry.js';
import { $blockId, $holders } from './ids.js';
import {
  headlessLexical,
  htmlOf as html,
  realLexicalModules,
  rootedLexical,
  selectText,
  type Headless,
} from './lexical-stubs.test.js';
import type { LexicalElementLike, TextEditorLexicalModules } from './modules.js';
import { $cellCaretArrow } from './tables.js';
import type { LexicalLastInput } from './runtime.js';
import type { TextEditorAction } from '../../actions.js';
import type { TextEditorSelectionInput, TextEditorTextPoint } from '../../model.js';

const ids = (headless: Headless) =>
  headless.editor.read(() => $holders(headless.rt).map((holder) => $blockId(headless.rt, holder)));

/** Dispatches a key command with a fake event; answers whether it was handled and prevented. */
function press(
  headless: Headless,
  command: lexical.LexicalCommand<KeyboardEvent> | lexical.LexicalCommand<KeyboardEvent | null>,
  key: string,
  init: Parameters<typeof keyEvent>[1] = {},
) {
  const { event, record } = keyEvent(key, init);
  const handled = headless.editor.dispatchCommand(
    command as lexical.LexicalCommand<KeyboardEvent>,
    event,
  );
  headless.editor.read(() => undefined);
  return { handled, prevented: record.prevented > 0 };
}

/** Enter as the engine dispatches it, the update flushed. */
function enter(headless: Headless): void {
  headless.editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
  headless.editor.read(() => undefined);
}

/** A backward character deletion, as Backspace and its input event dispatch it. */
function backspace(headless: Headless): void {
  headless.editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, true);
  headless.editor.read(() => undefined);
}

const caret = (headless: Headless) => {
  const selection = headless.instance.getState().selection;
  return selection.kind === 'text' ? selection.head : null;
};

const list =
  '<ul><li data-id="a"><p>one</p></li><li data-id="b"><p>two</p><ul><li data-id="c"><p>three</p></li></ul></li><li data-id="d"><p>four</p></li></ul>';

describe('uwg-te-req-parity-1: Tab and Shift+Tab in list items', () => {
  it('Tab nests an item as the last nested item of its previous sibling', () => {
    const headless = headlessLexical({ html: list });
    selectText(headless, { block: 'd', offset: 2 });
    expect(press(headless, lexical.KEY_TAB_COMMAND, 'Tab')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(html(headless)).toBe(
      '<ul><li data-id="a"><p>one</p></li><li data-id="b"><p>two</p><ul><li data-id="c"><p>three</p></li><li data-id="d"><p>four</p></li></ul></li></ul>',
    );
    expect(caret(headless)).toEqual({ block: 'd', offset: 2 });
  });

  it('Tab on an item without a previous sibling is consumed without effect', () => {
    const headless = headlessLexical({ html: list });
    selectText(headless, { block: 'a', offset: 0 });
    const before = html(headless);
    headless.recording.clear();
    expect(press(headless, lexical.KEY_TAB_COMMAND, 'Tab')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(html(headless)).toBe(before);
    expect(headless.recording.of('content')).toEqual([]);
  });

  it('Shift+Tab places a nested item after its parent, its following siblings becoming its children', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li></ul>',
    });
    selectText(headless, { block: 'b', offset: 1 });
    expect(press(headless, lexical.KEY_TAB_COMMAND, 'Tab', { shift: true }).handled).toBe(true);
    expect(html(headless)).toBe(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p><ul><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
  });

  it('Shift+Tab turns a top-level item into a paragraph, its nested items following', () => {
    const headless = headlessLexical({ html: list });
    selectText(headless, { block: 'b', offset: 0 });
    press(headless, lexical.KEY_TAB_COMMAND, 'Tab', { shift: true });
    expect(html(headless)).toBe(
      '<ul><li data-id="a"><p>one</p></li></ul>\n<p data-id="b">two</p>\n<ul><li data-id="c"><p>three</p></li><li data-id="d"><p>four</p></li></ul>',
    );
    expect(caret(headless)).toEqual({ block: 'b', offset: 0 });
  });

  it('Tab outside lists, code and cells is left to the browser; Mod+Tab is never taken', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">x</p>' });
    selectText(headless, { block: 'p1', offset: 1 });
    expect(press(headless, lexical.KEY_TAB_COMMAND, 'Tab')).toEqual({
      handled: false,
      prevented: false,
    });
    const items = headlessLexical({ html: list });
    selectText(items, { block: 'd', offset: 0 });
    expect(press(items, lexical.KEY_TAB_COMMAND, 'Tab', { ctrl: true }).handled).toBe(false);
  });
});

describe('uwg-te-req-parity-1: Enter in list items', () => {
  it('Enter in an empty nested item unnests it; in an empty top-level item it becomes a paragraph', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>a</p><ul><li data-id="e"><p></p></li></ul></li></ul>',
    });
    selectText(headless, { block: 'e', offset: 0 });
    enter(headless);
    expect(html(headless)).toBe(
      '<ul><li data-id="a"><p>a</p></li><li data-id="e"><p></p></li></ul>',
    );
    enter(headless);
    expect(html(headless)).toBe('<ul><li data-id="a"><p>a</p></li></ul>\n<p data-id="e"></p>');
    expect(caret(headless)).toEqual({ block: 'e', offset: 0 });
  });

  it('Enter at the start of a non-empty item inserts an empty item before it, which keeps its identifier', () => {
    const headless = headlessLexical({ html: '<ul><li data-id="a"><p>alpha</p></li></ul>' });
    selectText(headless, { block: 'a', offset: 0 });
    enter(headless);
    expect(html(headless).replace(/gen\d{4}/u, 'NEW')).toBe(
      '<ul><li data-id="NEW"><p></p></li><li data-id="a"><p>alpha</p></li></ul>',
    );
  });

  it('Backspace at the start of an item unnests it, keeping its identifier', () => {
    const headless = headlessLexical({ html: list });
    selectText(headless, { block: 'c', offset: 0 });
    expect(press(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(ids(headless)).toEqual(['a', 'b', 'c', 'd']);
    expect(html(headless)).toContain('<li data-id="c"><p>three</p></li><li data-id="d">');
  });
});

describe('uwg-te-req-parity-1: code block keys', () => {
  const code = '<pre data-id="c1"><code>if x\n  go</code></pre><p data-id="p1">after</p>';

  it('Tab inserts two spaces, never a tab; Shift+Tab removes up to two leading spaces', () => {
    const headless = headlessLexical({ html: code });
    selectText(headless, { block: 'c1', offset: 2 });
    expect(press(headless, lexical.KEY_TAB_COMMAND, 'Tab')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(html(headless)).toContain('<code>if   x\n  go</code>');
    expect(caret(headless)).toEqual({ block: 'c1', offset: 4 });
    selectText(headless, { block: 'c1', offset: 9 });
    press(headless, lexical.KEY_TAB_COMMAND, 'Tab', { shift: true });
    expect(html(headless)).toContain('<code>if   x\ngo</code>');
    expect(html(headless)).not.toContain('\t');
  });

  it('Tab over a selection indents each touched line', () => {
    const headless = headlessLexical({ html: code });
    selectText(headless, { block: 'c1', offset: 1 }, { block: 'c1', offset: 7 });
    press(headless, lexical.KEY_TAB_COMMAND, 'Tab');
    expect(html(headless)).toContain('<code>  if x\n    go</code>');
    expect(headless.instance.getState().selection).toMatchObject({
      anchor: { offset: 3 },
      head: { offset: 11 },
    });
  });

  it('Enter and Shift+Enter keep the caret line’s leading spaces and stay in the block', () => {
    const headless = headlessLexical({ html: code });
    selectText(headless, { block: 'c1', offset: 9 });
    expect(press(headless, lexical.KEY_ENTER_COMMAND, 'Enter').prevented).toBe(true);
    expect(html(headless)).toContain('<code>if x\n  go\n  </code>');
    press(headless, lexical.KEY_ENTER_COMMAND, 'Enter', { shift: true });
    expect(html(headless)).toContain('<code>if x\n  go\n  \n  </code>');
    expect(caret(headless)).toEqual({ block: 'c1', offset: 15 });
  });

  it('Enter at the end of a text ending with two line breaks leaves the block without them', () => {
    const headless = headlessLexical({ html: '<pre data-id="c1"><code>x</code></pre>' });
    selectText(headless, { block: 'c1', offset: 1 });
    press(headless, lexical.KEY_ENTER_COMMAND, 'Enter');
    press(headless, lexical.KEY_ENTER_COMMAND, 'Enter');
    expect(html(headless)).toContain('<code>x\n\n</code>');
    press(headless, lexical.KEY_ENTER_COMMAND, 'Enter');
    expect(html(headless).replace(/gen\d{4}/u, 'NEW')).toBe(
      '<pre data-id="c1"><code>x</code></pre>\n<p data-id="NEW"></p>',
    );
    expect(caret(headless)?.block).not.toBe('c1');
  });

  it('ArrowDown at the end of a last code block and ArrowUp at the start of a first one add a paragraph', () => {
    const headless = headlessLexical({ html: '<pre data-id="c1"><code>ab</code></pre>' });
    selectText(headless, { block: 'c1', offset: 1 });
    expect(press(headless, lexical.KEY_ARROW_DOWN_COMMAND, 'ArrowDown').handled).toBe(false);
    selectText(headless, { block: 'c1', offset: 2 });
    expect(press(headless, lexical.KEY_ARROW_DOWN_COMMAND, 'ArrowDown')).toEqual({
      handled: true,
      prevented: true,
    });
    selectText(headless, { block: 'c1', offset: 0 });
    expect(press(headless, lexical.KEY_ARROW_UP_COMMAND, 'ArrowUp', { shift: true }).handled).toBe(
      false,
    );
    expect(press(headless, lexical.KEY_ARROW_UP_COMMAND, 'ArrowUp').handled).toBe(true);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ kind }) => kind),
    ).toEqual(['paragraph', 'code', 'paragraph']);
    expect(caret(headless)?.block).toBe(headless.instance.getBlocks().roots[0]);
  });
});

describe('uwg-te-req-parity-1: Enter in a quote, Backspace at a block start', () => {
  it('Enter in the middle of a quote splits it into two quotes; at its end it inserts a paragraph', () => {
    const headless = headlessLexical({ html: '<blockquote data-id="q1">calm sea</blockquote>' });
    selectText(headless, { block: 'q1', offset: 4 });
    enter(headless);
    expect(html(headless).replace(/gen\d{4}/u, 'NEW')).toBe(
      '<blockquote data-id="q1"><p>calm</p></blockquote>\n<blockquote data-id="NEW"><p>&nbsp;sea</p></blockquote>',
    );
    const second = headless.instance.getBlocks().roots[1]!;
    expect(caret(headless)).toEqual({ block: second, offset: 0 });
    selectText(headless, { block: second, offset: 4 });
    enter(headless);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ kind }) => kind),
    ).toEqual(['quote', 'quote', 'paragraph']);
  });

  it('Backspace at the start of a heading, quote or code block turns it into a paragraph keeping its identifier', () => {
    const headless = headlessLexical({
      html: '<h2 data-id="h1">Tides</h2><blockquote data-id="q1">calm</blockquote><pre data-id="c1"><code>a\nb</code></pre>',
    });
    for (const id of ['h1', 'q1', 'c1']) {
      selectText(headless, { block: id, offset: 0 });
      expect(press(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace').handled).toBe(true);
    }
    expect(html(headless)).toBe(
      '<p data-id="h1">Tides</p>\n<p data-id="q1">calm</p>\n<p data-id="c1">a<br>b</p>',
    );
    // A further Backspace acts as at the start of a paragraph: the engine joins the blocks.
    selectText(headless, { block: 'q1', offset: 0 });
    expect(press(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace').handled).toBe(true);
    expect(ids(headless)).toEqual(['h1', 'c1']);
  });

  it('blocks that join keep the identifier of the block holding the first character', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">one</p><p data-id="p2">two</p><p data-id="e1"></p><p data-id="p3">three</p>',
    });
    selectText(headless, { block: 'p2', offset: 0 });
    backspace(headless);
    expect(ids(headless)).toEqual(['p1', 'e1', 'p3']);
    selectText(headless, { block: 'p3', offset: 0 });
    backspace(headless);
    expect(ids(headless)).toEqual(['p1', 'p3']);
    expect(html(headless)).toBe('<p data-id="p1">onetwo</p>\n<p data-id="p3">three</p>');
  });
});

describe('uwg-te-req-parity-1, uwg-te-req-content-7: Enter in a custom textblock', () => {
  const CALLOUT = (text: string) =>
    `<p data-id="p0">a</p><aside data-id="b1" data-type="callout" data-tone="warning">${text}</aside><p data-id="p9">z</p>`;
  const fresh = (headless: Headless) =>
    html(headless)
      .replace(/data-id="gen\d+"/gu, 'data-id="#"')
      .replace(/\n/gu, '');
  const enterAt = (source: string, offset: number) => {
    const headless = headlessLexical({ html: source, nodes: corpusNodes });
    selectText(headless, { block: 'b1', offset });
    expect(press(headless, lexical.KEY_ENTER_COMMAND, 'Enter').handled).toBe(true);
    return headless;
  };

  it('in the middle it splits the block into two of its kind, the second with its attributes and a fresh identifier', () => {
    const headless = enterAt(CALLOUT('No<strong>te</strong>'), 2);
    expect(fresh(headless)).toBe(
      '<p data-id="p0">a</p>' +
        '<aside data-id="b1" data-type="callout" data-tone="warning">No</aside>' +
        '<aside data-id="#" data-type="callout" data-tone="warning"><strong>te</strong></aside>' +
        '<p data-id="p9">z</p>',
    );
    const second = headless.instance.getBlocks().roots[2]!;
    expect(caret(headless)).toEqual({ block: second, offset: 0 });
    // One undo step, which restores the block.
    expect(headless.instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' })).toBe(true);
    expect(fresh(headless)).toBe(CALLOUT('No<strong>te</strong>'));
  });

  it('at its end, or in an empty one, it inserts a paragraph after it with the caret', () => {
    for (const [text, offset] of [
      ['Note', 4],
      ['', 0],
    ] as const) {
      const headless = enterAt(CALLOUT(text), offset);
      expect(fresh(headless)).toBe(
        `<p data-id="p0">a</p><aside data-id="b1" data-type="callout" data-tone="warning">${text}</aside>` +
          '<p data-id="#"></p><p data-id="p9">z</p>',
      );
      const paragraph = headless.instance.getBlocks().roots[2]!;
      expect(caret(headless)).toEqual({ block: paragraph, offset: 0 });
    }
  });

  it('at the start of a non-empty one it inserts an empty paragraph before it', () => {
    const headless = enterAt(CALLOUT('Note'), 0);
    expect(fresh(headless)).toBe(
      '<p data-id="p0">a</p><p data-id="#"></p>' +
        '<aside data-id="b1" data-type="callout" data-tone="warning">Note</aside><p data-id="p9">z</p>',
    );
    expect(caret(headless)).toEqual({ block: 'b1', offset: 0 });
  });
});

describe('uwg-te-req-blocks-1: normalization', () => {
  it('code text keeps no format but its link; inline code keeps only the code format', () => {
    const headless = headlessLexical({
      html: '<pre data-id="c1"><code>ab</code></pre><p data-id="p1">x</p>',
    });
    headless.editor.update(
      () => {
        const code = lexical.$getRoot().getFirstChild() as unknown as LexicalElementLike;
        const text = lexical.$createTextNode('bold');
        text.setFormat('bold');
        code.append(text as never);
        const paragraph = lexical.$getRoot().getLastChild() as unknown as LexicalElementLike;
        const inline = lexical.$createTextNode('k');
        inline.setFormat(1 | 16 | 128);
        paragraph.append(inline as never);
      },
      { discrete: true },
    );
    expect(html(headless)).toBe(
      '<pre data-id="c1"><code>abbold</code></pre>\n<p data-id="p1">x<code>k</code></p>',
    );
  });

  it('an empty paragraph follows a final atom block or table, and no other final block', () => {
    const headless = headlessLexical({ html: '<h1 data-id="h1">T</h1><hr data-id="d1">' });
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ kind }) => kind),
    ).toEqual(['heading', 'divider', 'paragraph']);
    const heading = headlessLexical({ html: '<p data-id="p1">a</p><h1 data-id="h1">T</h1>' });
    expect(heading.instance.getBlocks().roots).toEqual(['p1', 'h1']);
    // A document left without blocks holds one empty paragraph with a fresh identifier.
    heading.editor.update(() => lexical.$getRoot().clear(), { discrete: true });
    expect(heading.instance.getBlocks().ordered()).toMatchObject([
      { kind: 'paragraph', empty: true, id: expect.stringMatching(/^gen\d{4}$/u) },
    ]);
  });
});

describe('uwg-te-req-engine-11: Delete at the end of a code block joins the textblock after it', () => {
  const MENTION = '<span data-type="mention" data-person="u1" data-label="Ann">@Ann</span>';
  const engineCode = (headless: Headless) =>
    headless.editor.read(() =>
      (lexical.$getRoot().getFirstChild() as unknown as LexicalElementLike)
        .getChildren()
        .map((child) => child.getType()),
    );

  it('after joining a paragraph that holds only an inline node, the next Delete joins the paragraph after it', () => {
    const headless = headlessLexical({
      html: `<pre data-id="a"><code>a\nb</code></pre><p data-id="b">${MENTION}</p><p data-id="z">z</p>`,
      nodes: corpusNodes,
    });
    selectText(headless, { block: 'a', offset: 3 });
    expect(press(headless, lexical.KEY_DELETE_COMMAND, 'Delete').prevented).toBe(true);
    // The inline node joins as its text (`uwg-te-req-content-5`).
    expect(html(headless)).toBe(
      '<pre data-id="a"><code>a\nb@Ann</code></pre>\n<p data-id="z">z</p>',
    );
    // The code block holds what the document reports: its text and line breaks.
    expect(engineCode(headless)).toEqual(['text', 'linebreak', 'text']);
    expect(caret(headless)).toEqual({ block: 'a', offset: 3 });
    selectText(headless, { block: 'a', offset: 7 });
    expect(press(headless, lexical.KEY_DELETE_COMMAND, 'Delete').prevented).toBe(true);
    expect(html(headless)).toBe('<pre data-id="a"><code>a\nb@Annz</code></pre>');
    expect(caret(headless)).toEqual({ block: 'a', offset: 7 });
  });

  it('an inline node that reaches a code block by any other path than a join leaves it', () => {
    const headless = headlessLexical({
      html: `<pre data-id="a"><code>ab</code></pre><p data-id="b">x${MENTION}y</p>`,
      nodes: corpusNodes,
    });
    headless.editor.update(
      () => {
        const [code, paragraph] = lexical.$getRoot().getChildren<lexical.ElementNode>();
        const node = paragraph!.getChildren().find((child) => !lexical.$isTextNode(child));
        if (node) code!.append(node);
      },
      { discrete: true },
    );
    expect(html(headless)).toBe('<pre data-id="a"><code>ab</code></pre>\n<p data-id="b">xy</p>');
    expect(engineCode(headless)).toEqual(['text']);
  });
});

describe('uwg-te-req-engine-9: the block cursor', () => {
  const doc =
    '<p data-id="p1">ab</p><hr data-id="d1"><table data-id="t1"><tbody><tr><td><p>c</p></td></tr></tbody></table><p data-id="p2">z</p>';

  /** Places a collapsed selection on the root before child `index`, after a key or none. */
  function blockCursor(headless: Headless, index: number, key: string | null) {
    headless.rt.lastInput = key ? { kind: 'key', key, shift: false } : null;
    headless.editor.update(
      () => {
        const selection = lexical.$createRangeSelection();
        selection.anchor.set('root', index, 'element');
        selection.focus.set('root', index, 'element');
        lexical.$setSelection(selection);
      },
      { discrete: true },
    );
    headless.editor.read(() => undefined);
    return headless.instance.getState().selection;
  }

  it('a key toward an atom selects it; toward a table or textblock the caret moves into it', () => {
    const headless = headlessLexical({ html: doc });
    // Keys move a selection the user or the API placed.
    selectText(headless, { block: 'p1', offset: 2 });
    expect(blockCursor(headless, 1, 'ArrowRight')).toEqual({ kind: 'blocks', ids: ['d1'] });
    expect(blockCursor(headless, 2, 'ArrowLeft')).toEqual({ kind: 'blocks', ids: ['d1'] });
    expect(blockCursor(headless, 2, 'ArrowDown')).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
    expect(blockCursor(headless, 3, 'ArrowUp')).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 1 },
    });
    expect(blockCursor(headless, 3, 'ArrowRight')).toMatchObject({
      kind: 'text',
      head: { block: 'p2', offset: 0 },
    });
  });

  it('with no selection placed, as when the root takes focus with Tab, the caret goes to the first text edge, never on a leading atom', () => {
    for (const input of [null, 'Tab', 'ArrowRight', 'ArrowLeft']) {
      const headless = headlessLexical({
        html: '<hr data-id="d1"><hr data-id="d2"><p data-id="p1">first line</p><p data-id="p2">second</p>',
      });
      expect(headless.instance.getState().selection).toEqual({ kind: 'none' });
      expect(blockCursor(headless, 0, input)).toEqual({
        kind: 'text',
        anchor: { block: 'p1', offset: 0 },
        head: { block: 'p1', offset: 0 },
        empty: true,
      });
    }
    const table = headlessLexical({
      html: '<hr data-id="d1"><table data-id="t1"><tbody><tr><td><p>a</p></td></tr></tbody></table>',
    });
    expect(blockCursor(table, 0, null)).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
  });

  it('a press between a table and a divider measures the table by its own box, not its scroll wrapper with the reserved space', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p>c</p></td></tr></tbody></table><hr data-id="d1"><p data-id="p2">z</p>',
    });
    const box = (top: number, bottom: number) => ({
      getClientRects: () => [{}],
      getBoundingClientRect: () => ({
        left: 0,
        right: 400,
        top,
        bottom,
        width: 400,
        height: bottom - top,
      }),
    });
    // The table ends at 100, its wrapper with the reserved quick-add space at 130; the divider at 140.
    const table = { tagName: 'TABLE', ...box(0, 100) };
    const wrapper = { tagName: 'DIV', ...box(0, 130), querySelector: () => table };
    const divider = { tagName: 'HR', ...box(140, 141) };
    const keys = headless.editor.read(() =>
      lexical
        .$getRoot()
        .getChildren()
        .map((node) => node.getKey()),
    );
    headless.editor.getElementByKey = ((key: string) =>
      key === keys[0] ? wrapper : key === keys[1] ? divider : null) as never;
    headless.rt.lastInput = { kind: 'press', x: 50, y: 125, shift: false };
    headless.editor.update(
      () => {
        const selection = lexical.$createRangeSelection();
        selection.anchor.set('root', 1, 'element');
        selection.focus.set('root', 1, 'element');
        lexical.$setSelection(selection);
      },
      { discrete: true },
    );
    headless.editor.read(() => undefined);
    // 25 from the table, 15 from the divider: the start of the textblock after it.
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'p2', offset: 0 },
    });
  });

  it('with nothing in the key’s direction the selection goes back to where it was', () => {
    const headless = headlessLexical({ html: '<hr data-id="d1"><p data-id="p1">a</p>' });
    selectText(headless, { block: 'p1', offset: 0 });
    expect(blockCursor(headless, 0, 'ArrowLeft')).toMatchObject({
      kind: 'text',
      head: { block: 'p1', offset: 0 },
    });
  });
});

describe('uwg-te-req-engine-9: ArrowUp and ArrowDown beside an atom', () => {
  const doc =
    '<p data-id="top">top</p><hr data-id="d1"><p data-id="mid">mid</p><img data-id="i1" src="https://a.example/a.png" alt="">' +
    '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p><p>b2</p></td></tr><tr><td><p>c</p></td><td><p>d</p></td></tr></tbody></table><p data-id="end">end</p>';
  /** The key at a caret, the caret on the edge line or not; answers the selection after it. */
  function vertical(
    headless: Headless,
    key: 'ArrowUp' | 'ArrowDown',
    at: Parameters<typeof selectText>[1],
    onEdge = true,
  ) {
    selectText(headless, at);
    const sides: string[] = [];
    let moved = false;
    headless.editor.update(
      () => {
        moved = $verticalToAtom(headless.rt, key, (_point, side) => {
          sides.push(side);
          return onEdge;
        });
      },
      { discrete: true },
    );
    return { moved, sides, selection: headless.instance.getState().selection };
  }

  it('on the edge line toward an atom the key selects the atom', () => {
    const headless = headlessLexical({ html: doc });
    expect(vertical(headless, 'ArrowUp', { block: 'mid', offset: 0 })).toEqual({
      moved: true,
      sides: ['first'],
      selection: { kind: 'blocks', ids: ['d1'] },
    });
    expect(vertical(headless, 'ArrowDown', { block: 'top', offset: 3 }).selection).toEqual({
      kind: 'blocks',
      ids: ['d1'],
    });
    expect(vertical(headless, 'ArrowDown', { block: 'mid', offset: 3 })).toMatchObject({
      sides: ['last'],
      selection: { kind: 'blocks', ids: ['i1'] },
    });
  });

  it('from another line toward an atom the key is the browser’s, never the engine’s line navigation', () => {
    const headless = headlessLexical({ html: doc });
    expect(vertical(headless, 'ArrowDown', { block: 'top', offset: 1 }, false).moved).toBe(false);
    const beside = (key: 'ArrowUp' | 'ArrowDown') =>
      headless.editor.read(() => $atomBesideCaret(headless.rt, key));
    // The caret stays on the paragraph before the divider: the adapter takes the key unprevented.
    expect(beside('ArrowDown')).toBe(true);
    expect(beside('ArrowUp')).toBe(false);
    selectText(headless, { block: 'end', offset: 1 });
    expect(beside('ArrowDown')).toBe(false);
  });

  it('in a table only the first or last row’s first or last paragraph leads to the atom beside the table', () => {
    const headless = headlessLexical({ html: doc });
    const cell = (row: number, column: number, paragraph = 0) => ({
      block: 't1',
      cell: { row, column, paragraph },
      offset: 0,
    });
    expect(vertical(headless, 'ArrowUp', cell(0, 1)).selection).toEqual({
      kind: 'blocks',
      ids: ['i1'],
    });
    expect(vertical(headless, 'ArrowUp', cell(0, 1, 1)).moved).toBe(false);
    expect(vertical(headless, 'ArrowUp', cell(1, 0)).moved).toBe(false);
    // Below the table lies a textblock: the engine moves there.
    expect(vertical(headless, 'ArrowDown', cell(1, 1)).moved).toBe(false);
  });

  it('off the edge line, or toward a textblock or table, the engine moves the caret', () => {
    const headless = headlessLexical({ html: doc });
    expect(vertical(headless, 'ArrowUp', { block: 'mid', offset: 1 }, false)).toMatchObject({
      moved: false,
      selection: { kind: 'text', head: { block: 'mid', offset: 1 } },
    });
    expect(vertical(headless, 'ArrowUp', { block: 'top', offset: 1 }).moved).toBe(false);
    expect(vertical(headless, 'ArrowUp', { block: 'end', offset: 0 }).moved).toBe(false);
    expect(vertical(headless, 'ArrowDown', { block: 'end', offset: 3 }).moved).toBe(false);
  });

  it('the keys are taken ahead of the engine’s, without modifiers and only while editable', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'mid', offset: 0 });
    // Node measures no line, so the key stays the engine's: it is not taken.
    expect(press(headless, lexical.KEY_ARROW_UP_COMMAND, 'ArrowUp').prevented).toBe(false);
  });
});

describe('uwg-te-req-engine-9: a press after a block selection', () => {
  /**
   * A mount whose editor has a root in a fake document: `$getNearestNodeFromDOMNode` and
   * `$createRangeSelectionFromDom` resolve the fake press target and DOM selection to the start of
   * the last block, as the engine resolves real ones; `editable` false mounts it read-only.
   */
  function pressable(html: string, editable = true) {
    const real = realLexicalModules;
    const last = () => lexical.$getRoot().getLastChild() as lexical.ElementNode;
    let target: unknown = null;
    let atom: unknown = null;
    const modules: TextEditorLexicalModules = {
      ...real,
      lexical: {
        ...real.lexical,
        getDOMSelectionPoints: (selection) => selection,
        $getNearestNodeFromDOMNode: (dom) =>
          (dom === target
            ? last()
            : dom === atom
              ? lexical
                  .$getRoot()
                  .getChildren()
                  .find((node) => lexical.$isDecoratorNode(node))
              : null) as never,
        $createRangeSelectionFromDom: () => {
          const selection = lexical.$createRangeSelection();
          selection.anchor.set(last().getKey(), 0, 'element');
          selection.focus.set(last().getKey(), 0, 'element');
          return selection as never;
        },
      },
    };
    const rooted = rootedLexical({ html, modules, editable });
    const { root, document } = rooted;
    target = document.createElement('p');
    atom = document.createElement('hr');
    root.append(target as FakeElement, atom as FakeElement);
    // The press placed a caret at the start of the last block.
    const points = { anchorNode: target, anchorOffset: 0, focusNode: target, focusOffset: 0 };
    const view: { event?: Event | undefined } = {};
    Object.assign(document, {
      getSelection: () => ({ rangeCount: 1, ...points }),
      defaultView: Object.assign(view, document.defaultView),
    });
    const headless = {
      instance: rooted.instance,
      editor: rooted.instance.native as lexical.LexicalEditor,
    } as unknown as Headless;
    const setEvent = (event: Event | undefined) => void (view.event = event);
    return { headless, target, atom, setEvent, root };
  }
  const click = (headless: Headless, target: unknown) => {
    headless.editor.dispatchCommand(lexical.CLICK_COMMAND, {
      type: 'click',
      target,
      detail: 1,
      shiftKey: false,
    } as unknown as MouseEvent);
    headless.editor.read(() => undefined);
    return headless.instance.getState().selection;
  };
  const doc = '<p data-id="top">Top</p><hr data-id="d1"><p data-id="after">After</p>';
  const blocks = (headless: Headless, ids: string[]) =>
    headless.instance.execute([{ type: 'selection.set', selection: { kind: 'blocks', ids } }], {
      reason: 'imperative-action',
      focus: false,
    });

  it('a click outside the selected blocks reads the DOM selection the press placed, which a short press leaves for the click', () => {
    const { headless, target } = pressable(doc);
    blocks(headless, ['d1']);
    expect(click(headless, target)).toEqual({
      kind: 'text',
      anchor: { block: 'after', offset: 0 },
      head: { block: 'after', offset: 0 },
      empty: true,
    });
  });

  it('a click on an atom selects the atom it targets', () => {
    const { headless, atom } = pressable(doc);
    blocks(headless, ['top']);
    expect(click(headless, atom).kind).not.toBe('text');
  });

  it('V-737: a plain click on an image selects it as a block, as the other engine does; a Shift click stays the engine’s', () => {
    const image =
      '<p data-id="top">Top</p><img data-id="i1" src="a.png" alt="A"><p data-id="after">After</p>';
    const { headless, atom } = pressable(image);
    selectText(headless, { block: 'top', offset: 1 });
    expect(click(headless, atom)).toEqual({ kind: 'blocks', ids: ['i1'] });
    selectText(headless, { block: 'top', offset: 1 });
    headless.editor.dispatchCommand(lexical.CLICK_COMMAND, {
      type: 'click',
      target: atom,
      detail: 1,
      shiftKey: true,
    } as unknown as MouseEvent);
    headless.editor.read(() => undefined);
    expect(headless.instance.getState().selection.kind).toBe('text');
    // Read-only keeps the document selectable: the click selects the atom there too.
    const readOnly = pressable(image, false);
    expect(click(readOnly.headless, readOnly.atom)).toEqual({ kind: 'blocks', ids: ['i1'] });
  });

  it('while read-only, a DOM selection change inside the root replaces a block selection with the DOM selection', () => {
    const { headless, setEvent } = pressable(doc, false);
    blocks(headless, ['top', 'd1', 'after']);
    expect(headless.instance.getState().selection).toEqual({
      kind: 'blocks',
      ids: ['top', 'd1', 'after'],
    });
    // The change that the engine reports for a block selection outside a selectionchange event,
    // such as its own commit, changes nothing.
    headless.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
    headless.editor.read(() => undefined);
    expect(headless.instance.getState().selection.kind).toBe('blocks');
    const selectionChange = () => {
      setEvent(new Event('selectionchange'));
      headless.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
      setEvent(undefined);
      headless.editor.read(() => undefined);
    };
    // The first change echoes the engine's own write of the DOM selection for the placed blocks.
    selectionChange();
    expect(headless.instance.getState().selection.kind).toBe('blocks');
    selectionChange();
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'after', offset: 0 },
    });
  });

  it('V-438: while read-only, a placed block selection outlives the echo of its DOM selection write, and a press or a key ends the wait for it', () => {
    const { headless, setEvent, root } = pressable(doc, false);
    const selectionChange = () => {
      setEvent(new Event('selectionchange'));
      headless.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
      setEvent(undefined);
      headless.editor.read(() => undefined);
      return headless.instance.getState().selection.kind;
    };
    for (const input of ['pointerdown', 'keydown']) {
      blocks(headless, ['d1']);
      expect(headless.instance.getState().selection).toEqual({ kind: 'blocks', ids: ['d1'] });
      root.dispatchEvent(new Event(input));
      expect(selectionChange()).toBe('text');
    }
    blocks(headless, ['d1']);
    expect(selectionChange()).toBe('blocks');
  });
});

describe('uwg-te-lis-up-i2: Backspace and Delete over a cell range clear the cells, never the table', () => {
  const TABLE =
    '<p data-id="p0">before</p><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr><tr><td colspan="2"><p>wide</p></td></tr></tbody></table><p data-id="p2">after</p>';
  const all = {
    kind: 'cells' as const,
    table: 't1',
    range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
  };
  const selectAllCells = (headless: Headless) =>
    expect(
      headless.instance.execute([{ type: 'selection.set', selection: all }], {
        reason: 'imperative-action',
      }),
    ).toBe(true);
  const cleared =
    '<table data-id="t1"><tbody><tr><td><p></p></td><td><p></p></td></tr><tr><td colspan="2"><p></p></td></tr></tbody></table>';

  for (const [label, act] of [
    [
      'Backspace',
      (headless: Headless) => press(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace'),
    ],
    ['Delete', (headless: Headless) => press(headless, lexical.KEY_DELETE_COMMAND, 'Delete')],
  ] as const)
    it(`${label} over every cell clears them, keeps the table and the cell range`, () => {
      const headless = headlessLexical({ html: TABLE });
      selectAllCells(headless);
      const result = act(headless);
      expect(result).toEqual({ handled: true, prevented: true });
      expect(html(headless)).toContain(cleared);
      expect(headless.instance.getBlocks().roots).toEqual(['p0', 't1', 'p2']);
      expect(headless.instance.getState().selection).toMatchObject({ kind: 'cells', table: 't1' });
      expect(headless.recording.of('content').at(-1)?.change).toEqual({
        cause: 'input',
        reason: 'input',
      });
    });

  it('the deletion commands of input events clear the cells too', () => {
    for (const [command, payload] of [
      [lexical.DELETE_CHARACTER_COMMAND, true],
      [lexical.DELETE_CHARACTER_COMMAND, false],
      [lexical.DELETE_WORD_COMMAND, true],
      [lexical.DELETE_LINE_COMMAND, false],
      [lexical.REMOVE_TEXT_COMMAND, null],
    ] as const) {
      const headless = headlessLexical({ html: TABLE });
      selectAllCells(headless);
      expect(headless.editor.dispatchCommand(command as never, payload as never)).toBe(true);
      headless.editor.read(() => undefined);
      expect(html(headless)).toContain(cleared);
      expect(headless.instance.getState().selection.kind).toBe('cells');
    }
  });

  it('a partial range clears the grown range; cells already empty change nothing', () => {
    const headless = headlessLexical({ html: TABLE });
    headless.instance.execute(
      [
        {
          type: 'selection.set',
          selection: {
            kind: 'cells',
            table: 't1',
            range: { anchor: { row: 0, column: 1 }, head: { row: 1, column: 1 } },
          },
        },
      ],
      { reason: 'imperative-action' },
    );
    press(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace');
    // The range grows over the wide cell, so the cell of column 0 above it is cleared as well.
    expect(html(headless)).toContain(cleared);
    headless.recording.clear();
    expect(press(headless, lexical.KEY_DELETE_COMMAND, 'Delete')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(headless.recording.of('content')).toEqual([]);
  });

  it('cut of a cell range clears the grown range and keeps the cell range selected', () => {
    const headless = headlessLexical({ html: TABLE });
    headless.instance.execute(
      [
        {
          type: 'selection.set',
          selection: {
            kind: 'cells',
            table: 't1',
            range: { anchor: { row: 0, column: 1 }, head: { row: 1, column: 1 } },
          },
        },
      ],
      { reason: 'imperative-action' },
    );
    const data = new Map<string, string>();
    headless.editor.dispatchCommand(lexical.CUT_COMMAND, {
      clipboardData: { setData: (format: string, value: string) => void data.set(format, value) },
      preventDefault: () => undefined,
    } as never);
    headless.editor.read(() => undefined);
    expect(html(headless)).toContain(cleared);
    // The head names the wide cell by the first row and column of its span.
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'cells',
      table: 't1',
      range: { anchor: { row: 0, column: 1 }, head: { row: 1, column: 0 } },
    });
  });
});

describe('uwg-te-req-content-7: Enter at the start of a table’s first cell splits in the cell', () => {
  it('Enter at the start of cell (0,0) adds a paragraph in the cell, none above the table', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p>ab</p></td><td><p>cd</p></td></tr></tbody></table><p data-id="p2">after</p>',
    });
    headless.instance.execute(
      [
        {
          type: 'selection.set',
          selection: { kind: 'caret', block: 't1', cell: { row: 0, column: 0 }, position: 'start' },
        },
      ],
      { reason: 'imperative-action' },
    );
    enter(headless);
    expect(headless.instance.getBlocks().roots).toEqual(['t1', 'p2']);
    expect(html(headless)).toMatch(
      /^<table data-id="t1"><tbody><tr><td><p><\/p><p>ab<\/p><\/td><td><p>cd<\/p><\/td><\/tr><\/tbody><\/table>/u,
    );
  });
});

describe('uwg-te-req-key-3: Tab with selections that touch list items', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const range = (
    anchor: { block: string; offset: number },
    head: { block: string; offset: number },
  ): TextEditorAction => ({ type: 'selection.set', selection: { kind: 'text', anchor, head } });
  function command<P>(headless: Headless, which: lexical.LexicalCommand<P>, payload: P) {
    const handled = headless.editor.dispatchCommand(which, payload);
    headless.editor.read(() => undefined);
    headless.editor.read(() => undefined);
    return handled;
  }
  const key = (headless: Headless, which: lexical.LexicalCommand<KeyboardEvent>, name: string) => {
    const { event, record } = keyEvent(name);
    const handled = command(headless, which, event);
    return { handled, prevented: record.prevented > 0 };
  };
  const ids = (headless: Headless) =>
    headless.instance
      .getBlocks()
      .ordered()
      .map(({ id, depth }) => `${id}@${depth}`);

  it('Tab that can nest no touched item with the head outside lists is not consumed', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p></li></ul><p data-id="q">x</p>',
    });
    run(headless, range({ block: 'a', offset: 1 }, { block: 'q', offset: 1 }));
    expect(key(headless, lexical.KEY_TAB_COMMAND, 'Tab')).toEqual({
      handled: false,
      prevented: false,
    });
  });

  it('Tab nests the touched items that can nest, the head in a paragraph', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p></li><li data-id="b"><p>two</p></li></ul><p data-id="q">x</p>',
    });
    run(headless, range({ block: 'b', offset: 1 }, { block: 'q', offset: 1 }));
    expect(key(headless, lexical.KEY_TAB_COMMAND, 'Tab')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(ids(headless)).toEqual(['a@0', 'b@1', 'q@0']);
  });
});

describe('uwg-te-req-engine-12: Enter on an aligned block', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const caret = (block: string, offset: number): TextEditorAction => ({
    type: 'selection.set',
    selection: { kind: 'text', anchor: { block, offset } },
  });
  function command<P>(headless: Headless, which: lexical.LexicalCommand<P>, payload: P) {
    const handled = headless.editor.dispatchCommand(which, payload);
    headless.editor.read(() => undefined);
    headless.editor.read(() => undefined);
    return handled;
  }

  for (const [label, offset] of [
    ['start', 0],
    ['middle', 2],
    ['end', 4],
  ] as const)
    it(`Enter at the ${label} of a centered paragraph gives a centered block`, () => {
      const headless = headlessLexical({
        html: '<p data-id="p1" style="text-align: center">calm</p>',
      });
      run(headless, caret('p1', offset));
      command(headless, lexical.INSERT_PARAGRAPH_COMMAND, undefined);
      const blocks = headless.instance.getBlocks().ordered();
      expect(blocks.map(({ attrs }) => (attrs as { align?: string }).align ?? null)).toEqual([
        'center',
        'center',
      ]);
    });

  it('Enter at the start of a centered list item gives a centered item', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a" style="text-align: center"><p>one</p></li></ul>',
    });
    run(headless, caret('a', 0));
    command(headless, lexical.INSERT_PARAGRAPH_COMMAND, undefined);
    const blocks = headless.instance.getBlocks().ordered();
    expect(
      blocks.map(({ id, attrs }) => [id === 'a', (attrs as { align?: string }).align]),
    ).toEqual([
      [false, 'center'],
      [true, 'center'],
    ]);
  });

  for (const align of ['center', 'end', 'justify'] as const)
    it(`Enter in an empty ${align}-aligned heading inserts a paragraph after it with that alignment`, () => {
      const headless = headlessLexical({
        html: `<h2 data-id="h1" style="text-align: ${align}"></h2><p data-id="p1">x</p>`,
      });
      run(headless, {
        type: 'selection.set',
        selection: { kind: 'caret', block: 'h1', position: 'start' },
      });
      expect(press(headless, lexical.KEY_ENTER_COMMAND, 'Enter').handled).toBe(true);
      const blocks = headless.instance.getBlocks().ordered();
      expect(
        blocks.map(({ id, kind, attrs }) => [id, kind, (attrs as { align?: string }).align]),
      ).toEqual([
        ['h1', 'heading', align],
        [blocks[1]!.id, 'paragraph', align],
        ['p1', 'paragraph', null],
      ]);
      expect(['h1', 'p1']).not.toContain(blocks[1]!.id);
      expect(headless.instance.getState().selection).toMatchObject({
        head: { block: blocks[1]!.id, offset: 0 },
        empty: true,
      });
    });

  for (const [label, source] of [
    ['heading', '<h2 data-id="b" style="text-align: center">calm</h2>'],
    ['quote', '<blockquote data-id="b" style="text-align: center"><p>calm</p></blockquote>'],
  ] as const)
    it(`Enter at the end of a centered ${label} gives a centered paragraph`, () => {
      const headless = headlessLexical({ html: source });
      run(headless, caret('b', 4));
      command(headless, lexical.INSERT_PARAGRAPH_COMMAND, undefined);
      const blocks = headless.instance.getBlocks().ordered();
      expect(blocks.map(({ kind, attrs }) => [kind, (attrs as { align?: string }).align])).toEqual([
        [label, 'center'],
        ['paragraph', 'center'],
      ]);
    });
});

describe('uwg-te-req-content-7: Backspace and Delete at list boundaries', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const html = (headless: Headless) =>
    (headless.instance.getContent('html') as string).replace(/\n/gu, '');
  const caret = (block: string, offset: number): TextEditorAction => ({
    type: 'selection.set',
    selection: { kind: 'text', anchor: { block, offset } },
  });
  function command<P>(headless: Headless, which: lexical.LexicalCommand<P>, payload: P) {
    const handled = headless.editor.dispatchCommand(which, payload);
    headless.editor.read(() => undefined);
    headless.editor.read(() => undefined);
    return handled;
  }
  const key = (headless: Headless, which: lexical.LexicalCommand<KeyboardEvent>, name: string) => {
    const { event, record } = keyEvent(name);
    const handled = command(headless, which, event);
    return { handled, prevented: record.prevented > 0 };
  };
  const ids = (headless: Headless) =>
    headless.instance
      .getBlocks()
      .ordered()
      .map(({ id, depth }) => `${id}@${depth}`);

  it('Delete at the end of a paragraph before a list joins the first item into it', () => {
    const headless = headlessLexical({
      html: '<p data-id="b">calm</p><ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul>',
    });
    run(headless, caret('b', 4));
    expect(key(headless, lexical.KEY_DELETE_COMMAND, 'Delete')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(html(headless)).toBe(
      '<p data-id="b">calmone</p><ul><li data-id="c"><p>two</p></li></ul>',
    );
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: 'b', offset: 4 },
    });
  });

  it('Backspace at the start of a paragraph after a list joins it into the deepest last item', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul><p data-id="b">calm</p>',
    });
    run(headless, caret('b', 0));
    expect(key(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace').handled).toBe(true);
    expect(html(headless)).toBe(
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>twocalm</p></li></ul></li></ul>',
    );
  });

  it('Delete at the end of an item joins its first nested item, whose own items follow under it', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p><ul><li data-id="d"><p>three</p></li></ul></li></ul></li></ul>',
    });
    run(headless, caret('a', 3));
    key(headless, lexical.KEY_DELETE_COMMAND, 'Delete');
    expect(ids(headless)).toEqual(['a@0', 'd@1']);
    expect(headless.instance.getContent('text')).toBe('onetwo\nthree');
  });

  it('Backspace at the start of a list item unnests it, keeping its identifier, as its own undo step', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li><li data-id="d"><p>three</p></li></ul></li></ul>',
    });
    run(headless, caret('d', 0));
    key(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace');
    expect(ids(headless)).toEqual(['a@0', 'c@1', 'd@0']);
  });
});

describe('uwg-te-req-engine-9: carets and keys beside tables', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const caret = (block: string, offset: number): TextEditorAction => ({
    type: 'selection.set',
    selection: { kind: 'text', anchor: { block, offset } },
  });
  function command<P>(headless: Headless, which: lexical.LexicalCommand<P>, payload: P) {
    const handled = headless.editor.dispatchCommand(which, payload);
    headless.editor.read(() => undefined);
    headless.editor.read(() => undefined);
    return handled;
  }
  const key = (headless: Headless, which: lexical.LexicalCommand<KeyboardEvent>, name: string) => {
    const { event, record } = keyEvent(name);
    const handled = command(headless, which, event);
    return { handled, prevented: record.prevented > 0 };
  };
  const TABLE =
    '<p data-id="p0">a</p><table data-id="t1"><tbody><tr><td><p>x</p></td><td><p>yz</p></td></tr></tbody></table><p data-id="p1">b</p>';

  it('a caret at a table without a cell goes to cell (0,0), or the end of its last cell', () => {
    const headless = headlessLexical({ html: TABLE });
    const start: TextEditorAction = {
      type: 'selection.set',
      selection: { kind: 'caret', block: 't1', position: 'start' },
    };
    expect(headless.instance.can(start)).toBe(true);
    expect(run(headless, start)).toBe(true);
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
    run(headless, {
      type: 'selection.set',
      selection: { kind: 'caret', block: 't1', position: 'end' },
    });
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 2 },
    });
  });

  it('Backspace after a table block-selects it; a second Backspace deletes it', () => {
    const headless = headlessLexical({ html: TABLE });
    run(headless, caret('p1', 0));
    expect(key(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(headless.instance.getState().selection).toEqual({ kind: 'blocks', ids: ['t1'] });
    command(headless, lexical.DELETE_CHARACTER_COMMAND, true);
    expect(headless.instance.getBlocks().roots).toEqual(['p0', 'p1']);
  });

  it('Delete at the end of a block before a table block-selects it', () => {
    const headless = headlessLexical({ html: TABLE });
    run(headless, caret('p0', 1));
    expect(key(headless, lexical.KEY_DELETE_COMMAND, 'Delete').handled).toBe(true);
    expect(headless.instance.getState().selection).toEqual({ kind: 'blocks', ids: ['t1'] });
  });

  it('a second Delete deletes the table as blocks.delete does: the caret at the end of the block before', () => {
    for (const after of ['<p data-id="p1">b</p>', '<hr data-id="r1"><p data-id="p1">b</p>']) {
      const headless = headlessLexical({ html: TABLE.replace('<p data-id="p1">b</p>', after) });
      run(headless, caret('p0', 1));
      key(headless, lexical.KEY_DELETE_COMMAND, 'Delete');
      expect(key(headless, lexical.KEY_DELETE_COMMAND, 'Delete')).toEqual({
        handled: true,
        prevented: true,
      });
      expect(headless.instance.getBlocks().roots).not.toContain('t1');
      expect(headless.instance.getState().selection).toEqual({
        kind: 'text',
        anchor: { block: 'p0', offset: 1 },
        head: { block: 'p0', offset: 1 },
        empty: true,
      });
    }
  });

  it('a block selection deleted by a key is one undo step, which restores it', () => {
    const headless = headlessLexical({ html: TABLE });
    run(headless, caret('p0', 1));
    key(headless, lexical.KEY_DELETE_COMMAND, 'Delete');
    command(headless, lexical.DELETE_CHARACTER_COMMAND, false);
    expect(headless.instance.getBlocks().roots).toEqual(['p0', 'p1']);
    headless.instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' });
    expect(headless.instance.getBlocks().roots).toEqual(['p0', 't1', 'p1']);
  });
});

describe('uwg-te-req-engine-9: Backspace and Delete beside an atom block', () => {
  const ATOMS = [
    ['a divider', '<hr data-id="x">'],
    ['an image', '<img data-id="x" src="https://example.com/a.png" alt="">'],
    [
      'a custom atom',
      '<figure data-id="x" data-type="embed" data-url="https://example.com/"></figure>',
    ],
  ] as const;
  const BEFORE = [
    ['a paragraph', '<p data-id="a">ab</p>', 2],
    ['an empty paragraph', '<p data-id="a"></p>', 0],
    ['a heading', '<h2 data-id="a">ab</h2>', 2],
    ['a quote', '<blockquote data-id="a"><p>ab</p></blockquote>', 2],
    ['a code block', '<pre data-id="a"><code>a\nb</code></pre>', 3],
    ['a list item', '<ul><li data-id="a"><p>ab</p></li></ul>', 2],
  ] as const;
  const AFTER = [
    ['a paragraph', '<p data-id="a">ab</p>'],
    ['an empty paragraph', '<p data-id="a"></p><p data-id="z">z</p>'],
  ] as const;
  const COMMANDS = {
    Backspace: lexical.KEY_BACKSPACE_COMMAND,
    Delete: lexical.KEY_DELETE_COMMAND,
  } as const;

  /** The first key selects the atom and changes nothing; the second deletes the atom only. */
  function twoKeys(source: string, key: 'Backspace' | 'Delete', offset: number) {
    const headless = headlessLexical({ html: source, nodes: corpusNodes });
    selectText(headless, { block: 'a', offset });
    const before = html(headless);
    const first = press(headless, COMMANDS[key], key).handled;
    const selected = headless.instance.getState().selection;
    const unchanged = html(headless) === before;
    const second = press(headless, COMMANDS[key], key).handled;
    const roots = headless.instance.getBlocks().roots;
    const ids = headless.instance
      .getBlocks()
      .ordered()
      .map(({ id }) => id);
    return {
      first,
      selected,
      unchanged,
      second,
      deleted: !roots.includes('x'),
      kept: ids.includes('a'),
    };
  }
  const SELECTED = {
    first: true,
    selected: { kind: 'blocks', ids: ['x'] },
    unchanged: true,
    second: true,
    deleted: true,
    kept: true,
  };

  it('Delete at the end of a textblock before one, an empty one included, selects it and keeps the textblock; a second Delete deletes it', () => {
    for (const [atom, source] of ATOMS)
      for (const [label, block, end] of BEFORE)
        expect(
          twoKeys(`${block}${source}<p data-id="z">z</p>`, 'Delete', end),
          `${label}, ${atom}`,
        ).toEqual(SELECTED);
  });

  it('Backspace at the start of a textblock after one, an empty one included, selects it and keeps the textblock; a second Backspace deletes it', () => {
    for (const [atom, source] of ATOMS)
      for (const [label, block] of AFTER)
        expect(
          twoKeys(`<p data-id="z">z</p>${source}${block}`, 'Backspace', 0),
          `${label}, ${atom}`,
        ).toEqual(SELECTED);
  });
});

describe('uwg-te-req-engine-11: Enter with a modifier other than Shift alone', () => {
  it('Enter with Mod, Ctrl or Alt, with or without Shift, is prevented and changes nothing', () => {
    const chords: Parameters<typeof keyEvent>[1][] = [];
    for (const ctrl of [false, true])
      for (const meta of [false, true])
        for (const alt of [false, true])
          for (const shift of [false, true])
            if (ctrl || meta || alt) chords.push({ ctrl, meta, alt, shift });
    expect(chords).toHaveLength(14);
    for (const chord of chords) {
      const headless = headlessLexical({ html: '<p data-id="p1">Questions here</p>' });
      selectText(headless, { block: 'p1', offset: 10 });
      headless.recording.clear();
      expect(press(headless, lexical.KEY_ENTER_COMMAND, 'Enter', chord)).toEqual({
        handled: true,
        prevented: true,
      });
      expect(html(headless)).toBe('<p data-id="p1">Questions here</p>');
      expect(caret(headless)).toEqual({ block: 'p1', offset: 10 });
      expect(headless.recording.of('content')).toEqual([]);
    }
  });

  it('Enter and Shift+Enter stay editing keys', () => {
    const split = headlessLexical({ html: '<p data-id="p1">ab</p>' });
    selectText(split, { block: 'p1', offset: 1 });
    expect(press(split, lexical.KEY_ENTER_COMMAND, 'Enter')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(split.instance.getBlocks().roots).toHaveLength(2);
    const lineBreak = headlessLexical({ html: '<p data-id="p1">ab</p>' });
    selectText(lineBreak, { block: 'p1', offset: 1 });
    press(lineBreak, lexical.KEY_ENTER_COMMAND, 'Enter', { shift: true });
    expect(html(lineBreak)).toBe('<p data-id="p1">a<br>b</p>');
  });
});

describe('uwg-te-req-engine-11: a tab character arriving as text input', () => {
  /** A `beforeinput` of text as a browser or an input method sends it. */
  function textInput(headless: Headless, data: string) {
    let prevented = 0;
    const event = {
      type: 'beforeinput',
      inputType: 'insertText',
      data,
      dataTransfer: null,
      isComposing: false,
      timeStamp: 0,
      getTargetRanges: () => [],
      preventDefault: () => void (prevented += 1),
    } as unknown as InputEvent;
    const handled = headless.editor.dispatchCommand(lexical.BEFORE_INPUT_COMMAND, event);
    headless.editor.read(() => undefined);
    return { handled, prevented: prevented > 0 };
  }

  it('is inserted at the caret through the controlled insertion, keeping the text before it', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">xab</p>' });
    selectText(headless, { block: 'p1', offset: 3 });
    expect(textInput(headless, '\t')).toEqual({ handled: true, prevented: true });
    expect(headless.editor.read(() => lexical.$getRoot().getTextContent())).toBe('xab\t');
    expect(caret(headless)).toEqual({ block: 'p1', offset: 4 });
    const within = headlessLexical({ html: '<p data-id="p1">xab</p>' });
    selectText(within, { block: 'p1', offset: 1 });
    textInput(within, 'c\td');
    expect(within.editor.read(() => lexical.$getRoot().getTextContent())).toBe('xc\tdab');
  });

  it('other text input is left to the engine', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">xab</p>' });
    selectText(headless, { block: 'p1', offset: 3 });
    expect(textInput(headless, 'c').prevented).toBe(false);
  });
});

describe('uwg-te-req-engine-9: ArrowUp and ArrowDown from a cell into the cell above or below', () => {
  afterEach(() => vi.restoreAllMocks());
  const TABLE =
    '<table data-id="t1"><tbody><tr><td><p>c1</p></td><td><p>c2</p></td></tr><tr><td><p>c3</p></td><td><p>c4</p></td></tr></tbody></table>';
  const DOC = `<p data-id="p0">top</p>${TABLE}<p data-id="p9">end</p>`;
  // Cell (0,0) spans two columns: (0,2) is the second cell of row 0, (1,2) the third of row 1.
  const WIDE =
    '<table data-id="t2"><tbody><tr><td colspan="2"><p>wide</p></td><td><p>b</p></td></tr>' +
    '<tr><td><p>c</p></td><td><p>d</p></td><td><p>e</p></td></tr></tbody></table><p data-id="p9">end</p>';
  // Cell (0,0) spans two rows: (1,1) is the only cell of row 1, (2,1) the second of row 2.
  const TALL =
    '<table data-id="t3"><tbody><tr><td rowspan="2"><p>tall</p></td><td><p>b</p></td></tr>' +
    '<tr><td><p>c</p></td></tr><tr><td><p>d</p></td><td><p>e</p></td></tr></tbody></table><p data-id="p9">end</p>';
  const at = (table: string, row: number, column: number, offset: number) => ({
    block: table,
    cell: { row, column, paragraph: 0 },
    offset,
  });
  const caretOf = (point: ReturnType<typeof at>) => ({
    kind: 'text',
    anchor: point,
    head: point,
    empty: true,
  });
  /** The key at a caret, the caret on the edge line or not; answers the selection after it. */
  function arrow(
    source: string,
    from: ReturnType<typeof at>,
    key: 'ArrowUp' | 'ArrowDown',
    onEdge = true,
  ) {
    const headless = headlessLexical({ html: source });
    selectText(headless, from);
    const sides: string[] = [];
    let moved = false;
    headless.editor.update(
      () => {
        moved = $cellCaretArrow(headless.rt, key, (_point, side) => {
          sides.push(side);
          return onEdge;
        });
      },
      { discrete: true },
    );
    return { moved, sides, selection: headless.instance.getState().selection };
  }

  it('ArrowUp on a cell’s first line goes to the end of the cell above, ArrowDown on its last line to the start of the cell below', () => {
    expect(arrow(DOC, at('t1', 1, 0, 1), 'ArrowUp')).toEqual({
      moved: true,
      sides: ['first'],
      selection: caretOf(at('t1', 0, 0, 2)),
    });
    expect(arrow(DOC, at('t1', 1, 1, 0), 'ArrowUp').selection).toEqual(caretOf(at('t1', 0, 1, 2)));
    expect(arrow(DOC, at('t1', 0, 1, 1), 'ArrowDown')).toEqual({
      moved: true,
      sides: ['last'],
      selection: caretOf(at('t1', 1, 1, 0)),
    });
  });

  it('beside a merged cell the grid’s columns decide, never the cells’ order in their row', () => {
    expect(arrow(WIDE, at('t2', 0, 2, 1), 'ArrowDown').selection).toEqual(
      caretOf(at('t2', 1, 2, 0)),
    );
    expect(arrow(WIDE, at('t2', 1, 2, 0), 'ArrowUp').selection).toEqual(caretOf(at('t2', 0, 2, 1)));
    expect(arrow(WIDE, at('t2', 1, 1, 0), 'ArrowUp').selection).toEqual(caretOf(at('t2', 0, 0, 4)));
    expect(arrow(TALL, at('t3', 1, 1, 0), 'ArrowDown').selection).toEqual(
      caretOf(at('t3', 2, 1, 0)),
    );
    expect(arrow(TALL, at('t3', 2, 1, 0), 'ArrowUp').selection).toEqual(caretOf(at('t3', 1, 1, 1)));
    expect(arrow(TALL, at('t3', 0, 0, 0), 'ArrowDown').selection).toEqual(
      caretOf(at('t3', 2, 0, 0)),
    );
  });

  it('uwg-te-req-tables-7: from a cell that spans down to the last row ArrowDown leaves the table, never into a cell of that row', () => {
    // Row 1 holds d1, the cell (1,1) spanning rows 1–2, and f; row 2 holds g1 and h, the second
    // cell of its row, where a move by the cells' order in their rows would land.
    const SPAN =
      '<p data-id="p0">above</p><table data-id="t5"><tbody>' +
      '<tr><td colspan="2"><p>wide</p></td><td><p>c</p></td></tr>' +
      '<tr><td><p>d1</p></td><td rowspan="2"><p>tall</p></td><td><p>f</p></td></tr>' +
      '<tr><td><p>g1</p></td><td><p>h</p></td></tr></tbody></table>';
    const caretAt = (block: string, offset: number) => ({
      kind: 'text',
      anchor: { block, offset },
      head: { block, offset },
      empty: true,
    });
    expect(arrow(`${SPAN}<p data-id="p9">below</p>`, at('t5', 1, 1, 0), 'ArrowDown')).toEqual({
      moved: true,
      sides: ['last'],
      selection: caretAt('p9', 0),
    });
    expect(
      arrow(`${SPAN}<ul><li data-id="i1"><p>item</p></li></ul>`, at('t5', 1, 1, 4), 'ArrowDown')
        .selection,
    ).toEqual(caretAt('i1', 0));
    // An atom beside the table is selected by the block cursor's keys.
    expect(arrow(`${SPAN}<hr data-id="h1"><p>z</p>`, at('t5', 1, 1, 0), 'ArrowDown')).toMatchObject(
      { moved: false, selection: caretOf(at('t5', 1, 1, 0)) },
    );
    // Off the edge line, and from a cell of one row, the key stays the engine's.
    expect(
      arrow(`${SPAN}<p data-id="p9">below</p>`, at('t5', 1, 1, 0), 'ArrowDown', false).moved,
    ).toBe(false);
    expect(arrow(`${SPAN}<p data-id="p9">below</p>`, at('t5', 2, 2, 0), 'ArrowDown').moved).toBe(
      false,
    );
    vi.spyOn(LexicalGeometry.prototype, 'onEdgeLine').mockReturnValue(true);
    const headless = headlessLexical({ html: `${SPAN}<p data-id="p9">below</p>` });
    selectText(headless, at('t5', 1, 1, 2));
    expect(press(headless, lexical.KEY_ARROW_DOWN_COMMAND, 'ArrowDown')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(headless.instance.getState().selection).toEqual(caretAt('p9', 0));
  });

  it('off the edge line and out of the first or last row the key stays the engine’s', () => {
    expect(arrow(DOC, at('t1', 1, 0, 1), 'ArrowUp', false)).toMatchObject({
      moved: false,
      sides: ['first'],
      selection: caretOf(at('t1', 1, 0, 1)),
    });
    expect(arrow(DOC, at('t1', 0, 0, 1), 'ArrowUp')).toMatchObject({ moved: false, sides: [] });
    expect(arrow(DOC, at('t1', 1, 1, 2), 'ArrowDown')).toMatchObject({ moved: false, sides: [] });
    expect(arrow(DOC, { block: 'p9', offset: 0 } as never, 'ArrowUp')).toMatchObject({
      moved: false,
      sides: [],
    });
  });

  it('plain ArrowUp and ArrowDown are taken ahead of the engine’s table keys; with a modifier they are not', () => {
    vi.spyOn(LexicalGeometry.prototype, 'onEdgeLine').mockReturnValue(true);
    const headless = headlessLexical({ html: DOC });
    selectText(headless, at('t1', 1, 0, 1));
    const html = headless.instance.getContent('html');
    expect(press(headless, lexical.KEY_ARROW_UP_COMMAND, 'ArrowUp')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(headless.instance.getState().selection).toEqual(caretOf(at('t1', 0, 0, 2)));
    expect(press(headless, lexical.KEY_ARROW_DOWN_COMMAND, 'ArrowDown')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(headless.instance.getState().selection).toEqual(caretOf(at('t1', 1, 0, 0)));
    expect(headless.instance.getContent('html')).toBe(html);
    expect(headless.instance.getState().history.undo).toBe(false);
    for (const init of [{ alt: true }, { ctrl: true }, { meta: true }])
      expect(press(headless, lexical.KEY_ARROW_UP_COMMAND, 'ArrowUp', init).prevented).toBe(false);
    expect(headless.instance.getState().selection).toEqual(caretOf(at('t1', 1, 0, 0)));
  });
});

describe('uwg-te-req-engine-4: Mod+A over a document of one empty textblock', () => {
  const DOCUMENTS = [
    ['an empty paragraph', '<p data-id="b1"></p>'],
    ['an empty centered paragraph', '<p data-id="b1" style="text-align: center"></p>'],
    ['an empty heading', '<h2 data-id="b1"></h2>'],
    ['an empty list item', '<ul><li data-id="b1"><p></p></li></ul>'],
  ] as const;
  const WHOLE = {
    kind: 'text',
    anchor: { block: 'b1', offset: 0 },
    head: { block: 'b1', offset: 0 },
    empty: false,
  };

  function selectAll(headless: Headless): void {
    headless.editor.dispatchCommand(
      lexical.SELECT_ALL_COMMAND,
      keyEvent('a', { meta: true }).event,
    );
    headless.editor.read(() => undefined);
  }

  function type(headless: Headless, text: string): void {
    for (const character of text) {
      headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
      headless.editor.read(() => undefined);
    }
  }

  function cut(headless: Headless): Record<string, string> {
    const data: Record<string, string> = {};
    headless.editor.dispatchCommand(lexical.CUT_COMMAND, {
      clipboardData: {
        setData: (format: string, value: string) => void (data[format] = value),
        clearData: () => undefined,
      },
      preventDefault: () => undefined,
    } as never);
    headless.editor.read(() => undefined);
    return data;
  }

  const fresh = (headless: Headless) => headless.instance.getBlocks().ordered();

  for (const [label, source] of DOCUMENTS) {
    it(`with ${label}, the state reports the whole-document selection, never a caret`, () => {
      const headless = headlessLexical({ html: source });
      selectText(headless, { block: 'b1', offset: 0 });
      expect(headless.instance.getState().selection.kind === 'text').toBe(true);
      selectAll(headless);
      const state = headless.instance.getState();
      expect(state.selection).toEqual(WHOLE);
      expect(state.caret).toBeNull();
      expect(state.emptyBlock).toBeNull();
    });

    it(`with ${label}, a key, a cut or content.insert over it acts at the caret of one fresh empty paragraph`, () => {
      const cases: readonly (readonly [string, (headless: Headless) => unknown, string, number])[] =
        [
          ['typing', (h) => type(h, 'Q'), '<p data-id="#">Q</p>', 1],
          [
            'Enter',
            (h) => press(h, lexical.KEY_ENTER_COMMAND, 'Enter'),
            '<p data-id="#"></p>\n<p data-id="#"></p>',
            0,
          ],
          [
            'Shift+Enter',
            (h) => press(h, lexical.KEY_ENTER_COMMAND, 'Enter', { shift: true }),
            '<p data-id="#"><br><br></p>',
            1,
          ],
          [
            'Backspace',
            (h) => press(h, lexical.KEY_BACKSPACE_COMMAND, 'Backspace'),
            '<p data-id="#"></p>',
            0,
          ],
          [
            'Delete',
            (h) => press(h, lexical.KEY_DELETE_COMMAND, 'Delete'),
            '<p data-id="#"></p>',
            0,
          ],
          ['a cut', (h) => cut(h), '<p data-id="#"></p>', 0],
          [
            'content.insert at the reported range',
            (h) =>
              h.instance.execute(
                [
                  {
                    type: 'content.insert',
                    at: { kind: 'text', anchor: WHOLE.anchor, head: WHOLE.head },
                    content: {
                      kind: 'range',
                      blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'Z' }] }],
                    },
                  },
                ],
                { reason: 'imperative-action', focus: false },
              ),
            '<p data-id="#">Z</p>',
            1,
          ],
        ];
      for (const [name, act, expected, offset] of cases) {
        const headless = headlessLexical({ html: source });
        selectText(headless, { block: 'b1', offset: 0 });
        selectAll(headless);
        act(headless);
        const blocks = fresh(headless);
        expect(html(headless).replace(/gen\d{4}/gu, '#'), name).toBe(expected);
        const last = blocks[blocks.length - 1]!;
        expect(last.id, name).not.toBe('b1');
        expect(headless.instance.getState().selection, name).toMatchObject({
          head: { block: last.id, offset },
          empty: true,
        });
      }
    });
  }

  it('a cut over it writes the whole document as a text range', () => {
    const headless = headlessLexical({ html: '<h2 data-id="b1"></h2>' });
    selectAll(headless);
    expect(cut(headless)).toEqual({
      'text/html': '<div data-text-editor-fragment="range"><h2 data-id="b1"></h2></div>',
      'text/plain': '',
    });
  });

  it('a caret placed by selection.set stays a caret, also after Mod+A', () => {
    const caretFirst = headlessLexical({ html: '<h2 data-id="b1"></h2>' });
    selectText(caretFirst, { block: 'b1', offset: 0 });
    expect(caretFirst.instance.getState().selection).toMatchObject({ empty: true });
    type(caretFirst, 'Q');
    expect(html(caretFirst)).toBe('<h2 data-id="b1">Q</h2>');

    const placed = headlessLexical({ html: '<h2 data-id="b1"></h2>' });
    selectAll(placed);
    selectText(placed, { block: 'b1', offset: 0 });
    expect(placed.instance.getState().selection).toMatchObject({ empty: true });
    type(placed, 'Q');
    expect(html(placed)).toBe('<h2 data-id="b1">Q</h2>');
  });

  it('a press or an arrow key that leaves the engine’s selection where it was keeps it', () => {
    const pressed = headlessLexical({ html: '<h2 data-id="b1"></h2>' });
    const listeners: ((event: PointerEvent) => void)[] = [];
    const root = {
      addEventListener: (_type: string, listener: (event: PointerEvent) => void) =>
        void listeners.push(listener),
      removeEventListener: () => undefined,
    };
    trackPresses(pressed.rt, root as unknown as HTMLElement);
    selectAll(pressed);
    for (const listener of listeners)
      listener({ clientX: 4, clientY: 4, shiftKey: false } as PointerEvent);
    // The press's selection change selects the same point of the one empty block.
    pressed.editor.update(() => lexical.$getRoot().getFirstChild()?.selectStart(), {
      discrete: true,
    });
    expect(pressed.instance.getState().selection).toEqual(WHOLE);
    type(pressed, 'Q');
    expect(html(pressed)).toMatch(/^<p data-id="gen\d{4}">Q<\/p>$/u);

    const arrow = headlessLexical({ html: '<h2 data-id="b1"></h2>' });
    selectAll(arrow);
    arrow.editor.dispatchCommand(lexical.KEY_DOWN_COMMAND, keyEvent('ArrowLeft').event);
    arrow.editor.dispatchCommand(lexical.KEY_ARROW_LEFT_COMMAND, keyEvent('ArrowLeft').event);
    arrow.editor.read(() => undefined);
    expect(arrow.instance.getState().selection).toEqual(WHOLE);
    type(arrow, 'Q');
    expect(html(arrow)).toMatch(/^<p data-id="gen\d{4}">Q<\/p>$/u);
  });

  it('the selection lasts through an update that keeps it, and a refused selection.set keeps it', () => {
    const headless = headlessLexical({ html: '<h2 data-id="b1"></h2>' });
    selectAll(headless);
    headless.editor.update(() => lexical.$getRoot().markDirty(), { discrete: true });
    expect(headless.instance.getState().selection).toEqual(WHOLE);
    expect(
      headless.instance.execute(
        [
          { type: 'selection.set', selection: { kind: 'caret', block: 'b1', position: 'start' } },
          { type: 'blocks.delete', ids: ['missing'] },
        ],
        { reason: 'imperative-action', focus: false },
      ),
    ).toBe(false);
    expect(headless.instance.getState().selection).toEqual(WHOLE);
    type(headless, 'Q');
    expect(html(headless)).toMatch(/^<p data-id="gen\d{4}">Q<\/p>$/u);
  });
});

describe('uwg-te-req-engine-4: undo after a key over the whole-document selection of Mod+A', () => {
  function selectAll(headless: Headless): void {
    headless.editor.dispatchCommand(
      lexical.SELECT_ALL_COMMAND,
      keyEvent('a', { meta: true }).event,
    );
    headless.editor.read(() => undefined);
  }
  function type(headless: Headless, text: string): void {
    for (const character of text) {
      headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
      headless.editor.read(() => undefined);
    }
  }
  const undo = (headless: Headless) =>
    headless.instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' });
  const fresh = (source: string) => source.replace(/data-id="gen\d+"/gu, 'data-id="#"');

  const DOCUMENTS: readonly (readonly [string, string, { block: string; offset: number }])[] = [
    ['<h2 data-id="b1">ab</h2>', 'b1', { block: 'b1', offset: 2 }],
    ['<p data-id="b1">ab</p><p data-id="b2">cd</p>', 'b1', { block: 'b2', offset: 2 }],
    ['<h2 data-id="b1"></h2>', 'b1', { block: 'b1', offset: 0 }],
  ];
  const KEYS: readonly (readonly [string, (headless: Headless) => unknown])[] = [
    ['typing', (h) => type(h, 'x')],
    ['Enter', (h) => press(h, lexical.KEY_ENTER_COMMAND, 'Enter')],
    ['Backspace', (h) => press(h, lexical.KEY_BACKSPACE_COMMAND, 'Backspace')],
  ];

  for (const [source, first, last] of DOCUMENTS)
    for (const [label, key] of KEYS)
      it(`${source}: ${label}, undo, then typing replaces the document again`, () => {
        const headless = headlessLexical({ html: source });
        selectText(headless, { block: first, offset: 0 });
        selectAll(headless);
        key(headless);
        expect(undo(headless)).toBe(true);
        expect(html(headless).replace(/\n/gu, '')).toBe(source);
        // Undo restores the selection the key acted on: the whole document.
        expect(headless.instance.getState().selection).toEqual({
          kind: 'text',
          anchor: { block: first, offset: 0 },
          head: last,
          empty: false,
        });
        type(headless, 'y');
        expect(fresh(html(headless))).toBe('<p data-id="#">y</p>');
      });

  it('a selection that undo restores from before Mod+A is no whole-document selection', () => {
    const headless = headlessLexical({ html: '<h2 data-id="b1">ab</h2>' });
    selectText(headless, { block: 'b1', offset: 2 });
    vi.useFakeTimers();
    try {
      type(headless, 'c');
      vi.advanceTimersByTime(600);
      selectAll(headless);
      expect(undo(headless)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
    expect(html(headless)).toBe('<h2 data-id="b1">ab</h2>');
    expect(headless.instance.getState().selection).toMatchObject({ empty: true });
    type(headless, 'y');
    expect(html(headless)).toBe('<h2 data-id="b1">aby</h2>');
  });
});

describe('uwg-te-req-engine-4: the whole-document selection, however it was made', () => {
  const QUIET = { reason: 'imperative-action', focus: false } as const;
  function selectAll(headless: Headless): void {
    headless.editor.dispatchCommand(
      lexical.SELECT_ALL_COMMAND,
      keyEvent('a', { meta: true }).event,
    );
    headless.editor.read(() => undefined);
  }
  function type(headless: Headless, text: string): void {
    for (const character of text) {
      headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
      headless.editor.read(() => undefined);
    }
  }
  /** The clipboard data of a copy or cut through the engine's clipboard commands. */
  function clipboard(headless: Headless, cut: boolean): Record<string, string> {
    const data: Record<string, string> = {};
    headless.editor.dispatchCommand(cut ? lexical.CUT_COMMAND : lexical.COPY_COMMAND, {
      clipboardData: {
        setData: (format: string, value: string) => void (data[format] = value),
        clearData: () => undefined,
      },
      preventDefault: () => undefined,
    } as never);
    headless.editor.read(() => undefined);
    return data;
  }
  const INPUTS: Record<WholeDocumentInput, (headless: Headless) => unknown> = {
    typing: (h) => type(h, 'x'),
    Enter: (h) => press(h, lexical.KEY_ENTER_COMMAND, 'Enter'),
    'Shift+Enter': (h) => press(h, lexical.KEY_ENTER_COMMAND, 'Enter', { shift: true }),
    Backspace: (h) => press(h, lexical.KEY_BACKSPACE_COMMAND, 'Backspace'),
    Delete: (h) => press(h, lexical.KEY_DELETE_COMMAND, 'Delete'),
    cut: (h) => clipboard(h, true),
    'text.insert': (h) => h.instance.execute([{ type: 'text.insert', text: 'x' }], QUIET),
    'content.insert': (h) => {
      const { selection } = h.instance.getState();
      if (selection.kind !== 'text') throw new Error('The whole document reads as text.');
      return h.instance.execute(
        [
          {
            type: 'content.insert',
            at: { kind: 'text', anchor: selection.anchor, head: selection.head },
            content: { kind: 'range', blocks: [{ type: 'paragraph', content: [textRun('x')] }] },
          },
        ],
        QUIET,
      );
    },
  };
  /** A mount whose selection is the whole document, by Mod+A or by `selection.set`. */
  function whole(
    source: string,
    by: 'Mod+A' | 'selection.set',
    selection: TextEditorSelectionInput & { readonly kind: 'text' },
  ): Headless {
    const headless = headlessLexical({ html: source });
    if (by === 'Mod+A') selectAll(headless);
    else headless.instance.execute([{ type: 'selection.set', selection }], QUIET);
    return headless;
  }

  it('a text selection from the first to the last text point reads and copies as Mod+A’s', () => {
    for (const { source, selection, kinds } of WHOLE_DOCUMENTS) {
      const all = whole(source, 'Mod+A', selection);
      const set = whole(source, 'selection.set', selection);
      expect(all.instance.getState().blockKinds, source).toEqual(kinds);
      expect(set.instance.getState().blockKinds, source).toEqual(kinds);
      expect(set.instance.getState().marks, source).toEqual(all.instance.getState().marks);
      expect(clipboard(set, false), source).toEqual(clipboard(all, false));
    }
  });

  it('typing, the deletion keys, Enter, a cut and an insertion over it act at the caret of one empty paragraph with a fresh identifier', () => {
    for (const { source, selection } of WHOLE_DOCUMENTS)
      for (const by of ['Mod+A', 'selection.set'] as const)
        for (const [input, expected] of WHOLE_DOCUMENT_INPUTS) {
          const headless = whole(source, by, selection);
          const copied =
            input === 'cut' ? clipboard(whole(source, 'Mod+A', selection), false) : null;
          const result = INPUTS[input](headless);
          const label = `${source} ${by} ${input}`;
          expect(freshIds(html(headless)), label).toBe(expected);
          if (copied) expect(result, label).toEqual(copied);
          expect(headless.instance.getState().marks.bold, label).toBe('off');
        }
  });

  it('an action that keeps the selection keeps it as the whole-document selection', () => {
    for (const { source, selection } of WHOLE_DOCUMENTS)
      for (const by of ['Mod+A', 'selection.set'] as const)
        for (const actions of SELECTION_KEEPING_ACTIONS) {
          const headless = whole(source, by, selection);
          const label = `${source} ${by} ${actions.map(({ type }) => type).join(', ')}`;
          expect(headless.instance.execute(actions, QUIET), label).toBe(true);
          expect(headless.instance.getState().selection, label).toMatchObject({
            kind: 'text',
            empty: false,
          });
          type(headless, 'x');
          expect(freshIds(html(headless)), label).toBe('<p data-id="NEW">x</p>');
        }
  });

  it('a caret, or a selection short of either edge, is no whole-document selection', () => {
    const source = '<p data-id="p1">ab</p><p data-id="p2">cd</p>';
    const cases: [{ block: string; offset: number }, { block: string; offset: number }][] = [
      [
        { block: 'p1', offset: 0 },
        { block: 'p2', offset: 1 },
      ],
      [
        { block: 'p1', offset: 1 },
        { block: 'p2', offset: 2 },
      ],
      [
        { block: 'p1', offset: 0 },
        { block: 'p1', offset: 0 },
      ],
    ];
    for (const [anchor, head] of cases) {
      const headless = headlessLexical({ html: source });
      selectText(headless, anchor, head);
      type(headless, 'x');
      expect(freshIds(html(headless)), JSON.stringify([anchor, head])).not.toContain('"NEW"');
    }
  });
});

describe('uwg-te-req-engine-4: undo and redo restore the whole-document selection', () => {
  const SOURCE = '<hr data-id="d1"><p data-id="p1">ab</p><h2 data-id="h1">cd</h2>';
  const WHOLE = {
    kind: 'text',
    anchor: { block: 'p1', offset: 0 },
    head: { block: 'h1', offset: 2 },
    empty: false,
  };
  function type(headless: Headless, text: string): void {
    for (const character of text) {
      headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
      headless.editor.read(() => undefined);
    }
  }
  const step = (headless: Headless, type: 'history.undo' | 'history.redo') =>
    headless.instance.execute([{ type }], { reason: 'hotkey' });
  const KEYS: [string, (headless: Headless) => unknown][] = [
    ['typing', (h) => type(h, 'x')],
    ['Enter', (h) => press(h, lexical.KEY_ENTER_COMMAND, 'Enter')],
    ['Backspace', (h) => press(h, lexical.KEY_BACKSPACE_COMMAND, 'Backspace')],
  ];

  for (const by of ['Mod+A', 'selection.set'] as const)
    for (const [label, key] of KEYS)
      it(`${by}, ${label}: undo selects the whole document again, redo the key’s result, and typing then replaces the document`, () => {
        const headless = headlessLexical({ html: SOURCE });
        selectText(headless, { block: 'p1', offset: 1 });
        if (by === 'Mod+A') {
          headless.editor.dispatchCommand(
            lexical.SELECT_ALL_COMMAND,
            keyEvent('a', { meta: true }).event,
          );
          headless.editor.read(() => undefined);
        } else selectText(headless, WHOLE.anchor, WHOLE.head);
        key(headless);
        const after = freshIds(html(headless));
        expect(step(headless, 'history.undo')).toBe(true);
        expect(html(headless).replace(/\n/gu, '')).toBe(SOURCE);
        expect(headless.instance.getState().selection).toEqual(WHOLE);
        expect(step(headless, 'history.redo')).toBe(true);
        expect(freshIds(html(headless))).toBe(after);
        expect(step(headless, 'history.undo')).toBe(true);
        expect(headless.instance.getState().selection).toEqual(WHOLE);
        type(headless, 'y');
        expect(freshIds(html(headless))).toBe('<p data-id="NEW">y</p>');
      });
});

describe('uwg-te-req-engine-9: ArrowUp out of a table that opens the document', () => {
  afterEach(() => vi.restoreAllMocks());
  // The table opens the document; its cell (0,0) spans rows 0–1.
  const SOURCE =
    '<table data-id="t1"><tbody><tr><td rowspan="2"><p>tall</p></td><td><p>c1</p></td></tr>' +
    '<tr><td><p>c2</p></td></tr></tbody></table><p data-id="p9">end</p>';
  const at = (row: number, column: number, offset: number) => ({
    block: 't1',
    cell: { row, column, paragraph: 0 },
    offset,
  });
  const caretOf = (point: ReturnType<typeof at>) => ({
    kind: 'text',
    anchor: point,
    head: point,
    empty: true,
  });
  function arrow(source: string, from: ReturnType<typeof at>, onEdge = true) {
    const headless = headlessLexical({ html: source });
    selectText(headless, from);
    const sides: string[] = [];
    let moved = false;
    headless.editor.update(
      () => {
        moved = $cellCaretArrow(headless.rt, 'ArrowUp', (_point, side) => {
          sides.push(side);
          return onEdge;
        });
      },
      { discrete: true },
    );
    return { moved, sides, selection: headless.instance.getState().selection };
  }

  it('from the first row, a cell spanning rows included, the key is consumed and the selection stays', () => {
    for (const from of [at(0, 1, 1), at(0, 0, 2), at(0, 1, 0)])
      expect(arrow(SOURCE, from)).toEqual({
        moved: true,
        sides: ['first'],
        selection: caretOf(from),
      });
  });

  it('the key is consumed and prevented without a change, an undo step or a notification', () => {
    vi.spyOn(LexicalGeometry.prototype, 'onEdgeLine').mockReturnValue(true);
    const headless = headlessLexical({ html: SOURCE });
    selectText(headless, at(0, 1, 1));
    const html = headless.instance.getContent('html');
    headless.recording.clear();
    expect(press(headless, lexical.KEY_ARROW_UP_COMMAND, 'ArrowUp')).toEqual({
      handled: true,
      prevented: true,
    });
    expect(headless.instance.getState().selection).toEqual(caretOf(at(0, 1, 1)));
    expect(headless.instance.getContent('html')).toBe(html);
    expect(headless.instance.getState().history.undo).toBe(false);
    expect(headless.recording.of('content')).toEqual([]);
    expect(headless.recording.of('state')).toEqual([]);
  });

  it('off the first line, or with a block before the table, the key stays the engine’s', () => {
    expect(arrow(SOURCE, at(0, 1, 1), false)).toMatchObject({ moved: false });
    expect(arrow(`<p data-id="p0">top</p>${SOURCE}`, at(0, 1, 1))).toMatchObject({
      moved: false,
      sides: [],
    });
  });
});

describe('uwg-te-req-content-5, uwg-te-req-content-7: a textblock joined into a code block', () => {
  const MENTION = '<span data-type="mention" data-person="u1" data-label="Ann">@Ann</span>';
  const mounted = (source: string, caret: { block: string; offset: number }) => {
    const headless = headlessLexical({ html: source, nodes: corpusNodes });
    selectText(headless, caret);
    return headless;
  };
  const caretIn = (headless: Headless) => headless.instance.getState().selection;

  it('Delete at the end of a code block joins the next textblock, each inline node as its text', () => {
    const cases: [string, number, string][] = [
      [`<p data-id="b">${MENTION}</p><p data-id="e">e</p>`, 3, 'a\nb@Ann'],
      [`<p data-id="b"><strong>x</strong>${MENTION}y<br>z</p>`, 3, 'a\nbx@Anny\nz'],
    ];
    for (const [next, end, text] of cases) {
      const headless = mounted(`<pre data-id="a"><code>a\nb</code></pre>${next}`, {
        block: 'a',
        offset: end,
      });
      expect(press(headless, lexical.KEY_DELETE_COMMAND, 'Delete').handled, next).toBe(true);
      expect(html(headless).split('\n<p')[0], next).toBe(
        `<pre data-id="a"><code>${text}</code></pre>`,
      );
      expect(html(headless)).not.toContain('data-id="b"');
      expect(caretIn(headless)).toMatchObject({ head: { block: 'a', offset: end } });
    }
  });

  it('Backspace at the start of a paragraph after a code block joins it, each inline node as its text', () => {
    const headless = mounted(
      `<pre data-id="a"><code>ab</code></pre><p data-id="b">${MENTION} y</p>`,
      { block: 'b', offset: 0 },
    );
    expect(press(headless, lexical.KEY_BACKSPACE_COMMAND, 'Backspace').handled).toBe(true);
    expect(html(headless)).toBe('<pre data-id="a"><code>ab@Ann y</code></pre>');
    expect(caretIn(headless)).toMatchObject({ head: { block: 'a', offset: 2 } });
    expect(headless.instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' })).toBe(true);
    expect(html(headless)).toBe(
      `<pre data-id="a"><code>ab</code></pre>\n<p data-id="b">${MENTION} y</p>`,
    );
  });

  it('the deletion input at a code block’s end joins the same way', () => {
    const headless = mounted(
      `<pre data-id="a"><code>ab</code></pre><p data-id="b">${MENTION}</p>`,
      { block: 'a', offset: 2 },
    );
    headless.editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, false);
    headless.editor.read(() => undefined);
    expect(html(headless)).toBe('<pre data-id="a"><code>ab@Ann</code></pre>');
  });
});

describe('uwg-te-req-engine-4: a range that a press made keeps the press point as its anchor', () => {
  const DOC = '<hr data-id="d1"><p data-id="p1"><strong>ab</strong></p><h2 data-id="h1">cd</h2>';
  const PRESS: LexicalLastInput = { kind: 'press', x: 40, y: 60, shift: false };
  const AT_CD_END: TextEditorTextPoint = { block: 'h1', offset: 2 };
  const FORWARD = {
    kind: 'text',
    anchor: { block: 'p1', offset: 0 },
    head: { block: 'h1', offset: 2 },
    empty: false,
  };

  /** The text node of a block's first text, by the block's identifier. */
  const $textOf = (headless: Headless, block: string): lexical.TextNode => {
    const holder = $holders(headless.rt).find((node) => $blockId(headless.rt, node) === block);
    return (holder as lexical.ElementNode).getFirstDescendant() as lexical.TextNode;
  };

  /**
   * The engine's read of a drag from the end of "cd" up to the start of the root, made after
   * `input` with the text point recorded under the press: read without a direction, the range runs
   * forward, from an element point on the root to the press point, and the engine then reports the
   * selection change.
   */
  function dragRead(
    headless: Headless,
    input: LexicalLastInput,
    pressPoint: TextEditorTextPoint | null,
  ): void {
    headless.rt.lastInput = input;
    headless.rt.pressPoint = pressPoint;
    headless.editor.update(
      () => {
        const range = lexical.$createRangeSelection();
        range.anchor.set('root', 0, 'element');
        range.focus.set($textOf(headless, 'h1').getKey(), 2, 'text');
        lexical.$setSelection(range);
      },
      { discrete: true },
    );
    headless.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
    headless.editor.read(() => undefined);
  }

  /** Whether the engine's selection is backward, and the node and offset of its anchor. */
  const engineSelection = (headless: Headless) =>
    headless.editor.read(() => {
      const selection = lexical.$getSelection() as lexical.RangeSelection;
      return {
        backward: selection.isBackward(),
        anchor: [
          selection.anchor.key === $textOf(headless, 'h1').getKey(),
          selection.anchor.offset,
        ],
      };
    });

  it('a drag that the engine reads forward although it ends at the press point turns backward', () => {
    const headless = headlessLexical({ html: DOC });
    dragRead(headless, PRESS, AT_CD_END);
    expect(headless.instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'h1', offset: 2 },
      head: { block: 'p1', offset: 0 },
      empty: false,
    });
    expect(engineSelection(headless)).toEqual({ backward: true, anchor: [true, 2] });
    // Typing over it still replaces the whole document.
    headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, 'x');
    headless.editor.read(() => undefined);
    expect(freshIds(html(headless))).toBe('<p data-id="NEW">x</p>');
  });

  it('a range whose anchor is the press point, one read after a key, and a press without a point are read as they are', () => {
    const forward = headlessLexical({ html: DOC });
    dragRead(forward, PRESS, { block: 'p1', offset: 0 });
    expect(forward.instance.getState().selection).toEqual(FORWARD);

    const keyed = headlessLexical({ html: DOC });
    dragRead(keyed, { kind: 'key', key: 'ArrowDown', shift: true }, AT_CD_END);
    expect(keyed.instance.getState().selection).toEqual(FORWARD);
    expect(engineSelection(keyed).backward).toBe(false);

    // A press with Shift, a double press or a press outside text records no point.
    const pointless = headlessLexical({ html: DOC });
    dragRead(pointless, { ...PRESS, shift: true }, null);
    expect(pointless.instance.getState().selection).toEqual(FORWARD);
  });

  it('a DOM selection that states its direction is read as it is', () => {
    const headless = headlessLexical({ html: DOC });
    const container = fakeContainer();
    container.ownerDocument.selection = fakeSelection(container, 0, container, 1, 'forward');
    headless.rt.root = container as unknown as HTMLElement;
    try {
      dragRead(headless, PRESS, AT_CD_END);
    } finally {
      headless.rt.root = null;
    }
    expect(headless.instance.getState().selection).toEqual(FORWARD);
  });

  it('a plain primary press records the text point under it; Shift, a double press and other buttons record none', () => {
    const document = new FakeDocument();
    const marker = document.createElement('span');
    const real = realLexicalModules;
    const mount: { headless?: Headless } = {};
    const modules: TextEditorLexicalModules = {
      ...real,
      lexical: {
        ...real.lexical,
        // The DOM point under the press is the end of "cd".
        $createRangeSelectionFromDom: (points) => {
          const { headless } = mount;
          if (points?.anchorNode !== (marker as unknown as Node) || !headless) return null;
          const selection = lexical.$createRangeSelection();
          const key = $textOf(headless, 'h1').getKey();
          selection.anchor.set(key, points.anchorOffset, 'text');
          selection.focus.set(key, points.focusOffset, 'text');
          return selection as never;
        },
      },
    };
    const heading = headlessLexical({ html: DOC, modules });
    mount.headless = heading;
    Object.assign(document, {
      caretPositionFromPoint: () => ({ offsetNode: marker, offset: 2 }),
    });
    const listeners = new Map<string, (event: MouseEvent) => void>();
    const root = {
      ownerDocument: document,
      getRootNode: () => document,
      contains: (node: unknown) => node === marker,
      addEventListener: (type: string, listener: (event: MouseEvent) => void) =>
        void listeners.set(type, listener),
      removeEventListener: (type: string) => void listeners.delete(type),
    };
    const untrack = trackPresses(heading.rt, root as unknown as HTMLElement);
    const pressWith = (init: Partial<MouseEvent>) => {
      const event = { clientX: 5, clientY: 6, shiftKey: false, button: 0, detail: 1, ...init };
      listeners.get('pointerdown')?.(event as MouseEvent);
      listeners.get('mousedown')?.(event as MouseEvent);
      return heading.rt.pressPoint;
    };
    expect(pressWith({})).toEqual(AT_CD_END);
    expect(pressWith({ shiftKey: true })).toBeNull();
    expect(pressWith({ detail: 2 })).toBeNull();
    expect(pressWith({ button: 2 })).toBeNull();
    expect(pressWith({})).toEqual(AT_CD_END);
    untrack();
    expect([...listeners.keys()]).toEqual([]);
  });
});

describe('uwg-te-req-surfaces-6: a cleared selection on Lexical', () => {
  it('stays cleared through a DOM selection the engine reads until a key that edits places its resting caret', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">first</p><hr data-id="d1"><p data-id="p2">second</p>',
    });
    const set = (selection: TextEditorSelectionInput | { kind: 'none' }) =>
      headless.instance.execute([{ type: 'selection.set', selection } as TextEditorAction], {
        reason: 'programmatic',
      });
    expect(set({ kind: 'blocks', ids: ['d1'] })).toBe(true);
    expect(set({ kind: 'none' })).toBe(true);
    expect(headless.instance.getState().selection).toEqual({ kind: 'none' });
    // The caret a browser puts at the start of a focused root that holds no selection when a key
    // arrives, as the engine reads it.
    headless.editor.update(
      () => {
        lexical.$getRoot().getFirstChildOrThrow<lexical.ElementNode>().select(0, 0);
        headless.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
      },
      { discrete: true },
    );
    expect(headless.instance.getState().selection).toEqual({ kind: 'none' });
    press(headless, lexical.KEY_DOWN_COMMAND, 'Escape');
    press(headless, lexical.KEY_DOWN_COMMAND, 'Shift');
    expect(headless.instance.getState().selection).toEqual({ kind: 'none' });
    // The atom has no text: the caret rests at the start of the next textblock.
    press(headless, lexical.KEY_DOWN_COMMAND, 'x');
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p2', offset: 0 },
      empty: true,
    });
  });

  it('ends with any other action list and with focus', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">first</p><p data-id="p2">x</p>' });
    const none = { type: 'selection.set', selection: { kind: 'none' } } as TextEditorAction;
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['p2'] } }],
      { reason: 'programmatic' },
    );
    headless.instance.execute([none], { reason: 'programmatic' });
    expect(headless.rt.cleared).toEqual({ kind: 'caret', block: 'p2', position: 'start' });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } }],
      { reason: 'programmatic' },
    );
    expect(headless.rt.cleared).toBeNull();
    headless.instance.execute([none], { reason: 'programmatic' });
    expect(headless.rt.cleared).not.toBeNull();
    void headless.instance.focus('restore');
    expect(headless.rt.cleared).toBeNull();
  });
});

describe('uwg-te-req-parity-1: arrows over an inline node', () => {
  const MENTION = '<span data-type="mention" data-person="u1" data-label="Ann">@Ann</span>';

  it('steps over an inline node as one character and never selects it as a node', () => {
    const headless = headlessLexical({
      html: `<p data-id="p">a ${MENTION} b</p>`,
      nodes: corpusNodes,
    });
    const flags = headless.editor.read(() => {
      const found: boolean[] = [];
      const visit = (node: lexical.LexicalNode): void => {
        if (lexical.$isDecoratorNode(node))
          found.push(node.isInline(), node.isKeyboardSelectable());
        if (lexical.$isElementNode(node)) node.getChildren().forEach(visit);
      };
      visit(lexical.$getRoot());
      return found;
    });
    expect(flags).toEqual([true, false]);
    // Right after the node, ArrowLeft keeps a text selection: no node selection of the mention.
    selectText(headless, { block: 'p', offset: 3 });
    press(headless, lexical.KEY_ARROW_LEFT_COMMAND, 'ArrowLeft');
    expect(headless.instance.getState().selection.kind).toBe('text');
  });
});
