import type { ComponentDefinition } from './definition.js';
import type { PresentationDictionary } from './resolver.js';
import { widgetPresentationFamilies } from './families/widgets.js';

/**
 * Widget counterparts of `componentDefinitions` and `defaultPresentationDictionary`, exported
 * from `@tweakpad/ui/widgets` only. Widgets never import these aggregates.
 */
export const widgetDefinitions: readonly ComponentDefinition[] = widgetPresentationFamilies.map(
  (family) => family.definition,
);

export const defaultWidgetPresentationDictionary: PresentationDictionary = Object.assign(
  {},
  ...widgetPresentationFamilies.map((family) => family.appearance),
);
