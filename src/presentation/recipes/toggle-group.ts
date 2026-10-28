import type { PresentationDeclarations, PresentationDictionary } from '../resolver.js';
import { joinedControlPresentation } from '../composition.js';
import { buttonSizes } from './core/button.js';

export const toggleGroupAppearance: PresentationDictionary = {
  // ToggleGroup composes actual TpToggle instances: their existing variant/size recipe
  // owns every item paint rule. Group keys add no second copy of that appearance.
  ...Object.fromEntries(
    ['toggle-group', 'toggle-group-item'].flatMap((part) => [
      [part, []],
      ...['horizontal', 'vertical'].map((value) => [part + '-orientation-' + value, []]),
      ...['ghost', 'outline'].map((value) => [part + '-variant-' + value, []]),
      ...buttonSizes.map((value) => [part + '-size-' + value, []]),
    ]),
  ),
};

/**
 * Toggle-only joined padding over the common ButtonGroup seam geometry. A `square` (`icon-*`)
 * item keeps its step's zero inline padding (`req-cl-145-size`).
 */
export function toggleGroupJoinedPresentation(
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
  leadingIcon: boolean,
  trailingIcon: boolean,
  square: boolean,
): PresentationDeclarations {
  return {
    ...joinedControlPresentation(index, count, orientation),
    ...(square
      ? {}
      : {
          'padding-inline-start': leadingIcon ? 'var(--tp-space-1-5)' : 'var(--tp-space-2)',
          'padding-inline-end': trailingIcon ? 'var(--tp-space-1-5)' : 'var(--tp-space-2)',
        }),
  };
}
