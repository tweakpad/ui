import { describe, expect, it } from 'vitest';
import type { TextEditorBlock } from '../../../foundation/text-editor/model.js';
import {
  IMAGE_ALT_INSET,
  imageAltPlacement,
  imageAltProposal,
  imageAltTarget,
  imageAltVisible,
} from './image-alt.js';

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

const tree = {
  get: (id: string) =>
    ({
      i1: block('i1', 'image', { src: 'pantry-shelf.svg', alt: 'Shelf' }),
      i2: block('i2', 'image', { src: '', alt: '' }),
      p1: block('p1', 'paragraph'),
    })[id],
};

describe('alternative text field (uwg-te-req-surfaces-4)', () => {
  it('targets the one uploaded image of a block selection, never a pending image or anything else', () => {
    expect(imageAltTarget({ kind: 'blocks', ids: ['i1'] }, tree)).toEqual({
      id: 'i1',
      alt: 'Shelf',
    });
    // A pending image has no source yet: the field describes an image that is there.
    expect(imageAltTarget({ kind: 'blocks', ids: ['i2'] }, tree)).toBeNull();
    expect(imageAltTarget({ kind: 'blocks', ids: ['p1'] }, tree)).toBeNull();
    expect(imageAltTarget({ kind: 'blocks', ids: ['i1', 'i2'] }, tree)).toBeNull();
    expect(imageAltTarget({ kind: 'text' }, tree)).toBeNull();
    expect(imageAltTarget({ kind: 'blocks', ids: ['i1'] }, null)).toBeNull();
  });

  it('shows only for a target while ready, editable and focused, with no drag or other surface', () => {
    const base = {
      target: { id: 'i1', alt: '' },
      ready: true,
      editable: true,
      focusInside: true,
      dragging: false,
      surfaceOpen: false,
    };
    expect(imageAltVisible(base)).toBe(true);
    expect(imageAltVisible({ ...base, target: null })).toBe(false);
    expect(imageAltVisible({ ...base, ready: false })).toBe(false);
    expect(imageAltVisible({ ...base, editable: false })).toBe(false);
    expect(imageAltVisible({ ...base, focusInside: false })).toBe(false);
    expect(imageAltVisible({ ...base, dragging: true })).toBe(false);
    expect(imageAltVisible({ ...base, surfaceOpen: true })).toBe(false);
  });

  it('applies through block.set-attrs with reason item-press and no focus move', () => {
    expect(imageAltProposal('i1', 'A shelf', undefined)).toEqual({
      target: [{ type: 'block.set-attrs', id: 'i1', attrs: { alt: 'A shelf' } }],
      surface: 'content',
      reason: 'item-press',
      sourceEvent: undefined,
      trigger: null,
      focus: false,
    });
  });

  it('sits inside the image at its top-left corner, top-right in RTL, narrowed to a narrow image', () => {
    const box = { left: 100, top: 50, width: 400, height: 200 };
    const size = { width: 256, height: 40 };
    expect(imageAltPlacement(box, size, false)).toEqual({
      left: 100 + IMAGE_ALT_INSET,
      top: 50 + IMAGE_ALT_INSET,
      maxWidth: 400 - 2 * IMAGE_ALT_INSET,
    });
    expect(imageAltPlacement(box, size, true)).toEqual({
      left: 100 + 400 - IMAGE_ALT_INSET - 256,
      top: 50 + IMAGE_ALT_INSET,
      maxWidth: 400 - 2 * IMAGE_ALT_INSET,
    });
    const narrow = { left: 0, top: 0, width: 120, height: 80 };
    expect(imageAltPlacement(narrow, size, false)).toEqual({
      left: IMAGE_ALT_INSET,
      top: IMAGE_ALT_INSET,
      maxWidth: 120 - 2 * IMAGE_ALT_INSET,
    });
  });
});
