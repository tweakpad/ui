import type { PresentationRule } from '../../resolver.js';
import { dividerLine } from './divider.js';
import { focusRing } from './handle.js';

/**
 * Paint of an interactive resize separator (`req-f-resizable-separator`): the divider line in the
 * border role and the shared focus-visible ring. The enlarged pointer target is structural and
 * stays with the separator's owner (`resizeSeparatorTargetCss`).
 */
export const resizeSeparatorRules: readonly PresentationRule[] = [
  { declarations: { background: dividerLine['background-color']! } },
  { selector: '&:focus-visible', declarations: focusRing },
];
