/**
 * Tests of the text and inline node actions of the Tiptap adapter.
 */
import { describe, expect, it } from 'vitest';
import { html, htmlOf, mountTiptap, runActions, selectIn } from './tiptap-stubs.test.js';

describe('uwg-te-tab-actions r4, uwg-te-req-content-7: text over a range across blocks', () => {
  const LIST =
    '<p data-id="p0">intro text</p><ul><li data-id="a"><p>alpha</p><ul><li data-id="b"><p>bravo</p></li><li data-id="c"><p>charlie</p></li></ul></li><li data-id="d"><p>delta</p></li></ul>';

  it('text over a range into a list item removes the item and lifts its nested items', () => {
    const { instance } = mountTiptap({ content: html(LIST) });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'p0', offset: 5 },
      head: { block: 'a', offset: 2 },
    });
    expect(runActions(instance, { type: 'text.insert', text: 'Z' })).toBe(true);
    expect(htmlOf(instance)).toBe(
      '<p data-id="p0">introZpha</p>\n<ul><li data-id="b"><p>bravo</p></li><li data-id="c"><p>charlie</p></li><li data-id="d"><p>delta</p></li></ul>',
    );
  });

  it('code text joining a paragraph keeps its line breaks as hard breaks', () => {
    const { instance } = mountTiptap({
      content: html(
        '<p data-id="p0">intro text</p><pre data-id="k1"><code>line one\nline two</code></pre><p data-id="p1">outro</p>',
      ),
    });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'p0', offset: 5 },
      head: { block: 'k1', offset: 4 },
    });
    expect(runActions(instance, { type: 'text.insert', text: '' })).toBe(true);
    expect(htmlOf(instance)).toBe(
      '<p data-id="p0">intro one<br>line two</p>\n<p data-id="p1">outro</p>',
    );
  });
});
