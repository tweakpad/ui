import type { ComponentDefinition, PartDefinition } from './definition.js';
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
  /** Default appearance for every presentation key of the family. */
  readonly appearance: PresentationDictionary;
}

export interface PresentationFamilyInput {
  readonly definition: ComponentDefinition;
  readonly bindings?: PresentationFamily['bindings'];
  readonly structure?: PresentationDictionary;
  /** Appearance sources merged per key in order. */
  readonly sources?: readonly PresentationDictionary[];
}

/** The key segment of an axis: a part-scoped axis name (`itemVariant`) drops its prefix. */
export function axisSuffix(name: string): string {
  const suffix = name.replace(
    /^(?:item|action|pageLink|reactions|indicator|controls)(?=[A-Z])/,
    '',
  );
  return `${suffix[0]?.toLowerCase() ?? ''}${suffix.slice(1)}`;
}

/** The axes a part participates in, in definition order. */
export function partAxes(
  part: PartDefinition,
  definition: ComponentDefinition,
): NonNullable<ComponentDefinition['axes']> {
  return (definition.axes ?? []).filter((axis) => part.axes?.includes(axis.name));
}

/** The presentation keys of one part: its name, then `<part>-<axis>-<value>` per participating axis value. */
export function partKeys(part: PartDefinition, definition: ComponentDefinition): string[] {
  return [
    part.name,
    ...partAxes(part, definition).flatMap((axis) =>
      axis.values.map((value) => `${part.name}-${axisSuffix(axis.name)}-${value}`),
    ),
  ];
}

/** All presentation keys a definition declares, in part order. */
export function presentationKeys(definition: ComponentDefinition): string[] {
  return definition.parts.flatMap((part) => partKeys(part, definition));
}

/** A family is complete: every key has an entry, empty when no source styles it. */
export function definePresentation(input: PresentationFamilyInput): PresentationFamily {
  const sources = input.sources ?? [];
  const appearance: Record<string, readonly PresentationRule[]> = {};
  for (const key of presentationKeys(input.definition))
    appearance[key] = sources.flatMap((source) => source[key] ?? []);
  return Object.freeze({
    definition: input.definition,
    bindings: input.bindings ?? {},
    structure: input.structure ?? {},
    appearance,
  });
}

/**
 * The root tag whose bindings a class inherits: set when the class extends that family's root
 * element under another tag (a Navigation panel button extends Button). A constituent that only
 * belongs to the family (a radio item, a map pin) inherits nothing and binds its own tag.
 */
export function inheritedRootTag(
  constructor: { presentation?: PresentationFamily | undefined },
  familyTag: string | undefined = constructor.presentation?.definition.tagName,
): string | undefined {
  if (!familyTag) return undefined;
  for (
    let ancestor = Object.getPrototypeOf(constructor) as { tagName?: string } | null;
    ancestor;
    ancestor = Object.getPrototypeOf(ancestor) as { tagName?: string } | null
  )
    if (ancestor.tagName === familyTag) return familyTag;
  return undefined;
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
