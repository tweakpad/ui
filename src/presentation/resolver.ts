import type { ComponentDefinition } from './definition.js';

export type PresentationDeclarations = Readonly<Record<string, string | number>>;

export interface PresentationRule {
  /** A selector suffix, such as :hover. An ampersand denotes the public part. */
  selector?: string;
  declarations: PresentationDeclarations;
}

export type PresentationDictionary = Readonly<Record<string, readonly PresentationRule[]>>;

export interface PartPresentationHook {
  classHook?: string;
  styleHook?: PresentationDeclarations;
}

export type PartPresentation = Readonly<Record<string, PartPresentationHook>>;

export interface ComponentPresentation {
  parts: Readonly<Record<string, readonly PresentationRule[]>>;
  missingKeys: readonly string[];
}

/** Pure resolution. Missing keys contribute no appearance, never another dictionary. */
export function resolveComponentPresentation(
  definition: ComponentDefinition,
  axes: Readonly<Record<string, unknown>>,
  dictionary: PresentationDictionary,
): ComponentPresentation {
  const parts: Record<string, PresentationRule[]> = {};
  const missingKeys = new Set<string>();
  for (const part of definition.parts) {
    const inventory = part.presentationKeys ?? [part.name];
    const keys = [part.name];
    for (const axis of definition.axes ?? []) {
      const value = axes[axis.name] ?? axis.default;
      if (!axis.values.includes(String(value))) continue;
      // Scoped axes are represented by their cataloged part-key inventory.
      if (axis.name.startsWith('reactions') && !part.name.endsWith('-reactions')) continue;
      const suffix = axis.name.replace(
        /^(?:item|action|pageLink|reactions|indicator|controls)(?=[A-Z])/,
        '',
      );
      const key = `${part.name}-${suffix[0]?.toLowerCase()}${suffix.slice(1)}-${String(value)}`;
      if (inventory.includes(key)) keys.push(key);
    }
    parts[part.name] = [];
    for (const key of keys) {
      const rules = dictionary[key];
      if (rules === undefined) missingKeys.add(key);
      else parts[part.name]!.push(...rules);
    }
  }
  return { parts, missingKeys: [...missingKeys] };
}

/** Keep declarations ordered: CSS, not a conflict-group deletion, resolves shorthands. */
export function serializeDeclarations(declarations: PresentationDeclarations): string {
  return Object.entries(declarations)
    .map(([property, value]) => `${property}:${String(value)}`)
    .join(';');
}
