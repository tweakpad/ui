import { markEdge } from './edges.js';
import { selectionLine } from './selection.js';

/**
 * The insertion caret of a document drag: a line in the selection-line role, centered on the place
 * the dragged content lands.
 */
export const dropLine = {
  'border-block-start': `calc(2 * var(--tp-border-width)) var(--tp-border-style) ${selectionLine}`,
  translate: '0 -50%',
};

/** A container the dragged content lands in: a ring in the selection-line role, inside its box. */
export const dropInto = {
  'box-shadow': `inset 0 0 0 calc(2 * var(--tp-border-width)) ${selectionLine}`,
};

/**
 * The landing line of a list drag, between two items: dim but visible, in the control-edge role.
 * `--tp-<component>-drop-indicator-color` and `-size` restyle it; the private `--_tp-drop-line`
 * carries the thickness to the component's own geometry.
 */
export const listDropLine = (component: string) => ({
  '--_tp-drop-line': `var(--tp-${component}-drop-indicator-size, calc(2 * var(--tp-border-width)))`,
  background: `var(--tp-${component}-drop-indicator-color, ${markEdge.color})`,
  'border-radius': 'var(--_tp-drop-line)',
});
