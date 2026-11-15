import type { CatalogEntry } from '../catalog.js';

/**
 * A published widget: a specialized control (color picker, curve editor, audio graph) shipped
 * through `@tweakpad/ui/widgets`, never through the main index or `/register`. Widgets reuse the
 * Component Library definition kinds until the Widgets specification declares its own.
 */
export type WidgetEntry = CatalogEntry;

type WidgetTuple = readonly [WidgetEntry['name'], `tp-${string}`, WidgetEntry['kind']];

/** Public widgets in sidebar order: `[name, tag, kind]`. */
export const widgetCatalog = [
  ['Color picker', 'tp-color-picker', 'flattening-compound'],
  ['Gradient picker', 'tp-gradient-picker', 'flattening-compound'],
  ['Easing editor', 'tp-easing-editor', 'flattening-compound'],
  ['Flow', 'tp-flow', 'flattening-compound'],
  ['Emoji picker', 'tp-emoji-picker', 'flattening-compound'],
  ['Plot', 'tp-plot', 'flattening-compound'],
  ['Text editor', 'tp-text-editor', 'flattening-compound'],
  ['Color palette', 'tp-color-palette', 'flattening-compound'],
  ['Layers', 'tp-layers', 'flattening-compound'],
  ['Heatmap', 'tp-heatmap', 'flattening-compound'],
  ['Image editor', 'tp-image-editor', 'flattening-compound'],
  ['File explorer', 'tp-file-explorer', 'flattening-compound'],
] as const satisfies readonly WidgetTuple[];

export const widgetEntries: readonly WidgetEntry[] = widgetCatalog.map((entry: WidgetTuple) => ({
  name: entry[0],
  tagName: entry[1],
  kind: entry[2],
}));
