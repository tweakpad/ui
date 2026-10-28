import { describe, expect, it } from 'vitest';
import { textMechanicsCss } from '../../content/mechanics.js';
import { LEXICAL_BASE_CSS } from './css.js';

describe('uwg-te-req-pres-2: the adapter’s base CSS', () => {
  it('starts with the shared mechanics, then holds only its own rules', () => {
    expect(LEXICAL_BASE_CSS.startsWith(textMechanicsCss('[data-lexical-editor]'))).toBe(true);
  });

  it('is the reviewed text', () => {
    expect(LEXICAL_BASE_CSS).toBe(`[data-lexical-editor] {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  font-variant-ligatures: none;
}
[data-lexical-editor] .tp-te-code-block {
  white-space: pre-wrap;
  tab-size: 2;
}
[data-lexical-editor] [contenteditable="false"] {
  white-space: normal;
  user-select: none;
}
[data-lexical-editor]:dir(ltr) {
  --tp-te-direction: ltr;
}
[data-lexical-editor]:dir(rtl) {
  --tp-te-direction: rtl;
}
[data-lexical-editor] .tp-te-list .tp-te-list {
  direction: var(--tp-te-direction);
}
[data-lexical-editor] .tp-te-code-block {
  display: block;
}
[data-lexical-editor] .tp-te-table-wrapper {
  overflow-x: auto;
}
[data-lexical-editor] .tp-te-nested-item {
  list-style-type: none;
}
[data-lexical-editor]:has(.tp-te-table-selection) {
  caret-color: transparent;
}
[data-lexical-editor] .tp-te-cell-selected::selection,
[data-lexical-editor] .tp-te-cell-selected *::selection,
[data-lexical-editor] .tp-te-table-selection *::selection {
  background-color: transparent;
}
`);
  });
});
