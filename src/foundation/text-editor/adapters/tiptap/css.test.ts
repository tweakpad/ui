import { describe, expect, it } from 'vitest';
import { textMechanicsCss } from '../../content/mechanics.js';
import { TIPTAP_BASE_CSS } from './css.js';

describe('uwg-te-req-pres-2: the adapter’s base CSS', () => {
  it('starts with the shared mechanics, then holds only its own rules', () => {
    expect(TIPTAP_BASE_CSS.startsWith(textMechanicsCss('.ProseMirror'))).toBe(true);
  });

  it('is the reviewed text', () => {
    expect(TIPTAP_BASE_CSS).toBe(`.ProseMirror {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  font-variant-ligatures: none;
}
.ProseMirror .tp-te-code-block {
  white-space: pre-wrap;
  tab-size: 2;
}
.ProseMirror [contenteditable="false"] {
  white-space: normal;
  user-select: none;
}
.ProseMirror:dir(ltr) {
  --tp-te-direction: ltr;
}
.ProseMirror:dir(rtl) {
  --tp-te-direction: rtl;
}
.ProseMirror .tp-te-list .tp-te-list {
  direction: var(--tp-te-direction);
}
.ProseMirror [contenteditable="false"] [contenteditable="true"] {
  white-space: pre-wrap;
}
.ProseMirror img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  inline-size: 0 !important;
  block-size: 0 !important;
}
.ProseMirror-hideselection,
.ProseMirror-hideselection * {
  caret-color: transparent;
}
.ProseMirror-hideselection::selection,
.ProseMirror-hideselection *::selection,
.ProseMirror .tp-te-cell-selected::selection,
.ProseMirror .tp-te-cell-selected *::selection,
.ProseMirror .tp-te-table-selection *::selection {
  background: transparent;
}
.ProseMirror .tp-te-table-wrapper {
  overflow-x: auto;
}
`);
  });
});
