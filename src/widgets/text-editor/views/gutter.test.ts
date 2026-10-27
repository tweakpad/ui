import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { overlayBox } from '../geometry.js';
import { blockTree } from './block-selection.test.js';
import {
  gutterInsertActions,
  gutterPlacement,
  gutterTarget,
  headBlock,
  listMarkerOutset,
  type TextEditorGutterInput,
} from './gutter.js';

const base: TextEditorGutterInput = {
  enabled: true,
  pinned: false,
  current: null,
  focusInside: false,
  headBlock: 'caret',
  typing: false,
  hovered: null,
  coarse: false,
  editingFocused: true,
};

describe('gutter reveal', () => {
  it('follows the hovered block, and nothing without one', () => {
    expect(gutterTarget({ ...base, hovered: 'b2' })).toBe('b2');
    expect(gutterTarget(base)).toBeNull();
  });

  it('is hidden while typing until the pointer moves', () => {
    expect(gutterTarget({ ...base, hovered: 'b2', typing: true })).toBeNull();
  });

  it('sits beside the caret block after a coarse press while the editing root has focus', () => {
    expect(gutterTarget({ ...base, coarse: true })).toBe('caret');
    expect(gutterTarget({ ...base, coarse: true, editingFocused: false })).toBeNull();
  });

  it('stays pinned beside its block while its menu or a drag is active', () => {
    expect(gutterTarget({ ...base, pinned: true, current: 'b1', hovered: 'b3' })).toBe('b1');
    expect(gutterTarget({ ...base, pinned: true, current: 'b1', typing: true })).toBe('b1');
  });

  it('stays beside its block while it holds focus, else beside the selection head', () => {
    expect(gutterTarget({ ...base, focusInside: true, hovered: 'b3', typing: true })).toBe('caret');
    // A press on the grip of a block outside the selection focuses the grip: the block stays.
    expect(gutterTarget({ ...base, focusInside: true, current: 'b2', hovered: 'b2' })).toBe('b2');
  });

  it('never shows while it cannot (read-only, disabled, not ready or the layout turns it off)', () => {
    expect(gutterTarget({ ...base, enabled: false, pinned: true, current: 'b1' })).toBeNull();
  });

  it('reads the block of the selection head', () => {
    expect(
      headBlock({
        kind: 'text',
        anchor: { block: 'a', offset: 0 },
        head: { block: 'b', offset: 0 },
        empty: false,
      }),
    ).toBe('b');
    expect(headBlock({ kind: 'blocks', ids: ['a', 'c'] })).toBe('c');
    expect(
      headBlock({
        kind: 'cells',
        table: 't',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 0 } },
      }),
    ).toBe('t');
    expect(headBlock({ kind: 'none' })).toBeNull();
  });
});

describe('gutter insert', () => {
  const doc = blockTree([
    ['p1', 'paragraph'],
    ['p2-empty', 'paragraph'],
    ['l1', 'list-task'],
    ['l1a-empty', 'list-task', 1],
    ['h', 'heading'],
  ]);

  it('inserts a paragraph after the block with the slash trigger, before it with Alt', () => {
    expect(gutterInsertActions(doc, 'p1', { before: false, slash: true })).toEqual([
      { type: 'blocks.insert', kind: 'paragraph', at: { after: 'p1' }, select: 'start' },
      { type: 'text.insert', text: '/' },
    ]);
    expect(gutterInsertActions(doc, 'h', { before: true, slash: true })).toEqual([
      { type: 'blocks.insert', kind: 'paragraph', at: { before: 'h' }, select: 'start' },
      { type: 'text.insert', text: '/' },
    ]);
  });

  it('beside a list item inserts a list item of the same kind', () => {
    expect(gutterInsertActions(doc, 'l1', { before: false, slash: true })).toMatchObject([
      { type: 'blocks.insert', kind: 'list-task', at: { after: 'l1' } },
      { type: 'text.insert', text: '/' },
    ]);
  });

  it('fills an empty paragraph or list item in place', () => {
    expect(gutterInsertActions(doc, 'p2-empty', { before: false, slash: true })).toEqual([
      {
        type: 'selection.set',
        selection: { kind: 'caret', block: 'p2-empty', position: 'start' },
      },
      { type: 'text.insert', text: '/' },
    ]);
    expect(gutterInsertActions(doc, 'l1a-empty', { before: false, slash: true })).toHaveLength(2);
  });

  it('without the slash suggestions inserts no trigger, and an empty block only takes the caret', () => {
    expect(gutterInsertActions(doc, 'p1', { before: false, slash: false })).toEqual([
      { type: 'blocks.insert', kind: 'paragraph', at: { after: 'p1' }, select: 'start' },
    ]);
    expect(gutterInsertActions(doc, 'p2-empty', { before: false, slash: false })).toBe(
      'select-only',
    );
    expect(gutterInsertActions(doc, 'missing', { before: false, slash: true })).toBeNull();
  });
});

describe('gutter placement', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRectReadOnly;
  const toOverlay = (value: DOMRectReadOnly) =>
    overlayBox(value, { left: 100, top: 50 }, { x: 1, y: 1 });

  it('centres it on the first line at the inline start minus its size', () => {
    const rects = { content: rect(160, 90, 400, 60), firstLine: rect(160, 90, 400, 24) };
    expect(gutterPlacement(rects, toOverlay, { width: 48, height: 20 }, false)).toEqual({
      left: 12,
      top: 42,
    });
  });

  it('mirrors to the inline end in a right-to-left widget', () => {
    const rects = { content: rect(160, 90, 400, 60), firstLine: rect(160, 90, 400, 24) };
    expect(gutterPlacement(rects, toOverlay, { width: 48, height: 20 }, true)).toEqual({
      left: 460,
      top: 42,
    });
  });

  it('beside a table sits outside the reach of its row grips, on either side', () => {
    const rects = { content: rect(160, 90, 400, 60), firstLine: rect(160, 90, 400, 24) };
    const size = { width: 48, height: 20 };
    expect(gutterPlacement(rects, toOverlay, size, false, 12)).toEqual({ left: 0, top: 42 });
    expect(gutterPlacement(rects, toOverlay, size, true, 12)).toEqual({ left: 472, top: 42 });
  });

  it('centres it on a block lower than a line, such as a divider', () => {
    const rects = { content: rect(160, 90, 400, 1), firstLine: rect(160, 90, 400, 24) };
    expect(gutterPlacement(rects, toOverlay, { width: 48, height: 24 }, false)).toEqual({
      left: 12,
      top: 28.5,
    });
  });

  it('beside a list item sits outside its marker, at the inline start of its list', () => {
    const list = { getBoundingClientRect: () => ({ left: 100, right: 600 }) as DOMRect };
    // The marker's inset before the content, mirrored in RTL; none flush or without a list.
    expect(listMarkerOutset({ left: 124, right: 600 }, list, false)).toBe(24);
    expect(listMarkerOutset({ left: 100, right: 576 }, list, true)).toBe(24);
    expect(listMarkerOutset({ left: 100, right: 600 }, list, false)).toBe(0);
    expect(listMarkerOutset({ left: 124, right: 600 }, null, false)).toBe(0);
  });
});

describe('gutter source guards', () => {
  const source = readFileSync(new URL('./gutter.ts', import.meta.url), 'utf8');

  it('names the toolbar and its Buttons from strings and uses ghost icon-xs Buttons', () => {
    expect(source).toContain('role="toolbar"');
    expect(source).toContain('aria-label=${strings.gutter}');
    expect(source).toContain('${strings.insertBlock}');
    expect(source).toContain('${strings.grip}');
    expect(source.match(/size="icon-xs"/g)).toHaveLength(2);
    expect(source.match(/variant="ghost"/g)).toHaveLength(2);
  });

  it('keeps focus on an insert press and never prevents a grip press', () => {
    expect(source).toContain('@pointerdown=${this.#onInsertPress}');
    expect(source).not.toMatch(/grip[^\n]*@pointerdown/);
  });

  it('Alt+F10 focuses the insert Button with the focus indicator, which the chord does not give', () => {
    expect(source).toContain('return this.#session?.focusFirst({ focusVisible: true }) ?? false;');
  });

  it('writes no aria-grabbed or aria-pressed on the grip', () => {
    expect(source).not.toContain('aria-grabbed');
    expect(source).not.toContain('aria-pressed');
  });

  it('V-589: hit-tests the hovered block in the next frame, never in the move or scroll handler', () => {
    expect(source).not.toContain('geometry.hitBlock(');
    expect(source.match(/geometry\.requestHit\(/g)).toHaveLength(2);
  });
});
