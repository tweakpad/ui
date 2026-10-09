import type { PresentationFamily } from '../family.js';

/**
 * Every widget family, in widget catalog order. Widgets never import this list; each widget
 * carries its own family (`src/presentation/families/<widget>.ts`), so only an explicit import
 * of `@tweakpad/ui/widgets` aggregates bundles every widget's presentation.
 */
export const widgetPresentationFamilies: readonly PresentationFamily[] = [];
