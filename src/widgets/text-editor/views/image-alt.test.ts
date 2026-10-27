import { describe, expect, it } from 'vitest';
import type { TextEditorBlock } from '../../../foundation/text-editor/model.js';
import { imageAltProposal, imageAltTarget, imageAltVisible } from './image-alt.js';

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
});
