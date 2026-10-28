import { describe, expect, it } from 'vitest';
import { readClipboardHtml } from '../../content/html.js';
import { htmlSource } from '../../content/html-source.test.js';
import {
  canonicalize,
  type TextEditorPortableDraft,
  type TextEditorPortableInline,
} from '../../content/portable.js';
import { handleClipboardEvent, stateClipboard, stateFragment } from './clipboard.js';
import { pointToPos, toTiptapJson } from './mapping.js';
import type { TiptapNodeLike, TiptapSelectionLike } from './modules.js';
import { blockSelection } from './selection.js';
import { mountTiptap, ruleView, TIPTAP_MODULES } from './tiptap-stubs.test.js';
import type { TestView } from './tiptap-stubs.test.js';
import { portableOf, type TiptapEnv } from './work.js';

const t = (text: string, marks?: Record<string, unknown>): TextEditorPortableInline =>
  (marks ? { type: 'text', text, marks } : { type: 'text', text }) as TextEditorPortableInline;

const document: TextEditorPortableDraft = {
  blocks: [
    { type: 'heading', id: 'h1', level: 2, content: [t('Harbor '), t('notes', { bold: true })] },
    { type: 'paragraph', id: 'p1', content: [t('Low tide at noon')] },
    {
      type: 'list-bullet',
      id: 'i1',
      content: [t('pier')],
      children: [{ type: 'list-bullet', id: 'i2', content: [t('rope')], children: [] }],
    },
    {
      type: 'table',
      id: 't1',
      headerRow: true,
      headerColumn: false,
      rows: [
        {
          cells: [{ paragraphs: [{ content: [t('a')] }] }, { paragraphs: [{ content: [t('b')] }] }],
        },
        {
          cells: [{ paragraphs: [{ content: [t('c')] }] }, { paragraphs: [{ content: [t('d')] }] }],
        },
      ],
    },
    { type: 'paragraph', id: 'p2', content: [t('end')] },
  ],
};

/** A view with a text selection between two text points. */
function textSelection(anchor: [string, number], head: [string, number]) {
  const mounted = ruleView(document);
  const { view } = mounted;
  const doc = view.state.doc;
  view.dispatch(
    view.state.tr.setSelection(
      TIPTAP_MODULES.state.TextSelection.create(
        doc,
        pointToPos(doc, { block: anchor[0], offset: anchor[1] })!,
        pointToPos(doc, { block: head[0], offset: head[1] })!,
      ),
    ),
  );
  return mounted;
}

/** What a paste of the payload's HTML reads. */
const pasted = (html: string) => readClipboardHtml(htmlSource(html)!).fragment;

describe('Tiptap copy and cut (uwg-te-req-content-6)', () => {
  it('a text range in one textblock copies its text as a range of one paragraph', () => {
    const { view, env } = textSelection(['p1', 4], ['p1', 8]);
    const payload = stateClipboard(env, view.state)!;
    expect(payload.text).toBe('tide');
    expect(payload.html).toContain('data-text-editor-fragment="range"');
    expect(payload.html).not.toContain('data-pm-slice');
    expect(pasted(payload.html)).toMatchObject({
      kind: 'range',
      blocks: [{ content: [t('tide')] }],
    });
  });

  it('a range over blocks copies them, the outer two trimmed to the selection', () => {
    const { view, env } = textSelection(['h1', 7], ['p1', 3]);
    const fragment = stateFragment(env, view.state)!;
    expect(fragment).toMatchObject({
      kind: 'range',
      blocks: [
        { type: 'heading', id: 'h1', content: [t('notes', { bold: true })] },
        { type: 'paragraph', id: 'p1', content: [t('Low')] },
      ],
    });
    expect(stateClipboard(env, view.state)!.text).toBe('notes\n\nLow');
  });

  it('a block selection copies its blocks with their nested items', () => {
    const { view, env } = ruleView(document);
    view.dispatch(view.state.tr.setSelection(blockSelection(env.modules, view.state.doc, ['i1'])!));
    const payload = stateClipboard(env, view.state)!;
    expect(payload.html).toContain('data-text-editor-fragment="blocks"');
    expect(pasted(payload.html)).toMatchObject({
      kind: 'blocks',
      blocks: [{ type: 'list-bullet', id: 'i1', children: [{ id: 'i2' }] }],
    });
    expect(payload.text).toBe('pier\nrope');
  });

  it('a cell range copies a table of its cells, and the whole-document selection every block', () => {
    const { view, env } = ruleView(document);
    const doc = view.state.doc;
    let tablePos = 0;
    doc.forEach((node, pos) => {
      if (node.type.name === 'table') tablePos = pos;
    });
    const map = TIPTAP_MODULES.tables!.TableMap.get(doc.nodeAt(tablePos)!);
    view.dispatch(
      view.state.tr.setSelection(
        TIPTAP_MODULES.tables!.CellSelection.create(
          doc,
          tablePos + 1 + map.map[1]!,
          tablePos + 1 + map.map[3]!,
        ),
      ),
    );
    expect(stateFragment(env, view.state)).toMatchObject({
      kind: 'blocks',
      blocks: [
        {
          type: 'table',
          headerRow: true,
          headerColumn: false,
          rows: [
            { cells: [{ paragraphs: [{ content: [t('b')] }] }] },
            { cells: [{ paragraphs: [{ content: [t('d')] }] }] },
          ],
        },
      ],
    });
    const All = TIPTAP_MODULES.state.AllSelection as unknown as new (
      doc: TiptapNodeLike,
    ) => TiptapSelectionLike;
    view.dispatch(view.state.tr.setSelection(new All(view.state.doc)));
    const whole = stateFragment(env, view.state)!;
    expect(whole.kind).toBe('range');
    expect(whole.blocks.map((block) => block.id)).toEqual(['h1', 'p1', 'i1', 't1', 'p2']);
  });

  it('the handler writes exactly the two flavours and cancels the engine copy; nothing to copy is left alone', () => {
    const { view, env } = textSelection(['p1', 0], ['p1', 3]);
    const written: [string, string][] = [];
    const calls: string[] = [];
    const event = {
      clipboardData: {
        clearData: () => calls.push('clearData'),
        setData: (format: string, data: string) => written.push([format, data]),
      },
      preventDefault: () => calls.push('preventDefault'),
    };
    expect(handleClipboardEvent(env, view, event, false)).toBe(true);
    expect(calls).toEqual(['preventDefault', 'clearData']);
    expect(written.map(([format]) => format)).toEqual(['text/html', 'text/plain']);
    expect(written[1]![1]).toBe('Low');
    const collapsed = textSelection(['p1', 2], ['p1', 2]);
    expect(handleClipboardEvent(collapsed.env, collapsed.view, event, false)).toBe(false);
    expect(handleClipboardEvent(env, view, { ...event, clipboardData: null }, false)).toBe(false);
  });

  it('a cut deletes the selection; a block selection as the shared deletion, read-only never', () => {
    const event = () => ({
      clipboardData: { clearData: () => undefined, setData: () => undefined },
      preventDefault: () => undefined,
    });
    const text = textSelection(['p1', 0], ['p1', 4]);
    expect(handleClipboardEvent(text.env, text.view, event(), true)).toBe(true);
    expect(blocks(text.env, text.view)[1]).toMatchObject({
      id: 'p1',
      content: [t('tide at noon')],
    });
    expect(text.view.dispatched.at(-1)!.getMeta('uiEvent')).toBe('cut');
    const { view, env } = ruleView(document);
    view.dispatch(view.state.tr.setSelection(blockSelection(env.modules, view.state.doc, ['p1'])!));
    expect(handleClipboardEvent(env, view, event(), true)).toBe(true);
    expect(blocks(env, view).map((block) => block.id)).toEqual(['h1', 'i1', 't1', 'p2']);
    expect(view.dispatched.at(-1)!.getMeta('uiEvent')).toBe('cut');
    const readOnly = textSelection(['p1', 0], ['p1', 4]);
    readOnly.view.editable = false;
    expect(handleClipboardEvent(readOnly.env, readOnly.view, event(), true)).toBe(false);
  });

  it('cutting the whole-document selection leaves one empty paragraph with a fresh identifier', () => {
    const { view, env } = ruleView(document);
    const All = TIPTAP_MODULES.state.AllSelection as unknown as new (
      doc: TiptapNodeLike,
    ) => TiptapSelectionLike;
    view.dispatch(view.state.tr.setSelection(new All(view.state.doc)));
    handleClipboardEvent(
      env,
      view,
      {
        clipboardData: { clearData: () => undefined, setData: () => undefined },
        preventDefault: () => undefined,
      },
      true,
    );
    const left = blocks(env, view);
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ type: 'paragraph', content: [] });
    expect(['h1', 'p1', 'i1', 't1', 'p2']).not.toContain(left[0]!.id);
  });

  it('the mount wires the handlers into the engine props, and a cut reports cause cut', () => {
    const content = toTiptapJson(canonicalize(document).document);
    const { view, context, instance } = mountTiptap({ content: { content, format: 'json' } });
    instance.execute(
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
    const handlers = view.props.handleDOMEvents as Record<
      string,
      (view: unknown, event: unknown) => boolean
    >;
    expect(Object.keys(handlers).sort()).toEqual([
      'compositionend',
      'compositionstart',
      'copy',
      'cut',
      'dragstart',
      'keydown',
      'mousedown',
      'mouseup',
    ]);
    handlers.cut!(view, {
      clipboardData: { clearData: () => undefined, setData: () => undefined },
      preventDefault: () => undefined,
    });
    expect(context.changes.at(-1)).toEqual({ cause: 'cut', reason: 'input' });
  });
});

const blocks = (env: TiptapEnv, view: TestView) => portableOf(view.state.doc, env).blocks;

describe('uwg-te-req-content-6: copy and cut at a caret', () => {
  it('a copy or cut at a caret is left to the browser: nothing written, its default kept, nothing deleted', () => {
    // A copy while read-only too; a cut while read-only is never the adapter's.
    for (const [editable, type] of [
      [true, 'copy'],
      [true, 'cut'],
      [false, 'copy'],
    ] as const) {
      const { instance, view } = mountTiptap({
        content: { content: '<p data-id="p1">calm sea</p><p data-id="p2">end</p>', format: 'html' },
        editable,
      });
      instance.execute(
        [
          {
            type: 'selection.set',
            selection: { kind: 'text', anchor: { block: 'p1', offset: 2 } },
          },
        ],
        { reason: 'imperative-action', focus: false },
      );
      const before = instance.getContent('html');
      const data = new Map<string, string>();
      let prevented = 0;
      const handlers = view.props.handleDOMEvents as Record<
        string,
        (view: unknown, event: unknown) => boolean
      >;
      const handled = handlers[type]!(view, {
        clipboardData: {
          clearData: () => data.clear(),
          setData: (format: string, value: string) => void data.set(format, value),
        },
        preventDefault: () => void (prevented += 1),
      });
      const label = `${type}, editable ${editable}`;
      expect({ handled, data: Object.fromEntries(data), prevented }, label).toEqual({
        handled: false,
        data: {},
        prevented: 0,
      });
      expect(instance.getContent('html'), label).toBe(before);
    }
  });
});
