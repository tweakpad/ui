import type { PresentationDeclarations, PresentationRule } from '../../resolver.js';
import { invalidFocusRing } from './focus.js';
import { fieldBoundary, fieldFocus, fieldInvalid } from './text-control.js';

// Inline controls: compact, stackable rows of a control's own height, with the label inside the
// row at the inline start and the value at the inline end. Every control family's inline
// variant paints its row with this surface and text, so stacked rows of different controls line up.

/** The row surface: the muted track with the text-control border and radius. */
export const inlineControlSurface: PresentationDeclarations = {
  'box-sizing': 'border-box',
  border: fieldBoundary.border,
  'border-radius': fieldBoundary['border-radius'],
  background: 'var(--tp-muted)',
};

/** The fill that shows a row's amount, such as a slider's range: a primary tint text reads on. */
export const inlineControlFill = 'color-mix(in oklab, var(--tp-primary) 30%, transparent)';

/** The edge where the fill ends, and marks inside the fill. */
export const inlineControlEdge = 'var(--tp-primary)';

/** The label at the row's inline start. */
export const inlineControlLabel: PresentationDeclarations = {
  'font-size': 'var(--tp-text-sm)',
  'font-weight': 'var(--tp-font-normal)',
  'line-height': 'var(--tp-leading-normal)',
  color: 'var(--tp-foreground)',
};

/** The value at the row's inline end; it brightens while the row is in use. */
export const inlineControlValue: PresentationDeclarations = {
  'font-size': 'var(--tp-text-sm)',
  'line-height': 'var(--tp-leading-normal)',
  'font-variant-numeric': 'tabular-nums',
  color: 'var(--tp-muted-foreground)',
};

/**
 * Focus and validity rings of a row surface. `owner` selects the element carrying the `focus`
 * condition and the `data-invalid` marker, when the row is not that element itself; a row around
 * a text editor rings on `:focus-within`, as an Input group does.
 */
export function inlineControlRings(
  owner = '&',
  focus = '[data-focus-visible]',
): PresentationRule[] {
  const on = (marker: string): string => (owner === '&' ? `&${marker}` : `${owner}${marker} &`);
  return [
    { selector: on(focus), declarations: fieldFocus },
    { selector: on('[data-invalid]'), declarations: fieldInvalid },
    // Equal specificity: the later invalid paint would tint the focus ring away.
    { selector: on(`[data-invalid]${focus}`), declarations: invalidFocusRing },
  ];
}
