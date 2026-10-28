export type DefinitionKind =
  | 'compound-reexport'
  | 'flattening-compound'
  | 'preset-composition'
  | 'presentational-primitive'
  | 'thin-wrapper';

export interface PartDefinition {
  name: string;
  /**
   * What the part is, for the generated API reference (`::part(<name>)`): one sentence that a
   * consumer styling it needs. Parts without a description are flagged by the documentation
   * build of the elements that expose them.
   */
  description?: string;
  slot?: string;
  /** Axes (by name) whose values this part resolves to `<part>-<axis>-<value>` keys. */
  axes?: readonly string[];
}

/**
 * A component's presentation contract: its public parts and variant axes. Keys derive from
 * these (see `presentationKeys`); the live specification is the authority for part naming,
 * cardinality and state vocabulary.
 */
export interface ComponentDefinition {
  name: string;
  tagName: `tp-${string}`;
  kind: DefinitionKind;
  parts: readonly PartDefinition[];
  /** Declaration order is resolution order; defaults do not become state. */
  axes?: readonly { name: string; values: readonly string[]; default: string }[];
}
