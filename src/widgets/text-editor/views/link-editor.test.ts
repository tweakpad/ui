import { describe, expect, it } from 'vitest';
import type { TextEditorLinkState } from '../../../foundation/text-editor/model.js';
import { LINK_EDITOR_ORDER, linkEditorVisible, sameLink } from './link-editor.js';
import { IMAGE_ALT_ORDER } from './image-alt.js';

const link = (href: string, from = 0): TextEditorLinkState => ({
  href,
  range: { block: 'b1', from, to: from + 4 },
});

describe('link editor (uwg-te-req-surfaces-3)', () => {
  it('shows only for a link at the selection while ready, editable and focused, with no drag or other surface', () => {
    const base = {
      link: link('https://harbor.example/tides'),
      ready: true,
      editable: true,
      focusInside: true,
      dragging: false,
      surfaceOpen: false,
    };
    expect(linkEditorVisible(base)).toBe(true);
    expect(linkEditorVisible({ ...base, link: null })).toBe(false);
    expect(linkEditorVisible({ ...base, ready: false })).toBe(false);
    expect(linkEditorVisible({ ...base, editable: false })).toBe(false);
    expect(linkEditorVisible({ ...base, focusInside: false })).toBe(false);
    expect(linkEditorVisible({ ...base, dragging: true })).toBe(false);
    // The link popover open over the same link shows the editor's controls itself.
    expect(linkEditorVisible({ ...base, surfaceOpen: true })).toBe(false);
  });

  it('keeps its draft while the selection stays in the same link, and follows another link', () => {
    const a = link('https://harbor.example/tides');
    expect(sameLink(a, { ...a })).toBe(true);
    expect(sameLink(a, link('https://harbor.example/tides', 2))).toBe(false);
    expect(sameLink(a, link('https://harbor.example/alerts'))).toBe(false);
    expect(sameLink(a, null)).toBe(false);
    expect(sameLink(null, null)).toBe(true);
  });

  it('takes the alternative text field’s place in the Alt+F10 cycle; the two never apply together', () => {
    expect(LINK_EDITOR_ORDER).toBe(IMAGE_ALT_ORDER);
  });
});
