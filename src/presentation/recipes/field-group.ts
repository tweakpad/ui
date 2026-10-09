import type { PresentationDictionary } from '../resolver.js';
import { joinedGroupGap, joinedGroupSeparator } from './shared/joined-group.js';

// Field group shares the Button group seam presentation: editors keep their own recipes.
export const fieldGroupAppearance: PresentationDictionary = {
  'field-group': [joinedGroupGap],
  'field-group-separator': [joinedGroupSeparator],
};
