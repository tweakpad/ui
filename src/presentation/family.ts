import type { ComponentDefinition } from './definition.js';
import type { PresentationDictionary, PresentationRule } from './resolver.js';

/**
 * Everything one component family needs to present itself: its definition, the part bindings
 * of its elements, structural arrangement and default appearance. Each component imports only
 * its own family, so an application bundles the presentation of the components it uses and
 * nothing else.
 */
export interface PresentationFamily {
  readonly definition: ComponentDefinition;
  /** Shadow-root selector to part bindings, keyed by element tag (family members included). */
  readonly bindings: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Arrangement of registered parts; not replaceable dictionary appearance. */
  readonly structure: PresentationDictionary;
  /** Default appearance for this family's presentation keys. */
  readonly appearance: PresentationDictionary;
}

export interface PresentationFamilyInput {
  readonly definition: ComponentDefinition;
  readonly bindings?: PresentationFamily['bindings'];
  readonly structure?: PresentationDictionary;
  /** Appearance sources merged per key in order. */
  readonly sources?: readonly PresentationDictionary[];
  /** Give every presentation key an entry, even when no source styles it. */
  readonly complete?: boolean;
}

/** All presentation keys a definition declares, in part order. */
export function presentationKeys(definition: ComponentDefinition): string[] {
  return definition.parts.flatMap((part) => part.presentationKeys ?? [part.name]);
}

/** Every key of a definition with no rules, for families that style keys individually. */
export function emptyAppearance(definition: ComponentDefinition): PresentationDictionary {
  return Object.fromEntries(presentationKeys(definition).map((key) => [key, []]));
}

export function definePresentation(input: PresentationFamilyInput): PresentationFamily {
  const sources = input.sources ?? [];
  const appearance: Record<string, readonly PresentationRule[]> = {};
  for (const key of presentationKeys(input.definition)) {
    const present = sources.filter((source) => key in source);
    if (!present.length && !input.complete) continue;
    appearance[key] = present.flatMap((source) => source[key] ?? []);
  }
  return Object.freeze({
    definition: input.definition,
    bindings: input.bindings ?? {},
    structure: input.structure ?? {},
    appearance,
  });
}

/** The family for a tag: the element's own, one it declares, or a defined element's family. */
export function presentationFamilyFor(
  host: Element,
  tagName: string,
): PresentationFamily | undefined {
  const constructor = host.constructor as {
    presentation?: PresentationFamily;
    presentationFamilies?: readonly PresentationFamily[];
  };
  if (constructor.presentation?.definition.tagName === tagName) return constructor.presentation;
  const declared = constructor.presentationFamilies?.find(
    (family) => family.definition.tagName === tagName,
  );
  if (declared) return declared;
  // Dynamic owners (a menu item presented by its Menubar) are defined elements.
  const registry = host.ownerDocument.defaultView?.customElements;
  return (registry?.get(tagName) as { presentation?: PresentationFamily } | undefined)
    ?.presentation;
}
