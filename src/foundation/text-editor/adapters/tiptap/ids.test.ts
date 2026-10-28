import { describe, expect, it } from 'vitest';
import { holderIndex } from './mapping.js';
import { planBlockIds } from './ids.js';
import type { TiptapNodeLike } from './modules.js';
import { NATIVE } from './schema.js';
import { sequentialIds } from '../shared/test-helpers.test.js';
import { html, mountTiptap } from './tiptap-stubs.test.js';

/** The identifiers of a document's blocks in order. */
const idsOf = (doc: TiptapNodeLike) => holderIndex(doc).list.map((holder) => holder.id);

/** The position of an offset in a top-level textblock by index. */
function textPos(doc: TiptapNodeLike, index: number, offset: number): number {
  let pos = 0;
  for (let child = 0; child < index; child += 1) pos += doc.child(child).nodeSize;
  return pos + 1 + offset;
}

describe('Tiptap block identifiers (uwg-te-req-content-7)', () => {
  it('a copy of a block gets a fresh identifier while the block keeps its own, in the same change', () => {
    const { view, context, instance } = mountTiptap({
      content: html('<p data-id="p1">calm</p><p data-id="p2">sea</p>'),
    });
    const copy = view.state.doc.child(1);
    view.dispatch(view.state.tr.insert(0, copy));
    expect(idsOf(view.state.doc)).toEqual(['n000000001', 'p1', 'p2']);
    // The repair joined the change: one content notification, one undo step.
    expect(context.calls).toEqual(['ready', 'content']);
    instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' });
    expect(idsOf(view.state.doc)).toEqual(['p1', 'p2']);
  });

  it('a block without a valid identifier gets a fresh one; paragraphs of items and cells carry none', () => {
    const { view } = mountTiptap({
      content: html('<ul><li data-id="l1"><p>rope</p></li></ul>'),
    });
    const { schema } = view.state;
    const paragraph = schema.nodes[NATIVE.paragraph]!;
    view.dispatch(
      view.state.tr.insert(view.state.doc.content.size, paragraph.create({ id: 'bad id!' })),
    );
    expect(idsOf(view.state.doc)).toEqual(['l1', 'n000000001']);
    // An identifier on the paragraph of a list item is removed.
    view.dispatch(view.state.tr.setNodeAttribute(2, 'id', 'stray'));
    expect(view.state.doc.child(0).child(0).child(0).attrs.id).toBeNull();
  });

  it('V-141 unit part: Enter in the middle keeps the identifier on the first part', () => {
    const { view } = mountTiptap({ content: html('<p data-id="p1">calm sea</p>') });
    view.dispatch(view.state.tr.split(textPos(view.state.doc, 0, 4)));
    expect(idsOf(view.state.doc)).toEqual(['p1', 'n000000001']);
    expect(view.state.doc.child(0).textContent).toBe('calm');
  });

  it('V-141 unit part: Enter at the start of a non-empty block leaves the identifier with the content', () => {
    const { view } = mountTiptap({ content: html('<p data-id="p1">calm sea</p>') });
    view.dispatch(view.state.tr.split(textPos(view.state.doc, 0, 0)));
    const [first, second] = [view.state.doc.child(0), view.state.doc.child(1)];
    expect([first.attrs.id, first.textContent]).toEqual(['n000000001', '']);
    expect([second.attrs.id, second.textContent]).toEqual(['p1', 'calm sea']);
  });

  it('V-141 unit part: the same holds for a list item; in a code block the split keeps the first part', () => {
    const items = mountTiptap({
      content: html('<ul><li data-id="l1"><p>rope</p></li></ul>'),
    });
    const listItem = items.view.state.schema.nodes[NATIVE.listItem]!;
    items.view.dispatch(items.view.state.tr.split(3, 2, [{ type: listItem }, null]));
    expect(idsOf(items.view.state.doc)).toEqual(['n000000001', 'l1']);
    expect(items.view.state.doc.child(0).child(1).textContent).toBe('rope');
    const code = mountTiptap({ content: html('<pre data-id="c1"><code>let x;</code></pre>') });
    code.view.dispatch(code.view.state.tr.split(1));
    expect(idsOf(code.view.state.doc)).toEqual(['c1', 'n000000001']);
  });

  it('identifiers survive turn-into and list toggles both ways', () => {
    const { instance } = mountTiptap({
      content: html('<p data-id="p1">a</p><p data-id="p2">b</p>'),
    });
    const run = (...actions: Parameters<typeof instance.execute>[0]) =>
      instance.execute(actions, { reason: 'imperative-action' });
    run({ type: 'block.set-type', kind: 'list-task', ids: ['p1', 'p2'] });
    expect(instance.getBlocks().roots).toEqual(['p1', 'p2']);
    run({ type: 'block.set-type', kind: 'list-task', ids: ['p1', 'p2'], toggle: true });
    expect(
      instance
        .getBlocks()
        .ordered()
        .map((block) => [block.id, block.kind]),
    ).toEqual([
      ['p1', 'paragraph'],
      ['p2', 'paragraph'],
    ]);
  });

  it('the document keeps an empty paragraph after a final atom block, inside the change', () => {
    const { view, context } = mountTiptap({
      content: html('<p data-id="p1">a</p><hr data-id="d1">'),
    });
    expect(view.state.doc.lastChild?.type.name).toBe(NATIVE.paragraph);
    const size = view.state.doc.content.size;
    const last = view.state.doc.lastChild!;
    view.dispatch(view.state.tr.delete(size - last.nodeSize, size));
    expect(view.state.doc.lastChild?.type.name).toBe(NATIVE.paragraph);
    expect(view.state.doc.lastChild?.attrs.id).toBe('n000000002');
    expect(context.calls.filter((call) => call === 'content')).toHaveLength(1);
  });

  it('plans fixes against the changed ranges: the block outside them keeps the identifier', () => {
    const { view } = mountTiptap({
      content: html('<p data-id="p1">a</p><p data-id="p2">b</p>'),
    });
    const doc = view.state.doc;
    const create = sequentialIds('f', 9);
    // Both paragraphs claim p1; the second lies in the changed range.
    const tr = view.state.tr.setNodeAttribute(3, 'id', 'p1');
    expect(planBlockIds(tr.doc, [{ from: 3, to: 6 }], create)).toEqual([
      { pos: 3, id: 'f000000001' },
    ]);
    expect(planBlockIds(tr.doc, [{ from: 0, to: 3 }], create)).toEqual([
      { pos: 0, id: 'f000000002' },
    ]);
    expect(planBlockIds(doc, [], create)).toEqual([]);
  });
});
