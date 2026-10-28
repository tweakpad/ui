/**
 * Undo grouping and actions that change nothing on Lexical (Widgets `uwg-te-req-engine-5`,
 * `uwg-te-req-key-7`, `uwg-te-req-evt-3`).
 */
import * as lexical from 'lexical';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import { keyEvent } from '../shared/test-helpers.test.js';
import { headlessLexical, type Headless } from './lexical-stubs.test.js';

const run = (headless: Headless, ...actions: TextEditorAction[]) =>
  headless.instance.execute(actions, { reason: 'imperative-action' });

const html = (headless: Headless) => headless.instance.getContent('html') as string;
const text = (headless: Headless) => headless.instance.getContent('text') as string;

/**
 * Commits what the engine holds pending, and then what the update listeners queued (an input rule
 * the engine applies in an update of its own), as the microtasks between two keys in a browser do.
 */
function flush(headless: Headless): void {
  headless.editor.read(() => undefined);
  headless.editor.read(() => undefined);
}

/** Types as the engine's controlled insertion does, one character per update. */
function type(headless: Headless, characters: string): void {
  for (const character of characters) {
    headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
    flush(headless);
  }
}

function command<P>(headless: Headless, which: lexical.LexicalCommand<P>, payload: P) {
  headless.editor.dispatchCommand(which, payload);
  flush(headless);
}

const enter = (headless: Headless) =>
  command(headless, lexical.INSERT_PARAGRAPH_COMMAND, undefined);
const lineBreak = (headless: Headless) =>
  command(headless, lexical.INSERT_LINE_BREAK_COMMAND, false);
const tab = (headless: Headless, shift = false) =>
  command(headless, lexical.KEY_TAB_COMMAND, keyEvent('Tab', { shift }).event);

const undo = (headless: Headless) => run(headless, { type: 'history.undo' });

/** The texts the undo trail goes through, the current one first, until nothing is left to undo. */
function trail(headless: Headless): string[] {
  const texts = [text(headless)];
  for (let step = 0; step < 20 && headless.instance.getState().history.undo; step += 1) {
    undo(headless);
    texts.push(text(headless));
  }
  return texts;
}

const caret = (block: string, offset: number): TextEditorAction => ({
  type: 'selection.set',
  selection: { kind: 'text', anchor: { block, offset } },
});

describe('uwg-te-req-engine-5: undo grouping', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
  });
  afterEach(() => void vi.useRealTimers());

  it('typing, Enter and more typing within 500 ms are one undo step', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">x</p>' });
    run(headless, caret('p1', 1));
    type(headless, 'abc');
    enter(headless);
    type(headless, 'def');
    expect(trail(headless)).toEqual(['xabc\n\ndef', 'x']);
  });

  it('Shift+Enter groups with typing', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">x</p>' });
    run(headless, caret('p1', 1));
    type(headless, 'ab');
    lineBreak(headless);
    type(headless, 'cd');
    expect(trail(headless)).toEqual(['xab\ncd', 'x']);
  });

  it('Enter and Tab in a code block group with typing', () => {
    const headless = headlessLexical({ html: '<pre data-id="k1"><code>let</code></pre>' });
    run(headless, caret('k1', 3));
    type(headless, ' x');
    enter(headless);
    tab(headless);
    type(headless, 'y');
    expect(trail(headless)).toEqual(['let x\n  y', 'let']);
  });

  it('Enter at the start of a block groups with the typing after it', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    run(headless, caret('p1', 0));
    enter(headless);
    type(headless, 'b');
    expect(trail(headless)).toEqual(['\n\nbcalm', 'calm']);
  });

  it('typing over a selection is one step', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">abcd</p>' });
    run(headless, {
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p1', offset: 0 },
        head: { block: 'p1', offset: 4 },
      },
    });
    type(headless, 'xy');
    expect(trail(headless)).toEqual(['xy', 'abcd']);
  });

  it('a pause of more than 500 ms starts a new step', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">x</p>' });
    run(headless, caret('p1', 1));
    type(headless, 'ab');
    vi.advanceTimersByTime(600);
    enter(headless);
    type(headless, 'c');
    expect(trail(headless)).toEqual(['xab\n\nc', 'xab', 'x']);
  });

  it('text typed right after an inline rule starts a new step', () => {
    const headless = headlessLexical({ html: '<p data-id="p1"></p>' });
    run(headless, caret('p1', 0));
    type(headless, 'ab **x**');
    type(headless, 'z');
    expect(html(headless)).toBe('<p data-id="p1">ab <strong>x</strong>z</p>');
    const texts: string[] = [];
    while (headless.instance.getState().history.undo) {
      undo(headless);
      texts.push(html(headless));
    }
    expect(texts).toEqual([
      '<p data-id="p1">ab <strong>x</strong></p>',
      '<p data-id="p1">ab **x**</p>',
      '<p data-id="p1"></p>',
    ]);
  });

  it('text typed right after a space autolink starts a new step', () => {
    const headless = headlessLexical({ html: '<p data-id="p1"></p>' });
    run(headless, caret('p1', 0));
    type(headless, 'see https://a.example ');
    type(headless, 'z');
    expect(html(headless)).toMatch(
      /^<p data-id="p1">see <a href="[^"]+">https:\/\/a\.example<\/a> z<\/p>$/u,
    );
    undo(headless);
    expect(text(headless)).toBe('see https://a.example ');
    expect(html(headless)).toContain('<a href=');
    undo(headless);
    expect(html(headless)).toBe('<p data-id="p1">see https://a.example&nbsp;</p>');
  });

  it('list Tab after typing stays a step of its own', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p></li><li data-id="b"><p>two</p></li></ul>',
    });
    run(headless, caret('b', 3));
    type(headless, 'x');
    tab(headless);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ depth }) => depth),
    ).toEqual([0, 1]);
    undo(headless);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ depth }) => depth),
    ).toEqual([0, 0]);
    expect(text(headless)).toBe('one\ntwox');
    undo(headless);
    expect(text(headless)).toBe('one\ntwo');
  });

  it('typing, an action and typing again are three steps', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">x</p>' });
    run(headless, caret('p1', 1));
    type(headless, 'ab');
    run(headless, {
      type: 'text.insert',
      text: 'Q',
    });
    type(headless, 'cd');
    expect(trail(headless)).toEqual(['xabQcd', 'xabQ', 'xab', 'x']);
  });
});

describe('uwg-te-req-evt-3: actions that change nothing add no undo step and no content notification', () => {
  const SOURCE =
    '<p data-id="p1">calm sea</p><table data-id="t1"><tbody><tr><td><p>a</p></td></tr></tbody></table><p data-id="p2">tide</p>';
  const cases: readonly (readonly [string, TextEditorAction | null, TextEditorAction])[] = [
    [
      'mark.clear over part of unmarked text',
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 'p1', offset: 2 },
          head: { block: 'p1', offset: 6 },
        },
      },
      { type: 'mark.clear' },
    ],
    [
      'table.align of every cell to the alignment it has',
      null,
      { type: 'table.align', table: 't1', target: { all: true }, align: null },
    ],
    [
      'table.set-header to the header it has',
      null,
      { type: 'table.set-header', table: 't1', row: false },
    ],
    [
      'table.background of every cell to the background it has',
      null,
      { type: 'table.background', table: 't1', target: { all: true }, color: null },
    ],
    [
      'block.align to the alignment the block has',
      caret('p1', 2),
      { type: 'block.align', align: null },
    ],
  ];

  for (const [label, selection, action] of cases)
    it(`${label}`, () => {
      const headless = headlessLexical({ html: SOURCE });
      run(headless, selection ?? caret('p2', 0));
      const before = headless.instance.getContent('json');
      const { contentVersion } = headless.instance.getState();
      headless.recording.clear();
      expect(headless.instance.can(action)).toBe(true);
      expect(run(headless, action)).toBe(true);
      expect(headless.recording.of('content')).toEqual([]);
      expect(headless.recording.of('state')).toHaveLength(1);
      expect(headless.instance.getState().contentVersion).toBe(contentVersion);
      expect(headless.instance.getState().history.undo).toBe(false);
      expect(headless.instance.getContent('json')).toEqual(before);
    });

  it('a list that changes nothing is told from the update’s own dirty nodes, never by mapping the document', () => {
    const blocks = Array.from(
      { length: 200 },
      (_, index) => `<p data-id="p${index}">calm sea ${index}</p>`,
    ).join('');
    const headless = headlessLexical({ html: blocks });
    run(headless, {
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p100', offset: 2 },
        head: { block: 'p100', offset: 6 },
      },
    });
    const exported = vi.spyOn(lexical.ParagraphNode.prototype, 'exportJSON');
    try {
      expect(run(headless, { type: 'mark.clear' })).toBe(true);
      // The paragraph that holds the dirty text, before and after, and the state's block.
      expect(exported.mock.calls.length).toBeLessThan(10);
    } finally {
      exported.mockRestore();
    }
    expect(headless.instance.getState().history.undo).toBe(false);
    expect(headless.recording.of('content')).toEqual([]);
  });

  it('a no-op action keeps the selection it set, and a caret format it chose', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm sea</p>' });
    run(headless, caret('p1', 2), { type: 'mark.toggle', mark: 'bold' });
    expect(headless.instance.getState()).toMatchObject({
      selection: { kind: 'text', head: { block: 'p1', offset: 2 } },
      marks: { bold: 'on' },
      history: { undo: false },
    });
    expect(headless.recording.of('content')).toEqual([]);
  });
});

describe('uwg-te-tab-engine r3: history notifications', () => {
  it('history.undo notifies content once and no state after it', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm sea</p>' });
    run(headless, {
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p1', offset: 0 },
        head: { block: 'p1', offset: 4 },
      },
    });
    run(headless, { type: 'mark.toggle', mark: 'bold' });
    headless.recording.clear();
    expect(headless.instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' })).toBe(true);
    expect(
      headless.recording.records
        .filter(({ type }) => type !== 'adopt' && type !== 'release')
        .map(({ type }) => type),
    ).toEqual(['content']);
    headless.recording.clear();
    expect(headless.instance.execute([{ type: 'history.redo' }], { reason: 'hotkey' })).toBe(true);
    expect(headless.recording.records.map(({ type }) => type)).toEqual(['content']);
  });
});
