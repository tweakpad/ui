/**
 * Tests of the selections of the Tiptap adapter: programmatic selections, block selections and the
 * selection read back from the engine.
 */
import { describe, expect, it } from 'vitest';
import type { TextEditorSelectionInput } from '../../model.js';
import {
  fakeSelection,
  freshIds,
  SELECTION_KEEPING_ACTIONS,
  textRun,
  WHOLE_DOCUMENT_INPUTS,
  WHOLE_DOCUMENTS,
  type WholeDocumentInput,
} from '../shared/test-helpers.test.js';
import { handleClipboardEvent } from './clipboard.js';
import { holderIndex } from './mapping.js';
import {
  caretAt,
  html,
  htmlOf,
  keyedTiptap,
  mountTiptap,
  runActions,
  selectIn,
  TIPTAP_MODULES,
  undoOnce,
} from './tiptap-stubs.test.js';

describe('uwg-te-tab-actions r6, uwg-te-req-blocks-4: selections', () => {
  const DOC = '<p data-id="p1">a</p><hr data-id="d1"><p data-id="p2">b</p>';

  it('an atom the engine node-selects is a block selection; insertion follows it', () => {
    const { instance, view } = mountTiptap({ content: html(DOC) });
    const divider = holderIndex(view.state.doc).byId.get('d1')!;
    view.dispatch(
      view.state.tr.setSelection(
        TIPTAP_MODULES.state.NodeSelection.create(view.state.doc, divider.pos),
      ),
    );
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['d1'] });
    expect(runActions(instance, { type: 'blocks.insert', kind: 'divider' })).toBe(true);
    expect(htmlOf(instance)).toMatch(
      /^<p data-id="p1">a<\/p>\n<hr data-id="d1">\n<hr data-id="[^"]+">\n<p data-id="p2">b<\/p>$/u,
    );
  });

  it('the end of a table is the end of its last cell in document order, its start cell (0,0)', () => {
    const { instance } = mountTiptap({
      content: html(
        '<table data-id="t1"><tbody><tr><td><p>a</p></td><td rowspan="2"><p>bb</p></td></tr><tr><td><p>c</p></td></tr></tbody></table><p data-id="p1">z</p>',
      ),
    });
    selectIn(instance, { kind: 'caret', block: 't1', position: 'end' });
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 1, column: 0 }, offset: 1 },
    });
    // Without a cell, the start is cell (0,0).
    expect(
      instance.can({
        type: 'selection.set',
        selection: { kind: 'caret', block: 't1', position: 'start' },
      }),
    ).toBe(true);
    selectIn(instance, { kind: 'caret', block: 't1', position: 'start' });
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
  });

  it('a block selection reports its topmost blocks in document order, the first as the state block', () => {
    const { instance } = mountTiptap({
      content: html(
        '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul><p data-id="p1">x</p>',
      ),
    });
    selectIn(instance, { kind: 'blocks', ids: ['p1', 'b', 'a'] });
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['a', 'p1'] });
    expect(instance.getState().block?.id).toBe('a');
  });
});

describe('uwg-te-req-engine-4: the whole-document selection, however it was made', () => {
  type Mounted = ReturnType<typeof keyedTiptap>;
  /** The clipboard data of a copy or cut through the root's handler. */
  function clipboard(mounted: Mounted, cut: boolean): Record<string, string> {
    const data = new Map<string, string>();
    const event = {
      clipboardData: {
        clearData: () => data.clear(),
        setData: (format: string, value: string) => void data.set(format, value),
      },
      preventDefault: () => undefined,
    };
    handleClipboardEvent(mounted.keys.env, mounted.view as never, event, cut);
    return Object.fromEntries(data);
  }
  const INPUTS: Record<WholeDocumentInput, (mounted: Mounted) => unknown> = {
    typing: ({ keys }) => keys.type('x'),
    Enter: ({ keys }) => keys.press('Enter'),
    'Shift+Enter': ({ keys }) => keys.press('Shift-Enter'),
    Backspace: ({ keys }) => keys.press('Backspace'),
    Delete: ({ keys }) => keys.press('Delete'),
    cut: (mounted) => clipboard(mounted, true),
    'text.insert': ({ instance }) => runActions(instance, { type: 'text.insert', text: 'x' }),
    'content.insert': ({ instance }) => {
      const { selection } = instance.getState();
      if (selection.kind !== 'text') throw new Error('The whole document reads as text.');
      return runActions(instance, {
        type: 'content.insert',
        at: { kind: 'text', anchor: selection.anchor, head: selection.head },
        content: { kind: 'range', blocks: [{ type: 'paragraph', content: [textRun('x')] }] },
      });
    },
  };
  /** A mount whose selection is the whole document, by Mod+A or by `selection.set`. */
  function whole(
    source: string,
    by: 'Mod+A' | 'selection.set',
    selection: TextEditorSelectionInput,
  ) {
    const mounted = keyedTiptap(source);
    if (by === 'Mod+A') mounted.keys.press('Mod-a');
    else selectIn(mounted.instance, selection);
    return mounted;
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
          const mounted = whole(source, by, selection);
          const copied =
            input === 'cut' ? clipboard(whole(source, 'Mod+A', selection), false) : null;
          const result = INPUTS[input](mounted);
          const label = `${source} ${by} ${input}`;
          expect(freshIds(htmlOf(mounted.instance)), label).toBe(expected);
          if (copied) expect(result, label).toEqual(copied);
          expect(mounted.instance.getState().marks.bold, label).toBe('off');
        }
  });

  it('an action that keeps the selection keeps it as the whole-document selection', () => {
    for (const { source, selection } of WHOLE_DOCUMENTS)
      for (const by of ['Mod+A', 'selection.set'] as const)
        for (const actions of SELECTION_KEEPING_ACTIONS) {
          const mounted = whole(source, by, selection);
          const label = `${source} ${by} ${actions.map(({ type }) => type).join(', ')}`;
          expect(runActions(mounted.instance, ...actions), label).toBe(true);
          expect(mounted.instance.getState().selection, label).toMatchObject({
            kind: 'text',
            empty: false,
          });
          mounted.keys.type('x');
          expect(freshIds(htmlOf(mounted.instance)), label).toBe('<p data-id="NEW">x</p>');
        }
  });

  it('a caret, or a selection short of either edge, is no whole-document selection', () => {
    const source = '<p data-id="p1">ab</p><p data-id="p2">cd</p>';
    const cases: TextEditorSelectionInput[] = [
      { kind: 'text', anchor: { block: 'p1', offset: 0 }, head: { block: 'p2', offset: 1 } },
      { kind: 'text', anchor: { block: 'p1', offset: 1 }, head: { block: 'p2', offset: 2 } },
      { kind: 'text', anchor: { block: 'p1', offset: 0 } },
    ];
    for (const selection of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, selection);
      keys.type('x');
      expect(freshIds(htmlOf(instance)), JSON.stringify(selection)).not.toContain('"NEW"');
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
  const KEYS: [string, (keys: ReturnType<typeof keyedTiptap>['keys']) => unknown][] = [
    ['typing', (keys) => keys.type('x')],
    ['Enter', (keys) => keys.press('Enter')],
    ['Backspace', (keys) => keys.press('Backspace')],
  ];

  for (const by of ['Mod+A', 'selection.set'] as const)
    for (const [label, key] of KEYS)
      it(`${by}, ${label}: undo selects the whole document again, redo the key’s result, and typing then replaces the document`, () => {
        const { instance, keys } = keyedTiptap(SOURCE);
        if (by === 'Mod+A') keys.press('Mod-a');
        else selectIn(instance, { kind: 'text', anchor: WHOLE.anchor, head: WHOLE.head });
        key(keys);
        const after = freshIds(htmlOf(instance));
        expect(undoOnce(instance)).toBe(true);
        expect(htmlOf(instance).replace(/\n/gu, '')).toBe(SOURCE);
        expect(instance.getState().selection).toEqual(WHOLE);
        expect(
          instance.execute([{ type: 'history.redo' }], { reason: 'hotkey', focus: false }),
        ).toBe(true);
        expect(freshIds(htmlOf(instance))).toBe(after);
        expect(undoOnce(instance)).toBe(true);
        expect(instance.getState().selection).toEqual(WHOLE);
        keys.type('y');
        expect(freshIds(htmlOf(instance))).toBe('<p data-id="NEW">y</p>');
      });
});

describe('uwg-te-req-engine-4: a press after a load that the view did not own', () => {
  const DOC = '<p data-id="p1">top</p><hr data-id="d1"><p data-id="p2">end</p>';
  type Handler = (view: unknown, event: unknown) => boolean;

  /**
   * A mount whose editing root holds a stand-in text node per paragraph, which the view maps to
   * the positions of that paragraph's text, and a press as a click makes it: the press starts, the
   * root takes focus, the document's selection lands at a point, and the press ends. The engine's
   * own reading of the DOM selection is not part of the stub view, so only the adapter reads it.
   */
  function pressable(content = DOC) {
    const mounted = mountTiptap({ content: html(content) });
    const { view } = mounted;
    const root = view.dom;
    const document = root.ownerDocument;
    const texts = new Map<unknown, string>();
    const text = (block: string) => {
      const node = document.createElement('span');
      root.append(node);
      texts.set(node, block);
      return node;
    };
    Object.assign(view, {
      posAtDOM: (node: unknown, offset: number) => {
        const block = texts.get(node);
        const holder = block === undefined ? null : holderIndex(view.state.doc).byId.get(block);
        if (!holder) throw new RangeError('DOM position not inside the editor');
        return holder.pos + 1 + offset;
      },
    });
    const handlers = view.props.handleDOMEvents as Record<string, Handler | undefined>;
    const press = (node: unknown, offset: number, during?: () => void) => {
      handlers.mousedown?.(view, { type: 'mousedown', button: 0, detail: 1 });
      root.focus();
      document.selection = fakeSelection(node, offset);
      during?.();
      handlers.mouseup?.(view, { type: 'mouseup', button: 0 });
    };
    /** A click at the end of "top" that the engine read, then focus elsewhere and no DOM selection. */
    const clickTopThenLeave = () => {
      void mounted.instance.focus();
      selectIn(mounted.instance, caretAt('p1', 3));
      mounted.instance.blur();
      document.selection = null;
    };
    return { ...mounted, root, document, text, press, clickTopThenLeave };
  }

  const CARET_TOP_3 = {
    kind: 'text',
    anchor: { block: 'p1', offset: 3 },
    head: { block: 'p1', offset: 3 },
    empty: true,
  };

  it('a click on the point the view last read, after a content load, selects that point', () => {
    const t = pressable();
    const top = t.text('p1');
    t.clickTopThenLeave();
    t.instance.setContent('<p data-id="p1">top</p><p data-id="p3">new</p>', 'html');
    expect(t.instance.getState().selection.kind).toBe('none');
    t.context.calls.length = 0;
    t.press(top, 3);
    expect(t.instance.getState().selection).toEqual(CARET_TOP_3);
    expect(t.context.calls).toEqual(['state']);
    expect(runActions(t.instance, { type: 'text.insert', text: 'Z' })).toBe(true);
    expect(htmlOf(t.instance)).toBe('<p data-id="p1">topZ</p>\n<p data-id="p3">new</p>');
  });

  it('a click on that point after a selection load, and after a load that pushes history, selects it', () => {
    const selected = pressable();
    const top = selected.text('p1');
    selected.clickTopThenLeave();
    selectIn(selected.instance, caretAt('p2', 1));
    selected.press(top, 3);
    expect(selected.instance.getState().selection).toEqual(CARET_TOP_3);

    const pushed = pressable();
    const pushedTop = pushed.text('p1');
    pushed.clickTopThenLeave();
    pushed.instance.setContent('<p data-id="p1">top</p><p data-id="p3">new</p>', 'html', {
      history: 'push',
    });
    pushed.press(pushedTop, 3);
    expect(pushed.instance.getState().selection).toEqual(CARET_TOP_3);
  });

  it('a press after a load while the root had focus is left to the engine, which wrote its selection', () => {
    const t = pressable();
    const top = t.text('p1');
    void t.instance.focus();
    t.instance.setContent('<p data-id="p1">top</p><p data-id="p3">new</p>', 'html');
    t.press(top, 3);
    expect(t.instance.getState().selection.kind).toBe('none');
  });

  it('a press during which the engine set its own selection keeps it, and only the first press is read', () => {
    const atom = pressable();
    const top = atom.text('p1');
    atom.clickTopThenLeave();
    atom.instance.setContent(DOC, 'html');
    const divider = holderIndex(atom.view.state.doc).byId.get('d1')!;
    // The engine selects the atom that the press targets.
    atom.press(top, 3, () =>
      atom.view.dispatch(
        atom.view.state.tr.setSelection(
          TIPTAP_MODULES.state.NodeSelection.create(atom.view.state.doc, divider.pos),
        ),
      ),
    );
    expect(atom.instance.getState().selection).toEqual({ kind: 'blocks', ids: ['d1'] });

    const once = pressable();
    const onceTop = once.text('p1');
    const end = once.text('p2');
    once.clickTopThenLeave();
    once.instance.setContent(DOC, 'html');
    once.press(onceTop, 3);
    expect(once.instance.getState().selection).toEqual(CARET_TOP_3);
    // From here the engine's own record is current: a later press is the engine's to read.
    once.press(end, 1);
    expect(once.instance.getState().selection).toEqual(CARET_TOP_3);
  });

  it('a DOM selection outside the editing root, or none, is not read', () => {
    const t = pressable();
    t.text('p1');
    const outside = t.document.createElement('span');
    t.clickTopThenLeave();
    t.instance.setContent(DOC, 'html');
    t.press(outside, 1);
    expect(t.instance.getState().selection.kind).toBe('none');
    t.instance.blur();
    t.instance.setContent(DOC, 'html');
    t.press(outside, 1, () => void (t.document.selection = null));
    expect(t.instance.getState().selection.kind).toBe('none');
  });
});
