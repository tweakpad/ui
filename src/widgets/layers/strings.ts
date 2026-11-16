import type { LayersMessages } from './types.js';

export type ResolvedLayersMessages = Required<Omit<LayersMessages, 'tree'>> &
  Pick<LayersMessages, 'tree'>;

/** The English text of every message. */
export const DEFAULT_LAYERS_MESSAGES: ResolvedLayersMessages = Object.freeze({
  renameField: (label: string) => `Rename ${label}`,
  stateControl: (state: string, value: string) => `${state}: ${value}`,
  groupLabel: 'Group',
  empty: 'No layers',
  copySuffix: 'copy',
  movedLayers: (count: number) => `Moved ${count} layers`,
});

export function resolveLayersMessages(
  messages: LayersMessages | undefined,
): ResolvedLayersMessages {
  return { ...DEFAULT_LAYERS_MESSAGES, ...messages };
}
