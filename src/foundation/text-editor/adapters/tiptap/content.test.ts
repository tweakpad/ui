/**
 * Tests of the content action of the Tiptap adapter: a portable fragment inserted at a point,
 * over a text range or after a block selection.
 */
import { describe, expect, it } from 'vitest';
import { htmlOf, keyedTiptap, runActions } from './tiptap-stubs.test.js';

describe('uwg-te-tab-actions r5, uwg-te-req-engine-11: content.insert at the whole-document selection', () => {
  const DOC = '<hr data-id="d1"><p data-id="p1"><strong>a</strong>b</p><h2 data-id="h1">c</h2>';

  it('a fragment inserted at the Mod+A selection lands at the caret of one empty paragraph', () => {
    const { instance, keys } = keyedTiptap(DOC);
    keys.press('Mod-a');
    const { selection } = instance.getState();
    if (selection.kind !== 'text') throw new Error('Mod+A reads as text.');
    expect(
      runActions(instance, {
        type: 'content.insert',
        at: { kind: 'text', anchor: selection.anchor, head: selection.head },
        content: {
          kind: 'range',
          blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'Z' }] }],
        },
      }),
    ).toBe(true);
    expect(htmlOf(instance)).toMatch(/^<p data-id="(?!p1)[^"]+">Z<\/p>$/u);
  });
});
