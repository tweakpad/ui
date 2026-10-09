// `@tweakpad/ui/widgets`: widget classes, types, the widget catalog and the widget presentation
// aggregates. Registration lives in `@tweakpad/ui/register/widgets`. One line per widget folder,
// alphabetical, mirroring `src/components/index.ts`:
export * from './color-picker/index.js';
export * from './catalog.js';
export { widgetPresentationFamilies } from '../presentation/families/widgets.js';
export { widgetDefinitions, defaultWidgetPresentationDictionary } from '../presentation/widgets.js';
