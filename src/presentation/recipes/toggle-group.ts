import type { PresentationDeclarations, PresentationDictionary } from '../resolver.js';
import { joinedControlPresentation } from '../composition.js';

export const toggleGroupAppearance: PresentationDictionary = {
  // ToggleGroup composes actual TpToggle instances: their existing variant/size recipe
  // owns every item paint rule. Group keys add no second copy of that appearance.
  ...Object.fromEntries(
    ['toggle-group', 'toggle-group-item'].flatMap((part) => [
      [part, []],
      ...['horizontal', 'vertical'].map((value) => [part + '-orientation-' + value, []]),
      ...['ghost', 'outline'].map((value) => [part + '-variant-' + value, []]),
      ...['sm', 'default', 'lg'].map((value) => [part + '-size-' + value, []]),
    ]),
  ),
};

/** Nova adds Toggle-only joined padding over the common ButtonGroup seam geometry. */
export function toggleGroupJoinedPresentation(
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
  leadingIcon: boolean,
  trailingIcon: boolean,
): PresentationDeclarations {
  return {
    ...joinedControlPresentation(index, count, orientation),
    'padding-inline-start': `calc(var(--tp-spacing) * ${leadingIcon ? 1.5 : 2})`,
    'padding-inline-end': `calc(var(--tp-spacing) * ${trailingIcon ? 1.5 : 2})`,
  };
}
