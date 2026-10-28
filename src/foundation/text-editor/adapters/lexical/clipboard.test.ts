/**
 * Copy and cut on Lexical (Widgets `uwg-te-req-content-6`, `uwg-te-req-engine-4`,
 * `uwg-te-req-engine-6`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { keyEvent } from '../shared/test-helpers.test.js';
import { $selectionFragment } from './clipboard.js';
import {
  headlessLexical,
  htmlOf,
  rootedLexical,
  selectText,
  type Headless,
} from './lexical-stubs.test.js';

/** A clipboard event recording what is written, as the engine's root listener passes it. */
function clipboardEvent(type: 'copy' | 'cut') {
  const data = new Map<string, string>();
  let prevented = 0;
  const event = {
    type,
    clipboardData: { setData: (format: string, value: string) => void data.set(format, value) },
    preventDefault: () => void (prevented += 1),
  };
  return { event, data, prevented: () => prevented };
}

function copy(headless: Headless, type: 'copy' | 'cut' = 'copy') {
  const { event, data, prevented } = clipboardEvent(type);
  const handled = headless.editor.dispatchCommand(
    type === 'copy' ? lexical.COPY_COMMAND : lexical.CUT_COMMAND,
    event as never,
  );
  headless.editor.read(() => undefined);
  return { handled, data: Object.fromEntries(data), prevented: prevented() };
}

const doc =
  '<p data-id="p1">calm sea</p><h2 data-id="h1">Tides</h2><hr data-id="d1"><table data-id="t1"><tbody><tr><td><p>a</p></td><td data-background="blue"><p>b</p></td></tr><tr><td><p>c</p></td><td><p>d</p></td></tr></tbody></table><p data-id="p2">end</p>';

describe('uwg-te-req-content-6: copy writes the shared serializations', () => {
  it('V-128 unit part: a text range across blocks gives the range record and the shared text, nothing else', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'p1', offset: 5 }, { block: 'h1', offset: 4 });
    const result = copy(headless);
    expect(result.handled).toBe(true);
    expect(result.prevented).toBe(1);
    expect(Object.keys(result.data)).toEqual(['text/html', 'text/plain']);
    expect(result.data['text/html']).toBe(
      '<div data-text-editor-fragment="range"><p data-id="p1">sea</p><h2 data-id="h1">Tide</h2></div>',
    );
    // Blocks are separated as the text format writes them, not joined.
    expect(result.data['text/plain']).toBe('sea\n\nTide');
    expect(result.data['text/html']).not.toMatch(/lexical|data-pm-slice|style=/u);
  });

  it('a block selection copies its blocks; a cell range a table of its cells', () => {
    const headless = headlessLexical({ html: doc });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['h1', 'd1'] } }],
      { reason: 'imperative-action' },
    );
    expect(copy(headless).data['text/html']).toBe(
      '<div data-text-editor-fragment="blocks"><h2 data-id="h1">Tides</h2><hr data-id="d1"></div>',
    );
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
    const cells = copy(headless);
    expect(cells.data['text/html']).toBe(
      '<div data-text-editor-fragment="blocks"><table><tbody><tr><td data-background="blue"><p>b</p></td></tr><tr><td><p>d</p></td></tr></tbody></table></div>',
    );
  });

  it('a caret copies nothing, so the event stays the engine’s', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'p1', offset: 2 });
    expect(headless.editor.read(() => $selectionFragment(headless.rt))).toBeNull();
  });

  it('a copy or cut at a caret is left to the browser: nothing written, its default kept, nothing deleted', () => {
    // A copy while read-only too; a cut while read-only is never the adapter's.
    for (const [editable, type] of [
      [true, 'copy'],
      [true, 'cut'],
      [false, 'copy'],
    ] as const) {
      const headless = headlessLexical({ html: doc, editable });
      selectText(headless, { block: 'p1', offset: 2 });
      const before = headless.instance.getContent('html');
      const result = copy(headless, type);
      expect(result, `${type}, editable ${editable}`).toMatchObject({ data: {}, prevented: 0 });
      expect(headless.instance.getContent('html')).toBe(before);
    }
  });

  it('V-129 unit part: Mod+C and Mod+X on a block or cell selection run the native command in the root at once, every time, a cut deleting inside its event', () => {
    const rooted = rootedLexical({ html: doc });
    const editor = rooted.instance.native as lexical.LexicalEditor;
    const { document, root } = rooted;
    const payloads: Record<string, string>[] = [];
    const commands: string[] = [];
    // The browser's clipboard commands: each dispatches its event in the root synchronously, which
    // the engine's root listener passes on as a clipboard command.
    let ranges: unknown[] = [];
    Object.assign(document, {
      createTextNode: (text: string) => Object.assign(document.createElement('#text'), { text }),
      createRange: () => ({
        setStart() {},
        setEnd() {},
        cloneRange() {
          return this;
        },
      }),
      getSelection: () => ({
        get rangeCount() {
          return ranges.length;
        },
        getRangeAt: (index: number) => ranges[index],
        removeAllRanges: () => void (ranges = []),
        addRange: (range: unknown) => void ranges.push(range),
      }),
      execCommand: (command: 'copy' | 'cut') => {
        commands.push(command);
        expect(root.children.at(-1)?.tagName).toBe('SPAN');
        const { event, data } = clipboardEvent(command);
        editor.dispatchCommand(
          command === 'copy' ? lexical.COPY_COMMAND : lexical.CUT_COMMAND,
          event as never,
        );
        payloads.push(Object.fromEntries(data));
        return true;
      },
    });
    const blocks = () =>
      rooted.instance.execute(
        [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['h1', 'd1'] } }],
        { reason: 'imperative-action', focus: false },
      );
    const chord = (key: string) => {
      const { event, record } = keyEvent(key, { meta: true });
      const handled = editor.dispatchCommand(
        key === 'c' ? lexical.COPY_COMMAND : lexical.CUT_COMMAND,
        event as never,
      );
      editor.read(() => undefined);
      return { handled, prevented: record.prevented };
    };
    blocks();
    expect(chord('c')).toEqual({ handled: true, prevented: 0 });
    expect(chord('c').handled).toBe(true);
    expect(commands).toEqual(['copy', 'copy']);
    const expected = {
      'text/html':
        '<div data-text-editor-fragment="blocks"><h2 data-id="h1">Tides</h2><hr data-id="d1"></div>',
      'text/plain': 'Tides',
    };
    expect(payloads).toEqual([expected, expected]);
    // The temporary element is gone, and the DOM selection is as it was: none.
    expect(root.children.some((child) => child.tagName === 'SPAN')).toBe(false);
    expect(ranges).toEqual([]);
    rooted.recording.clear();
    expect(chord('x').handled).toBe(true);
    expect(commands).toEqual(['copy', 'copy', 'cut']);
    expect(payloads[2]).toEqual(expected);
    expect(rooted.instance.getBlocks().roots).toEqual(['p1', 't1', 'p2']);
    expect(rooted.recording.of('content').map(({ change }) => change)).toEqual([
      { cause: 'cut', reason: 'input' },
    ]);
    // A cell range copies its cells the same way.
    rooted.instance.execute(
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
      { reason: 'imperative-action', focus: false },
    );
    expect(chord('c').handled).toBe(true);
    expect(payloads[3]?.['text/html']).toBe(
      '<div data-text-editor-fragment="blocks"><table><tbody><tr><td data-background="blue"><p>b</p></td></tr><tr><td><p>d</p></td></tr></tbody></table></div>',
    );
    // A text range keeps the browser's own command, which the engine leaves to it.
    rooted.instance.execute(
      [
        {
          type: 'selection.set',
          selection: {
            kind: 'text',
            anchor: { block: 'p1', offset: 0 },
            head: { block: 'p1', offset: 4 },
          },
        },
      ],
      { reason: 'imperative-action', focus: false },
    );
    expect(chord('c').handled).toBe(false);
    expect(commands).toHaveLength(4);
  });

  it('Mod+A copies the whole document as a text range', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 });
    headless.editor.dispatchCommand(
      lexical.SELECT_ALL_COMMAND,
      keyEvent('a', { meta: true }).event,
    );
    const result = copy(headless);
    expect(result.data['text/html']).toMatch(
      /^<div data-text-editor-fragment="range"><p data-id="p1">calm sea<\/p>/u,
    );
    expect(result.data['text/html']).toContain('<p data-id="p2">end</p></div>');
    expect(result.data['text/plain']).toBe('calm sea\n\nTides\n\na\tb\nc\td\n\nend');
  });
});

describe('uwg-te-req-content-6: cut deletes in the same update, cause cut', () => {
  it('a text range is removed and reported as cause cut with reason input', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'p1', offset: 4 }, { block: 'p1', offset: 8 });
    headless.recording.clear();
    const result = copy(headless, 'cut');
    expect(result.data['text/plain']).toBe(' sea');
    expect(htmlOf(headless)).toMatch(/^<p data-id="p1">calm<\/p>/u);
    expect(headless.recording.of('content').map(({ change }) => change)).toEqual([
      { cause: 'cut', reason: 'input' },
    ]);
  });

  it('blocks are deleted as blocks.delete deletes them; cells are cleared, never the table', () => {
    const headless = headlessLexical({ html: doc });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['h1', 'd1'] } }],
      { reason: 'imperative-action' },
    );
    copy(headless, 'cut');
    expect(headless.instance.getBlocks().roots).toEqual(['p1', 't1', 'p2']);
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'p1', offset: 8 },
    });
    headless.instance.execute(
      [
        {
          type: 'selection.set',
          selection: {
            kind: 'cells',
            table: 't1',
            range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
          },
        },
      ],
      { reason: 'imperative-action' },
    );
    copy(headless, 'cut');
    expect(htmlOf(headless)).toContain(
      '<tr><td><p></p></td><td data-background="blue"><p></p></td></tr>',
    );
  });

  it('cutting the whole document leaves one empty paragraph with a fresh identifier', () => {
    const headless = headlessLexical({ html: doc });
    headless.editor.dispatchCommand(
      lexical.SELECT_ALL_COMMAND,
      keyEvent('a', { meta: true }).event,
    );
    headless.recording.clear();
    copy(headless, 'cut');
    const blocks = headless.instance.getBlocks().ordered();
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'paragraph', empty: true });
    expect(['p1', 'h1', 'd1', 't1', 'p2']).not.toContain(blocks[0]!.id);
    expect(headless.recording.of('content').map(({ change }) => change.cause)).toEqual(['cut']);
  });
});

describe('uwg-te-req-engine-4, uwg-te-req-content-6: a range whose ends lie between blocks', () => {
  type End = readonly [key: string, offset: number, type: 'text' | 'element'];
  /** Sets the engine's range selection, as a DOM selection over the root's content leaves it. */
  function range(headless: Headless, anchor: End, focus: End) {
    headless.editor.update(
      () => {
        const selection = lexical.$createRangeSelection();
        const key = (end: End) =>
          end[0] === 'b-text'
            ? (lexical.$getRoot().getLastChild() as lexical.ElementNode).getFirstChild()!.getKey()
            : end[0];
        selection.anchor.set(key(anchor), anchor[1], anchor[2]);
        selection.focus.set(key(focus), focus[1], focus[2]);
        lexical.$setSelection(selection);
      },
      { discrete: true },
    );
    headless.editor.read(() => undefined);
    return headless.instance.getState().selection;
  }
  const divided = '<hr data-id="d1"><p data-id="a">a</p><p data-id="b">b</p>';
  const text = (anchor: [string, number], head: [string, number]) => ({
    kind: 'text',
    anchor: { block: anchor[0], offset: anchor[1] },
    head: { block: head[0], offset: head[1] },
    empty: false,
  });

  it('reads as text between the nearest text points inside it, either way round', () => {
    const headless = headlessLexical({ html: divided });
    expect(range(headless, ['root', 0, 'element'], ['root', 3, 'element'])).toEqual(
      text(['a', 0], ['b', 1]),
    );
    expect(range(headless, ['root', 0, 'element'], ['b-text', 1, 'text'])).toEqual(
      text(['a', 0], ['b', 1]),
    );
    expect(range(headless, ['root', 3, 'element'], ['root', 0, 'element'])).toEqual(
      text(['b', 1], ['a', 0]),
    );
    expect(range(headless, ['root', 1, 'element'], ['root', 2, 'element'])).toEqual(
      text(['a', 0], ['a', 1]),
    );
  });

  it('copies the text range of the shared profile, never the engine’s own payload', () => {
    const headless = headlessLexical({ html: divided });
    range(headless, ['root', 0, 'element'], ['b-text', 0, 'text']);
    const result = copy(headless);
    expect(result.handled).toBe(true);
    expect(result.data).toEqual({
      'text/html':
        '<div data-text-editor-fragment="range"><p data-id="a">a</p><p data-id="b"></p></div>',
      'text/plain': 'a\n\n',
    });
    // From the first to the last text point it is the whole-document selection, whose copy holds
    // every block (`uwg-te-req-engine-4`).
    range(headless, ['root', 0, 'element'], ['root', 3, 'element']);
    expect(copy(headless).data).toEqual({
      'text/html':
        '<div data-text-editor-fragment="range"><hr data-id="d1"><p data-id="a">a</p><p data-id="b">b</p></div>',
      'text/plain': 'a\n\nb',
    });
  });

  it('a cut deletes the text range it copied, the blocks outside it staying', () => {
    const headless = headlessLexical({ html: divided });
    range(headless, ['root', 0, 'element'], ['b-text', 0, 'text']);
    expect(copy(headless, 'cut').data['text/plain']).toBe('a\n\n');
    expect(headless.instance.getBlocks().roots).toEqual(['d1', 'b']);
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'b', offset: 0 },
    });
    expect(headless.instance.getContent('html')).toBe('<hr data-id="d1">\n<p data-id="b">b</p>');
  });

  it('a copy or cut of a range that holds no text writes nothing, and the engine writes nothing either', () => {
    const headless = headlessLexical({ html: divided });
    expect(range(headless, ['root', 0, 'element'], ['root', 1, 'element'])).toEqual({
      kind: 'none',
    });
    for (const type of ['copy', 'cut'] as const)
      expect(copy(headless, type)).toEqual({ handled: true, data: {}, prevented: 1 });
    expect(headless.instance.getBlocks().roots).toEqual(['d1', 'a', 'b']);
  });
});
