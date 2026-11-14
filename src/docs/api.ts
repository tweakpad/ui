/**
 * The public API of one element, read from the package's Custom Elements Manifest
 * (`custom-elements.json`): the rows both renderings print in their API section. One filter for
 * both consumers: private reactive state (`_copied`), base-element plumbing every element
 * inherits (except `disabled`) and the diagnostics event are left out.
 */

import type { ApiTypes } from './api-types.js';

export interface ManifestType {
  text?: string;
  /** A choice list's values, written out or read through its alias (tweakpad-member-types). */
  values?: string[];
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
  parameters?: {
    name: string;
    optional?: boolean;
    default?: string;
    type?: ManifestType;
    description?: string;
  }[];
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
  /** The valid values of a choice list; Controls lists them in a select. */
  values?: string[];
  default: string;
  description: string;
}
export interface ApiProperty {
  name: string;
  type: string;
  /** The valid values of a choice list; Controls lists them in a select. */
  values?: string[];
  default: string;
  readonly: boolean;
  description: string;
}
/** How a Properties row's value can be edited live: a choice, a toggle or a field; null for none. */
export type ApiControl = 'select' | 'boolean' | 'text' | 'number' | null;

/**
 * One row of the Properties table: a property (and the attribute that sets it, when one does),
 * what it does, its type, its default and how its value can be controlled live.
 */
export interface ApiMember {
  /** The property name, or the attribute name when no property backs it. */
  name: string;
  /** The HTML attribute that sets it, when one does. */
  attribute?: string;
  type: string;
  /** The valid values of a choice list. */
  values?: string[];
  default: string;
  readonly: boolean;
  description: string;
  control: ApiControl;
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
  /**
   * The Properties table: every attribute-backed property, then every JavaScript-only one, each
   * once. The API Reference prints the other groups and never these.
   */
  members: ApiMember[];
  /** Public methods, one row per name with its overloads merged. */
  methods: ApiMethod[];
  events: ApiEvent[];
  /** Slots; the default slot is named `''`. */
  slots: ApiNamed[];
  cssParts: ApiNamed[];
  cssProperties: ApiCssProperty[];
  /** A form control: it also accepts `name`, `disabled`, `required` and `read-only`. */
  formControl: boolean;
}

const DIAGNOSTIC_EVENT = 'tp-diagnostic';

/**
 * Bases that hold the public API of the elements built on them, which no page of their own
 * documents: the Motion › Text elements share their splitting and reveal API through one base.
 */
const OWN_API_BASES: ReadonlySet<string> = new Set(['TextRevealElement', 'SurfaceBorderElement']);

/**
 * An element's table lists what it declares itself. Members and attributes it inherits from a
 * base class (the shared element, form-control and surface bases, or another component it
 * extends) are not repeated on every page that inherits them, except those of an own-API base.
 * A member the element redeclares is its own.
 */
const inherited = (entry: { name?: string; inheritedFrom?: { name?: string } }) =>
  !!entry.inheritedFrom &&
  !OWN_API_BASES.has(entry.inheritedFrom.name ?? '') &&
  // A form control's value is its own API, whatever base declares it.
  !(entry.inheritedFrom.name === FORM_BASE && entry.name === 'value');

/** The base of form-associated elements. */
const FORM_BASE = 'TpFormElement';

/** The cell of a type: `undefined` is absence, which the Default cell shows, so it is dropped. */
const cell = (type: ManifestType | undefined): string => {
  const parts = topLevelUnion(type?.text ?? '').filter((part) => part !== 'undefined');
  // A lone callback loses the parentheses that only grouped it with `undefined`.
  const only = parts.length === 1 ? parts[0]! : '';
  return only.startsWith('(') &&
    only.endsWith(')') &&
    topLevelUnion(only.slice(1, -1)).length === 1 &&
    balanced(only.slice(1, -1))
    ? only.slice(1, -1)
    : parts.join(' | ');
};

/** Whether brackets in a type text pair up, so stripping an outer pair keeps it valid. */
function balanced(text: string): boolean {
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if ('([{'.includes(char)) depth++;
    else if (')]}'.includes(char) && --depth < 0) return false;
  }
  return depth === 0;
}

/** A type text's top-level union members; `|` inside brackets, parentheses or quotes stays. */
function topLevelUnion(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === "'" || char === '"' || char === '`') quote = char;
    else if ('([{<'.includes(char)) depth++;
    else if (')]}>'.includes(char) && text[index - 1] !== '=') depth--;
    else if (char === '|' && depth === 0) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}
/** A choice list's values, when the type is one. */
const valuesOf = (...types: (ManifestType | undefined)[]) => {
  const values = types.find((type) => type?.values?.length)?.values;
  return values ? { values } : {};
};

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
    // A parameter with a default value is optional too.
    for (const overload of overloads)
      for (const parameter of overload.parameters ?? [])
        parameters.set(
          parameter.name,
          (parameters.get(parameter.name) ?? false) ||
            !!parameter.optional ||
            parameter.default !== undefined,
        );
    const described = overloads.find((overload) => overload.description) ?? overloads[0];
    const typeOf = (parameter: string) =>
      cell(described?.parameters?.find((entry) => entry.name === parameter)?.type);
    return {
      name,
      signature: `${name}(${[...parameters]
        .map(([parameter, optional]) => {
          const type = typeOf(parameter);
          return `${parameter}${optional ? '?' : ''}${type ? `: ${type}` : ''}`;
        })
        .join(', ')})`,
      returns: cell(described?.return?.type),
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
  const listed = (declaration.attributes ?? [])
    .filter((attribute) => !attribute.name.startsWith('_') && !inherited(attribute))
    .map((attribute) => {
      const field = attribute.fieldName ? fieldByName.get(attribute.fieldName) : undefined;
      return {
        name: attribute.name,
        property: attribute.fieldName ?? '',
        type: cell(attribute.type) || cell(field?.type),
        ...valuesOf(attribute.type, field?.type),
        default: attribute.default ?? field?.default ?? '',
        description: attribute.description ?? field?.description ?? '',
      };
    });
  // A controlled setting and its `default-*` starting value are one row: the setting's values and
  // default, with the starting attribute named.
  const attributes = listed
    .filter((attribute) => !pairOf(attribute.name, listed))
    .map((attribute) => {
      const start = listed.find((entry) => entry.name === `default-${attribute.name}`);
      return start
        ? {
            ...attribute,
            default: attribute.default || start.default,
            description: `${attribute.description} Uncontrolled start: \`${start.name}\`.`.trim(),
          }
        : attribute;
    });
  const seenEvents = new Set<string>();
  const events: ApiEvent[] = [];
  for (const event of declaration.events ?? []) {
    const name = event.name ?? '';
    if (!name || name === DIAGNOSTIC_EVENT || seenEvents.has(name)) continue;
    seenEvents.add(name);
    events.push({
      name,
      type: cell(event.type),
      description: event.description ?? '',
    });
  }
  const properties = propertyRows(members);
  const named = (entries: ManifestNamed[] | undefined): ApiNamed[] =>
    (entries ?? []).map((entry) => ({ name: entry.name, description: entry.description ?? '' }));
  return {
    tagName,
    className: declaration.name ?? '',
    description: declaration.description ?? '',
    attributes,
    properties,
    members: [
      ...attributes.map((row): ApiMember => ({
        name: row.property || row.name,
        attribute: row.name,
        type: row.type,
        ...(row.values ? { values: row.values } : {}),
        default: row.default,
        readonly: false,
        description: row.description,
        control: controlOf(row.type, row.values, false),
      })),
      ...properties.map((row): ApiMember => ({
        ...row,
        control: controlOf(row.type, row.values, row.readonly),
      })),
    ],
    methods: methodsOf(members),
    events,
    slots: named(declaration.slots),
    cssParts: named(declaration.cssParts),
    cssProperties: (declaration.cssProperties ?? []).map((entry) => ({
      name: entry.name,
      default: entry.default ?? '',
      description: entry.description ?? '',
    })),
    formControl: [...(declaration.attributes ?? []), ...(declaration.members ?? [])].some(
      (entry) => entry.inheritedFrom?.name === FORM_BASE,
    ),
  };
}

/** The live control a value takes: choices, toggles and plain fields only; never an object. */
function controlOf(
  type: string,
  values: readonly string[] | undefined,
  readonly: boolean,
): ApiControl {
  if (readonly) return null;
  if (values?.length) return 'select';
  const parts = topLevelUnion(type).filter((part) => part !== 'null');
  if (parts.length !== 1) return null;
  return parts[0] === 'boolean'
    ? 'boolean'
    : parts[0] === 'number'
      ? 'number'
      : parts[0] === 'string'
        ? 'text'
        : null;
}

/** Whether an attribute is the `default-*` starting value of another listed attribute. */
function pairOf(name: string, rows: readonly { name: string }[]): boolean {
  return name.startsWith('default-') && rows.some((row) => `default-${row.name}` === name);
}

/** Property rows: a `default*` starting value merges into its property, as attributes do. */
function propertyRows(members: ManifestMember[]): ApiProperty[] {
  const fields = members.filter((member) => member.kind === 'field' && !member.attribute);
  const startOf = (name: string) =>
    fields.find((field) => field.name === `default${name[0]!.toUpperCase()}${name.slice(1)}`);
  const starts = new Set(
    fields.filter((field) => fields.some((other) => startOf(other.name) === field)),
  );
  return fields
    .filter((field) => !starts.has(field))
    .map((field) => {
      const start = startOf(field.name);
      return {
        name: field.name,
        type: cell(field.type),
        ...valuesOf(field.type),
        default: field.default ?? start?.default ?? '',
        readonly: !!field.readonly,
        description: start
          ? `${field.description ?? ''} Uncontrolled start: \`${start.name}\`.`.trim()
          : (field.description ?? ''),
      };
    });
}

/**
 * Rows that say a fact twice: a description that quotes two or more of the row's own values, which
 * the type already lists. A description says what the row does; the values live in the type.
 */
export function repeatedValues(api: ElementApi): string[] {
  return [...api.attributes, ...api.properties]
    .filter(
      (row) =>
        (row.values ?? []).filter((value) => row.description.includes(`\`${value}\``)).length >= 2,
    )
    .map((row) => `${row.name}: the description repeats the values the type lists`);
}

/**
 * Attributes a reader cannot fill in from the docs: one typed by a name (`SortDirection`) that the
 * docs neither list the values of (a choice list, Controls' select) nor open a card for (`types`,
 * from `api-types.json`). A name alone tells a reader nothing.
 */
export function unlistedChoices(api: ElementApi, types?: ApiTypes): string[] {
  const carded = types?.elements[api.tagName] ?? {};
  return api.attributes
    .filter((row) => {
      const parts = row.type
        .split('|')
        .map((part) => part.trim())
        .filter((part) => part && part !== 'undefined' && part !== 'null');
      return (
        !row.values?.length && parts.some((part) => /^[A-Z]\w*$/u.test(part) && !(part in carded))
      );
    })
    .map(
      (row) =>
        `attribute ${row.name}: ${row.type} is not defined in the docs; list its values or use a primitive type`,
    );
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
