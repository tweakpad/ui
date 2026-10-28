/**
 * Editing mechanics of the text editor's content (Widgets `uwg-te-req-pres-2`, `uwg-te-req-pres-5`).
 *
 * The rules that every engine's editing root needs and that the pre-ready preview shares, so that
 * the swap at ready keeps the block size: text keeps its spaces and wraps, without ligatures; a code
 * block keeps its line breaks with a tab two spaces wide; non-editable islands keep normal spacing
 * and are not selectable as text; a list inside a list is laid out in the direction that the root
 * inherits (`:dir()`), never in the one that an item's `dir="auto"` resolves from its text. Plain
 * text scoped to `root`, naming no color: each adapter writes it first in its base CSS, and the
 * widget binds it to the preview.
 */

/**
 * List containers at every depth are laid out in the widget's direction, never in the one that an
 * item's `dir="auto"` resolves: the root, which carries no direction of its own, records the
 * direction it inherits from the widget (`:dir()`) in a custom property, and every list inside a
 * list takes it, whether the list is nested in the item that holds its parent's text or in a
 * wrapper item without text. Items and the blocks in them keep resolving their own direction from
 * their text.
 */
function listDirectionCss(root: string): string {
  return `${root}:dir(ltr) {
  --tp-te-direction: ltr;
}
${root}:dir(rtl) {
  --tp-te-direction: rtl;
}
${root} .tp-te-list .tp-te-list {
  direction: var(--tp-te-direction);
}
`;
}

/**
 * The root's own mechanics, all inherited properties: text keeps its spaces and wraps, without
 * ligatures. An engine relies on them to edit correctly, so the widget also writes them through
 * the CSSOM on the container of the editing root while generated styles are suppressed.
 */
export const TEXT_MECHANICS_INHERITED: Readonly<Record<string, string>> = Object.freeze({
  'white-space': 'pre-wrap',
  'overflow-wrap': 'break-word',
  'font-variant-ligatures': 'none',
});

/** The mechanics rules scoped to `root`, one selector without a top-level comma. */
export function textMechanicsCss(root: string): string {
  const inherited = Object.entries(TEXT_MECHANICS_INHERITED)
    .map(([property, value]) => `  ${property}: ${value};\n`)
    .join('');
  return `${root} {
${inherited}}
${root} .tp-te-code-block {
  white-space: pre-wrap;
  tab-size: 2;
}
${root} [contenteditable="false"] {
  white-space: normal;
  user-select: none;
}
${listDirectionCss(root)}`;
}
