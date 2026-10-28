/**
 * The public API of one element, read from the package's Custom Elements Manifest
 * (`custom-elements.json`): the rows both renderings print in their API section. One filter for
 * both consumers: private reactive state (`_copied`), base-element plumbing every element
 * inherits (except `disabled`) and the diagnostics event are left out.
 */

export interface ManifestType {
  text?: string;
}
export interface ManifestAttribute {
  name: string;
  fieldName?: string;
  type?: ManifestType;
  default?: string;
  description?: string;
  inheritedFrom?: { name?: string };
}
export interface ManifestEvent {
  name?: string;
  type?: ManifestType;
  description?: string;
  inheritedFrom?: { name?: string };
}
export interface ManifestMember {
  kind: 'field' | 'method';
  name: string;
  static?: boolean;
  privacy?: 'public' | 'private' | 'protected';
  readonly?: boolean;
  attribute?: string;
  reflects?: boolean;
  type?: ManifestType;
  default?: string;
  description?: string;
  parameters?: { name: string; optional?: boolean; type?: ManifestType; description?: string }[];
  return?: { type?: ManifestType };
  inheritedFrom?: { name?: string };
}
export interface ManifestNamed {
  name: string;
  description?: string;
  default?: string;
}
export interface ManifestDeclaration {
  kind?: string;
  name?: string;
  tagName?: string;
  description?: string;
  superclass?: { name?: string };
  attributes?: ManifestAttribute[];
  events?: ManifestEvent[];
  members?: ManifestMember[];
  slots?: ManifestNamed[];
  cssParts?: ManifestNamed[];
  cssProperties?: ManifestNamed[];
  /** Tags of the library elements this element renders (its `elementDependencies`, up the class chain). */
  renders?: string[];
}
export interface Manifest {
  modules: { path?: string; declarations?: ManifestDeclaration[] }[];
}

export interface ApiAttribute {
  name: string;
  /** The property the attribute reflects to or from. */
  property: string;
  type: string;
  default: string;
  description: string;
}
export interface ApiProperty {
  name: string;
  type: string;
  default: string;
  readonly: boolean;
  description: string;
}
export interface ApiMethod {
  name: string;
  signature: string;
  returns: string;
  description: string;
}
export interface ApiEvent {
  name: string;
  /** The event class or detail type. */
  type: string;
  description: string;
}
export interface ApiNamed {
  name: string;
  description: string;
}
export interface ApiCssProperty extends ApiNamed {
  default: string;
}

export interface ElementApi {
  tagName: string;
  className: string;
  description: string;
  attributes: ApiAttribute[];
  /** The element's public properties that no attribute reflects, such as object-valued ones. */
  properties: ApiProperty[];
  /** Public methods, one row per name with its overloads merged. */
  methods: ApiMethod[];
  events: ApiEvent[];
  /** Slots; the default slot is named `''`. */
  slots: ApiNamed[];
  cssParts: ApiNamed[];
  cssProperties: ApiCssProperty[];
}

const DIAGNOSTIC_EVENT = 'tp-diagnostic';

/**
 * An element's table lists what it declares itself. Members and attributes it inherits from a
 * base class (the shared element, form-control and surface bases, or another component it
 * extends) are not repeated on every page that inherits them. A member the element redeclares
 * is its own.
 */
const inherited = (entry: { inheritedFrom?: { name?: string } }) => !!entry.inheritedFrom;

/** Public API the element declares itself. */
const ownPublic = (member: ManifestMember) =>
  !member.static &&
  (member.privacy ?? 'public') === 'public' &&
  !member.name.startsWith('_') &&
  !member.name.startsWith('#') &&
  !inherited(member);

function methodsOf(members: ManifestMember[]): ApiMethod[] {
  const byName = new Map<string, ManifestMember[]>();
  for (const member of members) {
    if (member.kind !== 'method' || !ownPublic(member)) continue;
    byName.set(member.name, [...(byName.get(member.name) ?? []), member]);
  }
  return [...byName].map(([name, overloads]) => {
    // A parameter is optional when any overload lets it be left out.
    const parameters = new Map<string, boolean>();
    for (const overload of overloads)
      for (const parameter of overload.parameters ?? [])
        parameters.set(
          parameter.name,
          (parameters.get(parameter.name) ?? false) || !!parameter.optional,
        );
    const described = overloads.find((overload) => overload.description) ?? overloads[0];
    return {
      name,
      signature: `${name}(${[...parameters]
        .map(([parameter, optional]) => (optional ? `${parameter}?` : parameter))
        .join(', ')})`,
      returns: described?.return?.type?.text ?? '',
      description: described?.description ?? '',
    };
  });
}

/** The manifest declaration of a tag. */
export function elementDeclaration(
  manifest: Manifest,
  tagName: string,
): ManifestDeclaration | undefined {
  for (const module of manifest.modules)
    for (const declaration of module.declarations ?? [])
      if (declaration.tagName === tagName) return declaration;
  return undefined;
}

/** Every tag the manifest declares, in manifest order. */
export function manifestTags(manifest: Manifest): string[] {
  return manifest.modules.flatMap((module) =>
    (module.declarations ?? []).flatMap((declaration) =>
      declaration.tagName ? [declaration.tagName] : [],
    ),
  );
}

export function elementApi(manifest: Manifest, tagName: string): ElementApi | undefined {
  const declaration = elementDeclaration(manifest, tagName);
  if (!declaration) return undefined;
  const members = (declaration.members ?? []).filter(ownPublic);
  const fieldByName = new Map(
    members.filter((member) => member.kind === 'field').map((member) => [member.name, member]),
  );
  const attributes = (declaration.attributes ?? [])
    .filter((attribute) => !attribute.name.startsWith('_') && !inherited(attribute))
    .map((attribute) => {
      const field = attribute.fieldName ? fieldByName.get(attribute.fieldName) : undefined;
      return {
        name: attribute.name,
        property: attribute.fieldName ?? '',
        type: attribute.type?.text ?? field?.type?.text ?? '',
        default: attribute.default ?? field?.default ?? '',
        description: attribute.description ?? field?.description ?? '',
      };
    });
  const seenEvents = new Set<string>();
  const events: ApiEvent[] = [];
  for (const event of declaration.events ?? []) {
    const name = event.name ?? '';
    if (!name || name === DIAGNOSTIC_EVENT || seenEvents.has(name)) continue;
    seenEvents.add(name);
    events.push({
      name,
      type: event.type?.text ?? '',
      description: event.description ?? '',
    });
  }
  const named = (entries: ManifestNamed[] | undefined): ApiNamed[] =>
    (entries ?? []).map((entry) => ({ name: entry.name, description: entry.description ?? '' }));
  return {
    tagName,
    className: declaration.name ?? '',
    description: declaration.description ?? '',
    attributes,
    properties: members
      .filter((member) => member.kind === 'field' && !member.attribute)
      .map((member) => ({
        name: member.name,
        type: member.type?.text ?? '',
        default: member.default ?? '',
        readonly: !!member.readonly,
        description: member.description ?? '',
      })),
    methods: methodsOf(members),
    events,
    slots: named(declaration.slots),
    cssParts: named(declaration.cssParts),
    cssProperties: (declaration.cssProperties ?? []).map((entry) => ({
      name: entry.name,
      default: entry.default ?? '',
      description: entry.description ?? '',
    })),
  };
}

/** Rows of an element's API that carry no description, as `kind name` labels. */
export function undescribedApi(api: ElementApi): string[] {
  const missing: string[] = [];
  if (!api.description) missing.push('element summary');
  const check = (kind: string, rows: readonly { name: string; description: string }[]) => {
    for (const row of rows)
      if (!row.description) missing.push(`${kind} ${row.name || '(default)'}`);
  };
  check('attribute', api.attributes);
  check('property', api.properties);
  check('method', api.methods);
  check('event', api.events);
  check('slot', api.slots);
  check('part', api.cssParts);
  check('css property', api.cssProperties);
  return missing;
}
