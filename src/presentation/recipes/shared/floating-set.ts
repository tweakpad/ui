import type { PresentationDeclarations } from '../../resolver.js';

/**
 * A set of controls floating over a canvas (Flow's controls, the image editor's bar): it sits on
 * the page surface, as Map control groups do, so translucent control fills never show the canvas
 * through.
 */
export const floatingSet: PresentationDeclarations = {
  'background-color': 'var(--tp-background)',
  'border-radius': 'var(--tp-radius-md)',
  'box-shadow': 'var(--tp-shadow-sm)',
};
