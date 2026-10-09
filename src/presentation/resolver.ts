import type { ComponentDefinition } from './definition.js';
import { axisSuffix, partAxes } from './family.js';

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
    const keys = [part.name];
    for (const axis of partAxes(part, definition)) {
      const value = axes[axis.name] ?? axis.default;
      if (!axis.values.includes(String(value))) continue;
      keys.push(`${part.name}-${axisSuffix(axis.name)}-${String(value)}`);
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
