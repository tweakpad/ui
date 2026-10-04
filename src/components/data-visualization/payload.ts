import type { VisualizationPayload, VisualizationSeriesMap } from './types.js';

const keyOf = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

/** Same resolver for every metadata consumer; never mutate the engine payload. */
export function resolveVisualizationSeries(
  series: VisualizationSeriesMap,
  item: VisualizationPayload,
  nameKey?: string,
) {
  const declared = nameKey
    ? (keyOf(item[nameKey]) ?? keyOf(item.payload?.[nameKey]) ?? nameKey)
    : undefined;
  const key = declared ?? keyOf(item.dataKey) ?? keyOf(item.name) ?? keyOf(item.value) ?? '';
  const nested = keyOf(item[key]) ?? keyOf(item.payload?.[key]);
  const resolvedKey = nested && series[nested] ? nested : key;
  const metadata = series[resolvedKey];
  return {
    key: resolvedKey,
    metadata,
    label: metadata?.label ?? keyOf(item.name) ?? keyOf(item.value) ?? key,
  };
}

/** A collision-free CSS identifier, including punctuation and Unicode keys. */
export function visualizationIdentifier(value: string): string {
  return `v-${Array.from(value, (character) => character.codePointAt(0)!.toString(16)).join('-')}`;
}
