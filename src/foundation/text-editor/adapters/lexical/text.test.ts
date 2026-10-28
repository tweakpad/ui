/**
 * Text and content insertion on Lexical (Widgets `uwg-te-tab-actions` r4, r5,
 * `uwg-te-req-engine-12`): text over a range across blocks goes through the shared range
 * replacement, and editing input over such a range through the shared range deletion.
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import type { TextEditorAction, TextEditorContentInsertAction } from '../../actions.js';
import { keyEvent } from '../shared/test-helpers.test.js';
import { headlessLexical, type Headless } from './lexical-stubs.test.js';

const run = (headless: Headless, ...actions: TextEditorAction[]) =>
  headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
const html = (headless: Headless) =>
  (headless.instance.getContent('html') as string).replace(/\n/gu, '');
function command<P>(headless: Headless, which: lexical.LexicalCommand<P>, payload: P) {
  const handled = headless.editor.dispatchCommand(which, payload);
  headless.editor.read(() => undefined);
  headless.editor.read(() => undefined);
  return handled;
}

describe('uwg-te-req-engine-12: range replacement across blocks', () => {
  const caret = (block: string, offset: number): TextEditorAction => ({
    type: 'selection.set',
    selection: { kind: 'text', anchor: { block, offset } },
  });
  const range = (
    anchor: { block: string; offset: number },
    head: { block: string; offset: number },
  ): TextEditorAction => ({ type: 'selection.set', selection: { kind: 'text', anchor, head } });
  const ids = (headless: Headless) =>
    headless.instance
      .getBlocks()
      .ordered()
      .map(({ id, depth }) => `${id}@${depth}`);

  it('text inserted inside a link over a range across blocks stays in the link', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">see <a href="https://a.example/">docs</a> now</p>',
    });
    run(headless, caret('p1', 6), { type: 'text.insert', text: 'a\nb' });
    expect(html(headless)).toBe(
      '<p data-id="p1">see <a href="https://a.example/">doa</a><br><a href="https://a.example/">bcs</a> now</p>',
    );
  });

  it('text over a range from a paragraph into a list item lifts the item’s nested items', () => {
    const headless = headlessLexical({
      html: '<p data-id="p0">intro text</p><ul><li data-id="a"><p>alpha</p><ul><li data-id="b"><p>bravo</p></li></ul></li><li data-id="d"><p>delta</p></li></ul>',
    });
    run(headless, range({ block: 'p0', offset: 5 }, { block: 'a', offset: 2 }), {
      type: 'text.insert',
      text: 'Z',
    });
    expect(ids(headless)).toEqual(['p0@0', 'b@0', 'd@0']);
    expect(headless.instance.getContent('text')).toMatch(/^introZpha/u);
  });

  it('removing a range from a paragraph into a code block gives hard breaks', () => {
    const headless = headlessLexical({
      html: '<p data-id="p0">intro text</p><pre data-id="k1"><code>line one\nline two</code></pre><p data-id="p1">outro</p>',
    });
    run(headless, range({ block: 'p0', offset: 5 }, { block: 'k1', offset: 4 }), {
      type: 'text.delete',
      range: { block: 'p0', from: 5, to: 5 },
    });
    run(headless, range({ block: 'p0', offset: 5 }, { block: 'k1', offset: 4 }));
    command(headless, lexical.DELETE_CHARACTER_COMMAND, true);
    expect(html(headless)).toBe(
      '<p data-id="p0">intro one<br>line two</p><p data-id="p1">outro</p>',
    );
  });

  it('Enter over a range from a heading’s start keeps the heading’s identifier and kind', () => {
    const headless = headlessLexical({
      html: '<h2 data-id="b">calm sea</h2><p data-id="p2">x</p>',
    });
    run(headless, range({ block: 'b', offset: 0 }, { block: 'b', offset: 4 }));
    command(headless, lexical.INSERT_PARAGRAPH_COMMAND, undefined);
    expect(html(headless)).toMatch(/^<p data-id="gen\d{4}"><\/p><h2 data-id="b">&nbsp;sea<\/h2>/u);
  });

  it('typing over a range across blocks is the shared deletion, then the text', () => {
    const headless = headlessLexical({
      html: '<h2 data-id="h1">calm</h2><p data-id="p1"><strong>sea</strong> tide</p>',
    });
    run(headless, range({ block: 'h1', offset: 2 }, { block: 'p1', offset: 3 }));
    command(headless, lexical.CONTROLLED_TEXT_INSERTION_COMMAND, 'x');
    // The text takes the marks of the text before the range (`insertionMarks`): none here.
    expect(html(headless)).toBe('<h2 data-id="h1">cax tide</h2>');
  });
});

describe('uwg-te-req-engine-4, uwg-te-req-engine-6: content inserted over the selection of Mod+A', () => {
  const text = (value: string) => ({ type: 'text' as const, text: value });
  const fragments: readonly [string, TextEditorContentInsertAction['content'], RegExp][] = [
    [
      'a text range',
      { kind: 'range', blocks: [{ type: 'paragraph', content: [text('pasted')] }] },
      /^<p data-id="gen\d{4}">pasted<\/p>$/u,
    ],
    [
      'a text range of two paragraphs',
      {
        kind: 'range',
        blocks: [
          { type: 'paragraph', content: [text('Z')] },
          { type: 'paragraph', content: [text('Y')] },
        ],
      },
      /^<p data-id="gen\d{4}">Z<\/p><p data-id="gen\d{4}">Y<\/p>$/u,
    ],
    [
      'whole blocks',
      { kind: 'blocks', blocks: [{ type: 'heading', level: 3, content: [text('H')] }] },
      /^<h3 data-id="gen\d{4}">H<\/h3>$/u,
    ],
  ];

  it.each(fragments)(
    '%s at the reported selection lands in one fresh paragraph, can answering as execute does',
    (_, content, expected) => {
      const headless = headlessLexical({
        html: '<h2 data-id="h1">calm</h2><p data-id="p1"><strong>sea</strong>s</p>',
      });
      command(headless, lexical.SELECT_ALL_COMMAND, keyEvent('a').event);
      const selection = headless.instance.getState().selection;
      expect(selection).toMatchObject({
        kind: 'text',
        anchor: { block: 'h1', offset: 0 },
        head: { block: 'p1', offset: 4 },
      });
      if (selection.kind !== 'text') return;
      const action: TextEditorAction = {
        type: 'content.insert',
        at: { kind: 'text', anchor: selection.anchor, head: selection.head },
        content,
      };
      expect(headless.instance.can(action)).toBe(true);
      expect(run(headless, action)).toBe(true);
      expect(html(headless)).toMatch(expected);
      expect(headless.rt.selectAll).toBe(false);
      expect(headless.recording.of('error')).toEqual([]);
    },
  );
});
