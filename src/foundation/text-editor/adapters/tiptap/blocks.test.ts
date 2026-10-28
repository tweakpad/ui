/**
 * Tests of the block actions of the Tiptap adapter: their targets, the place of an insertion and
 * the selection it leaves.
 */
import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import {
  htmlOf,
  keyedTiptap,
  mountTiptap,
  html,
  runActions,
  selectIn,
  shapeOf,
} from './tiptap-stubs.test.js';

const TABLE =
  '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>';

describe('uwg-te-tab-actions r2: the textblocks a text selection targets', () => {
  const heading: TextEditorAction = {
    type: 'block.set-type',
    kind: 'heading',
    attrs: { level: 2 },
  };

  it('a range targets the textblocks it meets in document order, atoms and tables between skipped', () => {
    const { instance } = mountTiptap({
      content: html(`<p data-id="p1">calm</p><hr data-id="d1">${TABLE}<p data-id="p2">sea</p>`),
    });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'p2', offset: 1 },
      head: { block: 'p1', offset: 1 },
    });
    expect(instance.can(heading)).toBe(true);
    expect(runActions(instance, heading)).toBe(true);
    const written = htmlOf(instance);
    expect(written).toContain('<h2 data-id="p1">calm</h2>');
    expect(written).toContain('<h2 data-id="p2">sea</h2>');
    expect(written).toContain('<hr data-id="d1">');
    expect(written).toContain('<table data-id="t1">');
  });

  it('a selection with an end in a table cell targets no block, nor does Mod+A from a table', () => {
    const { instance, keys } = keyedTiptap(`${TABLE}<p data-id="p1">calm</p>`);
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 1 },
    });
    expect(instance.can(heading)).toBe(false);
    expect(keys.press('Mod-a')).toBe(true);
    expect(instance.getState().selection).toMatchObject({ kind: 'text', anchor: { block: 't1' } });
    expect(instance.can(heading)).toBe(false);
    expect(instance.can({ type: 'block.align', align: 'center' })).toBe(false);
  });
});

describe('uwg-te-tab-actions r3, uwg-te-req-blocks-1: inserted blocks', () => {
  it('an inserted atom is block-selected whatever select says; a table with end takes the end of its last cell', () => {
    for (const select of ['start', 'end', undefined] as const) {
      const { instance } = mountTiptap({
        content: html('<p data-id="p1">a</p><p data-id="p2">b</p>'),
      });
      expect(
        runActions(instance, {
          type: 'blocks.insert',
          kind: 'divider',
          at: { after: 'p1' },
          ...(select ? { select } : {}),
        }),
      ).toBe(true);
      const { selection } = instance.getState();
      expect(selection.kind, String(select)).toBe('blocks');
    }
    const { instance } = mountTiptap({ content: html('<p data-id="p1">a</p>') });
    expect(
      runActions(instance, {
        type: 'blocks.insert',
        kind: 'table',
        attrs: { rows: 2, columns: 3 },
        at: { after: 'p1' },
        select: 'end',
      }),
    ).toBe(true);
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { cell: { row: 1, column: 2 } },
    });
  });

  it('replacing a list item keeps its nested items and splits the list', () => {
    const { instance } = mountTiptap({
      content: html(
        '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p></p><ul><li data-id="e"><p>five</p></li></ul></li></ul></li></ul>',
      ),
    });
    expect(
      runActions(instance, { type: 'blocks.insert', kind: 'divider', at: { replace: 'b' } }),
    ).toBe(true);
    expect(shapeOf(instance)).toContain('five');
    expect(shapeOf(instance)).toContain('<hr data-id="NEW">');
    const caret = mountTiptap({
      content: html(
        '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p></p></li><li data-id="c"><p>three</p></li></ul></li><li data-id="d"><p>four</p></li></ul>',
      ),
    });
    selectIn(caret.instance, { kind: 'caret', block: 'b', position: 'start' });
    expect(runActions(caret.instance, { type: 'blocks.insert', kind: 'paragraph' })).toBe(true);
    expect(shapeOf(caret.instance)).not.toContain('<br>');
    expect(shapeOf(caret.instance)).toContain('three');
    expect(shapeOf(caret.instance)).toContain('four');
    expect(shapeOf(caret.instance)).not.toContain('data-id="b"');
  });
});
