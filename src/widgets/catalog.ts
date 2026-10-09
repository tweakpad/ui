import type { CatalogEntry } from '../catalog.js';

/**
 * A published widget: a specialized control (color picker, curve editor, audio graph) shipped
 * through `@tweakpad/ui/widgets`, never through the main index or `/register`. Widgets reuse the
 * Component Library definition kinds until the Widgets specification declares its own.
 */
export type WidgetEntry = CatalogEntry;

type WidgetTuple = readonly [WidgetEntry['name'], `tp-${string}`, WidgetEntry['kind']];

/** Public widgets in sidebar order: `[name, tag, kind]`. */
export const widgetCatalog = [] as const satisfies readonly WidgetTuple[];

export const widgetEntries: readonly WidgetEntry[] = widgetCatalog.map((entry: WidgetTuple) => ({
  name: entry[0],
  tagName: entry[1],
  kind: entry[2],
}));
