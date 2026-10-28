import { describe, expect, it } from 'vitest';
import type { TextEditorPortableDraft } from '../../content/portable.js';
import { codeArrow, codeEnter, codeTab } from './code.js';
import { pointToPos } from './mapping.js';
import { ruleView, TIPTAP_MODULES } from './tiptap-stubs.test.js';
import type { TestView } from './tiptap-stubs.test.js';
import { portableOf, type TiptapEnv } from './work.js';

const code = (text: string, id = 'c1') => ({ type: 'code' as const, id, text });

/** A view with a text selection in the block `block`, from `anchor` to `head`. */
function select(draft: TextEditorPortableDraft, block: string, anchor: number, head = anchor) {
  const mounted = ruleView(draft);
  const { view } = mounted;
  const doc = view.state.doc;
  view.dispatch(
    view.state.tr.setSelection(
      TIPTAP_MODULES.state.TextSelection.create(
        doc,
        pointToPos(doc, { block, offset: anchor })!,
        pointToPos(doc, { block, offset: head })!,
      ),
    ),
  );
  return mounted;
}

const blocks = (env: TiptapEnv, view: TestView) => portableOf(view.state.doc, env).blocks;
/** The selection as offsets into the textblock that holds it. */
const offsets = (view: TestView) => [
  view.state.selection.$anchor.parentOffset,
  view.state.selection.$head.parentOffset,
];

describe('Tiptap code block keys (uwg-te-req-parity-1)', () => {
  it('Tab inserts two spaces at a caret; Shift+Tab removes up to two leading spaces of the caret line', () => {
    const { view, env } = select({ blocks: [code('let x\n   y')] }, 'c1', 3);
    expect(codeTab(env, view, false)).toBe(true);
    expect(blocks(env, view)).toEqual([code('let   x\n   y')]);
    expect(offsets(view)).toEqual([5, 5]);
    const second = select({ blocks: [code('let x\n   y')] }, 'c1', 8);
    expect(codeTab(second.env, second.view, true)).toBe(true);
    expect(blocks(second.env, second.view)).toEqual([code('let x\n y')]);
    expect(offsets(second.view)).toEqual([6, 6]);
  });

  it('Tab and Shift+Tab indent and outdent each line a selection touches, never with a tab', () => {
    const { view, env } = select({ blocks: [code('a\nb\nc')] }, 'c1', 0, 3);
    codeTab(env, view, false);
    expect(blocks(env, view)).toEqual([code('  a\n  b\nc')]);
    // The shared rule: a point at or after an insertion moves with it.
    expect(offsets(view)).toEqual([2, 7]);
    codeTab(env, view, true);
    expect(blocks(env, view)).toEqual([code('a\nb\nc')]);
    expect(JSON.stringify(blocks(env, view))).not.toContain('\\t');
  });

  it('Shift+Tab without leading spaces is consumed without effect', () => {
    const { view, env } = select({ blocks: [code('a')] }, 'c1', 1);
    const before = view.state.doc;
    expect(codeTab(env, view, true)).toBe(true);
    expect(view.state.doc).toBe(before);
  });

  it('Enter and Shift+Enter insert a line break with the caret line indentation', () => {
    for (const shift of [false, true]) {
      const { view, env } = select({ blocks: [code('  let x')] }, 'c1', 7);
      expect(codeEnter(env, view, shift)).toBe(true);
      expect(blocks(env, view)).toEqual([code('  let x\n  ')]);
      expect(offsets(view)).toEqual([10, 10]);
    }
  });

  it('Enter at the end of a text that ends with two line breaks leaves the code block', () => {
    const { view, env } = select({ blocks: [code('let x\n\n')] }, 'c1', 7);
    expect(codeEnter(env, view, false)).toBe(true);
    const [first, second] = blocks(env, view);
    expect(first).toEqual(code('let x'));
    expect(second).toMatchObject({ type: 'paragraph', content: [] });
    expect(view.state.selection.$head.parent.type.name).toBe('paragraph');
    // Undo right after restores the code block as it was.
    TIPTAP_MODULES.history.undo(view.state, (tr) => view.dispatch(tr));
    expect(blocks(env, view)).toEqual([code('let x\n\n')]);
    // Shift+Enter never leaves, nor Enter before the end.
    const shifted = select({ blocks: [code('let x\n\n')] }, 'c1', 7);
    codeEnter(shifted.env, shifted.view, true);
    expect(blocks(shifted.env, shifted.view)).toEqual([code('let x\n\n\n')]);
  });

  it('ArrowDown at the end of a last code block and ArrowUp at the start of a first one add a paragraph', () => {
    const down = select({ blocks: [code('a')] }, 'c1', 1);
    expect(codeArrow(down.env, down.view, 'down')).toBe(true);
    expect(blocks(down.env, down.view).map((block) => block.type)).toEqual(['code', 'paragraph']);
    expect(down.view.state.selection.$head.parent.type.name).toBe('paragraph');
    const up = select({ blocks: [code('a')] }, 'c1', 0);
    expect(codeArrow(up.env, up.view, 'up')).toBe(true);
    expect(blocks(up.env, up.view).map((block) => block.type)).toEqual(['paragraph', 'code']);
    expect(up.view.state.selection.$head.pos).toBe(1);
    // Not away from the edge, nor when a block follows or precedes.
    const middle = select({ blocks: [code('ab')] }, 'c1', 1);
    expect(codeArrow(middle.env, middle.view, 'down')).toBe(false);
    const followed = select(
      { blocks: [code('a'), { type: 'paragraph', id: 'p1', content: [] }] },
      'c1',
      1,
    );
    expect(codeArrow(followed.env, followed.view, 'down')).toBe(false);
    const preceded = select(
      { blocks: [{ type: 'paragraph', id: 'p1', content: [] }, code('a')] },
      'c1',
      0,
    );
    expect(codeArrow(preceded.env, preceded.view, 'up')).toBe(false);
  });

  it('the code keys leave other blocks to the other keys', () => {
    const { view, env } = select(
      { blocks: [{ type: 'paragraph', id: 'p1', content: [] }] },
      'p1',
      0,
    );
    expect(codeTab(env, view, false)).toBe(false);
    expect(codeEnter(env, view, false)).toBe(false);
    expect(codeArrow(env, view, 'down')).toBe(false);
  });
});

describe('uwg-te-req-parity-1: leaving a code block', () => {
  it('the paragraph of a code exit has an identifier in the exit transaction itself', () => {
    const enter = ruleView({ blocks: [{ type: 'code', id: 'k1', text: 'ab\n\n' }] }, 5);
    expect(codeEnter(enter.env, enter.view, false)).toBe(true);
    const down = ruleView({ blocks: [{ type: 'code', id: 'k1', text: 'ab' }] }, 3);
    expect(codeArrow(down.env, down.view, 'down')).toBe(true);
    for (const { view } of [enter, down]) {
      const exit = view.dispatched.at(-1)!.doc;
      expect(typeof exit.child(1).attrs.id).toBe('string');
    }
  });
});
