import type { PresentationDictionary } from './resolver.js';
import { presentationFamilies } from './families/index.js';

export { controlSizePresentation, variantPresentation } from './recipes/shared/variant.js';

/**
 * The default appearance of every family in one dictionary, for consumers that build a
 * replacement dictionary from the defaults. Components resolve their own family's appearance
 * and never import this aggregate.
 */
export const defaultPresentationDictionary: PresentationDictionary = Object.assign(
  {},
  ...presentationFamilies.map((family) => family.appearance),
);
