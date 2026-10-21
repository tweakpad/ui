import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import {
  canonicalize,
  type TextEditorPortableDraft,
  type TextEditorPortableInline,
} from '../../content/portable.js';
import type { TextEditorContentInput } from '../../engine.js';
import type { TextEditorEngineState, TextEditorSelectionInput } from '../../model.js';
import { defineTextEditorInline } from '../../nodes.js';
import { toTiptapJson } from './mapping.js';
import type { TiptapNodeLike, TiptapSelectionLike } from './modules.js';
import { html, mountTiptap, TIPTAP_MODULES, selectIn } from './tiptap-stubs.test.js';

/** Portable content as the native JSON that a mount takes. */
const portable = (draft: TextEditorPortableDraft, nodes = [] as const): TextEditorContentInput => ({
  content: toTiptapJson(canonicalize(draft, { nodes }).document),
  format: 'json',
});

const t = (text: string, marks?: Record<string, unknown>): TextEditorPortableInline =>
  (marks ? { type: 'text', text, marks } : { type: 'text', text }) as TextEditorPortableInline;

/** A mount whose selection the test sets through `selection.set`. */
function selected(draft: TextEditorPortableDraft, options: { nodes?: never[] } = {}) {
  const mounted = mountTiptap({ content: portable(draft), ...options });
  const select = (selection: TextEditorSelectionInput) => {
    const action: TextEditorAction = { type: 'selection.set', selection };
    expect(mounted.instance.execute([action], { reason: 'imperative-action', focus: false })).toBe(
      true,
    );
    return mounted.instance.getState();
  };
  return { ...mounted, select };
}

/** Whether a value and every object it holds is frozen. */
function deeplyFrozen(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return true;
  return Object.isFrozen(value) && Object.values(value).every(deeplyFrozen);
}

describe('Tiptap normalized state (uwg-te-req-engine-4, uwg-te-tab-engine r3)', () => {
  it('V-018 unit part: the state is deep-frozen and read without side effects', () => {
    const { instance } = mountTiptap({ content: html('<p data-id="p1">calm</p>') });
    const state = instance.getState();
    expect(deeplyFrozen(state)).toBe(true);
    expect(instance.getState()).toBe(state);
    expect(() => {
      'use strict';
      (state as { version: number }).version = 9;
    }).toThrow(TypeError);
    expect(state).toMatchObject({
      version: 1,
      contentVersion: 1,
      editable: true,
      focused: false,
      composing: false,
      empty: false,
      history: { undo: false, redo: false },
    });
  });

  it('V-018 unit part: version counts every engine update, contentVersion only document changes', () => {
    const { instance, view } = mountTiptap({ content: html('<p data-id="p1">calm</p>') });
    const run = (...actions: Parameters<typeof instance.execute>[0]) =>
      instance.execute(actions, { reason: 'imperative-action', focus: false });
    const versions = (state: TextEditorEngineState) => [state.version, state.contentVersion];
    run({ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } });
    expect(versions(instance.getState())).toEqual([2, 1]);
    run({ type: 'text.insert', text: '!' });
    expect(versions(instance.getState())).toEqual([3, 2]);
    // An engine change without the adapter: typing.
    view.dispatch(view.state.tr.insertText('?'));
    expect(versions(instance.getState())).toEqual([4, 3]);
    // An update that changes nothing the state holds leaves the versions.
    view.setProps({});
    expect(versions(instance.getState())).toEqual([4, 3]);
  });

  it('reports the selection: the whole document as text, an atom block as blocks', () => {
    const { instance, view } = mountTiptap({
      content: html('<hr data-id="d1"><p data-id="p1">calm</p><p data-id="p2">sea</p>'),
    });
    const { AllSelection, NodeSelection } = TIPTAP_MODULES.state;
    const All = AllSelection as unknown as new (doc: TiptapNodeLike) => TiptapSelectionLike;
    // The whole-document selection (Mod+A) reads as text from the first to the last text point.
    view.dispatch(view.state.tr.setSelection(new All(view.state.doc)));
    expect(instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p2', offset: 3 },
      empty: false,
    });
    // A node selection of an atom block reads as a block selection of it.
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, 0)));
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['d1'] });
    expect(instance.getState().empty).toBe(false);
    // After setContent no selection is placed until focus or a selection.
    instance.setContent('', 'text');
    expect(instance.getState()).toMatchObject({ empty: true, selection: { kind: 'none' } });
  });
});

describe('Tiptap normalized state, the selection parts (uwg-te-req-engine-4)', () => {
  const document: TextEditorPortableDraft = {
    blocks: [
      {
        type: 'heading',
        id: 'h1',
        level: 2,
        content: [t('calm ', { bold: true, textColor: 'blue' }), t('sea')],
      },
      {
        type: 'paragraph',
        id: 'p1',
        align: 'center',
        content: [t('see '), t('the pier', { link: 'https://harbor.example/' }), t(' now')],
      },
      { type: 'paragraph', id: 'p2', content: [] },
      {
        type: 'list-ordered',
        id: 'i1',
        start: 3,
        content: [t('one')],
        children: [{ type: 'list-ordered', id: 'i2', content: [t('two')], children: [] }],
      },
      { type: 'code', id: 'c1', text: 'let x' },
      {
        type: 'table',
        id: 't1',
        headerRow: true,
        headerColumn: false,
        rows: [
          {
            cells: [{ colSpan: 2, paragraphs: [{ content: [t('head', { italic: true })] }] }],
          },
          {
            cells: [
              { paragraphs: [{ content: [t('a', { italic: true })] }] },
              { paragraphs: [{ content: [t('b')] }] },
            ],
          },
        ],
      },
      { type: 'paragraph', id: 'p3', content: [t('x', { code: true }), t('y')] },
    ],
  };

  it('V-018 unit part: a caret reports its marks, block, kinds, caret text and no link or table', () => {
    const { select } = selected(document);
    const state = select({ kind: 'text', anchor: { block: 'h1', offset: 3 } });
    expect(state.marks).toMatchObject({
      bold: 'on',
      italic: 'off',
      textColor: 'blue',
      highlight: null,
    });
    expect(state.block).toEqual({
      id: 'h1',
      kind: 'heading',
      attrs: { level: 2, align: null },
      depth: 0,
    });
    expect(state.blockKinds).toEqual(['heading:2']);
    expect(state.align).toBeNull();
    expect(state.caret).toEqual({
      point: { block: 'h1', offset: 3 },
      textBefore: 'cal',
      inCode: false,
    });
    expect(state.link).toBeNull();
    expect(state.table).toBeNull();
    expect(state.emptyBlock).toBeNull();
  });

  it('V-018 unit part: a range reports mixed marks, its kinds in order and the common alignment', () => {
    const { select } = selected(document);
    const state = select({
      kind: 'text',
      anchor: { block: 'h1', offset: 1 },
      head: { block: 'p1', offset: 2 },
    });
    expect(state.marks).toMatchObject({ bold: 'mixed', textColor: 'mixed' });
    expect(state.blockKinds).toEqual(['heading:2', 'paragraph']);
    expect(state.align).toBe('mixed');
    expect(state.block).toMatchObject({ id: 'p1', kind: 'paragraph', attrs: { align: 'center' } });
    expect(state.caret).toBeNull();
    expect(
      select({ kind: 'text', anchor: { block: 'p1', offset: 0 }, head: { block: 'p1', offset: 2 } })
        .align,
    ).toBe('center');
  });

  it('V-018 unit part: the link at a selection in one textblock, a caret at either edge included', () => {
    const { select } = selected(document);
    const link = { href: 'https://harbor.example/', range: { block: 'p1', from: 4, to: 12 } };
    expect(select({ kind: 'text', anchor: { block: 'p1', offset: 6 } }).link).toEqual(link);
    expect(select({ kind: 'text', anchor: { block: 'p1', offset: 4 } }).link).toEqual(link);
    expect(select({ kind: 'text', anchor: { block: 'p1', offset: 12 } }).link).toEqual(link);
    expect(
      select({ kind: 'text', anchor: { block: 'p1', offset: 5 }, head: { block: 'p1', offset: 9 } })
        .link,
    ).toEqual(link);
    expect(select({ kind: 'text', anchor: { block: 'p1', offset: 2 } }).link).toBeNull();
  });

  it('V-018 unit part: list items report their kind, attributes and depth', () => {
    const { select } = selected(document);
    expect(select({ kind: 'text', anchor: { block: 'i1', offset: 1 } }).block).toEqual({
      id: 'i1',
      kind: 'list-ordered',
      attrs: { align: null, start: 3 },
      depth: 0,
    });
    expect(select({ kind: 'text', anchor: { block: 'i2', offset: 1 } }).block).toEqual({
      id: 'i2',
      kind: 'list-ordered',
      attrs: { align: null, start: 1 },
      depth: 1,
    });
  });

  it('V-018 unit part: an empty textblock and code report the empty block and code', () => {
    const { select } = selected(document);
    const empty = select({ kind: 'text', anchor: { block: 'p2', offset: 0 } });
    expect(empty.emptyBlock).toEqual({ id: 'p2', kind: 'paragraph' });
    expect(empty.caret).toEqual({
      point: { block: 'p2', offset: 0 },
      textBefore: '',
      inCode: false,
    });
    expect(select({ kind: 'text', anchor: { block: 'c1', offset: 3 } }).caret).toMatchObject({
      textBefore: 'let',
      inCode: true,
    });
    expect(select({ kind: 'text', anchor: { block: 'p3', offset: 1 } }).caret).toMatchObject({
      textBefore: 'x',
      inCode: true,
    });
    // Typed text takes the marks before the caret, and none at a textblock's start.
    expect(select({ kind: 'text', anchor: { block: 'p3', offset: 0 } }).caret?.inCode).toBe(false);
    expect(select({ kind: 'text', anchor: { block: 'p3', offset: 2 } }).caret?.inCode).toBe(false);
  });

  it('V-018 unit part: the table at the selection, with the cell range of a cell selection', () => {
    const { select } = selected(document);
    const inCell = select({
      kind: 'text',
      anchor: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 2 },
    });
    expect(inCell.table).toEqual({
      id: 't1',
      cell: { row: 0, column: 0 },
      range: null,
      rows: 2,
      columns: 2,
      headerRow: true,
      headerColumn: false,
      merged: true,
      cellMerged: true,
    });
    expect(inCell.block).toMatchObject({ id: 't1', kind: 'table' });
    expect(inCell.blockKinds).toEqual(['table']);
    expect(inCell.emptyBlock).toBeNull();
    const range = { anchor: { row: 1, column: 0 }, head: { row: 1, column: 1 } };
    const cells = select({ kind: 'cells', table: 't1', range });
    expect(cells.table).toMatchObject({ cell: { row: 1, column: 1 }, range, cellMerged: false });
    expect(cells.marks.italic).toBe('mixed');
    expect(cells.blockKinds).toEqual(['table']);
  });

  it('V-018 unit part: a block selection reports its blocks, the first as the state block', () => {
    const { select } = selected(document);
    const state = select({ kind: 'blocks', ids: ['p1', 'h1'] });
    expect(state.selection).toEqual({ kind: 'blocks', ids: ['h1', 'p1'] });
    expect(state.block).toMatchObject({ id: 'h1' });
    expect(state.blockKinds).toEqual(['heading:2', 'paragraph']);
    expect(state.marks.bold).toBe('mixed');
    expect(state.caret).toBeNull();
  });

  it('V-018 unit part: the text before the caret writes hard breaks and inline nodes, at most 64 units', () => {
    const chip = defineTextEditorInline({ name: 'chip', element: 'span', text: () => 'chip' });
    const long = 'w'.repeat(70);
    const mounted = mountTiptap({
      nodes: [chip],
      content: portable(
        {
          blocks: [
            {
              type: 'paragraph',
              id: 'p1',
              content: [
                t('a'),
                { type: 'hard-break' },
                { type: 'custom', name: 'chip', attrs: {} },
                t('b'),
              ],
            },
            { type: 'paragraph', id: 'p2', content: [t(long)] },
          ],
        },
        [chip] as never,
      ),
    });
    const run = (selection: TextEditorSelectionInput) =>
      mounted.instance.execute([{ type: 'selection.set', selection }], {
        reason: 'imperative-action',
        focus: false,
      });
    run({ kind: 'text', anchor: { block: 'p1', offset: 4 } });
    expect(mounted.instance.getState().caret?.textBefore).toBe('a\n\uFFFCb');
    run({ kind: 'text', anchor: { block: 'p2', offset: 70 } });
    expect(mounted.instance.getState().caret?.textBefore).toBe('w'.repeat(64));
  });

  it('Mod+A reads as text from the first to the last text point, past a leading atom', () => {
    const { instance, view } = mountTiptap({
      content: portable({
        blocks: [
          { type: 'divider', id: 'd1' },
          { type: 'paragraph', id: 'p1', content: [t('calm')] },
          {
            type: 'table',
            id: 't1',
            headerRow: false,
            headerColumn: false,
            rows: [
              {
                cells: [
                  { paragraphs: [{ content: [t('a')] }] },
                  { paragraphs: [{ content: [t('bc')] }] },
                ],
              },
            ],
          },
          { type: 'image', id: 'm1', src: 'https://harbor.example/m.png', alt: '' },
          { type: 'paragraph', id: 'p2', content: [t('end')] },
        ],
      }),
    });
    const All = TIPTAP_MODULES.state.AllSelection as unknown as new (
      doc: TiptapNodeLike,
    ) => TiptapSelectionLike;
    view.dispatch(view.state.tr.setSelection(new All(view.state.doc)));
    const state = instance.getState();
    expect(state.selection).toEqual({
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p2', offset: 3 },
      empty: false,
    });
    // The engine keeps its own whole-document selection.
    expect(view.state.selection).toBeInstanceOf(TIPTAP_MODULES.state.AllSelection);
    expect(state.block).toMatchObject({ id: 'p2' });
    expect(state.blockKinds).toEqual(['divider', 'paragraph', 'table', 'image']);
  });
});

describe('uwg-te-req-engine-4: the alignment a selection reports', () => {
  it('state.align leaves out code blocks', () => {
    const { instance } = mountTiptap({
      content: html(
        '<blockquote data-id="q1" style="text-align: center"><p>quoted</p></blockquote><pre data-id="k1"><code>x</code></pre>',
      ),
    });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'q1', offset: 0 },
      head: { block: 'k1', offset: 1 },
    });
    expect(instance.getState().align).toBe('center');
  });
});
