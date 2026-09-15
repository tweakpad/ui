export type PresentationValue = string | number | boolean | null;
export type PresentationRecord = Readonly<Record<string, PresentationValue>>;

export interface PresentationLayer {
  tokens?: PresentationRecord;
  parts?: Readonly<Record<string, PresentationRecord>>;
  conflicts?: Readonly<Record<string, readonly string[]>>;
}

export interface ResolvedPresentation {
  tokens: Record<string, PresentationValue>;
  parts: Record<string, Record<string, PresentationValue>>;
}

export function mergePresentation(layers: readonly PresentationLayer[]): ResolvedPresentation {
  const result: ResolvedPresentation = { tokens: {}, parts: {} };
  for (const layer of layers) {
    if (layer.tokens) Object.assign(result.tokens, layer.tokens);
    for (const [part, values] of Object.entries(layer.parts ?? {})) {
      const target = (result.parts[part] ??= {});
      for (const [key, value] of Object.entries(values)) {
        for (const group of Object.values(layer.conflicts ?? {})) {
          if (group.includes(key)) for (const member of group) delete target[member];
        }
        target[key] = value;
      }
    }
  }
  return result;
}

export function presentationStyle(tokens: PresentationRecord): string {
  return Object.entries(tokens)
    .map(([key, value]) => `--tp-${toKebabCase(key)}:${String(value)}`)
    .join(';');
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLocaleLowerCase();
}
