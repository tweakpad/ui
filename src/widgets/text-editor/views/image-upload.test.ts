import { describe, expect, it } from 'vitest';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorBlock } from '../../../foundation/text-editor/model.js';
import {
  imageFileRejection,
  imageSourceAllowed,
  insertedBlock,
  livePoint,
  pendingImageIds,
  pendingImageInsertActions,
} from './image-upload.js';

const file = (name: string, type: string, size: number): File =>
  new File([new Uint8Array(size)], name, { type });

const block = (id: string, kind: string, attrs: Record<string, unknown> = {}): TextEditorBlock =>
  ({
    id,
    kind,
    attrs,
    parentId: null,
    depth: 0,
    index: 0,
    children: [],
    empty: false,
    textblock: kind === 'paragraph',
  }) as TextEditorBlock;

describe('image upload cards (uwg-te-req-surfaces-4)', () => {
  it('keeps image sources to the image policy', () => {
    expect(imageSourceAllowed('https://harbor.example/pier.jpg')).toBe(true);
    expect(imageSourceAllowed('pantry-shelf.svg')).toBe(true);
    expect(imageSourceAllowed('')).toBe(false);
    expect(imageSourceAllowed('blob:https://harbor.example/1')).toBe(false);
    expect(imageSourceAllowed('data:image/png;base64,AAAA')).toBe(false);
  });

  it('finds the pending images of the block tree: images whose source is empty, in order', () => {
    const tree = {
      ordered: () => [
        block('p1', 'paragraph'),
        block('i1', 'image', { src: '', alt: '' }),
        block('i2', 'image', { src: 'pantry-shelf.svg', alt: 'Shelf' }),
        block('i3', 'image', { src: '', alt: 'Later' }),
      ],
    };
    expect(pendingImageIds(tree)).toEqual(['i1', 'i3']);
    expect(pendingImageIds(null)).toEqual([]);
  });

  it('refuses a pasted or dropped file outside the accepted types or over the size limit, naming the file (uwg-te-req-content-6)', () => {
    const limits = { accept: 'image/png, image/jpeg', maxFileSize: 1024 };
    expect(
      imageFileRejection(file('a.png', 'image/png', 512), limits, textEditorStrings),
    ).toBeNull();
    expect(imageFileRejection(file('a.gif', 'image/gif', 512), limits, textEditorStrings)).toBe(
      'a.gif is not an accepted image type.',
    );
    expect(imageFileRejection(file('b.png', 'image/png', 4096), limits, textEditorStrings)).toBe(
      'b.png is larger than 1 KB.',
    );
    // The defaults accept any image of any size.
    expect(
      imageFileRejection(
        file('c.webp', 'image/webp', 1 << 26),
        { accept: 'image/*', maxFileSize: null },
        textEditorStrings,
      ),
    ).toBeNull();
  });

  it('inserts a pending image at the paste or drop selection, after a block, or at the end of an empty document', () => {
    const selection = { kind: 'text', anchor: { block: 'p1', offset: 2 } } as const;
    expect(pendingImageInsertActions({ kind: 'selection', selection })).toEqual([
      { type: 'selection.set', selection },
      { type: 'blocks.insert', kind: 'image', attrs: { src: '', alt: '' } },
    ]);
    expect(pendingImageInsertActions({ kind: 'after', id: 'i1' })).toEqual([
      { type: 'blocks.insert', kind: 'image', attrs: { src: '', alt: '' }, at: { after: 'i1' } },
    ]);
    expect(pendingImageInsertActions({ kind: 'document' })).toEqual([
      { type: 'blocks.insert', kind: 'image', attrs: { src: '', alt: '' } },
    ]);
  });

  it('keeps the paste point while its blocks exist, then falls back to the selection or the last block', () => {
    const point = {
      kind: 'selection',
      selection: { kind: 'text', anchor: { block: 'p1', offset: 0 } },
    } as const;
    expect(livePoint(point, ['p1', 'p2'], null)).toBe(point);
    const current = {
      kind: 'text',
      anchor: { block: 'p2', offset: 1 },
      head: { block: 'p2', offset: 1 },
      empty: true,
    } as const;
    expect(livePoint(point, ['p2'], current as never)).toEqual({
      kind: 'selection',
      selection: { kind: 'text', anchor: current.anchor, head: current.head },
    });
    expect(livePoint(point, ['p2'], null)).toEqual({ kind: 'after', id: 'p2' });
    expect(livePoint(point, [], null)).toEqual({ kind: 'document' });
    expect(livePoint({ kind: 'after', id: 'i1' }, [], null)).toEqual({ kind: 'after', id: 'i1' });
  });

  it('names the block an applied insert added', () => {
    expect(insertedBlock(['p1'], ['p1', 'i1'])).toBe('i1');
    expect(insertedBlock(['p1'], ['p1'])).toBeNull();
  });
});
