import type { PresentationDeclarations } from '../../resolver.js';

/** The code surface fill: the card fill mixed halfway toward muted (`dcp-roles-table-r8`). */
export const codeSurfaceFill = 'color-mix(in oklab, var(--tp-card) 50%, var(--tp-muted))';

/** The code surface (`dcp-roles-table-r8`): border, extra-large radius, the code fill and its text. */
export const codeSurface: PresentationDeclarations = {
  border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
  'border-radius': 'var(--tp-radius-xl)',
  background: codeSurfaceFill,
  color: 'var(--tp-foreground)',
};

/**
 * The code face of code spans and code blocks (`dcp-roles-table-r7`, `-r8`): the mono font with
 * ligatures and contextual alternates off. Each set takes its two values by key, in its own order.
 */
export const codeFace = {
  'font-family': 'var(--tp-font-mono)',
  'font-feature-settings': '"liga" 0, "calt" 0',
} as const satisfies PresentationDeclarations;

/** Code typography (`dcp-roles-table-r8`): small mono text, ligatures off, a tab size of 2. */
export const codeTypography: PresentationDeclarations = {
  'font-family': codeFace['font-family'],
  'font-size': 'var(--tp-text-sm)',
  'line-height': 'var(--tp-leading-normal)',
  'font-feature-settings': codeFace['font-feature-settings'],
  'tab-size': '2',
};

/** The block inset of code text. */
export const codeInsetBlock = 'var(--tp-space-3)';

/** The inline inset of each code line. */
export const codeInsetInline = 'var(--tp-space-4)';

/** The focus ring of a scrollable code region, drawn inside its edge. */
export const codeFocusRing: PresentationDeclarations = {
  outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
  'outline-offset': 'calc(var(--tp-ring-width) * -1)',
};
